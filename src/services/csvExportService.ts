import { supabase } from '../lib/supabase';
import type { TimeEntry, HobbyCategory, Transaction, UserExpenseCategory, UserAccount } from '../lib/supabase';
import { TimeEntryService, type ManualTimeEntryData } from './timeEntryService';
import { CategoryService } from './categoryService';
import * as XLSX from 'xlsx';
import { ExpenseCategoryService } from './expenseCategoryService';
import { UserAccountService } from './userAccountService';
import { TransactionService } from './transactionService';
import { formatDateTime, formatDate } from '../lib/dateUtils';

// Interface for temporary time entry data with category name
interface TimeEntryWithCategoryName extends ManualTimeEntryData {
  _categoryName?: string;
}

export class CSVExportService {
  /**
   * Remove emoji presentation characters, variation selectors and ZWJ from a string
   */
  private static stripEmoji(input: string): string {
    if (!input) return '';
    return input.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '');
  }

  /**
   * Normalize category names for comparison: strip emoji, collapse spaces, lowercase
   */
  private static normalizeCategoryKey(input: string): string {
    return this.stripEmoji(input).toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  }
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
   * Parse semicolon-delimited Excel-CSV (provided example format) into normalized rows
   * Header example:
   * Period;Accounts;Category;Subcategory;Note;CLP;Income/Expense;Description;Amount;Currency;Accounts
   * Rules:
   * - Ignore Subcategory
   * - Use Note as title/name
   * - Ignore last Accounts column (not the first one)
   * - Map Income/Expense: "Income" => income, anything else => expense
   * - Period format dd-mm-yyyy (with dashes); convert to ISO yyyy-mm-dd
   */
  static parseExcelCsvTransactions(content: string): Array<{
    date: string;
    type: 'income' | 'expense';
    title: string;
    description?: string;
    categoryName: string;
    accountName: string;
    amount: number;
    currency: string;
  }> {
    const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error('Excel CSV must include headers and at least one row');

    const header = lines[0].split(';').map(h => h.trim().toLowerCase());

    const idxPeriod = header.findIndex(h => h === 'period');
    const idxAccountsFirst = header.findIndex(h => h === 'accounts');
    const idxCategory = header.findIndex(h => h === 'category');
    const idxSubcategory = header.findIndex(h => h === 'subcategory');
    const idxNote = header.findIndex(h => h === 'note');
    const idxIncomeExpense = header.findIndex(h => h === 'income/expense');
    const idxDescription = header.findIndex(h => h === 'description');
    const idxAmount = header.findIndex(h => h === 'amount' || h === 'clp');
    const idxCurrency = header.findIndex(h => h === 'currency');
    const idxAccountsLast = header.lastIndexOf('accounts');

    const missing: string[] = [];
    if (idxPeriod < 0) missing.push('Period');
    if (idxAccountsFirst < 0) missing.push('Accounts');
    if (idxCategory < 0) missing.push('Category');
    if (idxNote < 0) missing.push('Note');
    if (idxIncomeExpense < 0) missing.push('Income/Expense');
    if (idxAmount < 0) missing.push('Amount/CLP');
    if (idxCurrency < 0) missing.push('Currency');
    if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);

    const normalizeDate = (dmyWithDashes: string): string => {
      // dd-mm-yyyy -> yyyy-mm-dd
      const parts = dmyWithDashes.split('-').map(p => p.trim());
      if (parts.length !== 3) throw new Error(`Invalid Period date: ${dmyWithDashes}`);
      const [dayStr, monthStr, yearStr] = parts;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      if (!year || month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`Invalid Period date: ${dmyWithDashes}`);
      return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    };

    const result: Array<{
      date: string;
      type: 'income' | 'expense';
      title: string;
      description?: string;
      categoryName: string;
      accountName: string;
      amount: number;
      currency: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';');
      // Guard: ensure we have at least as many columns as expected
      if (cols.length <= Math.max(idxPeriod, idxAccountsFirst, idxCategory, idxNote, idxIncomeExpense, idxAmount, idxCurrency)) {
        console.warn('Skipping malformed Excel CSV row (insufficient columns)', { rowIndex: i + 1, row: lines[i] });
        continue;
      }

      const period = cols[idxPeriod]?.trim();
      const accountFirst = cols[idxAccountsFirst]?.trim();
      const category = cols[idxCategory]?.trim();
      const note = cols[idxNote]?.trim();
      const incomeExpense = cols[idxIncomeExpense]?.trim().toLowerCase();
      const description = idxDescription >= 0 ? cols[idxDescription]?.trim() : '';
      const amountStr = cols[idxAmount]?.trim();
      const currency = cols[idxCurrency]?.trim() || 'CLP';
      const accountLast = idxAccountsLast >= 0 ? cols[idxAccountsLast]?.trim() : '';

      if (!period || !accountFirst || !category || !note || !amountStr) {
        console.warn('Skipping Excel CSV row with missing required fields', { rowIndex: i + 1, period, accountFirst, category, note, amountStr });
        continue;
      }

      // Ignore subcategory and the last accounts column explicitly
      void idxSubcategory;
      void accountLast;

      // Normalize
      let type: 'income' | 'expense' = 'expense';
      if (incomeExpense === 'income') type = 'income';

      const amount = Number((amountStr || '').replace(/\./g, '').replace(/,/g, ''));
      if (!isFinite(amount)) {
        console.warn('Skipping Excel CSV row with invalid amount', { rowIndex: i + 1, amountStr });
        continue;
      }

      let isoDate: string;
      try {
        isoDate = normalizeDate(period);
      } catch (e) {
        console.warn('Skipping Excel CSV row with invalid Period date', { rowIndex: i + 1, period, error: e });
        continue;
      }

      result.push({
        date: isoDate,
        type,
        title: note,
        description,
        categoryName: this.stripEmoji((category || '').toString()).replace(/\s+/g, ' ').trim() || (category || '').toString(),
        accountName: accountFirst,
        amount,
        currency,
      });
    }

    return result;
  }

  /**
   * Import transactions from XLSX file content (binary ArrayBuffer)
   */
  static async importTransactionsFromXlsxFile(file: File, existingTransactions: Transaction[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error('No sheet found in XLSX file');

    // Read as array-of-arrays to avoid header collisions
    const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as unknown as string[][];
    if (!aoa || aoa.length < 2) return { imported: 0, skipped: 0, errors: [] };

    const headerRow = (aoa[0] || []).map(h => (h || '').toString().trim().toLowerCase());
    const findIndex = (name: string) => headerRow.findIndex(h => h === name);
    const idxPeriod = findIndex('period');
    const idxAccountsFirst = headerRow.findIndex(h => h === 'accounts');
    const idxCategory = findIndex('category');
    const idxSubcategory = findIndex('subcategory');
    const idxNote = findIndex('note');
    const idxIncomeExpense = findIndex('income/expense');
    const idxDescription = findIndex('description');
    const idxAmount = findIndex('amount') >= 0 ? findIndex('amount') : findIndex('clp');
    const idxCurrency = findIndex('currency');
    const idxAccountsLast = headerRow.lastIndexOf('accounts');

    const missing: string[] = [];
    if (idxPeriod < 0) missing.push('Period');
    if (idxAccountsFirst < 0) missing.push('Accounts');
    if (idxCategory < 0) missing.push('Category');
    if (idxNote < 0) missing.push('Note');
    if (idxIncomeExpense < 0) missing.push('Income/Expense');
    if (idxAmount < 0) missing.push('Amount/CLP');
    if (idxCurrency < 0) missing.push('Currency');
    if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);

    const excelSerialToIso = (val: unknown): string => {
      if (val instanceof Date) {
        const yyyy = String(val.getFullYear()).padStart(4, '0');
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      if (typeof val === 'number') {
        // Convert Excel serial date to JS date; epoch 1899-12-30
        const jsTime = Math.round((val - 25569) * 86400 * 1000);
        const d = new Date(jsTime);
        const yyyy = String(d.getFullYear()).padStart(4, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      // Expect dd-mm-yyyy
      const s = (val || '').toString().trim();
      const parts = s.split('-');
      if (parts.length !== 3) throw new Error('Invalid date');
      const [dd, mm, yyyy] = parts;
      return `${yyyy.padStart(4,'0')}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    };

    const normalizedRows: Array<{
      date: string; type: 'income' | 'expense'; title: string; description?: string;
      categoryName: string; accountName: string; amount: number; currency: string;
    }> = [];
    const skippedLogs: string[] = [];

    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const period = row[idxPeriod] ?? '';
      const accountFirst = row[idxAccountsFirst] ?? '';
      const category = row[idxCategory] ?? '';
      const note = row[idxNote] ?? '';
      const incomeExpense = (row[idxIncomeExpense] ?? '').toString().toLowerCase();
      const description = idxDescription >= 0 ? (row[idxDescription] ?? '').toString() : '';
      const amountCell = row[idxAmount] ?? '';
      const currency = (row[idxCurrency] ?? 'CLP').toString();
      const accountLast = idxAccountsLast >= 0 ? row[idxAccountsLast] : '';

      void idxSubcategory; // ignored
      void accountLast; // ignored

      try {
        const isoDate = excelSerialToIso(period);
        const type = incomeExpense === 'income' ? 'income' : 'expense';
        const title = (note || '').toString().trim();
        const categoryName = (category || '').toString().replace(/^\p{Emoji}+/u, '').trim() || (category || '').toString();
        const accountName = (accountFirst || '').toString().trim();
        const amount = typeof amountCell === 'number' ? amountCell : Number((amountCell as string).replace(/\./g, '').replace(/,/g, ''));

        if (!isoDate || !title || !categoryName || !accountName || !isFinite(amount)) {
          skippedLogs.push(`Row ${r + 1}: Missing or invalid fields`);
          continue;
        }

        normalizedRows.push({ date: isoDate, type, title, description, categoryName, accountName, amount, currency });
      } catch (e) {
        skippedLogs.push(`Row ${r + 1}: ${(e as Error).message}`);
      }
    }

    if (normalizedRows.length === 0) {
      return { imported: 0, skipped: skippedLogs.length, errors: skippedLogs };
    }

    // Route through existing CSV importer by generating a temporary CSV string
    const mockCsv = ['Date,Type,Title,Description,Category,Account,Amount,Currency']
      .concat(
        normalizedRows.map(r => [
          r.date.split('-').reverse().join('/'),
          r.type,
          r.title,
          r.description || '',
          r.categoryName,
          r.accountName,
          String(r.amount),
          r.currency,
        ].join(','))
      )
      .join('\n');

    const res = await this.importTransactionsFromCSV(mockCsv, existingTransactions);
    if (skippedLogs.length > 0) res.errors.push(...skippedLogs);
    return res;
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
        escapeCSVValue(formatDate(t.transaction_date)),
        escapeCSVValue(t.type),
        escapeCSVValue(t.title),
        escapeCSVValue(t.description || ''),
        escapeCSVValue(getCategoryName(t)),
        escapeCSVValue(getAccountName(t)),
        // Keep amount as raw number string to preserve data fidelity
        escapeCSVValue(String(t.amount)),
        escapeCSVValue(t.currency),
        // Created At contains a comma due to 24h time formatting, so ensure it is escaped
        escapeCSVValue(formatDateTime(t.created_at)),
        escapeCSVValue(t.transaction_id),
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
   * Parse CSV content for transactions and return an array of normalized transaction data
   * Expected headers (case-insensitive):
   * Date (dd/mm/yyyy), Type, Title, Description, Category, Account, Amount, Currency
   */
  static parseTransactionsCSVContent(csvContent: string): Array<{
    date: string; // YYYY-MM-DD
    type: 'income' | 'expense';
    title: string;
    description?: string;
    categoryName: string;
    accountName: string;
    amount: number;
    currency: string;
    transactionId?: string;
  }> {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headerLine = lines[0];
    const headers = this.parseCSVRow(headerLine).map(h => h.trim().toLowerCase());

    const idx = {
      // Use strict equality for 'date' to avoid matching 'created at'
      date: headers.findIndex(h => h === 'date'),
      type: headers.findIndex(h => h === 'type'),
      title: headers.findIndex(h => h === 'title'),
      description: headers.findIndex(h => h === 'description'),
      category: headers.findIndex(h => h === 'category'),
      account: headers.findIndex(h => h === 'account'),
      amount: headers.findIndex(h => h === 'amount'),
      currency: headers.findIndex(h => h === 'currency'),
      transactionId: headers.findIndex(h => h.includes('transaction id') || h === 'transaction id'),
    };
    const idxCreatedAt = headers.findIndex(h => h === 'created at');

    const missing: string[] = [];
    if (idx.date < 0) missing.push('Date');
    if (idx.type < 0) missing.push('Type');
    if (idx.title < 0) missing.push('Title');
    if (idx.category < 0) missing.push('Category');
    if (idx.account < 0) missing.push('Account');
    if (idx.amount < 0) missing.push('Amount');
    // currency is optional; default to CLP if missing

    if (missing.length > 0) {
      throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }

    const toISODate = (ddmmyyyy: string): string => {
      const parts = ddmmyyyy.split('/').map(p => p.trim());
      if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${ddmmyyyy} (expected dd/mm/yyyy)`);
      }
      const [dayStr, monthStr, yearStr] = parts;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
        throw new Error(`Invalid date: ${ddmmyyyy}`);
      }
      const yyyy = String(year).padStart(4, '0');
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const results: Array<{
      date: string;
      type: 'income' | 'expense';
      title: string;
      description?: string;
      categoryName: string;
      accountName: string;
      amount: number;
      currency: string;
      transactionId?: string;
    }> = [];

    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const rawValues = this.parseCSVRow(line);

        // Handle unescaped comma in Created At (e.g., "dd/mm/yyyy, hh:mm") by merging adjacent cells
        let values = rawValues;
        if (
          idxCreatedAt >= 0 &&
          values.length === headers.length + 1 &&
          /\d{2}\/\d{2}\/\d{4}/.test(values[idxCreatedAt] || '') &&
          /\d{1,2}:\d{2}/.test(values[idxCreatedAt + 1] || '')
        ) {
          const merged = values.slice();
          merged[idxCreatedAt] = `${(values[idxCreatedAt] || '').trim()}, ${(values[idxCreatedAt + 1] || '').trim()}`;
          merged.splice(idxCreatedAt + 1, 1);
          values = merged;
          console.debug('Merged split Created At columns in CSV row to realign fields', { rowIndex: i + 1, createdAt: merged[idxCreatedAt] });
        }

        const dateStr = values[idx.date]?.trim();
        const typeStr = values[idx.type]?.trim().toLowerCase();
        const title = values[idx.title]?.trim();
        const description = idx.description >= 0 ? values[idx.description]?.trim() : '';
        const categoryName = values[idx.category]?.trim();
        const accountName = values[idx.account]?.trim();
        const amountStr = values[idx.amount]?.trim();
        const currency = idx.currency >= 0 ? (values[idx.currency]?.trim() || 'CLP') : 'CLP';
        const transactionId = idx.transactionId >= 0 ? values[idx.transactionId]?.trim() : undefined;

        if (!dateStr || !typeStr || !title || !categoryName || !accountName || !amountStr) {
          throw new Error('Missing required fields');
        }
        if (typeStr !== 'income' && typeStr !== 'expense') {
          throw new Error(`Invalid type: ${typeStr}`);
        }

        const amount = Number(amountStr.replace(/,/g, ''));
        if (!isFinite(amount)) {
          throw new Error(`Invalid amount: ${amountStr}`);
        }

        const isoDate = toISODate(dateStr);

        results.push({
          date: isoDate,
          type: typeStr as 'income' | 'expense',
          title,
          description,
          categoryName,
          accountName,
          amount,
          currency,
          transactionId,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        errors.push(`Row ${i + 1}: ${msg}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`CSV parsing errors:\n${errors.join('\n')}`);
    }

    return results;
  }

  /**
   * Import transactions from CSV content
   */
  static async importTransactionsFromCSV(csvContent: string, existingTransactions: Transaction[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    // Parse rows
    const rows = this.parseTransactionsCSVContent(csvContent);

    // Load existing categories/accounts
    const [existingCategories, existingAccounts] = await Promise.all([
      ExpenseCategoryService.getUserExpenseCategories(),
      UserAccountService.getUserAccounts(),
    ]);

    const categoryNameToId = new Map<string, string>();
    existingCategories.forEach(c => categoryNameToId.set(this.normalizeCategoryKey(c.name), c.id));

    const accountNameToId = new Map<string, string>();
    existingAccounts.forEach(a => accountNameToId.set(a.name, a.id));

    // Prepare duplicate detection (existing + within-file)
    const existingIds = new Set<string>();
    const existingComposite = new Set<string>();
    for (const t of existingTransactions) {
      if (t.transaction_id) existingIds.add(t.transaction_id);
      const comp = `${t.title}|${t.type}|${t.transaction_date}|${Number(t.amount)}|${t.currency}`;
      existingComposite.add(comp);
    }

    const seenIds = new Set<string>();
    const seenComposite = new Set<string>();

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        // Build duplicate keys
        const rawId = row.transactionId?.trim();
        // Accept only IDs that match our generation pattern: txn_<timestamp>_<random>
        const rowId = rawId && /^txn_\d+_[a-z0-9]+$/i.test(rawId) ? rawId : undefined;
        if (rawId && !rowId) {
          console.info('Ignoring invalid transactionId format in CSV row; will use composite dedupe instead', { rawId, title: row.title, date: row.date });
        }
        const rowComposite = `${row.title}|${row.type}|${row.date}|${Number(row.amount)}|${row.currency}`;
        const rowCompositeWithin = `${rowComposite}|${row.categoryName}|${row.accountName}`;

        // Skip duplicates (in DB or in current file)
        if (rowId && existingIds.has(rowId)) {
          console.info('Skipping duplicate by existing transactionId', { transactionId: rowId, title: row.title, date: row.date });
          skipped++;
          continue;
        }
        if (existingComposite.has(rowComposite)) {
          console.info('Skipping duplicate by existing composite', { key: rowComposite, title: row.title, date: row.date });
          skipped++;
          continue;
        }
        if (rowId && seenIds.has(rowId)) {
          console.info('Skipping duplicate within file by transactionId', { transactionId: rowId, title: row.title, date: row.date });
          skipped++;
          continue;
        }
        if (seenComposite.has(rowCompositeWithin)) {
          console.info('Skipping duplicate within file by composite', { key: rowCompositeWithin, title: row.title, date: row.date });
          skipped++;
          continue;
        }

        // Mark as seen to prevent duplicates within same import
        if (rowId) seenIds.add(rowId);
        seenComposite.add(rowCompositeWithin);

        // Ensure category exists
        const rowCategoryKey = this.normalizeCategoryKey(row.categoryName);
        let categoryId = categoryNameToId.get(rowCategoryKey);
        if (!categoryId) {
          try {
            const newCategoryName = this.stripEmoji(row.categoryName).replace(/\s+/g, ' ').trim();
            const created = await ExpenseCategoryService.createUserExpenseCategory({
              name: newCategoryName,
              emoji: '🧾',
              color: this.generateRandomColor(),
            });
            categoryId = created.id;
            categoryNameToId.set(this.normalizeCategoryKey(created.name), created.id);
          } catch (createErr) {
            console.warn(`Failed to create expense category "${row.categoryName}":`, createErr);
          }
        }

        // Ensure account exists
        let accountId = accountNameToId.get(row.accountName);
        if (!accountId) {
          try {
            const created = await UserAccountService.createAccount({
              name: row.accountName,
              type: 'other',
              color: '#6B7280',
              description: '',
            });
            accountId = created.id;
            accountNameToId.set(created.name, created.id);
          } catch (createErr) {
            console.warn(`Failed to create account "${row.accountName}":`, createErr);
          }
        }

        if (!categoryId || !accountId) {
          throw new Error(`Missing category or account for "${row.title}"`);
        }

        await TransactionService.createTransaction({
          type: row.type,
          amount: row.amount,
          currency: row.currency,
          categoryId,
          accountId,
          title: row.title,
          description: row.description || undefined,
          transactionDate: row.date,
        });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to import row', { title: row.title, date: row.date, reason: msg, row });
        errors.push(`Failed to import "${row.title}" (${row.date}): ${msg}`);
      }
    }

    return { imported, skipped, errors };
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