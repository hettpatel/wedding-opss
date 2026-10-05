export interface StorageEstimateInfo {
  supported: boolean;
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
  level: 'ok' | 'watch' | 'critical';
  persisted: boolean;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export async function readStorageEstimate(): Promise<StorageEstimateInfo> {
  const empty: StorageEstimateInfo = {
    supported: false,
    usedBytes: 0,
    quotaBytes: 0,
    usedPercent: 0,
    level: 'ok',
    persisted: false,
  };

  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return empty;

  try {
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;
    const quotaBytes = estimate.quota ?? 0;
    const usedPercent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;

    return {
      supported: true,
      usedBytes,
      quotaBytes,
      usedPercent,
      level: usedPercent >= 90 ? 'critical' : usedPercent >= 70 ? 'watch' : 'ok',
      persisted,
    };
  } catch {
    return empty;
  }
}

/** Asks the browser not to evict this app's data. Safe to call more than once. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
