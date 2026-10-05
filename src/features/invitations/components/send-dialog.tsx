'use client';

import { Copy, Download, MessageCircle, RefreshCw, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { logAppError } from '@/lib/db/repositories';
import { downloadBlob } from '@/lib/files/download';
import { invitationFileName } from '@/lib/format/filename';
import { buildWhatsAppLink, normalizePhone } from '@/lib/format/phone';
import { generateInvitationPdf, type GeneratedInvitation } from '@/lib/pdf/generate-invitation';
import {
  copyText,
  detectShareCapabilities,
  shareFiles,
  type ShareCapabilities,
} from '@/lib/share/share-capabilities';
import type { GuestHousehold, InvitationTemplate, WeddingSettings } from '@/lib/models';
import { PdfPreview } from './pdf-preview';
import { renderForGuest } from '../lib/message-values';
import { recordDispatchEvent, undoDispatch } from '../lib/dispatch-service';
import type { DispatchMethod } from '../lib/dispatch-rules';

type Stage = 'preparing' | 'ready' | 'awaiting' | 'failed';

export function SendDialog({
  guest,
  template,
  messageBody,
  wedding,
  defaultCountryCode,
  onClose,
}: {
  guest: GuestHousehold | null;
  template: InvitationTemplate | null;
  messageBody: string;
  wedding: WeddingSettings | null;
  defaultCountryCode: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const online = useOnlineStatus();
  const [stage, setStage] = useState<Stage>('preparing');
  const [pdf, setPdf] = useState<GeneratedInvitation | null>(null);
  const [fitWarning, setFitWarning] = useState<string | null>(null);
  const [fontWarning, setFontWarning] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<DispatchMethod>('native-share');
  const [busy, setBusy] = useState(false);
  const [capabilities, setCapabilities] = useState<ShareCapabilities>({
    canShare: false,
    canShareFiles: false,
    canCopy: false,
  });

  useEffect(() => {
    setCapabilities(detectShareCapabilities());
  }, []);

  const message = useMemo(
    () => (guest ? renderForGuest(messageBody, guest, wedding) : ''),
    [guest, messageBody, wedding]
  );

  const phone = useMemo(
    () => (guest?.rawPhone ? normalizePhone(guest.rawPhone, defaultCountryCode) : null),
    [defaultCountryCode, guest?.rawPhone]
  );

  const fileName = guest ? invitationFileName(guest.invitationDisplayName) : 'invitation.pdf';

  const guestRef = useRef(guest);
  guestRef.current = guest;
  const templateRef = useRef(template);
  templateRef.current = template;

  const prepare = useCallback(async () => {
    const guest = guestRef.current;
    const template = templateRef.current;
    if (!guest) return;
    setStage('preparing');
    setError(null);
    setFitWarning(null);
    setFontWarning(null);
    setPdf(null);

    if (!template) {
      // Text-only mode: the message still works, the attachment does not exist yet.
      setStage('ready');
      return;
    }

    try {
      const generated = await generateInvitationPdf(template, guest.invitationDisplayName);
      setPdf(generated);
      setFitWarning(generated.overflowWarning);
      setFontWarning(generated.fontWarning);
      await recordDispatchEvent(guest.id, 'generated', 'native-share');
      setStage('ready');
    } catch (caught) {
      await logAppError('pdf', 'The invitation PDF could not be created', caught);
      setError('The invitation could not be created. Check the template under Invitations and try again.');
      await recordDispatchEvent(guest.id, 'failed', 'native-share', {
        errorMessage: 'The invitation PDF could not be created',
      });
      setStage('failed');
    }
  }, []);

  useEffect(() => {
    if (guest) void prepare();
    // Keyed on the ids only: a live-query refresh must not re-run the generator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest?.id, template?.id, prepare]);

  if (!guest) return null;

  const copyMessage = async () => {
    const copied = await copyText(message);
    showToast({
      message: copied
        ? 'Message copied. Paste it in WhatsApp.'
        : 'Copying is blocked here. Select the message and copy it by hand.',
      tone: copied ? 'success' : 'error',
    });
    return copied;
  };

  const afterAction = (method: DispatchMethod) => {
    setLastMethod(method);
    setStage('awaiting');
  };

  const onShare = async () => {
    if (!pdf) return;
    setBusy(true);
    await copyText(message);

    const file = new File([pdf.blob], fileName, { type: 'application/pdf' });
    const outcome = await shareFiles({ files: [file], title: 'Wedding invitation', text: message });
    setBusy(false);

    if (outcome === 'opened') {
      await recordDispatchEvent(guest.id, 'share-opened', 'native-share');
      afterAction('native-share');
      return;
    }
    if (outcome === 'cancelled') {
      showToast({ message: 'Sharing was cancelled. Nothing was recorded.' });
      return;
    }
    setError(
      'This browser cannot share files. Use "Open WhatsApp" for the text, or download the PDF and attach it yourself.'
    );
  };

  const onWhatsApp = async () => {
    if (!phone?.normalized) return;
    setBusy(true);
    const opened = window.open(buildWhatsAppLink(phone.normalized, message), '_blank', 'noopener');
    setBusy(false);

    if (!opened) {
      setError('The browser blocked the new window. Allow pop-ups, or copy the message and open WhatsApp yourself.');
      return;
    }
    await recordDispatchEvent(guest.id, 'whatsapp-opened', 'whatsapp-link', {
      note: 'Text only. The PDF is not attached by this link.',
    });
    afterAction('whatsapp-link');
  };

  const onDownload = async () => {
    if (!pdf) return;
    setBusy(true);
    downloadBlob(pdf.blob, fileName);
    await copyText(message);
    await recordDispatchEvent(guest.id, 'downloaded', 'manual-download');
    setBusy(false);
    afterAction('manual-download');
  };

  const recordAnswer = async (sent: boolean) => {
    setBusy(true);
    const update = await recordDispatchEvent(
      guest.id,
      sent ? 'confirmed-sent' : 'not-sent',
      lastMethod
    );
    setBusy(false);
    showToast({
      message: sent ? `Marked as sent to ${guest.primaryGuestName}` : 'Marked as not sent',
      tone: sent ? 'success' : 'neutral',
      action: update ? { label: 'Undo', onClick: () => void undoDispatch(update.snapshot) } : undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Send to ${guest.primaryGuestName}`}
      description={guest.village ?? undefined}
      footer={
        stage === 'awaiting' ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Did the invitation actually go out?</p>
            <div className="flex gap-2">
              <Button variant="quiet" size="block" pending={busy} onClick={() => void recordAnswer(false)}>
                Not sent
              </Button>
              <Button size="block" pending={busy} onClick={() => void recordAnswer(true)}>
                Confirm sent
              </Button>
            </div>
            <Button variant="ghost" size="block" onClick={() => setStage('ready')}>
              Try again
            </Button>
          </div>
        ) : (
          <Button variant="quiet" size="block" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

        {stage === 'preparing' ? (
          <p className="py-4 text-center text-sm text-muted">Making the invitation…</p>
        ) : null}

        {stage === 'failed' ? (
          <Button size="block" onClick={() => void prepare()}>
            Try again
          </Button>
        ) : null}

        {stage !== 'preparing' && stage !== 'failed' ? (
          <>
            {!template ? (
              <InlineNotice tone="warning">
                No invitation card is set up yet, so only the message can be sent.{' '}
                <Link href="/invitations" className="font-semibold underline">
                  Add your card
                </Link>{' '}
                to attach a personalised PDF.
              </InlineNotice>
            ) : null}

            {fitWarning ? (
              <InlineNotice tone="error">
                {fitWarning} The PDF is still made, so look at it before you send it.
              </InlineNotice>
            ) : null}

            {fontWarning ? <InlineNotice tone="warning">{fontWarning}</InlineNotice> : null}

            {pdf ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/5 px-3 py-2 text-sm text-success">
                  <span className="min-w-0 truncate">
                    Invitation ready
                    {pdf.shrunk ? ` · name shrunk to ${Math.round(pdf.fit.fontSize)}` : ''}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 font-semibold underline"
                    onClick={() => setShowPreview((current) => !current)}
                  >
                    {showPreview ? 'Hide' : 'Look at it'}
                  </button>
                </div>
                {showPreview ? <PdfPreview blob={pdf.blob} fileName={fileName} /> : null}
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-sm font-medium">Message</p>
              <p className="whitespace-pre-wrap rounded-lg border border-hairline bg-surface px-3 py-2 text-sm leading-relaxed">
                {message}
              </p>
              <Button variant="quiet" size="sm" className="mt-2" onClick={() => void copyMessage()}>
                <Copy className="h-4 w-4" aria-hidden />
                Copy message
              </Button>
            </div>

            {stage === 'ready' ? (
              <div className="space-y-2">
                {!online ? (
                  <InlineNotice tone="warning">
                    You are offline. The invitation is ready and can be downloaded, but WhatsApp
                    will not open until the connection is back.
                  </InlineNotice>
                ) : null}
                {capabilities.canShareFiles ? (
                  <Button size="block" pending={busy} disabled={!pdf} onClick={() => void onShare()}>
                    <Share2 className="h-4 w-4" aria-hidden />
                    Share invitation
                  </Button>
                ) : (
                  <InlineNotice tone="info">
                    This browser cannot attach files to the share sheet. Use WhatsApp for the text,
                    or download the PDF and attach it yourself.
                  </InlineNotice>
                )}

                {phone?.normalized ? (
                  <Button variant="quiet" size="block" pending={busy} onClick={() => void onWhatsApp()}>
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Open WhatsApp with the text
                  </Button>
                ) : (
                  <InlineNotice tone="warning">
                    {guest.rawPhone
                      ? `WhatsApp cannot be opened: ${phone?.message ?? 'this number cannot be used'}.`
                      : 'This guest has no WhatsApp number, so only download works.'}
                  </InlineNotice>
                )}

                {pdf ? (
                  <Button variant="quiet" size="block" pending={busy} onClick={() => void onDownload()}>
                    <Download className="h-4 w-4" aria-hidden />
                    Download the PDF to send by hand
                  </Button>
                ) : null}

                {pdf ? (
                  <Button variant="ghost" size="block" pending={busy} onClick={() => void prepare()}>
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Make the invitation again
                  </Button>
                ) : null}

                <p className="text-xs text-muted">
                  Opening WhatsApp sends the text only — the PDF is never attached automatically.
                  Nothing is recorded as sent until you confirm it.
                </p>
              </div>
            ) : null}

            {stage === 'awaiting' ? (
              <InlineNotice tone="info">
                {lastMethod === 'native-share'
                  ? 'The share sheet was opened. The app cannot tell whether you finished sending.'
                  : lastMethod === 'whatsapp-link'
                    ? 'WhatsApp was opened with the message. Attach the downloaded PDF there if you need it.'
                    : 'The PDF was downloaded and the message copied. Attach it in WhatsApp, then come back.'}
              </InlineNotice>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
