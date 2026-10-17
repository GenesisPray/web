import {
  buildContractSnapshot,
  exportContractsAsJson,
  parseContractSnapshot,
} from '../exportStorage';
import { CONTRACTS_KEY, saveContract } from '../storage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:   (key: string) => store[key] ?? null,
    setItem:   (key: string, value: string) => { store[key] = value; },
    removeItem:(key: string) => { delete store[key]; },
    clear:     () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const KEY = CONTRACTS_KEY;
const sample = [
  { id: 'c1', address: 'GABC', label: 'Alpha', network: 'mainnet' },
  { id: 'c2', address: 'GDEF', label: 'Beta',  network: 'testnet' },
];

beforeEach(() => localStorageMock.clear());

describe('buildContractSnapshot', () => {
  it('returns version 1 snapshot', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    expect(buildContractSnapshot(KEY).version).toBe(1);
  });

  it('includes all contracts', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const snap = buildContractSnapshot(KEY);
    expect(snap.count).toBe(2);
    expect(snap.contracts).toHaveLength(2);
  });

  it('returns count 0 and empty array when no contracts stored', () => {
    const snap = buildContractSnapshot(KEY);
    expect(snap.count).toBe(0);
    expect(snap.contracts).toEqual([]);
  });

  it('includes an ISO exportedAt timestamp', () => {
    const snap = buildContractSnapshot(KEY);
    expect(() => new Date(snap.exportedAt)).not.toThrow();
    expect(snap.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('preserves the enabled field for paused contracts', () => {
    const withEnabled = [
      { ...sample[0], enabled: false },
      { ...sample[1], enabled: true },
    ];
    localStorage.setItem(KEY, JSON.stringify(withEnabled));
    const snap = buildContractSnapshot(KEY);
    expect(snap.contracts[0].enabled).toBe(false);
    expect(snap.contracts[1].enabled).toBe(true);
  });

  it('omits enabled for contracts that never set it', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const snap = buildContractSnapshot(KEY);
    expect(snap.contracts[0].enabled).toBeUndefined();
  });
});

describe('exportContractsAsJson', () => {
  it('returns valid JSON string', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const json = exportContractsAsJson(KEY);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('produced JSON round-trips back to snapshot shape', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const json = exportContractsAsJson(KEY);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.contracts).toHaveLength(2);
  });

  it('includes enabled: false for paused contracts in exported JSON', () => {
    const withEnabled = [{ ...sample[0], enabled: false }, sample[1]];
    localStorage.setItem(KEY, JSON.stringify(withEnabled));
    const parsed = JSON.parse(exportContractsAsJson(KEY));
    expect(parsed.contracts[0].enabled).toBe(false);
  });
});

describe('parseContractSnapshot', () => {
  it('parses valid snapshot JSON', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const json = exportContractsAsJson(KEY);
    const snap = parseContractSnapshot(json);
    expect(snap.version).toBe(1);
    expect(snap.contracts).toHaveLength(2);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseContractSnapshot('not json')).toThrow('Invalid JSON');
  });

  it('throws on wrong version', () => {
    const bad = JSON.stringify({ version: 99, contracts: [] });
    expect(() => parseContractSnapshot(bad)).toThrow('Invalid snapshot format');
  });

  it('throws when contracts field is missing', () => {
    const bad = JSON.stringify({ version: 1 });
    expect(() => parseContractSnapshot(bad)).toThrow('Invalid snapshot format');
  });

  it('preserves enabled: false through a parse round-trip', () => {
    const withEnabled = [{ ...sample[0], enabled: false }];
    localStorage.setItem(KEY, JSON.stringify(withEnabled));
    const snap = parseContractSnapshot(exportContractsAsJson(KEY));
    expect(snap.contracts[0].enabled).toBe(false);
  });
});

describe('buildContractSnapshot with default key', () => {
  it('exports contracts written by saveContract', () => {
    saveContract({
      id: 'c1',
      label: 'Alpha',
      contract_id: 'CDSO4GGZH7KBUQYKOIQDCMCFSRYEPOVDUX7Z4IB5TWNTLT2GDRKDQOYR',
      network: 'mainnet',
      rules: [],
      webhook_url: 'https://hooks.example.com/alpha',
      created_at: 1,
      updated_at: 1,
    });
    const snapshot = buildContractSnapshot();
    expect(snapshot.count).toBe(1);
    expect(snapshot.contracts[0].id).toBe('c1');
  });

  it('exports enabled: false for a paused contract written by saveContract', () => {
    saveContract({
      id: 'c1',
      label: 'Alpha',
      contract_id: 'CDSO4GGZH7KBUQYKOIQDCMCFSRYEPOVDUX7Z4IB5TWNTLT2GDRKDQOYR',
      network: 'mainnet',
      rules: [],
      webhook_url: 'https://hooks.example.com/alpha',
      created_at: 1,
      updated_at: 1,
      enabled: false,
    });
    const snapshot = buildContractSnapshot();
    expect(snapshot.contracts[0].enabled).toBe(false);
  });
});
