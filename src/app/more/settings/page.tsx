'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/form-controls';
import { InlineNotice } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { useAppSettings, useWeddingSettings, updateAppSettings, updateWeddingSettings } from '@/hooks/use-app-data';
import { loadDemoData, removeDemoData } from '@/features/demo/demo-data';
import { formatDisplayDateTime } from '@/lib/format/date';

export default function SettingsPage() {
  const wedding = useWeddingSettings();
  const app = useAppSettings();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    eventDates: '',
    venueName: '',
    venueAddress: '',
    mapLink: '',
    groomName: '',
    brideName: '',
    defaultCountryCode: '91',
  });
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [confirmRemoveDemo, setConfirmRemoveDemo] = useState(false);

  useEffect(() => {
    if (!wedding || !app || dirty) return;
    setForm({
      eventDates: wedding.eventDates,
      venueName: wedding.venueName,
      venueAddress: wedding.venueAddress,
      mapLink: wedding.mapLink,
      groomName: wedding.groomName,
      brideName: wedding.brideName,
      defaultCountryCode: app.defaultCountryCode,
    });
  }, [app, dirty, wedding]);

  const set = (key: keyof typeof form) => (value: string) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    const nextErrors: Record<string, string> = {};
    if (form.mapLink && !/^https?:\/\//i.test(form.mapLink)) {
      nextErrors.mapLink = 'A map link starts with https://';
    }
    if (!/^\d{1,4}$/.test(form.defaultCountryCode)) {
      nextErrors.defaultCountryCode = 'Use digits only, for example 91';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    await updateWeddingSettings({
      eventDates: form.eventDates,
      venueName: form.venueName,
      venueAddress: form.venueAddress,
      mapLink: form.mapLink,
      groomName: form.groomName,
      brideName: form.brideName,
    });
    await updateAppSettings({ defaultCountryCode: form.defaultCountryCode });
    setSaving(false);
    setDirty(false);
    showToast({ message: 'Settings saved on this phone', tone: 'success' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Wedding details"
          description="These are used in the invitation message later on."
        />
        <div className="space-y-4 p-4">
          <Field label="Event dates" htmlFor="event-dates" hint="For example: 12 to 14 June 2026">
            <Input
              id="event-dates"
              value={form.eventDates}
              onChange={(event) => set('eventDates')(event.target.value)}
            />
          </Field>

          <Field label="Venue name" htmlFor="venue-name">
            <Input
              id="venue-name"
              value={form.venueName}
              onChange={(event) => set('venueName')(event.target.value)}
            />
          </Field>

          <Field label="Full venue address" htmlFor="venue-address">
            <Textarea
              id="venue-address"
              rows={3}
              value={form.venueAddress}
              onChange={(event) => set('venueAddress')(event.target.value)}
            />
          </Field>

          <Field label="Map link" htmlFor="map-link" error={errors.mapLink} hint="Paste the share link from your maps app">
            <Input
              id="map-link"
              inputMode="url"
              value={form.mapLink}
              onChange={(event) => set('mapLink')(event.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Groom's name" htmlFor="groom-name">
              <Input
                id="groom-name"
                value={form.groomName}
                onChange={(event) => set('groomName')(event.target.value)}
              />
            </Field>
            <Field label="Bride's name" htmlFor="bride-name">
              <Input
                id="bride-name"
                value={form.brideName}
                onChange={(event) => set('brideName')(event.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Default country code"
            htmlFor="country-code"
            error={errors.defaultCountryCode}
            hint="Used when a phone number has no country code. India is 91."
          >
            <Input
              id="country-code"
              inputMode="numeric"
              value={form.defaultCountryCode}
              onChange={(event) => set('defaultCountryCode')(event.target.value)}
            />
          </Field>

          <Button size="block" pending={saving} onClick={() => void save()}>
            Save settings
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Demo data"
          description="Sample tasks, vendors, expenses and guests, kept separate from your real data."
        />
        <div className="space-y-3 p-4">
          {app?.demoDataLoadedAt ? (
            <InlineNotice tone="info">
              Demo data was loaded on {formatDisplayDateTime(app.demoDataLoadedAt)}. Everything it
              created is marked as demo and can be removed in one step.
            </InlineNotice>
          ) : (
            <p className="text-sm text-muted">
              Loading demo data adds 10 tasks, 3 vendors, 3 expenses and 6 guest households. Your
              own records are never changed.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="quiet"
              size="block"
              pending={demoBusy}
              onClick={async () => {
                setDemoBusy(true);
                const summary = await loadDemoData();
                setDemoBusy(false);
                showToast({
                  message: `Added ${summary.tasks} demo tasks and ${summary.guests} demo guests`,
                  tone: 'success',
                });
              }}
            >
              Load demo data
            </Button>
            <Button
              variant="quiet"
              size="block"
              disabled={!app?.demoDataLoadedAt}
              onClick={() => setConfirmRemoveDemo(true)}
            >
              Remove demo data
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmRemoveDemo}
        title="Remove all demo data?"
        description="Only records marked as demo will be deleted. Anything you created yourself stays exactly as it is."
        confirmLabel="Remove demo data"
        destructive
        pending={demoBusy}
        onCancel={() => setConfirmRemoveDemo(false)}
        onConfirm={async () => {
          setDemoBusy(true);
          const summary = await removeDemoData();
          setDemoBusy(false);
          setConfirmRemoveDemo(false);
          showToast({ message: `Removed ${summary.tasks + summary.guests + summary.vendors + summary.expenses} demo records` });
        }}
      />
    </div>
  );
}
