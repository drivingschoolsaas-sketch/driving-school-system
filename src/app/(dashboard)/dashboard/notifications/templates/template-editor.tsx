'use client';

// ==================================================
// Notification Template Editor
// ==================================================
// Inline editor for notification email templates with
// live preview of {{variable}} interpolation.

import { useState, useActionState, useTransition } from 'react';
import { saveTemplateAction, resetTemplateAction } from './actions';
import type { TemplateActionState } from './actions';

interface Template {
  notification_type: string;
  channel: string;
  subject: string | null;
  body: string;
  is_active: boolean;
  is_custom: boolean;
}

interface Props {
  templates: Template[];
  primaryColor: string;
}

const TYPE_LABELS: Record<string, { label: string; description: string; variables: string[] }> = {
  booking_confirmed: {
    label: 'Booking Confirmed',
    description: 'Sent when a booking is confirmed',
    variables: ['student_name', 'instructor_name', 'lesson_type', 'date', 'start_time', 'end_time', 'pickup_address', 'school_name', 'cancellation_hours'],
  },
  booking_reminder: {
    label: 'Lesson Reminder',
    description: 'Sent the day before a lesson',
    variables: ['student_name', 'instructor_name', 'lesson_type', 'date', 'start_time', 'end_time', 'pickup_address', 'school_name'],
  },
  booking_changed: {
    label: 'Booking Updated',
    description: 'Sent when booking details change',
    variables: ['student_name', 'instructor_name', 'lesson_type', 'date', 'start_time', 'end_time', 'school_name'],
  },
  booking_cancelled: {
    label: 'Booking Cancelled',
    description: 'Sent when a booking is cancelled',
    variables: ['student_name', 'date', 'start_time', 'cancellation_reason', 'school_name'],
  },
  payment_receipt: {
    label: 'Payment Receipt',
    description: 'Sent after a successful payment',
    variables: ['student_name', 'amount', 'description', 'date', 'school_name'],
  },
  payment_failed: {
    label: 'Payment Failed',
    description: 'Sent when a payment fails',
    variables: ['student_name', 'amount', 'failure_reason', 'school_name'],
  },
  instructor_reassigned: {
    label: 'Instructor Changed',
    description: "Sent when a lesson's instructor changes",
    variables: ['student_name', 'instructor_name', 'date', 'school_name'],
  },
  review_request: {
    label: 'Review Request',
    description: 'Sent after a lesson is completed',
    variables: ['student_name', 'instructor_name', 'review_url', 'school_name'],
  },
  test_congratulations: {
    label: 'Test Passed',
    description: 'Sent when a student passes their test',
    variables: ['student_name', 'school_name'],
  },
  welcome: {
    label: 'Welcome Email',
    description: 'Sent when a student account is created',
    variables: ['student_name', 'school_name'],
  },
};

const initialState: TemplateActionState = { success: false };

export function TemplateEditorList({ templates, primaryColor }: Props) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {templates.map((template) => {
        const typeInfo = TYPE_LABELS[template.notification_type];
        const isEditing = editing === template.notification_type;

        return (
          <div
            key={template.notification_type}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => setEditing(isEditing ? null : template.notification_type)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {typeInfo?.label ?? template.notification_type}
                  </h3>
                  {template.is_custom && (
                    <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 text-[10px] font-medium">
                      Customised
                    </span>
                  )}
                  {!template.is_active && (
                    <span className="rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 text-[10px] font-medium">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {typeInfo?.description ?? ''}
                </p>
              </div>
              <span className="shrink-0 text-gray-400 dark:text-gray-500 text-sm ml-2">
                {isEditing ? '▲' : '▼'}
              </span>
            </button>

            {/* Editor */}
            {isEditing && (
              <TemplateForm
                template={template}
                variables={typeInfo?.variables ?? []}
                primaryColor={primaryColor}
                onClose={() => setEditing(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TemplateForm({
  template,
  variables,
  primaryColor,
  onClose,
}: {
  template: Template;
  variables: string[];
  primaryColor: string;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(saveTemplateAction, initialState);
  const [isResetting, startResetTransition] = useTransition();
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleReset = () => {
    startResetTransition(async () => {
      const result = await resetTemplateAction(template.notification_type, template.channel);
      if (result.success) {
        setResetMsg('Reset to default. Reload to see changes.');
      } else {
        setResetMsg(result.error ?? 'Reset failed');
      }
    });
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <form action={formAction}>
        <input type="hidden" name="notification_type" value={template.notification_type} />
        <input type="hidden" name="channel" value={template.channel} />

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject Line
            </label>
            <input
              name="subject"
              type="text"
              defaultValue={template.subject ?? ''}
              placeholder="e.g. Booking Confirmed — {{lesson_type}}"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message Body
            </label>
            <textarea
              name="body"
              rows={10}
              defaultValue={template.body}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white font-mono"
            />
          </div>

          {/* Available Variables */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Available Variables (click to copy)
            </p>
            <div className="flex flex-wrap gap-1">
              {variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                  className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-mono text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={`Copy {{${v}}}`}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={template.is_active}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Send this notification
            </span>
          </label>
          {/* Hidden field to send false when unchecked */}

          {/* Messages */}
          {state.success && (
            <p className="text-sm text-green-600 dark:text-green-400">✓ Template saved!</p>
          )}
          {state.error && (
            <p className="text-sm text-red-600 dark:text-red-400">✗ {state.error}</p>
          )}
          {resetMsg && (
            <p className="text-sm text-blue-600 dark:text-blue-400">{resetMsg}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Save Template
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
            {template.is_custom && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {isResetting ? 'Resetting…' : 'Reset to Default'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
