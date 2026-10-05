import { describe, expect, it } from 'vitest';
import { detectShareCapabilities, NO_CAPABILITIES } from './share-capabilities';

describe('detectShareCapabilities', () => {
  it('reports nothing available where the browser APIs are absent', () => {
    // This test runs outside a browser: navigator.share and document do not exist,
    // which is exactly the case the fallbacks are there for.
    const capabilities = detectShareCapabilities();
    expect(capabilities.canShare).toBe(false);
    expect(capabilities.canShareFiles).toBe(false);
    expect(capabilities.canCopy).toBe(false);
  });

  it('has a safe default shape', () => {
    expect(NO_CAPABILITIES).toEqual({ canShare: false, canShareFiles: false, canCopy: false });
  });
});
