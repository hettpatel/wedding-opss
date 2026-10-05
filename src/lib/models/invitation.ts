import { z } from 'zod';
import { baseRecordSchema, blobSchema } from './common';

export const FONT_CHOICES = ['serif', 'sans', 'script'] as const;
export const fontChoiceSchema = z.enum(FONT_CHOICES);
export type FontChoice = z.infer<typeof fontChoiceSchema>;

export const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;
export const textAlignmentSchema = z.enum(TEXT_ALIGNMENTS);

/** Percentages of the page, measured from the top-left, so placement survives any screen size. */
export const invitationTextPlacementSchema = z.object({
  pageNumber: z.number().int().positive(),
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(1).max(100),
  heightPct: z.number().min(1).max(100),
  fontFamily: fontChoiceSchema,
  fontSize: z.number().positive(),
  minFontSize: z.number().positive(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #800020'),
  align: textAlignmentSchema,
  maxLines: z.number().int().min(1).max(3),
  autoShrink: z.boolean(),
});
export type InvitationTextPlacement = z.infer<typeof invitationTextPlacementSchema>;

export const DEFAULT_TEXT_PLACEMENT: InvitationTextPlacement = {
  pageNumber: 1,
  xPct: 15,
  yPct: 60,
  widthPct: 70,
  heightPct: 10,
  fontFamily: 'serif',
  fontSize: 28,
  minFontSize: 12,
  colorHex: '#800020',
  align: 'center',
  maxLines: 2,
  autoShrink: true,
};

export const TEMPLATE_KINDS = ['image/png', 'image/jpeg', 'application/pdf'] as const;

export const invitationTemplateSchema = baseRecordSchema.extend({
  name: z.string().trim().min(1),
  fileName: z.string(),
  mimeType: z.enum(TEMPLATE_KINDS),
  sizeBytes: z.number().nonnegative(),
  /** Natural size in pixels (images) or points (PDF). Used for coordinate conversion. */
  widthUnits: z.number().positive(),
  heightUnits: z.number().positive(),
  pageCount: z.number().int().positive(),
  data: blobSchema,
  placement: invitationTextPlacementSchema,
  isActive: z.boolean(),
});
export type InvitationTemplate = z.infer<typeof invitationTemplateSchema>;
