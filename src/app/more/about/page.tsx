'use client';

import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { APP_NAME, APP_VERSION } from '@/lib/constants';

const WORKING = [
  'Installable app that opens without internet',
  'Tasks written in your own words, checked before saving',
  'Task views, filters, search, notes and photos',
  'Guest households, Excel and CSV import with a full preview',
  'Duplicate review that never merges anything on its own',
  'Invitation card with the guest name placed by hand',
  'Personalised PDF, WhatsApp message and sharing with manual confirmation',
  'Settings, demo data, backup, restore and storage usage',
];

const NOT_BUILT_YET = ['Vendor directory and expense register'];

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={APP_NAME} description={`Version ${APP_VERSION}`} />
        <div className="space-y-3 p-4 text-sm">
          <p className="text-muted">
            A personal app for one wedding in Kahoda, Mehsana. Everything is stored on this phone.
            There is no account, no server and no subscription.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="What works today" />
        <ul className="space-y-2 p-4 text-sm">
          {WORKING.map((item) => (
            <li key={item} className="flex gap-2">
              <Badge tone="success">Ready</Badge>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Not built yet" description="These screens are empty on purpose." />
        <ul className="space-y-2 p-4 text-sm">
          {NOT_BUILT_YET.map((item) => (
            <li key={item} className="flex gap-2">
              <Badge tone="gold">Later</Badge>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
