import { addDays } from 'date-fns';
import { getDb } from '@/lib/db/db';
import { createRecord } from '@/lib/db/records';
import { repositories } from '@/lib/db/repositories';
import { updateAppSettings } from '@/lib/db/settings-service';
import { nowIso, toIsoDate } from '@/lib/format/date';
import { normalizePhone } from '@/lib/format/phone';
import type {
  Expense,
  GuestHousehold,
  TaskCategory,
  Vendor,
  WeddingTask,
} from '@/lib/models';

export interface DemoSummary {
  tasks: number;
  vendors: number;
  expenses: number;
  guests: number;
}

function categoryId(categories: TaskCategory[], name: string): string {
  return categories.find((category) => category.name === name)?.id ?? categories[0]?.id ?? '';
}

/** Everything created here carries source: 'demo' so it can be removed in one step. */
export async function loadDemoData(): Promise<DemoSummary> {
  const db = getDb();
  const categories = await db.taskCategories.orderBy('sortOrder').toArray();
  const today = new Date();
  const day = (offset: number) => toIsoDate(addDays(today, offset));

  const vendors: Vendor[] = [
    createRecord<Vendor>(
      {
        name: 'Mahesh Decorators',
        categoryId: categoryId(categories, 'Venue & Decor'),
        contactPerson: 'Mahesh Patel',
        phone: '9876543210',
        alternatePhone: null,
        village: 'Visnagar',
        notes: 'Quoted for stage, mandap and entrance gate.',
        quotedAmount: 185000,
        advancePaid: 50000,
      },
      'demo'
    ),
    createRecord<Vendor>(
      {
        name: 'Shree Umiya Caterers',
        categoryId: categoryId(categories, 'Catering & Menu'),
        contactPerson: 'Dinesh bhai',
        phone: '9123456780',
        alternatePhone: '02762 234567',
        village: 'Mehsana',
        notes: 'Rate is per plate. Final count needed three days before.',
        quotedAmount: 420000,
        advancePaid: 100000,
      },
      'demo'
    ),
    createRecord<Vendor>(
      {
        name: 'Krishna Travels',
        categoryId: categoryId(categories, 'Transport & Vehicles'),
        contactPerson: 'Jayesh',
        phone: '9988776655',
        alternatePhone: null,
        village: 'Kahoda',
        notes: 'Three 32-seat buses held for the baraat day.',
        quotedAmount: 54000,
        advancePaid: 0,
      },
      'demo'
    ),
  ];

  const tasks: WeddingTask[] = [
    demoTask({
      title: 'Get quotation from Mahesh decorator for stage and mandap',
      originalInput:
        'Get quotation from Mahesh decorator for stage and mandap by next Sunday, high priority, expected budget 75000',
      categoryId: categoryId(categories, 'Venue & Decor'),
      priority: 'High',
      status: 'In Progress',
      targetDate: day(4),
      vendorName: 'Mahesh Decorators',
      vendorPhone: '9876543210',
      estimatedExpense: 185000,
    }),
    demoTask({
      title: 'Confirm final plate count with the caterer',
      originalInput: 'Confirm final plate count with caterer today',
      categoryId: categoryId(categories, 'Catering & Menu'),
      priority: 'High',
      targetDate: day(0),
      vendorName: 'Shree Umiya Caterers',
      vendorPhone: '9123456780',
      quantityValue: 650,
      quantityUnit: 'plates',
    }),
    demoTask({
      title: 'Pay advance to Krishna Travels for three buses',
      originalInput: 'Pay advance to Krishna Travels for 3 buses, 54000',
      categoryId: categoryId(categories, 'Transport & Vehicles'),
      priority: 'Medium',
      targetDate: day(-5),
      vendorName: 'Krishna Travels',
      estimatedExpense: 54000,
      quantityValue: 3,
      quantityUnit: 'buses',
    }),
    demoTask({
      title: 'Order mameru gift boxes',
      originalInput: 'Order 200 boxes for mameru',
      categoryId: categoryId(categories, 'Mameru Gifts'),
      priority: 'Medium',
      status: 'Blocked',
      blockerReason: 'Waiting for the final list from mama ji',
      targetDate: day(6),
      quantityValue: 200,
      quantityUnit: 'boxes',
    }),
    demoTask({
      title: 'Book rooms for outstation guests',
      originalInput: 'Book 20 rooms for outstation guests before the wedding',
      categoryId: categoryId(categories, 'Guest Accommodation'),
      priority: 'Medium',
      targetDate: day(9),
      quantityValue: 20,
      quantityUnit: 'rooms',
      estimatedExpense: 48000,
    }),
    demoTask({
      title: 'Fix muhurat timing with pandit ji',
      originalInput: 'Fix muhurat timing with pandit ji, important',
      categoryId: categoryId(categories, 'Rituals & Puja'),
      priority: 'High',
      status: 'Completed',
      targetDate: day(-9),
      completedAt: nowIso(),
      completionNotes: 'Muhurat fixed for the morning slot.',
    }),
    demoTask({
      title: 'Send WhatsApp invitations to the Kahoda list',
      originalInput: 'Send whatsapp invitation to Kahoda guests next week',
      categoryId: categoryId(categories, 'Invitations & Communication'),
      priority: 'Medium',
      targetDate: day(7),
    }),
    demoTask({
      title: 'Collect drone footage quotation from the photographer',
      originalInput: 'Collect drone footage quote from photographer',
      categoryId: categoryId(categories, 'Photography & Media'),
      priority: 'Low',
      targetDate: day(12),
    }),
    demoTask({
      title: 'Settle the balance for the sound system',
      originalInput: 'Settle balance payment for sound system',
      categoryId: categoryId(categories, 'Finance & Payments'),
      priority: 'Medium',
      targetDate: day(-2),
      estimatedExpense: 22000,
    }),
    demoTask({
      title: 'Buy spare torches and extension boards',
      originalInput: 'Buy spare torches and extension boards',
      categoryId: categoryId(categories, 'Miscellaneous'),
      priority: 'Low',
    }),
  ];

  const expenses: Expense[] = [
    createRecord<Expense>(
      {
        description: 'Advance to Mahesh Decorators',
        categoryId: categoryId(categories, 'Venue & Decor'),
        vendorId: vendors[0]?.id ?? null,
        taskId: tasks[0]?.id ?? null,
        amount: 50000,
        paymentStatus: 'Advance Paid',
        paymentDate: day(-12),
        paymentMethod: 'UPI',
        notes: null,
        receipt: null,
        receiptFileName: null,
      },
      'demo'
    ),
    createRecord<Expense>(
      {
        description: 'Caterer booking advance',
        categoryId: categoryId(categories, 'Catering & Menu'),
        vendorId: vendors[1]?.id ?? null,
        taskId: null,
        amount: 100000,
        paymentStatus: 'Advance Paid',
        paymentDate: day(-20),
        paymentMethod: 'Bank Transfer',
        notes: null,
        receipt: null,
        receiptFileName: null,
      },
      'demo'
    ),
    createRecord<Expense>(
      {
        description: 'Sound system balance',
        categoryId: categoryId(categories, 'Finance & Payments'),
        vendorId: null,
        taskId: tasks[8]?.id ?? null,
        amount: 22000,
        paymentStatus: 'Unpaid',
        paymentDate: null,
        paymentMethod: null,
        notes: 'Due on the function day.',
        receipt: null,
        receiptFileName: null,
      },
      'demo'
    ),
  ];

  const guests: GuestHousehold[] = [
    demoGuest('Rameshbhai Kanjibhai Patel', 'Mr. & Mrs. Rameshbhai Patel', '9876543210', 'Kahoda', 'Groom', 4, 'Pending'),
    demoGuest('Dinesh Chaudhary', 'Dinesh Chaudhary & Family', '+91 91234 56780', 'Mehsana', 'Bride', 3, 'Invitation Generated'),
    demoGuest(
      'Shri Jashvantbhai Maganbhai Chaudhary and family',
      'Shri Jashvantbhai Maganbhai Chaudhary & Parivar',
      '09988776655',
      'Visnagar',
      'Common',
      6,
      'WhatsApp Opened'
    ),
    demoGuest('Kiran Thakor', 'Kiran Thakor', '98765', 'Unjha', 'Groom', 2, 'Needs Review'),
    demoGuest('Hasmukhbhai Patel', 'Hasmukhbhai Patel', 'number not available', 'Kahoda', 'Common', 5, 'Needs Review'),
    demoGuest('Nileshbhai Patel', 'Nileshbhai Patel & Family', '9123456781', 'Ahmedabad', 'Bride', 4, 'Sent Confirmed Manually'),
  ];

  await db.transaction('rw', db.tasks, db.vendors, db.expenses, db.guests, async () => {
    await db.vendors.bulkPut(vendors);
    await db.tasks.bulkPut(tasks);
    await db.expenses.bulkPut(expenses);
    await db.guests.bulkPut(guests);
  });

  await updateAppSettings({ demoDataLoadedAt: nowIso() });

  return {
    tasks: tasks.length,
    vendors: vendors.length,
    expenses: expenses.length,
    guests: guests.length,
  };
}

export async function removeDemoData(): Promise<DemoSummary> {
  const isDemo = (record: { source: string }) => record.source === 'demo';

  const summary: DemoSummary = {
    tasks: await repositories.tasks.removeWhere(isDemo),
    vendors: await repositories.vendors.removeWhere(isDemo),
    expenses: await repositories.expenses.removeWhere(isDemo),
    guests: await repositories.guests.removeWhere(isDemo),
  };

  await updateAppSettings({ demoDataLoadedAt: null });

  return summary;
}

type DemoTaskInput = Omit<Partial<WeddingTask>, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion' | 'source'> & {
  title: string;
  categoryId: string;
};

function demoTask(input: DemoTaskInput): WeddingTask {
  return createRecord<WeddingTask>(
    {
      originalInput: input.title,
      priority: 'Medium',
      status: 'Open',
      targetDate: null,
      reminderDate: null,
      assignedTo: null,
      details: null,
      blockerReason: null,
      vendorId: null,
      vendorName: null,
      vendorPhone: null,
      estimatedExpense: null,
      actualExpense: null,
      quantityValue: null,
      quantityUnit: null,
      completionNotes: null,
      completedAt: null,
      ...input,
    },
    'demo'
  );
}

function demoGuest(
  primaryGuestName: string,
  invitationDisplayName: string,
  rawPhone: string,
  village: string,
  side: GuestHousehold['side'],
  expectedGuestCount: number,
  invitationStatus: GuestHousehold['invitationStatus']
): GuestHousehold {
  const phone = normalizePhone(rawPhone);
  return createRecord<GuestHousehold>(
    {
      primaryGuestName,
      invitationDisplayName,
      rawPhone,
      normalizedPhone: phone.normalized,
      countryCode: phone.countryCode,
      village,
      side,
      expectedGuestCount,
      notes: null,
      invitationStatus,
      generatedAt: null,
      shareSheetOpenedAt: null,
      whatsAppOpenedAt: null,
      sentConfirmedAt: invitationStatus === 'Sent Confirmed Manually' ? nowIso() : null,
      lastError: phone.status === 'ok' ? null : (phone.message ?? null),
      needsReview: phone.status !== 'ok',
      importBatchId: null,
    },
    'demo'
  );
}
