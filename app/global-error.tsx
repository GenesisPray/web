'use client';

import { useCallback, useMemo, useState } from 'react';

const TXWATCH_KEY_PREFIXES = ['txwatch', 'tx-watch', 'txwatch:'];

function isTxWatchKey(key: string): boolean {
  const lower = key.toLowerCase();
  return TXWATCH_KEY_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function collectTxWatchKeys(): { storage: Storage; key: string }[] {
  const entries: { storage: Storage; key: string }[] = [];
  if (typeof window === 'undefined') return entries;
  const stores: Storage[] = [];
  try {
    stores.push(window.localStorage);
  } catch {
    // ignore inaccessible storage
  }
  try {
    stores.push(window.sessionStorage);
  } catch {
    // ignore inaccessible storage
  }
  for (const storage of stores) {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && isTxWatchKey(key)) {
          entries.push({ storage, key });
        }
      }
    } catch {
      // ignore inaccessible storage
    }
  }
  return entries;
}

function buildBackup(): string {
  const data: Record<string, Record<string, string | null>> = {
    localStorage: {},
    sessionStorage: {},
  };
  if (typeof window === 'undefined') return JSON.stringify(data, null, 2);
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && isTxWatchKey(key)) {
        data.localStorage[key] = window.localStorage.getItem(key);
      }
    }
  } catch {
    // ignore inaccessible storage
  }
  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && isTxWatchKey(key)) {
        data.sessionStorage[key] = window.sessionStorage.getItem(key);
      }
    }
  } catch {
    // ignore inaccessible storage
  }
  return JSON.stringify(data, null, 2);
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [cleared, setCleared] = useState(false);

  const txWatchKeyCount = useMemo(() => collectTxWatchKeys().length, []);

  const handleDownloadBackup = useCallback(() => {
    try {
      const backup = buildBackup();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `txwatch-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
    } catch {
      // ignore download failures
    }
  }, []);

  const handleClearTxWatchData = useCallback(() => {
    const entries = collectTxWatchKeys();
    for (const { storage, key } of entries) {
      try {
        storage.removeItem(key);
      } catch {
        // ignore removal failures
      }
    }
    setCleared(true);
    setConfirming(false);
  }, []);

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Critical Error</h1>
              <p className="text-muted-foreground">
                A critical error occurred. The application needs to restart.
              </p>
              {error.message && (
                <p className="text-sm text-muted-foreground/60 font-mono break-words">
                  {error.message}
                </p>
              )}
            </div>

            <button
              onClick={() => reset()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Restart Application
            </button>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                If the problem persists, you can back up and reset TxWatch local data.
              </p>

              <button
                onClick={handleDownloadBackup}
                className="w-full px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                {backupDownloaded ? 'Download backup again' : 'Download backup'}
              </button>

              {cleared ? (
                <p className="text-sm text-muted-foreground">
                  TxWatch local data has been cleared. Restart the application to continue.
                </p>
              ) : confirming ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    This will remove {txWatchKeyCount} TxWatch{' '}
                    {txWatchKeyCount === 1 ? 'key' : 'keys'} from this browser. Other
                    data on this origin will not be touched. Continue?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearTxWatchData}
                      className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
                    >
                      Yes, clear TxWatch data
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="w-full px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Reset TxWatch local data
                </button>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}