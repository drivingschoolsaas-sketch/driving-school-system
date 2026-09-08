import { z } from 'zod';

// ==================================================
// Organization Validators
// ==================================================

/** Slug: lowercase letters, numbers, hyphens. 3-63 chars. */
const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(63, 'Slug must be at most 63 characters')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen'
  );

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be at most 100 characters')
    .trim(),
  slug: slugSchema,
  timezone: z.string().min(1, 'Timezone is required').default('Australia/Sydney'),
  currency: z.string().length(3, 'Currency must be a 3-letter code').default('AUD'),
  country: z.string().length(2, 'Country must be a 2-letter code').default('AU'),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email('Invalid email address').nullable().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .trim()
    .optional(),
  timezone: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
  country: z.string().length(2).optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
