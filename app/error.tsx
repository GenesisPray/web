'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { exportContractsAsJson } from '@/lib/exportStorage';
import { TXWATCH_KEYS } from '@/lib/storageKeys';
import { storageLogger } from '@/lib/storageLogger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const isStorageError = error.message?.includes('storage') ||
    error.message?.includes('JSON') ||
    error.message?.includes('parse');

  const corruptedKey = storageLogger.getCorruptedKey?.() ?? null;

  const downloadBackup = () => {
    try {
      exportContractsAsJson();
      setBackupDownloaded(true);
    } catch (e) {
      console.error('Failed to export backup:', e);
    }
  };

  const removeKey = (key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      reset();
    } catch (e) {
      console.error('Failed to remove key:', e);
      reset();
    }
  };

  const clearTxWatchData = () => {
    try {
      for (const key of TXWATCH_KEYS) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
      reset();
    } catch (e) {
      console.error('Failed to clear storage:', e);
      reset();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Oops!</h1>
          <p className="text-muted-foreground">
            {isStorageError
              ? 'Something went wrong with your stored data.'
              : 'Something went wrong. Please try again.'}
          </p>
          {error.message && (
            <p className="text-sm text-muted-foreground/60 font-mono break-words">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {isStorageError && corruptedKey && (
            <button
              onClick={() => removeKey(corruptedKey)}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
            >
              Remove Corrupted Data ({corruptedKey})
            </button>
          )}

          {isStorageError && !corruptedKey && !confirming && (
            <>
              <button
                onClick={downloadBackup}
                className="px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Download backup
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                Reset Local Data
              </button>
            </>
          )}

          {isStorageError && !corruptedKey && confirming && (
            <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
              <p className="text-sm text-muted-foreground">
                This will delete all TxWatch contracts and alerts stored on this device.
                {!backupDownloaded && ' Consider downloading a backup first.'}
              </p>
              {!backupDownloaded && (
                <button
                  onClick={downloadBackup}
                  className="w-full px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Download backup
                </button>
              )}
              <button
                onClick={clearTxWatchData}
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                Yes, delete TxWatch data
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="w-full px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
