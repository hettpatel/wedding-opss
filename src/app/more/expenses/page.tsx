import { ModuleNotReady } from '@/components/shell/module-not-ready';

export default function ExpensesPage() {
  return (
    <ModuleNotReady
      title="Expenses"
      phase="a later stage of the build"
      planned={[
        'Simple expense register with payment status',
        'Estimated, actual, paid and outstanding totals',
        'Receipt photos linked to tasks and vendors',
      ]}
    />
  );
}
