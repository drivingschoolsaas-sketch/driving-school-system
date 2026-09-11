'use client';

// ==================================================
// Record Payment Form (Client Component)
// ==================================================
// Inline form for recording manual payments (cash,
// bank transfer, etc.) — admin action.

import { useState, useActionState } from 'react';
import { recordPaymentAction, type PaymentActionState } from './actions';

interface Props {
  students: Array<{ id: string; display_name: string }>;
  primaryColor: string;
}

const initialState: PaymentActionState = { success: false };

const PAYMENT_TYPES = [
  { value: 'booking_full', label: 'Full Payment' },
  { value: 'booking_deposit', label: 'Deposit' },
  { value: 'package_purchase', label: 'Package Purchase' },
  { value: 'outstanding_balance', label: 'Outstanding Balance' },
];

export function RecordPaymentForm({ students, primaryColor }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(recordPaymentAction, initialState);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: primaryColor }}
      >
        💵 Record Payment
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Record Manual Payment
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕ Close
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount ($) *
            </label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              name="payment_type"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              {PAYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Student */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Student
          </label>
          <select
            name="student_id"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="">— No student linked —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            name="description"
            placeholder="e.g. Cash payment for 5-lesson package"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>

        {/* Messages */}
        {state.success && (
          <p className="text-sm text-green-600 dark:text-green-400">✓ Payment recorded successfully!</p>
        )}
        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400">✗ {state.error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Record Payment
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
