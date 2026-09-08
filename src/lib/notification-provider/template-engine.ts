// ==================================================
// Notification Template Engine
// ==================================================
// Simple {{variable}} interpolation for notification
// templates. Handles missing variables gracefully.

/**
 * Interpolate {{variable}} placeholders in a template string.
 * Missing variables are replaced with empty string.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

/**
 * Extract variable names from a template string.
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  const vars = new Set<string>();
  for (const match of matches) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

// --------------------------------------------------
// Default Templates
// --------------------------------------------------
// Used when a school hasn't customised their templates.

export const DEFAULT_TEMPLATES: Record<
  string,
  { subject: string; body: string }
> = {
  booking_confirmed: {
    subject: 'Booking Confirmed — {{lesson_type}}',
    body: `Hi {{student_name}},

Your lesson has been confirmed!

📅 Date: {{date}}
🕐 Time: {{start_time}} — {{end_time}}
🚗 Type: {{lesson_type}}
👨‍🏫 Instructor: {{instructor_name}}
📍 Pickup: {{pickup_address}}

If you need to reschedule or cancel, please contact us at least {{cancellation_hours}} hours in advance.

See you soon!
{{school_name}}`,
  },

  booking_reminder: {
    subject: 'Lesson Reminder — Tomorrow',
    body: `Hi {{student_name}},

Just a reminder about your upcoming lesson:

📅 Date: {{date}}
🕐 Time: {{start_time}} — {{end_time}}
🚗 Type: {{lesson_type}}
👨‍🏫 Instructor: {{instructor_name}}
📍 Pickup: {{pickup_address}}

See you tomorrow!
{{school_name}}`,
  },

  booking_changed: {
    subject: 'Booking Updated — {{lesson_type}}',
    body: `Hi {{student_name}},

Your lesson details have been updated:

📅 Date: {{date}}
🕐 Time: {{start_time}} — {{end_time}}
🚗 Type: {{lesson_type}}
👨‍🏫 Instructor: {{instructor_name}}

If you have any questions, please contact us.

{{school_name}}`,
  },

  booking_cancelled: {
    subject: 'Booking Cancelled',
    body: `Hi {{student_name}},

Your lesson on {{date}} at {{start_time}} has been cancelled.

Reason: {{cancellation_reason}}

If you'd like to rebook, visit our website or contact us.

{{school_name}}`,
  },

  payment_receipt: {
    subject: 'Payment Receipt — {{amount}}',
    body: `Hi {{student_name}},

We've received your payment.

💰 Amount: {{amount}}
📝 Description: {{description}}
📅 Date: {{date}}

Thank you!
{{school_name}}`,
  },

  payment_failed: {
    subject: 'Payment Failed',
    body: `Hi {{student_name}},

Your payment of {{amount}} could not be processed.

Reason: {{failure_reason}}

Please update your payment method or contact us for assistance.

{{school_name}}`,
  },

  instructor_reassigned: {
    subject: 'Instructor Update for Your Lesson',
    body: `Hi {{student_name}},

Your instructor for the lesson on {{date}} has been changed to {{instructor_name}}.

All other details remain the same.

{{school_name}}`,
  },

  review_request: {
    subject: 'How Was Your Lesson?',
    body: `Hi {{student_name}},

We hope you enjoyed your recent lesson with {{instructor_name}}!

We'd love to hear your feedback. Please take a moment to leave a review:

{{review_url}}

Thank you for choosing {{school_name}}!`,
  },

  test_congratulations: {
    subject: '🎉 Congratulations on Passing!',
    body: `Hi {{student_name}},

Congratulations on passing your driving test! 🎉🚗

We're so proud of your achievement. Thank you for choosing {{school_name}} for your driving journey.

Drive safe!
{{school_name}}`,
  },

  welcome: {
    subject: 'Welcome to {{school_name}}!',
    body: `Hi {{student_name}},

Welcome to {{school_name}}! We're excited to help you on your driving journey.

You can book lessons, track your progress, and manage your account through your student portal.

If you have any questions, don't hesitate to reach out.

{{school_name}}`,
  },
};
