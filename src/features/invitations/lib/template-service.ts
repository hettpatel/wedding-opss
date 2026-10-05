import { getDb } from '@/lib/db/db';
import { createRecord, touchRecord } from '@/lib/db/records';
import { repositories } from '@/lib/db/repositories';
import { validateFile } from '@/lib/files/validate';
import { readPdfPageSize, readTemplateSize } from '@/lib/pdf/generate-invitation';
import {
  DEFAULT_TEXT_PLACEMENT,
  type InvitationTemplate,
  type InvitationTextPlacement,
} from '@/lib/models';

export interface SaveTemplateResult {
  ok: boolean;
  error: string | null;
  template: InvitationTemplate | null;
}

const SUPPORTED_MIME = ['image/png', 'image/jpeg', 'application/pdf'] as const;

function mimeFor(file: File): (typeof SUPPORTED_MIME)[number] | null {
  if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'application/pdf') {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.pdf')) return 'application/pdf';
  return null;
}

/** Saving a new template never deletes the old one; it just stops being the active one. */
export async function saveTemplateFile(file: File): Promise<SaveTemplateResult> {
  const validation = validateFile(file, 'invitationTemplate');
  if (!validation.ok) return { ok: false, error: validation.error, template: null };

  const mimeType = mimeFor(file);
  if (!mimeType) {
    return {
      ok: false,
      error: 'Use a PNG or JPG image, or a single-page PDF.',
      template: null,
    };
  }

  try {
    const size = await readTemplateSize(file);

    const db = getDb();
    const template = createRecord<InvitationTemplate>({
      name: file.name.replace(/\.[^.]+$/, ''),
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
      widthUnits: size.widthUnits,
      heightUnits: size.heightUnits,
      pageCount: size.pageCount,
      data: file,
      placement: DEFAULT_TEXT_PLACEMENT,
      isActive: true,
    });

    await db.transaction('rw', db.invitationTemplates, async () => {
      const others = await db.invitationTemplates.toArray();
      if (others.length > 0) {
        await db.invitationTemplates.bulkPut(
          others.map((item) => touchRecord(item, { isActive: false }))
        );
      }
      await db.invitationTemplates.put(template);
    });

    return { ok: true, error: null, template };
  } catch (error) {
    const outOfSpace = error instanceof Error && error.name === 'QuotaExceededError';
    return {
      ok: false,
      error: outOfSpace
        ? 'This phone has run out of storage space. Export a backup, then remove some photos.'
        : 'That file could not be opened. Try exporting it again as PNG, JPG or PDF.',
      template: null,
    };
  }
}

export async function savePlacement(
  templateId: string,
  placement: InvitationTextPlacement
): Promise<void> {
  await repositories.invitationTemplates.update(templateId, { placement });
}

/**
 * Switching to another page of a multi-page PDF also re-reads that page's size, because
 * the stored percentages are resolved against it.
 */
export async function selectTemplatePage(
  template: InvitationTemplate,
  pageNumber: number
): Promise<void> {
  const size = await readPdfPageSize(template.data, pageNumber);
  await repositories.invitationTemplates.update(template.id, {
    widthUnits: size.widthUnits,
    heightUnits: size.heightUnits,
    pageCount: size.pageCount,
    placement: { ...template.placement, pageNumber },
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await repositories.invitationTemplates.remove(templateId);
}
