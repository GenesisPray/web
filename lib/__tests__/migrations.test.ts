import { migrateStorage } from '../storage';
import { migrations, runMigrations } from '../migrations';
import { STORAGE_VERSION_KEY, NOTIFICATIONS_ENABLED_KEY, LEGACY_NOTIFICATIONS_ENABLED_KEY } from '../storageKeys';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => localStorageMock.clear());

describe('migrations', () => {
  it('upgrades v0 to v1 and writes the version key', () => {
    const ran: number[] = [];
    migrateStorage({ 1: () => ran.push(1) });
    expect(ran).toEqual([1]);
    expect(store[STORAGE_VERSION_KEY]).toBe('1');
  });

  it('is idempotent', () => {
    const ran: number[] = [];
    migrateStorage({ 1: () => ran.push(1) });
    migrateStorage({ 1: () => ran.push(1) });
    expect(ran).toEqual([1]);
    expect(store[STORAGE_VERSION_KEY]).toBe('1');
  });

  it('runMigrations uses the registry', () => {
    expect(migrations[1]).toBeTypeOf('function');
    runMigrations();
    expect(store[STORAGE_VERSION_KEY]).toBe('1');
  });

  it('migrates the legacy notifications key to the txwatch_ prefix', () => {
    store[LEGACY_NOTIFICATIONS_ENABLED_KEY] = 'true';
    runMigrations();
    expect(store[NOTIFICATIONS_ENABLED_KEY]).toBe('true');
    expect(store[LEGACY_NOTIFICATIONS_ENABLED_KEY]).toBeUndefined();
  });

  it('does not overwrite an existing notifications key during migration', () => {
    store[LEGACY_NOTIFICATIONS_ENABLED_KEY] = 'true';
    store[NOTIFICATIONS_ENABLED_KEY] = 'false';
    runMigrations();
    expect(store[NOTIFICATIONS_ENABLED_KEY]).toBe('false');
    expect(store[LEGACY_NOTIFICATIONS_ENABLED_KEY]).toBeUndefined();
  });

  it('leaves the notifications key untouched when no legacy key exists', () => {
    runMigrations();
    expect(store[NOTIFICATIONS_ENABLED_KEY]).toBeUndefined();
    expect(store[LEGACY_NOTIFICATIONS_ENABLED_KEY]).toBeUndefined();
  });
});