import { z } from 'zod';

// ==================================================
// Student Validators
// ==================================================

export const createStudentSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  pickup_address: z.string().max(500).optional().nullable(),
  pickup_suburb: z.string().max(100).optional().nullable(),
  pickup_postcode: z.string().max(10).optional().nullable(),
  learner_permit_number: z.string().max(50).optional().nullable(),
  permit_expiry: z.string().optional().nullable(),
  preferred_transmission: z.enum(['automatic', 'manual', 'both']).optional().nullable(),
  preferred_instructor_id: z.string().uuid().optional().nullable(),
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z.string().max(30).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema
  .omit({ user_id: true })
  .partial()
  .extend({
    is_active: z.boolean().optional(),
  });

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
