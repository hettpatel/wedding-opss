import { ModuleNotReady } from '@/components/shell/module-not-ready';

export default function VendorsPage() {
  return (
    <ModuleNotReady
      title="Vendors"
      phase="a later stage of the build"
      planned={[
        'Vendor contacts with phone numbers and village',
        'Quoted amount, advance paid and balance due',
        'Receipts attached to each vendor',
      ]}
    />
  );
}
