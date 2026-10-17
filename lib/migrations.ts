import { migrateStorage } from './storage'
import { NOTIFICATIONS_ENABLED_KEY, LEGACY_NOTIFICATIONS_ENABLED_KEY } from './storageKeys'

// Registry of storage migrations keyed by the version they upgrade TO.
// Bump CURRENT_STORAGE_VERSION in storage.ts alongside adding an entry here.
export const migrations: Record<number, () => void> = {
  // v1: baseline schema; unversioned (v0) data is already compatible.
  1: () => {},
  // v2: migrate `txwatch:notifications-enabled` (colon) to `txwatch_notifications_enabled`.
  2: () => {
    if (typeof window === 'undefined') return
    try {
      const legacy = window.localStorage.getItem(LEGACY_NOTIFICATIONS_ENABLED_KEY)
      if (legacy === null) return
      // Only migrate if the new key has not already been set (idempotent).
      if (window.localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === null) {
        window.localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, legacy)
      }
      window.localStorage.removeItem(LEGACY_NOTIFICATIONS_ENABLED_KEY)
    } catch {
      // Ignore storage errors (e.g. disabled storage); migration is best-effort.
    }
  },
}

export function runMigrations() {
  migrateStorage(migrations)
}