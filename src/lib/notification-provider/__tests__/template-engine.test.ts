// ==================================================
// Template Engine Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  extractVariables,
  DEFAULT_TEMPLATES,
} from '../template-engine';

describe('renderTemplate', () => {
  it('replaces single variable', () => {
    const result = renderTemplate('Hello {{name}}!', { name: 'Jane' });
    expect(result).toBe('Hello Jane!');
  });

  it('replaces multiple variables', () => {
    const result = renderTemplate(
      '{{student_name}} has a lesson on {{date}} at {{start_time}}',
      {
        student_name: 'John',
        date: '2024-06-15',
        start_time: '10:00 AM',
      }
    );
    expect(result).toBe('John has a lesson on 2024-06-15 at 10:00 AM');
  });

  it('handles missing variables by replacing with empty string', () => {
    const result = renderTemplate('Hi {{name}}, your code is {{code}}', {
      name: 'Jane',
    });
    expect(result).toBe('Hi Jane, your code is ');
  });

  it('handles null variables', () => {
    const result = renderTemplate('Value: {{value}}', { value: null });
    expect(result).toBe('Value: ');
  });

  it('handles undefined variables', () => {
    const result = renderTemplate('Value: {{value}}', { value: undefined });
    expect(result).toBe('Value: ');
  });

  it('converts numbers to strings', () => {
    const result = renderTemplate('Amount: ${{amount}}', { amount: 85 });
    expect(result).toBe('Amount: $85');
  });

  it('handles template with no variables', () => {
    const result = renderTemplate('No variables here', {});
    expect(result).toBe('No variables here');
  });

  it('handles repeated variables', () => {
    const result = renderTemplate('{{name}} said {{name}}', { name: 'Jo' });
    expect(result).toBe('Jo said Jo');
  });

  it('does not match invalid syntax like {name} or {{ name }}', () => {
    const result = renderTemplate('{name} and {{ spaced }}', { name: 'X', spaced: 'Y' });
    expect(result).toBe('{name} and {{ spaced }}');
  });
});

describe('extractVariables', () => {
  it('extracts variables from a template', () => {
    const vars = extractVariables('Hello {{name}}, your lesson is on {{date}}');
    expect(vars).toContain('name');
    expect(vars).toContain('date');
    expect(vars).toHaveLength(2);
  });

  it('deduplicates repeated variables', () => {
    const vars = extractVariables('{{name}} and {{name}} again');
    expect(vars).toEqual(['name']);
  });

  it('returns empty array for no variables', () => {
    const vars = extractVariables('No variables');
    expect(vars).toEqual([]);
  });
});

describe('DEFAULT_TEMPLATES', () => {
  it('has templates for all standard notification types', () => {
    const expectedTypes = [
      'booking_confirmed',
      'booking_reminder',
      'booking_changed',
      'booking_cancelled',
      'payment_receipt',
      'payment_failed',
      'instructor_reassigned',
      'review_request',
      'test_congratulations',
      'welcome',
    ];

    for (const type of expectedTypes) {
      expect(DEFAULT_TEMPLATES[type]).toBeDefined();
      expect(DEFAULT_TEMPLATES[type].subject).toBeTruthy();
      expect(DEFAULT_TEMPLATES[type].body).toBeTruthy();
    }
  });

  it('templates use {{school_name}} variable', () => {
    for (const [, template] of Object.entries(DEFAULT_TEMPLATES)) {
      expect(template.body).toContain('{{school_name}}');
    }
  });

  it('templates can be rendered without errors', () => {
    const variables = {
      student_name: 'Jane Doe',
      school_name: 'Sydney Smart Driving',
      date: '2024-06-15',
      start_time: '10:00 AM',
      end_time: '11:00 AM',
      lesson_type: '1-Hour Manual Lesson',
      instructor_name: 'Bob Smith',
      pickup_address: '123 Main St',
      cancellation_hours: '24',
      amount: '$85.00',
      description: 'Lesson payment',
      failure_reason: 'Card declined',
      cancellation_reason: 'Student requested',
      review_url: 'https://example.com/review',
    };

    for (const [, template] of Object.entries(DEFAULT_TEMPLATES)) {
      const rendered = renderTemplate(template.body, variables);
      expect(rendered).not.toContain('{{');
    }
  });
});
