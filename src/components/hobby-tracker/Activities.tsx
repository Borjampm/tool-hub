import { useEffect, useState } from 'react';
import { TimeEntryService, type ManualTimeEntryData, type UpdateTimeEntryData } from '../../services/timeEntryService';
import { CategoryService } from '../../services/categoryService';
import { CSVExportService } from '../../services/csvExportService';
import { ActivityModal, type ActivityFormData } from './ActivityModal';
import type { TimeEntry, HobbyCategory } from '../../lib/supabase';
import { formatDate, formatDateTimeRounded, formatTimeRangeRounded, formatDuration } from '../../lib/dateUtils';

// New component for the file upload modal
function FileUploadModal({ 
  isOpen, 
  onClose, 
  onFileUpload 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onFileUpload: (file: File) => Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }>; 
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileSelect(csvFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setUploadResult(null);
    
    try {
      const result = await onFileUpload(file);
      setUploadResult(result);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadResult({
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed']
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setUploadResult(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload Data</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
                 {uploadResult ? (
           <div className="space-y-4">
             <div className="text-center">
               <div className="text-3xl mb-3">
                 {uploadResult.errors.length === 0 && uploadResult.imported > 0 ? '🎉' : 
                  uploadResult.imported > 0 ? '⚠️' : '❌'}
               </div>
               <h4 className="text-lg font-medium text-gray-900">
                 {uploadResult.imported > 0 ? 'Upload Successful!' : 'Upload Complete'}
               </h4>
               {uploadResult.imported > 0 && (
                 <p className="text-sm text-gray-600 mt-1">
                   Your activities list has been updated
                 </p>
               )}
             </div>
             
             <div className="bg-gray-50 rounded-lg p-4 space-y-3">
               {uploadResult.imported > 0 && (
                 <div className="flex justify-between items-center">
                   <span className="text-gray-600">✅ Successfully imported:</span>
                   <span className="font-bold text-green-600 text-lg">{uploadResult.imported}</span>
                 </div>
               )}
               {uploadResult.skipped > 0 && (
                 <div className="flex justify-between items-center">
                   <span className="text-gray-600">⏭️ Skipped (duplicates):</span>
                   <span className="font-medium text-yellow-600">{uploadResult.skipped}</span>
                 </div>
               )}
               {uploadResult.errors.length > 0 && (
                 <div className="mt-3">
                   <p className="text-red-600 font-medium flex items-center">
                     ❌ Errors ({uploadResult.errors.length}):
                   </p>
                   <div className="max-h-32 overflow-y-auto text-sm text-red-600 mt-2 bg-red-50 rounded p-2">
                     {uploadResult.errors.map((error, index) => (
                       <div key={index} className="mt-1">• {error}</div>
                     ))}
                   </div>
                 </div>
               )}
               
               {uploadResult.imported === 0 && uploadResult.skipped === 0 && uploadResult.errors.length === 0 && (
                 <div className="text-center text-gray-600">
                   No data to import from the file
                 </div>
               )}
             </div>
           </div>
        ) : (
          <>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
              />
              
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600">Processing file...</p>
                </div>
              ) : (
                <>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Drag file here</h4>
                  <p className="text-gray-500 mb-4">Or click to browse files</p>
                  <label
                    htmlFor="file-upload"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    Choose File
                  </label>
                  <p className="text-sm text-gray-400 mt-2">CSV files only</p>
                </>
              )}
            </div>
          </>
        )}
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-2 transition-colors ${
              uploadResult 
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 focus:ring-gray-500'
            }`}
          >
            {uploadResult ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// New component for the manage data dropdown
function ManageDataDropdown({ 
  entries, 
  isExporting, 
  onExportCSV, 
  onUploadData 
}: { 
  entries: TimeEntry[]; 
  isExporting: boolean; 
  onExportCSV: () => void; 
  onUploadData: () => void; 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium flex items-center space-x-1 sm:space-x-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H8c-2.21 0-4-1.79-4-4V7" />
        </svg>
        <span className="hidden sm:inline">Manage Data</span>
        <span className="sm:hidden">Manage</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="py-1">
            <button
              onClick={() => {
                onExportCSV();
                setIsOpen(false);
              }}
              disabled={isExporting || entries.length === 0}
              className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full mr-3"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download CSV</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                onUploadData();
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Activities() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [categories, setCategories] = useState<HobbyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>();
  const [modalLoading, setModalLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0=this week, 1=last week, etc.

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [entriesData, categoriesData] = await Promise.all([
        TimeEntryService.getAllEntries(),
        CategoryService.getHobbyCategories()
      ]);
      setEntries(entriesData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load entries:', err);
      setError('Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (totalSeconds: number): string => {
    return formatDuration(totalSeconds);
  };

  const formatStartTime = (dateString: string): string => {
    return formatDateTimeRounded(dateString);
  };



  const handleCreateActivity = () => {
    setModalMode('create');
    setEditingEntry(undefined);
    setIsModalOpen(true);
  };

  const handleEditActivity = (entry: TimeEntry) => {
    setModalMode('edit');
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteActivity = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(entryId);
      await TimeEntryService.deleteEntry(entryId);
      setEntries(entries.filter(entry => entry.entry_id !== entryId));
    } catch (err) {
      console.error('Failed to delete activity:', err);
      setError('Failed to delete activity');
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalSubmit = async (data: ActivityFormData) => {
    try {
      setModalLoading(true);
      setError(null);

      const startTime = new Date(data.startTime);
      const endTime = new Date(startTime.getTime() + data.duration * 60 * 1000); // Add duration in milliseconds
      
      if (data.duration <= 0) {
        throw new Error('Duration must be greater than 0');
      }

      const elapsedTime = data.duration * 60; // Convert duration to seconds

      if (modalMode === 'create') {
        // Find the category ID if a category was selected
        let categoryId: string | undefined;
        if (data.category) {
          const categories = await CategoryService.getHobbyCategories();
          const selectedCategory = categories.find(cat => cat.name === data.category);
          categoryId = selectedCategory?.id;
        }

        const manualEntryData: ManualTimeEntryData = {
          name: data.name,
          description: data.description,
          categoryId: categoryId,
          startTime,
          endTime,
          elapsedTime,
        };
        
        const { entry, isPending } = await TimeEntryService.createManualEntryOfflineAware(manualEntryData);
        if (entry && !isPending) {
          setEntries([entry, ...entries]);
        }
        // When isPending, entry will appear after sync and page refresh
      } else if (modalMode === 'edit' && editingEntry) {
        // Find the category ID if a category was selected
        let categoryId: string | undefined;
        if (data.category) {
          const categories = await CategoryService.getHobbyCategories();
          const selectedCategory = categories.find(cat => cat.name === data.category);
          categoryId = selectedCategory?.id;
        }

        const updateData: UpdateTimeEntryData = {
          name: data.name,
          description: data.description,
          categoryId: categoryId,
          startTime,
          endTime,
          elapsedTime,
        };
        
        const updatedEntry = await TimeEntryService.updateEntry(editingEntry.entry_id, updateData);
        setEntries(entries.map(entry => 
          entry.entry_id === editingEntry.entry_id ? updatedEntry : entry
        ));
      }

      setIsModalOpen(false);
      setEditingEntry(undefined);
    } catch (err) {
      console.error('Failed to save activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to save activity');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEntry(undefined);
    setModalLoading(false);
  };

  const generateSampleActivities = async () => {
    // Define a small set of sample categories with colors
    const sampleCategories: { name: string; color: string }[] = [
      { name: 'Work', color: '#2563EB' },
      { name: 'Exercise', color: '#10B981' },
      { name: 'Learning', color: '#F59E0B' },
      { name: 'Personal', color: '#8B5CF6' },
      { name: 'Errands', color: '#EF4444' },
    ];

    // Sample activities mapped to a category name
    const sampleActivities: { name: string; description: string; category: string }[] = [
      { name: 'Daily standup meeting', description: 'Team sync and planning for the day', category: 'Work' },
      { name: 'Code review session', description: 'Reviewing pull requests from team members', category: 'Work' },
      { name: 'Learning React hooks', description: 'Deep dive into useEffect and custom hooks', category: 'Learning' },
      { name: 'Morning jog', description: 'Cardio workout around the neighborhood', category: 'Exercise' },
      { name: 'Lunch break', description: 'Enjoyed a nice sandwich and caught up with colleagues', category: 'Personal' },
      { name: 'Bug fixing', description: 'Fixed critical login issue reported by users', category: 'Work' },
      { name: 'Reading technical articles', description: 'Staying up to date with latest React trends', category: 'Learning' },
      { name: 'Grocery shopping', description: 'Weekly grocery run to stock up on essentials', category: 'Errands' },
      { name: 'Yoga session', description: 'Relaxing yoga practice to unwind', category: 'Exercise' },
      { name: 'Project planning', description: 'Planning next sprint and prioritizing features', category: 'Work' },
    ];

    try {
      setError(null);

      // Ensure the sample categories exist for the current user
      const existingCategories = await CategoryService.getHobbyCategories();
      const nameToCategory = new Map<string, HobbyCategory>();
      existingCategories.forEach((c) => nameToCategory.set(c.name.trim(), c));

      const createdCategories: HobbyCategory[] = [];
      for (const cat of sampleCategories) {
        if (!nameToCategory.has(cat.name)) {
          try {
            const created = await CategoryService.createCategory({ name: cat.name, color: cat.color });
            nameToCategory.set(created.name.trim(), created);
            createdCategories.push(created);
          } catch (createErr) {
            // If creation fails, continue without blocking the rest
            console.warn(`Failed to create sample category "${cat.name}":`, createErr);
          }
        }
      }

      // Refresh local categories state if we created any new ones
      if (createdCategories.length > 0) {
        setCategories([...existingCategories, ...createdCategories]);
      }

      const now = new Date();
      const promises = sampleActivities.map(async (activity) => {
        // Generate random duration between 15 minutes and 8 hours
        const durationMinutes = Math.floor(Math.random() * (8 * 60 - 15)) + 15;

        // Generate random start time within the last 14 days
        const daysBack = Math.floor(Math.random() * 14);
        const hoursBack = Math.floor(Math.random() * 24);
        const minutesBack = Math.floor(Math.random() * 60);

        const startTime = new Date(now);
        startTime.setDate(startTime.getDate() - daysBack);
        startTime.setHours(startTime.getHours() - hoursBack);
        startTime.setMinutes(startTime.getMinutes() - minutesBack);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);

        // Resolve category ID for this activity (if available)
        const matchedCategory = nameToCategory.get(activity.category);
        const categoryId = matchedCategory ? matchedCategory.id : undefined;

        const manualEntryData: ManualTimeEntryData = {
          name: activity.name,
          description: activity.description,
          categoryId,
          startTime,
          endTime,
          elapsedTime: durationMinutes * 60, // Convert to seconds
        };

        return TimeEntryService.createManualEntry(manualEntryData);
      });

      const newEntries = await Promise.all(promises);
      setEntries([
        ...newEntries.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        ...entries,
      ]);
    } catch (err) {
      console.error('Failed to create sample activities:', err);
      setError('Failed to create sample activities');
    }
  };

  const handleExportCSV = async () => {
    if (entries.length === 0) {
      setError('No activities to export');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);
      
      // Use direct download method to avoid needing storage bucket setup
      CSVExportService.downloadCSVDirect(entries, categories);
      
      console.log('✅ CSV export completed successfully');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setError('Failed to export activities as CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadData = () => {
    setIsUploadModalOpen(true);
  };

  const handleUploadModalClose = () => {
    setIsUploadModalOpen(false);
  };

  const handleFileUpload = async (file: File): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> => {
    try {
      setError(null);
      
      // Validate file type
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        throw new Error('Please select a CSV file');
      }

      // Read file content
      const csvContent = await CSVExportService.readFileAsText(file);
      
      // Import the data
      const result = await CSVExportService.importTimeEntriesFromCSV(csvContent, entries);
      
      // Refresh the entries list silently without showing loading state
      if (result.imported > 0) {
        try {
          const data = await TimeEntryService.getAllEntries();
          setEntries(data);
        } catch (refreshError) {
          console.error('Failed to refresh entries after import:', refreshError);
          // Don't throw here - the import was successful, just refresh failed
        }
      }
      
      return result;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  };

  // Weekly pagination helpers (mirroring Dashboard weekly logic)
  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7; // Mon=0, Sun=6
    d.setDate(d.getDate() - diffToMonday);
    return d;
  };

  const now = new Date();
  const thisWeekStart = getStartOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const getWeekStartFromOffset = (offset: number): Date => {
    const d = new Date(thisWeekStart);
    d.setDate(thisWeekStart.getDate() - offset * 7);
    return d;
  };

  const activeWeekStart = getWeekStartFromOffset(weekOffset);
  const activeWeekEnd = new Date(activeWeekStart);
  activeWeekEnd.setDate(activeWeekStart.getDate() + 7);

  const toEntryDate = (e: TimeEntry) => (e.start_time ? new Date(e.start_time) : new Date(e.created_at));
  const activeWeekEntries = entries
    .filter((e) => {
      const d = toEntryDate(e);
      return d >= activeWeekStart && d < activeWeekEnd;
    })
    .sort((a, b) => toEntryDate(b).getTime() - toEntryDate(a).getTime());

  const activeWeekTotalSeconds = activeWeekEntries.reduce((sum, e) => sum + (e.elapsed_time || 0), 0);

  const activeLabel =
    activeWeekStart.getTime() === thisWeekStart.getTime()
      ? 'This Week'
      : activeWeekStart.getTime() === lastWeekStart.getTime()
      ? 'Last Week'
      : `Week of ${formatDate(activeWeekStart.toISOString().slice(0, 10))}`;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Activities</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage all your hobby tracking entries</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <ManageDataDropdown
              entries={entries}
              isExporting={isExporting}
              onExportCSV={handleExportCSV}
              onUploadData={handleUploadData}
            />
            {import.meta.env.DEV && (
              <button
                onClick={generateSampleActivities}
                className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-medium text-sm order-2 sm:order-none"
                title="Development only: Generate sample data"
              >
                <span className="sm:hidden">Sample Data</span>
                <span className="hidden sm:inline">Generate Sample Data</span>
              </button>
            )}
            <button
              onClick={handleCreateActivity}
              className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium order-1 sm:order-none"
            >
              <span className="sm:hidden">+ Activity</span>
              <span className="hidden sm:inline">Create Activity</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm sm:text-base text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {entries.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-6xl mb-4">📝</div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                No Activities Yet
              </h2>
              <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto mb-6">
                Create your first activity manually or start using the timer to track your time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {import.meta.env.DEV && (
                  <button
                    onClick={generateSampleActivities}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-medium text-sm"
                  >
                    Generate Sample Data
                  </button>
                )}
                <button
                  onClick={handleCreateActivity}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
                >
                  Create Activity
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-2 rounded hover:bg-gray-100 touch-manipulation min-h-[44px] min-w-[44px]"
                aria-label="Previous week"
                title="Previous week"
              >
                &lt;
              </button>
              <div className="flex-1 flex flex-col items-center">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">{activeLabel}</h2>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  {formatDate(activeWeekStart.toISOString().slice(0, 10))} - {formatDate(new Date(activeWeekEnd.getTime() - 1).toISOString().slice(0, 10))}
                </div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium mt-1">
                  Total: {formatTime(activeWeekTotalSeconds)}
                </div>
              </div>
              <button
                onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                className="p-2 rounded hover:bg-gray-100 touch-manipulation min-h-[44px] min-w-[44px]"
                aria-label="Next week"
                title="Next week"
                disabled={weekOffset === 0}
              >
                &gt;
              </button>
            </div>

            <div className="divide-y divide-gray-200">
              {activeWeekEntries.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No activities</div>
              ) : (
                activeWeekEntries.map((entry) => (
                  <div key={entry.id} className="p-4 sm:p-6 hover:bg-gray-50">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                          {entry.name}
                        </h3>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {entry.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                          {(() => {
                            let categoryName = null as string | null;
                            let categoryColor = '#6B7280';
                            if (entry.category_id) {
                              const categoryInfo = categories.find(cat => cat.id === entry.category_id);
                              if (categoryInfo) {
                                categoryName = categoryInfo.name;
                                categoryColor = categoryInfo.color || '#6B7280';
                              }
                            } else if (entry.category) {
                              categoryName = entry.category;
                              const categoryInfo = categories.find(cat => cat.name === entry.category);
                              if (categoryInfo) {
                                categoryColor = categoryInfo.color || '#6B7280';
                              }
                            }
                            return categoryName ? (
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: categoryColor }}
                              >
                                {categoryName}
                              </span>
                            ) : null;
                          })()}
                          <span className="text-xs sm:text-sm text-gray-500">
                            {entry.start_time ? formatStartTime(entry.start_time) : formatStartTime(entry.created_at)}
                          </span>
                          {entry.end_time && entry.start_time && (
                            <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                              {formatTimeRangeRounded(entry.start_time, entry.end_time)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end lg:space-x-4">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-semibold text-gray-900">
                            {entry.elapsed_time ? formatTime(entry.elapsed_time) : 'In progress...'}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4 lg:ml-0">
                          <button
                            onClick={() => handleEditActivity(entry)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                            title="Edit activity"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(entry.entry_id)}
                            disabled={deletingId === entry.entry_id}
                            className="text-red-600 hover:text-red-800 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 touch-manipulation"
                            title="Delete activity"
                          >
                            {deletingId === entry.entry_id ? (
                              <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <ActivityModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
          isLoading={modalLoading}
          existingEntry={editingEntry}
          mode={modalMode}
        />

        <FileUploadModal
          isOpen={isUploadModalOpen}
          onClose={handleUploadModalClose}
          onFileUpload={handleFileUpload}
        />
      </div>
    </div>
  );
} 