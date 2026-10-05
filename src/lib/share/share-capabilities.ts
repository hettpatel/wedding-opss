export interface ShareCapabilities {
  /** navigator.share exists at all. */
  canShare: boolean;
  /** navigator.share accepts files, which is what sends the PDF itself. */
  canShareFiles: boolean;
  canCopy: boolean;
}

export const NO_CAPABILITIES: ShareCapabilities = {
  canShare: false,
  canShareFiles: false,
  canCopy: false,
};

/**
 * Everything here is feature detection, run in the browser only. A capability is assumed
 * absent unless the browser actually reports it.
 */
export function detectShareCapabilities(): ShareCapabilities {
  if (typeof navigator === 'undefined') return NO_CAPABILITIES;

  const canShare = typeof navigator.share === 'function';
  let canShareFiles = false;

  if (canShare && typeof navigator.canShare === 'function' && typeof File === 'function') {
    try {
      const probe = new File([new Uint8Array([37, 80, 68, 70])], 'probe.pdf', {
        type: 'application/pdf',
      });
      canShareFiles = navigator.canShare({ files: [probe] });
    } catch {
      canShareFiles = false;
    }
  }

  const canCopy =
    typeof navigator.clipboard?.writeText === 'function' ||
    (typeof document !== 'undefined' && typeof document.execCommand === 'function');

  return { canShare, canShareFiles, canCopy };
}

export type ShareOutcome = 'opened' | 'cancelled' | 'unsupported' | 'failed';

export interface ShareFilesInput {
  files: File[];
  title?: string;
  text?: string;
}

/**
 * Opens the system share sheet with the PDF attached. "opened" means the sheet was shown
 * and dismissed without an error - it does NOT mean anything was sent, which is why the
 * caller always asks the person afterwards.
 */
export async function shareFiles(input: ShareFilesInput): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: input.files })) {
    return 'unsupported';
  }

  try {
    await navigator.share({ files: input.files, title: input.title, text: input.text });
    return 'opened';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

/** Clipboard API first, then the old textarea trick, so copying works on older browsers too. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or not in a user gesture: fall through to the fallback.
    }
  }

  if (typeof document === 'undefined') return false;

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}
