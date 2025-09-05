import { supabase } from '../lib/supabase';
import type { TimeEntry, HobbyCategory, Transaction, UserExpenseCategory, UserAccount } from '../lib/supabase';
import { TimeEntryService, type ManualTimeEntryData } from './timeEntryService';
import { CategoryService } from './categoryService';
import { formatDateTime, formatDate } from '../lib/dateUtils';

// Interface for temporary time entry data with category name
interface TimeEntryWithCategoryName extends ManualTimeEntryData {
  _categoryName?: string;
}

export class CSVExportService {
  /**
   * Convert time entries to CSV format
   */
  static formatTimeEntriesToCSV(entries: TimeEntry[], categories: HobbyCategory[] = []): string {
    // Define CSV headers
    const headers = [
      'Name',
      'Description',
      'Category',
      'Start Time (Unix)',
      'End Time (Unix)',
      'Elapsed Time (Seconds)',
      'Duration',
      'Created At',
      'Entry ID'
    ];

    // Helper function to format duration (no seconds shown)
    const formatDuration = (totalSeconds: number | null | undefined): string => {
      if (!totalSeconds) return '0m';
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        // For durations less than 1 minute, round up to 1 minute
        return '1m';
      }
    };

    // Helper function to escape CSV values
    const escapeCSVValue = (value: string | null | undefined): string => {
      if (!value) return '';
      
      // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    };

    // Convert entries to CSV rows
    const csvRows = entries.map(entry => {
      // Find category name using foreign key relationship
      let categoryName = '';
      if (entry.category_id) {
        const categoryInfo = categories.find(cat => cat.id === entry.category_id);
        if (categoryInfo) {
          categoryName = categoryInfo.name;
        }
      } else if (entry.category) {
        // Fallback to legacy category field
        categoryName = entry.category;
      }

      const row = [
        escapeCSVValue(entry.name),
        escapeCSVValue(entry.description || ''),
        escapeCSVValue(categoryName),
        entry.start_time ? new Date(entry.start_time).getTime().toString() : '',
        entry.end_time ? new Date(entry.end_time).getTime().toString() : '',
        entry.elapsed_time?.toString() || '0',
        formatDuration(entry.elapsed_time),
        formatDateTime(entry.created_at),
        entry.entry_id
      ];
      
      return row.join(',');
    });

    // Combine headers and rows
    return [headers.join(','), ...csvRows].join('\n');
  }

  /**
   * Convert transactions to CSV format
   */
  static formatTransactionsToCSV(
    transactions: Transaction[],
    categories: UserExpenseCategory[] = [],
    accounts: UserAccount[] = []
  ): string {
    const headers = [
      'Date',
      'Type',
      'Title',
      'Description',
      'Category',
      'Account',
      'Amount',
      'Currency',
      'Created At',
      'Transaction ID',
    ];

    const escapeCSVValue = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const getCategoryName = (t: Transaction): string => {
      if (t.category_id) {
        const cat = categories.find(c => c.id === t.category_id);
        if (cat) return cat.name;
      }
      return t.category || '';
    };

    const getAccountName = (t: Transaction): string => {
      if (t.account_id) {
        const acc = accounts.find(a => a.id === t.account_id);
        if (acc) return acc.name;
      }
      return t.account || '';
    };

    const rows = transactions.map(t => {
      return [
        formatDate(t.transaction_date),
        t.type,
        escapeCSVValue(t.title),
        escapeCSVValue(t.description || ''),
        escapeCSVValue(getCategoryName(t)),
        escapeCSVValue(getAccountName(t)),
        // Keep amount as raw number string to preserve data fidelity
        String(t.amount),
        t.currency,
        formatDateTime(t.created_at),
        t.transaction_id,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Download transactions CSV directly without storage
   */
  static downloadTransactionsCSVDirect(
    transactions: Transaction[],
    categories: UserExpenseCategory[] = [],
    accounts: UserAccount[] = [],
    filename?: string
  ): void {
    try {
      const csvContent = this.formatTransactionsToCSV(transactions, categories, accounts);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `transactions-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Direct CSV download error (transactions):', error);
      throw error;
    }
  }

  /**
   * Export time entries as CSV file using Supabase storage
   */
  static async exportTimeEntriesToCSV(entries: TimeEntry[], categories: HobbyCategory[] = []): Promise<string> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to export data');
      }

      // Generate CSV content
      const csvContent = this.formatTimeEntriesToCSV(entries, categories);
      
      // Create a unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `time-entries-export-${timestamp}.csv`;
      const filePath = `exports/${user.id}/${filename}`;

      // Convert CSV content to Blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('user-exports')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload CSV file: ${uploadError.message}`);
      }

      // Get public URL for download
      const { data: urlData } = supabase.storage
        .from('user-exports')
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error('Failed to generate download URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('CSV export error:', error);
      throw error;
    }
  }

  /**
   * Download CSV file directly without using storage (alternative method)
   */
  static downloadCSVDirect(entries: TimeEntry[], categories: HobbyCategory[] = [], filename?: string): void {
    try {
      // Generate CSV content
      const csvContent = this.formatTimeEntriesToCSV(entries, categories);
      
      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `time-entries-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Direct CSV download error:', error);
      throw error;
    }
  }

  /**
   * Parse CSV content and return array of time entry data
   */
  static parseCSVContent(csvContent: string): ManualTimeEntryData[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = this.parseCSVRow(headerLine).map(h => h.trim());
    
    // Validate required headers (only core fields are required for import)
    // Format matches export: Name, Description, Category, Start Time (Unix timestamp), End Time (Unix timestamp), Duration (seconds), Duration (formatted), Created At, Entry ID
    const requiredHeaders = ['Name', 'Start Time', 'End Time'];
    const missingHeaders = requiredHeaders.filter(header => {
      if (header.toLowerCase() === 'start time') {
        return !headers.some(h => h.toLowerCase().includes('start time'));
      }
      if (header.toLowerCase() === 'end time') {
        return !headers.some(h => h.toLowerCase().includes('end time'));
      }
      return !headers.some(h => h.toLowerCase() === header.toLowerCase());
    });
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    // Find column indices (matching export format)
    const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
    const descriptionIndex = headers.findIndex(h => h.toLowerCase() === 'description');
    const categoryIndex = headers.findIndex(h => h.toLowerCase() === 'category');
    const startTimeIndex = headers.findIndex(h => h.toLowerCase().includes('start time'));
    const endTimeIndex = headers.findIndex(h => h.toLowerCase().includes('end time'));
    // Note: Duration and Entry ID columns are ignored during import as they're calculated/generated

    const timeEntries: ManualTimeEntryData[] = [];
    const errors: string[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      try {
        const values = this.parseCSVRow(line);
        
        const name = values[nameIndex]?.trim();
        const startTimeStr = values[startTimeIndex]?.trim();
        const endTimeStr = values[endTimeIndex]?.trim();

        if (!name || !startTimeStr || !endTimeStr) {
          errors.push(`Row ${i + 1}: Missing required fields (Name, Start Time, End Time)`);
          continue;
        }

        // Parse dates (handle both Unix timestamps and date strings)
        let startTime: Date;
        let endTime: Date;

        // Check if it's a Unix timestamp (numeric string)
        if (/^\d+$/.test(startTimeStr.trim())) {
          startTime = new Date(parseInt(startTimeStr));
        } else {
          startTime = new Date(startTimeStr);
        }

        if (/^\d+$/.test(endTimeStr.trim())) {
          endTime = new Date(parseInt(endTimeStr));
        } else {
          endTime = new Date(endTimeStr);
        }

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          errors.push(`Row ${i + 1}: Invalid date format (expected Unix timestamp or valid date string)`);
          continue;
        }

        if (endTime <= startTime) {
          errors.push(`Row ${i + 1}: End time must be after start time`);
          continue;
        }

        // Calculate elapsed time in seconds
        const elapsedTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        const timeEntry: ManualTimeEntryData = {
          name,
          description: descriptionIndex >= 0 ? values[descriptionIndex]?.trim() || undefined : undefined,
          categoryId: undefined, // Will be resolved during import
          startTime,
          endTime,
          elapsedTime,
        };

        // Store the category name for later processing during import
        if (categoryIndex >= 0 && values[categoryIndex]?.trim()) {
          (timeEntry as TimeEntryWithCategoryName)._categoryName = values[categoryIndex].trim();
        }

        timeEntries.push(timeEntry);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`CSV parsing errors:\n${errors.join('\n')}`);
    }

    return timeEntries;
  }

  /**
   * Parse a single CSV row, handling quoted values
   */
  private static parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < row.length) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);
    return result;
  }

  /**
   * Generate a random color for new categories
   */
  private static generateRandomColor(): string {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
      '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
      '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
      '#EC4899', '#F43F5E', '#EF4444', '#F87171', '#FB7185'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Import time entries from CSV content, avoiding duplicates
   */
  static async importTimeEntriesFromCSV(csvContent: string, existingEntries: TimeEntry[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    try {
      const parsedEntries = this.parseCSVContent(csvContent);
      
      // Get existing categories to check for missing ones
      const existingCategories = await CategoryService.getHobbyCategories();
      const categoryMap = new Map<string, string>(); // name -> id
      existingCategories.forEach(cat => categoryMap.set(cat.name, cat.id));
      
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const entry of parsedEntries) {
        try {
          // Check for duplicates based on name, start time, and end time
          const isDuplicate = existingEntries.some(existing => 
            existing.name === entry.name &&
            existing.start_time && 
            existing.end_time &&
            new Date(existing.start_time).getTime() === entry.startTime.getTime() &&
            new Date(existing.end_time).getTime() === entry.endTime.getTime()
          );

          if (isDuplicate) {
            skipped++;
            continue;
          }

          // Handle category - create if it doesn't exist
          const categoryName = (entry as TimeEntryWithCategoryName)._categoryName;
          if (categoryName && !categoryMap.has(categoryName)) {
            try {
              // Create new category with random color
              const newCategory = await CategoryService.createCategory({
                name: categoryName,
                color: this.generateRandomColor()
              });
              categoryMap.set(categoryName, newCategory.id);
            } catch (createError) {
              console.warn(`Failed to create category "${categoryName}":`, createError);
              // Continue without category if creation fails
            }
          }

          // Set the category ID if we have a category
          if (categoryName && categoryMap.has(categoryName)) {
            entry.categoryId = categoryMap.get(categoryName);
          }

          // Remove the temporary category name field
          delete (entry as TimeEntryWithCategoryName)._categoryName;

          await TimeEntryService.createManualEntry(entry);
          imported++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to import "${entry.name}": ${errorMsg}`);
        }
      }

      return { imported, skipped, errors };
    } catch (error) {
      throw new Error(`CSV import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read file content as text
   */
  static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  }
} 
