import { supabase } from '../lib/supabase';
import type { TimeEntry } from '../lib/supabase';

export class CSVExportService {
  /**
   * Convert time entries to CSV format
   */
  static formatTimeEntriesToCSV(entries: TimeEntry[]): string {
    // Define CSV headers
    const headers = [
      'Name',
      'Description',
      'Category',
      'Start Time',
      'End Time',
      'Duration (seconds)',
      'Duration (formatted)',
      'Created At',
      'Entry ID'
    ];

    // Helper function to format duration
    const formatDuration = (totalSeconds: number | null | undefined): string => {
      if (!totalSeconds) return '0s';
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
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
      const row = [
        escapeCSVValue(entry.name),
        escapeCSVValue(entry.description || ''),
        escapeCSVValue(entry.category || ''),
        entry.start_time ? new Date(entry.start_time).toLocaleString() : '',
        entry.end_time ? new Date(entry.end_time).toLocaleString() : '',
        entry.elapsed_time?.toString() || '0',
        formatDuration(entry.elapsed_time),
        new Date(entry.created_at).toLocaleString(),
        entry.entry_id
      ];
      
      return row.join(',');
    });

    // Combine headers and rows
    return [headers.join(','), ...csvRows].join('\n');
  }

  /**
   * Export time entries as CSV file using Supabase storage
   */
  static async exportTimeEntriesToCSV(entries: TimeEntry[]): Promise<string> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to export data');
      }

      // Generate CSV content
      const csvContent = this.formatTimeEntriesToCSV(entries);
      
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
  static downloadCSVDirect(entries: TimeEntry[], filename?: string): void {
    try {
      // Generate CSV content
      const csvContent = this.formatTimeEntriesToCSV(entries);
      
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
} 