import type { WatchedContract } from '@/types'
import { getContracts, saveContract, deleteContract } from '@/lib/storage'
import {
  isApiConfigured,
  listContracts,
  createContract,
  updateContract,
  removeContract,
} from '@/lib/contractsApi'

export type SyncState = 'synced' | 'error'
export interface SyncStatus {
  state: SyncState
  error?: string
  at: number
}

const STATUS_KEY = 'txwatch_sync_status'

/** Storage key used by the local contract cache; storage events on it signal cross-tab changes. */
export const CONTRACTS_STORAGE_KEY = 'txwatch_contracts'

/**
 * Subscribe to cross-tab contract changes. The callback fires whenever another
 * tab writes to the contracts cache (add, delete, or refresh). Returns an
 * unsubscribe function.
 */
export function subscribeToContractChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === CONTRACTS_STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function getSyncStatuses(): Record<string, SyncStatus> {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function setStatus(id: string, status: SyncStatus | null) {
  try {
    const all = getSyncStatuses()
    if (status) all[id] = status
    else delete all[id]
    localStorage.setItem(STATUS_KEY, JSON.stringify(all))
  } catch {
    // status is best-effort
  }
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Sync failed')

export interface SyncResult {
  ok: boolean
  error?: string
}

/** Save locally (cache) and push to the API when configured. Never throws. */
export async function syncSaveContract(contract: WatchedContract, isNew: boolean): Promise<SyncResult> {
  saveContract(contract)
  if (!isApiConfigured()) return { ok: true }
  try {
    await (isNew ? createContract(contract) : updateContract(contract))
    setStatus(contract.id, { state: 'synced', at: Date.now() })
    return { ok: true }
  } catch (e) {
    const error = errMsg(e)
    setStatus(contract.id, { state: 'error', error, at: Date.now() })
    return { ok: false, error }
  }
}

export async function syncDeleteContract(id: string): Promise<SyncResult> {
  deleteContract(id)
  setStatus(id, null)
  if (!isApiConfigured()) return { ok: true }
  try {
    await removeContract(id)
    return { ok: true }
  } catch (e) {
    // Local delete already happened; the next refresh restores it if the API still has it.
    return { ok: false, error: errMsg(e) }
  }
}

/**
 * With an API configured, the API is the source of truth: replace the local
 * cache with its list. On failure the cache is kept and the error returned.
 */
export async function refreshContracts(): Promise<{ contracts: WatchedContract[]; error?: string }> {
  if (!isApiConfigured()) return { contracts: getContracts() }
  try {
    const remote = await listContracts()
    const ids = new Set(remote.map((c) => c.id))
    getContracts().filter((c) => !ids.has(c.id)).forEach((c) => deleteContract(c.id))
    remote.forEach((c) => {
      saveContract(c)
      setStatus(c.id, { state: 'synced', at: Date.now() })
    })
    return { contracts: getContracts() }
  } catch (e) {
    return { contracts: getContracts(), error: errMsg(e) }
  }
}

/**
 * Subscribe to cross-tab contract changes. The callback fires whenever the
 * contracts cache is written from another tab (or window) via the `storage`
 * event, so detail pages can reload the contract or detect its deletion.
 * Returns an unsubscribe function.
 */
export function onContractsChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === CONTRACTS_KEY) callback()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
