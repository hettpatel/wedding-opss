# Wedding Ops — Kahoda

A personal, offline-first PWA for running one wedding: tasks, guests, invitations and
spending. Single user, no account, no server, no subscription. All data lives in IndexedDB
on the phone that uses it.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build (static export — the whole app becomes plain files in `out/`):

```bash
npm run build
npx serve out      # or upload out/ to any free static host
```

The service worker is deliberately **not** registered in development, so you always see
fresh code. Install and offline behaviour only work from a production build served over
HTTPS (or localhost).

Hosting under a sub-folder (GitHub Pages project sites):

```bash
NEXT_PUBLIC_BASE_PATH=/wedding-ops npm run build
```

Other commands:

```bash
npm run typecheck  # tsc --noEmit
npm run lint
npm test           # vitest
```

## What works today

**Phase 1 — shell and storage**
- Installable PWA: manifest, icons, service worker, offline fallback screen
- Online/offline indicator; writes confirm with "saved on this phone"
- Bottom navigation on mobile, sidebar on tablet/desktop
- IndexedDB (Dexie) with all 16 tables, seeded categories and settings
- Settings: event dates, venue, address, map link, couple names, default country code
- Backup: export everything (including photos) to one JSON file; import with a preview,
  a choice between "add what is missing" and "replace everything", and an automatic
  safety export before any destructive restore
- Storage usage screen with quota warnings and a persistent-storage request
- Demo data behind an explicit action, tagged `source: 'demo'` and removable in one step

**Phase 2 — tasks (complete)**
- Natural-language input ("Describe what needs to be done") with a deterministic local
  parser — no AI service, no network
- Structured preview before anything is saved, with uncertain fields highlighted and
  optional chips for what is missing
- Full task record: category, priority, status, target and reminder dates, assignee,
  vendor, phone, estimated and actual money, quantity and unit, blocker reason,
  completion notes, notes thread, proof photos and receipts
- Custom categories: add, rename and delete. Deleting moves its tasks to a category you
  pick — a category can never take tasks down with it
- Views (Today / Upcoming / Overdue / High priority / Blocked / Completed / All), search,
  filters, sorting, one-tap completion with undo, reopen with undo, confirmed deletion
- "Before the wedding" resolves to the date read out of the Event dates setting; with no
  date saved it adds nothing and says why
- Cards on mobile, a table on desktop

**Phase 3 — guests (complete)**
- Guest households with side, expected head count, village, notes and invitation status
- Manual entry with live phone normalisation and a duplicate warning that never blocks you
- Contact Picker support where the browser has it, hidden everywhere else
- Excel (.xlsx, .xls) and CSV import: sheet choice, header-row detection, suggested column
  mapping you can correct, and a preview that separates ready rows, rows with warnings and
  rows that cannot be imported
- A missing or broken phone number is a warning, never a reason to drop a guest. Only a row
  with no name at all is rejected
- Rows needing attention download as a CSV with the reason attached
- Duplicate review with five choices per row — keep existing, replace, add separately, skip,
  or import and flag. Anything left undecided is imported as a new household and marked
  "Needs Review": nothing is ever merged, replaced or skipped on its own
- Search, filters, sorting, bulk selection, bulk status change with confirmation and undo

**Phase 4 — the invitation card (complete)**
- Upload a PNG, JPG or PDF card. Multi-page PDFs are fine: pick the page, and that page's
  real size is re-read so the stored percentages resolve against it
- Drag and resize the guest-name box over the card, or use the arrow keys (shift to
  resize), or type exact percentages. Positions are stored as percentages of the page, so
  the same layout holds on a 320px phone and a 1240pt print
- Font, size, minimum size, colour, alignment, line count and auto-shrink
- **Fonts are really embedded.** Three SIL Open Font License files ship in `public/fonts`
  and are subset into each PDF through `@pdf-lib/fontkit`. They are also precached by the
  service worker, so invitations can still be built with no connection
- **The editor measures with the same embedded font the PDF uses**, so the fit shown on
  screen and the result in the file cannot disagree
- "Try a name" builds a real PDF from the current layout — short name, usual name, a very
  long one, or the longest name actually in your guest list — and shows it inline with its
  fit result, so the layout is proven before 500 invitations are made from it
- The layout autosaves; personalised PDFs are built on demand and never stored

**Phase 5 — message and sending (complete)**
- Message editor with the five merge tags, tap-to-insert, a live preview against a real
  guest, a warning for tags the app does not know, and a warning for tags whose setting is
  still empty
- Three ways to send, each chosen by feature detection:
  1. **Share sheet** — generates the PDF, copies the message to the clipboard, then opens
     the system share sheet with the file attached
  2. **WhatsApp text** — opens a properly encoded click-to-chat link, and says plainly that
     the PDF is not attached by this route
  3. **Download** — saves the PDF and copies the message so you can attach it yourself
- Every route ends with the same question: Confirm sent / Not sent / Try again
- A full history of attempts per guest, and Undo on the confirmation

### Nothing is sent until you say so

`applyDispatchEvent` is the only code that can change an invitation's status, and the only
event that produces "Sent Confirmed Manually" is an explicit confirmation. Opening the
share sheet records "Share Sheet Opened"; opening WhatsApp records "WhatsApp Opened";
downloading records nothing more than "Invitation Generated". A guest already confirmed as
sent is never downgraded by a later action. All of this is unit tested.

## What is not built yet

| Screen | Phase |
| --- | --- |
| Vendors, expenses | 6 |

### Fonts

`public/fonts` holds Liberation Serif, Liberation Sans and Liberation Serif Italic, all
under the SIL Open Font License, which expressly permits embedding and redistribution.
`public/fonts/LICENSE.txt` and `README.txt` carry the licence and the attribution.

No cursive face is bundled, because none with a redistributable licence was available when
this was built. Drop an OFL script font in as `public/fonts/script.ttf` and the "Script"
option picks it up automatically. Until then that option falls back to the italic serif and
the editor says so rather than pretending.

Text shadow is in the spec as optional "only if PDF output can reproduce it consistently".
It is not implemented: pdf-lib has no shadow primitive, and faking one with offset text
renders differently across PDF viewers.

The groundwork for those phases is already here and unit tested: phone normalisation,
duplicate detection, merge-tag rendering, filename sanitisation, coordinate conversion
(screen ↔ percentage ↔ PDF) and the long-name fitting algorithm. The data models, Zod
schemas and Dexie tables for guests, templates, messages and dispatch attempts are written
and included in backups.

SheetJS is loaded only when an Excel file is actually opened, so it stays out of the main
bundle. The registry build is pinned in `package.json`; if you would rather use the
official SheetJS distribution, swap it for
`npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.

pdf-lib is loaded only when an invitation is actually generated, so it stays out of the
first paint.

For PDF fonts, `pdf-lib` embeds Times-Roman (serif) and Helvetica (sans) with no extra
files. A script/cursive option needs one redistributable TTF dropped into
`public/fonts/` and registered through `@pdf-lib/fontkit`.

## Architecture

```
src/
  app/                  routes (App Router, all client-rendered, static-exportable)
  components/ui/        button, card, dialog, toast, form controls, feedback
  components/shell/     navigation, top bar, service worker, install prompt
  features/
    tasks/              components, hooks, queries, form schema, service
    demo/               demo data loader and remover
    dashboard/          stat tile
  hooks/                online status, settings, attachment counts
  lib/
    db/                 Dexie schema, repository abstraction, seeding, settings service
    models/             TypeScript types + Zod schemas for every record
    nlp/                the natural-language task parser, split into small pure functions
    format/             currency, date, phone, filename, coordinates
    pdf/                text fitting
    message/            merge tags
    guests/             duplicate detection
    files/              validation and download
    storage/            quota
    backup/             export, preview, restore
```

Every record carries `id`, `createdAt`, `updatedAt`, `schemaVersion` and `source`.
`schemaVersion` travels inside backups so future migrations stay possible.

The UI only talks to `Repository<T>` (`src/lib/db/repository.ts`), implemented today by
`DexieRepository`. An optional cloud backup adapter can be added behind the same interface
without touching any component.

### A note on shadcn/ui

The UI primitives follow shadcn's conventions — `cva` variants, a `cn()` merge helper,
small composable components you own and edit — but they are hand-written rather than
pulled from the registry, so the app has no Radix dependency. The dialog implements its
own focus trap, Escape handling and `aria-modal`. If you prefer the real thing later,
`npx shadcn@latest add dialog` drops in beside these with the same API surface.

## Testing

```bash
npm test
```

164 unit tests cover the parts where a silent mistake would be expensive: category
detection (including custom categories), priority detection, relative, weekday and
explicit date parsing, the wedding-date anchor, currency and quantity parsing, Indian
phone normalisation, merge-tag replacement, filename sanitisation, duplicate guest
detection, coordinate conversion, long-name fitting, task filtering and sorting, category
naming rules, form-to-record mapping, the repository behaviour that Undo depends on, CSV
parsing (quotes, embedded newlines, semicolon and tab files), header-row detection, column
mapping, row validation, the rejected-row report, duplicate resolution, and guest
filtering and sorting, invitation status transitions, merge-value building, and name fitting across short,
usual, very long and single-unbreakable-word household names.

**The no-silent-overflow rule has its own test.** Across every combination of those names
and four box shapes, the fitter must either report `fits: true` with no reason, or
`fits: false` with a plain-English explanation — and in both cases the joined output lines
must still equal the original name exactly. Nothing is ever clipped, truncated or dropped
without the app saying so.

### What the tests do and do not prove

The storage tests run against an in-memory stand-in for a Dexie table. They prove the
record shaping and the Undo contract (restoring a snapshot returns the row to its exact
earlier state, `updatedAt` included). They do not exercise IndexedDB itself, and nothing
here can test rendering. Run through the checks below on a real phone once.

### Genuine browser limitations

These are not bugs and cannot be fixed in app code:

- **The PDF code is cached on first use, not on install.** Fonts are precached, but the
  pdf-lib chunk is only cached once an invitation has been generated. Generate one
  invitation while online; after that it works offline.
- **Nothing can tell you whether a message was really sent.** The Web Share API returns
  when the sheet closes, not when the recipient has it. This is why confirmation is manual.
- **File sharing is not everywhere.** `navigator.canShare({files})` is false on desktop
  Firefox and older iOS; those browsers get the WhatsApp text route and download instead.
- **Inline PDF preview depends on the browser.** Some Android WebViews download the file
  rather than render it in the frame; the download button sits next to the preview.
- **The Contact Picker is Chromium-on-Android only.** The button does not appear elsewhere.
- **iOS has no install prompt.** `beforeinstallprompt` never fires, so the install card
  stays hidden; installing means Share then "Add to Home Screen".
- **Private browsing may refuse storage.** IndexedDB can be blocked, in which case the app
  says so on a dedicated screen instead of failing silently. Draft autosave is guarded too.
- **A very large backup is one JSON string.** Hundreds of photos can exhaust memory on a
  low-end phone. Export regularly and delete attachments you no longer need.

### Checks to run on the phone

1. Add a task by dictation, correct a field in the preview, save, then **reload the
   browser** — the task should still be there with its original sentence attached.
2. Complete a task, tap Undo in the toast, confirm the status and dates return.
3. Switch the phone to aeroplane mode, then open the app from the home-screen icon. Add
   a task, edit one, search, and export a backup. All of it should work.
4. At 360px width, check that nothing scrolls sideways and the bottom bar never covers a
   field or a button.
5. Attach a photo to a task, reload, and confirm it is still attached.
6. Import a real guest spreadsheet. Check that the preview counts match the file, that a
   row with a bad number is a warning rather than a rejection, and that the downloaded
   "rows to check" CSV opens cleanly in Excel.
7. Import the same file twice. The second time, every row should appear in the duplicate
   step, and leaving them alone should add them as flagged rather than overwrite anything.
8. Upload your card, drag the name box onto the blank line, then use "Try a name" with the
   long preset and with the longest name in your own list. Check the PDF that comes out.
9. Change the font and confirm the sample redraws — that proves the embedded font loaded.
10. Open the share sheet and then dismiss it without sending. The guest must read "Share
   Sheet Opened", never "Sent Confirmed Manually".
11. Do the same with WhatsApp, answer "Not sent", and confirm the guest goes back to
    "Invitation Generated" rather than staying stuck.

## Design

Deep Crimson `#800020` for primary actions and active navigation. Royal Gold `#D4AF37`
only for highlights, selected chips and the "check this" outline — never for body text.
White cards on an ivory `#FFFDD0` background, minimal shadows, 48px minimum touch targets,
system fonts (nothing is fetched from a font CDN, so the app renders identically offline).

## Rules the app follows

- Nothing is saved from a sentence without showing a structured preview first.
- A date, quantity, vendor, phone number or amount is never invented. If it was not said,
  the field stays empty and is offered as an optional chip.
- High priority is only set when urgency is actually stated.
- The original sentence is always kept on the task.
- Destructive actions confirm; reversible ones offer undo.
- Nothing is ever recorded as "sent" without a manual confirmation (enforced in the data
  model: `Sent Confirmed Manually` is the only confirmed state).
