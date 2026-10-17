/**
 * Single registry of all storage keys used by the application.
 *
 * Every module that reads from or writes to localStorage should import its
 * keys from here instead of hard-coding strings. This keeps prefixes
 * consistent and makes backup/export and "reset app data" operations
 * reliable and complete.
 */

/** Contracts list. */
export const CONTRACTS_KEY = 'txwatch_contracts';

/** Alerts list. */
export const ALERTS_KEY = 'txwatch_alerts';

/** Storage schema version. */
export const STORAGE_VERSION_KEY = 'txwatch_storage_version';

/** Contract sync status. */
export const SYNC_STATUS_KEY = 'txwatch_sync_status';

/** Alert retention period in days. */
export const ALERT_RETENTION_DAYS_KEY = 'txwatch_alert_retention_days';

/** Whether notifications are enabled (migrated from `txwatch:notifications-enabled`). */
export const NOTIFICATIONS_ENABLED_KEY = 'txwatch_notifications_enabled';

/** Freighter wallet public key. */
export const FREIGHTER_PUBLIC_KEY = 'freighter_public_key';

/** Session key: last created contract. */
export const LAST_CREATED_CONTRACT_KEY = 'txwatch_last_created_contract';

/** Session key: duplicate contract. */
export const DUPLICATE_CONTRACT_KEY = 'txwatch_duplicate_contract';

/**
 * Legacy key for notifications-enabled, using a colon separator.
 * Kept only for migration purposes.
 */
export const LEGACY_NOTIFICATIONS_ENABLED_KEY = 'txwatch:notifications-enabled';

/**
 * All TxWatch-owned keys. Used for backup/export and scoped "reset app data".
 *
 * Note: `FREIGHTER_PUBLIC_KEY` is intentionally excluded because it is owned
 * by the Freighter integration rather than by TxWatch's own data model.
 */
export const TXWATCH_KEYS: readonly string[] = [
  CONTRACTS_KEY,
  ALERTS_KEY,
  STORAGE_VERSION_KEY,
  SYNC_STATUS_KEY,
  ALERT_RETENTION_DAYS_KEY,
  NOTIFICATIONS_ENABLED_KEY,
  LAST_CREATED_CONTRACT_KEY,
  DUPLICATE_CONTRACT_KEY,
];

/**
 * Migrate the legacy `txwatch:notifications-enabled` key to the new
 * `txwatch_notifications_enabled` key.
 *
 * If the legacy key exists and the new key does not, its value is copied to
 * the new key. The legacy key is then removed. Safe to call multiple times.
 *
 * @param storage - The Storage instance to operate on (defaults to
 *   `localStorage` when available).
 */
export function migrateLegacyStorageKeys(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): void {
  if (!storage) {
    return;
  }

  try {
    const legacyValue = storage.getItem(LEGACY_NOTIFICATIONS_ENABLED_KEY);
    if (legacyValue === null) {
      return;
    }

    if (storage.getItem(NOTIFICATIONS_ENABLED_KEY) === null) {
      storage.setItem(NOTIFICATIONS_ENABLED_KEY, legacyValue);
    }

    storage.removeItem(LEGACY_NOTIFICATIONS_ENABLED_KEY);
  } catch {
    // Ignore storage errors (e.g. quota exceeded or access denied).
  }
}