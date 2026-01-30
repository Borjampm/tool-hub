import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../services/offlineQueueService';
import type { QueuedOperation } from '../services/offlineQueueService';

interface NetworkStatus {
  isOnline: boolean;
  pendingCount: number;
  pendingOperations: QueuedOperation[];
}

interface UseNetworkStatusReturn extends NetworkStatus {
  refreshPendingCount: () => Promise<void>;
}

/**
 * Hook to monitor network status and pending offline operations.
 * Automatically triggers queue processing when coming back online.
 */
export function useNetworkStatus(
  onOnline?: () => void
): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingOperations, setPendingOperations] = useState<QueuedOperation[]>([]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);

      if (count > 0) {
        const operations = await offlineQueue.getPendingOperations();
        setPendingOperations(operations);
      } else {
        setPendingOperations([]);
      }
    } catch (error) {
      console.error('Failed to refresh pending count:', error);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onOnline?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial fetch of pending count
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    pendingOperations,
    refreshPendingCount,
  };
}
