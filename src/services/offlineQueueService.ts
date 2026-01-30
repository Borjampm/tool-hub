/**
 * Offline Queue Service
 * Uses IndexedDB to store pending operations when offline.
 * Operations are processed when the connection is restored.
 */

const DB_NAME = 'tool-hub-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-operations';
const MAX_RETRIES = 3;

export type OperationType = 'transaction' | 'timeEntry';
export type ActionType = 'create' | 'update' | 'delete';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  action: ActionType;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

class OfflineQueueService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbReady;
  }

  /**
   * Add an operation to the offline queue
   */
  async addToQueue(
    type: OperationType,
    action: ActionType,
    data: Record<string, unknown>
  ): Promise<string> {
    const db = await this.getDB();
    const id = `${type}_${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const operation: QueuedOperation = {
      id,
      type,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(operation);

      request.onsuccess = async () => {
        // Request Background Sync after adding to queue
        await this.requestBackgroundSync();
        resolve(id);
      };
      request.onerror = () => {
        console.error('Failed to add operation to queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Request Background Sync to process the queue when online.
   * Falls back gracefully if Background Sync is not supported.
   */
  async requestBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('[OfflineQueue] Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if Background Sync is supported
      if ('sync' in registration) {
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('offline-sync');
        console.log('[OfflineQueue] Background Sync registered');
      } else {
        console.log('[OfflineQueue] Background Sync not supported');
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to register Background Sync:', error);
    }
  }

  /**
   * Get all pending operations, ordered by timestamp
   */
  async getPendingOperations(): Promise<QueuedOperation[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        console.error('Failed to get pending operations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get the count of pending operations
   */
  async getPendingCount(): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Failed to count pending operations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove a successfully processed operation from the queue
   */
  async removeFromQueue(id: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to remove operation from queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Increment retry count for a failed operation
   */
  async incrementRetry(id: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result as QueuedOperation | undefined;
        if (!operation) {
          resolve(false);
          return;
        }

        operation.retries += 1;

        if (operation.retries >= MAX_RETRIES) {
          // Remove failed operation after max retries
          const deleteRequest = store.delete(id);
          deleteRequest.onsuccess = () => resolve(false);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          const updateRequest = store.put(operation);
          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = () => reject(updateRequest.error);
        }
      };

      getRequest.onerror = () => {
        console.error('Failed to get operation for retry:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * Clear all pending operations (use with caution)
   */
  async clearQueue(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to clear queue:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();
