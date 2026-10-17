import { migrateStorage, migrateContractsToV2 } from './storage'

// Registry of storage migrations keyed by the version they upgrade TO.
// Bump CURRENT_STORAGE_VERSION in storage.ts alongside adding an entry here.
export const migrations: Record<number, () => void> = {
  // v1: baseline schema; unversioned (v0) data is already compatible.
  1: () => {},
  // v2: backfill enabled: true on contracts.
  2: migrateContractsToV2,
}

export function runMigrations() {
  migrateStorage(migrations)
}