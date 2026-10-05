'use client';

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, Loader2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form-controls';
import {
  clampPercentBox,
  percentBoxToPixels,
  type PercentBox,
  type TextAlign,
} from '@/lib/format/coordinates';
import { fitTextToBox, type FitResult } from '@/lib/pdf/fit-text';
import { FONT_CSS, FONT_CSS_STYLE, FONT_LABELS } from '@/lib/pdf/fonts';
import { getFontMeasurer, type FontMeasurer } from '@/lib/pdf/measure';
import {
  FONT_CHOICES,
  TEXT_ALIGNMENTS,
  type FontChoice,
  type InvitationTemplate,
  type InvitationTextPlacement,
} from '@/lib/models';
import { savePlacement, selectTemplatePage } from '../lib/template-service';
import { NameTestDialog } from './name-test-dialog';

const SAMPLE_NAME = 'Mr. & Mrs. Ramesh Patel';
const NUDGE = 0.5;
const BIG_NUDGE = 2.5;

export function PlacementEditor({
  template,
  longestGuestName = null,
}: {
  template: InvitationTemplate;
  longestGuestName?: string | null;
}) {
  const [placement, setPlacement] = useState<InvitationTextPlacement>(template.placement);
  const [saved, setSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [measurer, setMeasurer] = useState<FontMeasurer | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: 'move' | 'resize'; x: number; y: number; box: PercentBox } | null>(
    null
  );

  useEffect(() => {
    // Only when a different card is opened. Syncing on template.placement as well would
    // fight with the autosave below: each save returns a new object and would re-trigger it.
    setPlacement(template.placement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  useEffect(() => {
    let active = true;

    if (template.mimeType === 'application/pdf') {
      setPdfLoading(true);
      setPdfError(null);
      void (async () => {
        try {
          const { renderPdfPageToDataUrl } = await import('@/lib/pdf/pdf-renderer');
          const dataUrl = await renderPdfPageToDataUrl(
            template.data,
            placement.pageNumber || 1,
            1400
          );
          if (active) {
            setPreviewUrl(dataUrl);
            setPdfLoading(false);
          }
        } catch (err) {
          if (active) {
            console.error('Failed to render PDF page preview:', err);
            setPdfError('Could not render PDF card image. You can still set the position using the fields below.');
            setPdfLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }

    const url = URL.createObjectURL(template.data);
    setPreviewUrl(url);
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [template.data, template.mimeType, placement.pageNumber]);

  // The same font the PDF will embed, so the fit shown here matches the file exactly.
  useEffect(() => {
    let active = true;
    setMeasurer(null);
    void getFontMeasurer(placement.fontFamily).then((loaded) => {
      if (active) setMeasurer(loaded);
    });
    return () => {
      active = false;
    };
  }, [placement.fontFamily]);

  // Autosaves the layout shortly after the last change, so nothing is lost on a back tap.
  useEffect(() => {
    setSaved(false);
    const timer = window.setTimeout(() => {
      void savePlacement(template.id, placement).then(() => setSaved(true));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [placement, template.id]);

  const update = useCallback(
    (changes: Partial<InvitationTextPlacement>) =>
      setPlacement((current) => ({ ...current, ...changes })),
    []
  );

  const updateBox = useCallback(
    (box: Partial<PercentBox>) =>
      setPlacement((current) => ({ ...current, ...clampPercentBox({ ...current, ...box }) })),
    []
  );

  const onPointerDown = (mode: 'move' | 'resize') => (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragRef.current = { mode, x: event.clientX, y: event.clientY, box: placement };
  };

  const onPointerMove = useCallback((event: ReactPointerEvent) => {
    const drag = dragRef.current;
    const surface = surfaceRef.current;
    if (!drag || !surface) return;

    const rect = surface.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = ((event.clientX - drag.x) / rect.width) * 100;
    const deltaY = ((event.clientY - drag.y) / rect.height) * 100;

    setPlacement((current) => ({
      ...current,
      ...clampPercentBox(
        drag.mode === 'move'
          ? { ...drag.box, xPct: drag.box.xPct + deltaX, yPct: drag.box.yPct + deltaY }
          : {
              ...drag.box,
              widthPct: Math.max(5, drag.box.widthPct + deltaX),
              heightPct: Math.max(3, drag.box.heightPct + deltaY),
            }
      ),
    }));
  }, []);

  const endDrag = () => {
    dragRef.current = null;
  };

  /** Arrow keys move the box; with Shift they resize it. Needed for keyboard use. */
  const onKeyDown = (event: ReactKeyboardEvent) => {
    const step = event.altKey ? BIG_NUDGE : NUDGE;
    const moves: Record<string, Partial<PercentBox>> = event.shiftKey
      ? {
          ArrowLeft: { widthPct: placement.widthPct - step },
          ArrowRight: { widthPct: placement.widthPct + step },
          ArrowUp: { heightPct: placement.heightPct - step },
          ArrowDown: { heightPct: placement.heightPct + step },
        }
      : {
          ArrowLeft: { xPct: placement.xPct - step },
          ArrowRight: { xPct: placement.xPct + step },
          ArrowUp: { yPct: placement.yPct - step },
          ArrowDown: { yPct: placement.yPct + step },
        };

    const change = moves[event.key];
    if (!change) return;
    event.preventDefault();
    updateBox(change);
  };

  const fit: FitResult | null = useMemo(() => {
    if (!measurer) return null;
    const box = percentBoxToPixels(placement, {
      width: template.widthUnits,
      height: template.heightUnits,
    });
    return fitTextToBox(SAMPLE_NAME, measurer.measure, {
      maxWidth: box.width,
      maxHeight: box.height,
      fontSize: placement.fontSize,
      minFontSize: placement.minFontSize,
      maxLines: placement.maxLines,
      autoShrink: placement.autoShrink,
    });
  }, [measurer, placement, template.heightUnits, template.widthUnits]);

  const aspect = template.widthUnits / template.heightUnits || 0.7;
  const shownSize = fit?.fontSize ?? placement.fontSize;

  return (
    <div className="space-y-4">
      <div
        ref={surfaceRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="template-surface relative w-full select-none overflow-hidden rounded-card border border-hairline bg-white shadow-xs"
        style={{ aspectRatio: String(aspect) }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Your invitation card"
            className="pointer-events-none h-full w-full select-none object-contain"
            draggable={false}
          />
        ) : pdfLoading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface px-6 text-center text-sm text-muted">
            <Loader2 className="h-6 w-6 animate-spin text-crimson" />
            <span>Rendering PDF card…</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface px-6 text-center text-sm text-muted">
            {pdfError || 'A card preview is not available.'}
          </div>
        )}

        <div
          role="application"
          tabIndex={0}
          aria-label="Guest name area. Drag to move, or use the arrow keys. Hold shift with the arrows to resize."
          onPointerDown={onPointerDown('move')}
          onKeyDown={onKeyDown}
          className="absolute cursor-move border-2 border-dashed border-crimson bg-crimson/10 touch-none select-none transition-shadow hover:shadow-md active:bg-crimson/20"
          style={{
            left: `${placement.xPct}%`,
            top: `${placement.yPct}%`,
            width: `${placement.widthPct}%`,
            height: `${placement.heightPct}%`,
          }}
        >
          <span className="pointer-events-none absolute -top-5 left-0 rounded bg-crimson px-1.5 text-[10px] font-semibold text-white shadow-xs">
            GUEST NAME
          </span>

          <span
            className="pointer-events-none flex h-full w-full select-none flex-col justify-center overflow-hidden px-1 leading-tight"
            style={{
              alignItems:
                placement.align === 'center'
                  ? 'center'
                  : placement.align === 'right'
                    ? 'flex-end'
                    : 'flex-start',
              color: placement.colorHex,
              fontFamily: FONT_CSS[placement.fontFamily],
              fontStyle: FONT_CSS_STYLE[placement.fontFamily],
              fontSize: `${(shownSize / template.widthUnits) * 100}cqw`,
              textAlign: placement.align,
            }}
          >
            {(fit?.lines ?? [SAMPLE_NAME]).map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </span>

          <span
            onPointerDown={onPointerDown('resize')}
            aria-label="Resize box"
            className="absolute -bottom-3 -right-3 flex h-7 w-7 cursor-se-resize items-center justify-center rounded-full border-2 border-white bg-crimson text-[10px] font-bold text-white shadow-md touch-none"
          >
            ⤡
          </span>
        </div>
      </div>

      {/* Quick Touch Controls for Mobile */}
      <div className="space-y-2 rounded-lg border border-hairline bg-surface/60 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink">Touch Nudge & Align</span>
          <span className="text-[11px] text-muted">
            X: {round(placement.xPct)}% · Y: {round(placement.yPct)}% · W: {round(placement.widthPct)}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded border border-hairline bg-white shadow-xs">
            <button
              type="button"
              className="p-2 text-ink hover:bg-surface active:bg-hairline"
              aria-label="Nudge left"
              onClick={() => updateBox({ xPct: placement.xPct - 1 })}
              title="Move left"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 text-ink hover:bg-surface active:bg-hairline"
              aria-label="Nudge up"
              onClick={() => updateBox({ yPct: placement.yPct - 1 })}
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 text-ink hover:bg-surface active:bg-hairline"
              aria-label="Nudge down"
              onClick={() => updateBox({ yPct: placement.yPct + 1 })}
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 text-ink hover:bg-surface active:bg-hairline"
              aria-label="Nudge right"
              onClick={() => updateBox({ xPct: placement.xPct + 1 })}
              title="Move right"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            className="rounded border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-ink shadow-xs hover:bg-surface active:bg-hairline"
            onClick={() => updateBox({ xPct: (100 - placement.widthPct) / 2 })}
          >
            Center Horizontally
          </button>

          <div className="flex items-center rounded border border-hairline bg-white shadow-xs">
            <button
              type="button"
              className="px-2 py-1.5 text-xs font-medium text-ink hover:bg-surface active:bg-hairline"
              onClick={() => updateBox({ widthPct: placement.widthPct - 2 })}
              title="Narrower"
            >
              Narrower
            </button>
            <div className="h-4 w-px bg-hairline" />
            <button
              type="button"
              className="px-2 py-1.5 text-xs font-medium text-ink hover:bg-surface active:bg-hairline"
              onClick={() => updateBox({ widthPct: placement.widthPct + 2 })}
              title="Wider"
            >
              Wider
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted" role="status">
          {saved ? 'Layout saved on this phone.' : 'Drag the box onto the blank line of your card.'}
        </p>
        <Button variant="quiet" size="sm" onClick={() => setTestOpen(true)}>
          <Eye className="h-4 w-4" aria-hidden />
          Try a name
        </Button>
      </div>

      {measurer?.note ? <InlineNotice tone="warning">{measurer.note}</InlineNotice> : null}

      {fit && !fit.fits ? (
        <InlineNotice tone="warning">
          {fit.overflowReason} Longer household names will be flagged before you send them.
        </InlineNotice>
      ) : null}

      {fit && fit.fits && fit.fontSize < placement.fontSize ? (
        <InlineNotice tone="info">
          The sample name is shrunk to {Math.round(fit.fontSize)} to fit this box.
        </InlineNotice>
      ) : null}

      {template.mimeType === 'application/pdf' && template.pageCount > 1 ? (
        <Field
          label="Which page of the PDF is the card?"
          htmlFor="placement-page"
          hint={`This file has ${template.pageCount} pages`}
        >
          <Select
            id="placement-page"
            value={String(placement.pageNumber)}
            onChange={(event) => {
              const pageNumber = Number(event.target.value);
              update({ pageNumber });
              void selectTemplatePage(template, pageNumber);
            }}
          >
            {Array.from({ length: template.pageCount }, (_, index) => (
              <option key={index} value={index + 1}>
                Page {index + 1}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Exact position</legend>
        <Field label="From the left (%)" htmlFor="placement-x">
          <Input
            id="placement-x"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={round(placement.xPct)}
            onChange={(event) => updateBox({ xPct: Number(event.target.value) })}
          />
        </Field>
        <Field label="From the top (%)" htmlFor="placement-y">
          <Input
            id="placement-y"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={round(placement.yPct)}
            onChange={(event) => updateBox({ yPct: Number(event.target.value) })}
          />
        </Field>
        <Field label="Width (%)" htmlFor="placement-w">
          <Input
            id="placement-w"
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={round(placement.widthPct)}
            onChange={(event) => updateBox({ widthPct: Number(event.target.value) })}
          />
        </Field>
        <Field label="Height (%)" htmlFor="placement-h">
          <Input
            id="placement-h"
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={round(placement.heightPct)}
            onChange={(event) => updateBox({ heightPct: Number(event.target.value) })}
          />
        </Field>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Font" htmlFor="placement-font">
          <Select
            id="placement-font"
            value={placement.fontFamily}
            onChange={(event) => update({ fontFamily: event.target.value as FontChoice })}
          >
            {FONT_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {FONT_LABELS[choice]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Alignment" htmlFor="placement-align">
          <Select
            id="placement-align"
            value={placement.align}
            onChange={(event) => update({ align: event.target.value as TextAlign })}
          >
            {TEXT_ALIGNMENTS.map((align) => (
              <option key={align} value={align}>
                {align === 'left' ? 'Left' : align === 'center' ? 'Centre' : 'Right'}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Text size"
          htmlFor="placement-size"
          hint={fit ? `Sample shown at ${Math.round(fit.fontSize)}` : 'Measuring…'}
        >
          <Input
            id="placement-size"
            type="number"
            min={6}
            max={400}
            value={placement.fontSize}
            onChange={(event) => {
              const size = Math.max(6, Number(event.target.value) || 6);
              update({ fontSize: size, minFontSize: Math.min(placement.minFontSize, size) });
            }}
          />
        </Field>

        <Field
          label="Smallest size allowed"
          htmlFor="placement-min"
          hint="Long names shrink down to this and no further"
        >
          <Input
            id="placement-min"
            type="number"
            min={4}
            max={placement.fontSize}
            value={placement.minFontSize}
            onChange={(event) =>
              update({
                minFontSize: Math.min(
                  placement.fontSize,
                  Math.max(4, Number(event.target.value) || 4)
                ),
              })
            }
          />
        </Field>

        <Field label="Text colour" htmlFor="placement-colour">
          <Input
            id="placement-colour"
            type="color"
            className="h-12 p-1"
            value={placement.colorHex}
            onChange={(event) => update({ colorHex: event.target.value })}
          />
        </Field>

        <Field label="Lines allowed" htmlFor="placement-lines">
          <Select
            id="placement-lines"
            value={String(placement.maxLines)}
            onChange={(event) => update({ maxLines: Number(event.target.value) })}
          >
            <option value="1">One line</option>
            <option value="2">Up to two lines</option>
            <option value="3">Up to three lines</option>
          </Select>
        </Field>
      </div>

      <label className="flex min-h-touch items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#800020]"
          checked={placement.autoShrink}
          onChange={(event) => update({ autoShrink: event.target.checked })}
        />
        Shrink long names so they fit
      </label>

      <NameTestDialog
        open={testOpen}
        template={template}
        longestGuestName={longestGuestName}
        onClose={() => setTestOpen(false)}
      />
    </div>
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
