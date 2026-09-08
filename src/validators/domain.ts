import { z } from 'zod';

// ==================================================
// Domain Validators
// ==================================================

/**
 * Hostname format: lowercase, no protocol, no path, no port.
 * Allows subdomains (e.g., booking.school.com.au).
 */
const hostnameSchema = z
  .string()
  .min(3, 'Hostname must be at least 3 characters')
  .max(253, 'Hostname must be at most 253 characters')
  .regex(
    /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(\.[a-z]{2,})+$/,
    'Invalid hostname format. Must be a valid domain (e.g., school.com.au or booking.school.com.au)'
  )
  .transform((val) => val.toLowerCase().trim());

export const addDomainSchema = z.object({
  hostname: hostnameSchema,
  domain_type: z.enum(['custom_root', 'custom_subdomain']),
  set_as_primary: z.boolean().default(false),
});

export type AddDomainInput = z.infer<typeof addDomainSchema>;

export const setPrimaryDomainSchema = z.object({
  domainId: z.string().uuid('Invalid domain ID'),
});

export type SetPrimaryDomainInput = z.infer<typeof setPrimaryDomainSchema>;

export const removeDomainSchema = z.object({
  domainId: z.string().uuid('Invalid domain ID'),
});

export type RemoveDomainInput = z.infer<typeof removeDomainSchema>;

/**
 * Platform subdomain slug: used to generate {slug}.driveflow.com.au.
 * Same rules as organization slug.
 */
export const platformSubdomainSchema = z
  .string()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(63, 'Subdomain must be at most 63 characters')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'Subdomain must contain only lowercase letters, numbers, and hyphens'
  );
