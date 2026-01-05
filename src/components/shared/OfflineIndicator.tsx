import { useEffect, useCallback, useState } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { offlineQueue } from '../../services/offlineQueueService';
import { TransactionService } from '../../services/transactionService';
import { TimeEntryService } from '../../services/timeEntryService';
import type { CreateTransactionData } from '../../services/transactionService';
import type { ManualTimeEntryData } from '../../services/timeEntryService';

/**
 * Displays offline status and pending operations count.
 * Automatically processes queued operations when coming back online.
 */
export function OfflineIndicator() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const processQueue = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const operations = await offlineQueue.getPendingOperations();

      for (const operation of operations) {
        try {
          if (operation.type === 'transaction') {
            if (operation.action === 'create') {
              await TransactionService.createTransaction(
                operation.data as unknown as CreateTransactionData
              );
            }
            // Add update/delete handling as needed
          } else if (operation.type === 'timeEntry') {
            if (operation.action === 'create') {
              await TimeEntryService.createManualEntry(
                operation.data as unknown as ManualTimeEntryData
              );
            }
            // Add update/delete handling as needed
          }

          await offlineQueue.removeFromQueue(operation.id);
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          const shouldRetry = await offlineQueue.incrementRetry(operation.id);
          if (!shouldRetry) {
            console.warn(`Operation ${operation.id} exceeded max retries, removed from queue`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process queue:', error);
      setSyncError('Failed to sync some items');
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, []);

  const { isOnline, pendingCount, refreshPendingCount } = useNetworkStatus(processQueue);

  // Refresh count when syncing completes
  useEffect(() => {
    if (!isSyncing) {
      refreshPendingCount();
    }
  }, [isSyncing, refreshPendingCount]);

  // Don't show anything if online with no pending items and no errors
  if (isOnline && pendingCount === 0 && !syncError && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
      <div
        className={`rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 ${
          isOnline
            ? isSyncing
              ? 'bg-blue-600 text-white'
              : syncError
                ? 'bg-red-600 text-white'
                : 'bg-green-600 text-white'
            : 'bg-amber-600 text-white'
        }`}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {!isOnline && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          )}
          {isOnline && isSyncing && (
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          {isOnline && !isSyncing && syncError && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
          {isOnline && !isSyncing && !syncError && pendingCount > 0 && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {!isOnline && 'You are offline'}
            {isOnline && isSyncing && 'Syncing...'}
            {isOnline && !isSyncing && syncError && syncError}
            {isOnline && !isSyncing && !syncError && pendingCount > 0 && 'Synced successfully'}
          </p>
          {pendingCount > 0 && !isSyncing && (
            <p className="text-xs opacity-90">
              {pendingCount} pending {pendingCount === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>

        {/* Retry Button (on error) */}
        {syncError && (
          <button
            onClick={processQueue}
            className="flex-shrink-0 px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
