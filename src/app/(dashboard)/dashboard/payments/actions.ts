'use server';

// ==================================================
// Payment Server Actions
// ==================================================
// Record manual payments, mark completed, issue refunds.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import {
  createPayment,
  markPaymentSucceeded,
  createRefund,
} from '@/services/payment-service';
import { createPaymentSchema, createRefundSchema } from '@/validators/payment';
import { audit } from '@/lib/audit';
import { sendNotification } from '@/services/notification-service';
import { logger } from '@/lib/logging';

export interface PaymentActionState {
  success: boolean;
  error?: string;
}

/**
 * Record a manual payment (cash, bank transfer, etc.)
 * Creates payment and immediately marks it succeeded.
 */
export async function recordPaymentAction(
  _prev: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  try {
    const { auth, organization } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.PAYMENT_MANAGE);
    const client = await createServerSupabaseClient();

    const amountDollars = parseFloat(formData.get('amount') as string);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      return { success: false, error: 'Amount must be a positive number.' };
    }

    const input = createPaymentSchema.parse({
      payment_type: formData.get('payment_type') || 'booking_full',
      amount_cents: Math.round(amountDollars * 100),
      currency: organization.currency ?? 'AUD',
      student_id: formData.get('student_id') || null,
      booking_id: formData.get('booking_id') || null,
      description: formData.get('description') || null,
    });

    // Create and immediately mark as succeeded (manual payment = already received)
    const payment = await createPayment(client, auth, input);
    await markPaymentSucceeded(client, payment.id, auth.organizationId);

    audit(client, auth, {
      action: 'payment.recorded',
      resourceType: 'payment',
      resourceId: payment.id,
      details: { amount_cents: input.amount_cents, type: input.payment_type },
    });

    // Send payment receipt notification if student linked
    if (input.student_id) {
      void (async () => {
        try {
          const { data: student } = await client
            .from('students')
            .select('display_name, email, user_id')
            .eq('id', input.student_id!)
            .eq('organization_id', auth.organizationId)
            .single();

          const { data: org } = await client
            .from('organizations')
            .select('name')
            .eq('id', auth.organizationId)
            .single();

          if (student?.email && org) {
            await sendNotification(client, {
              organizationId: auth.organizationId,
              notificationType: 'payment_receipt' as Parameters<typeof sendNotification>[1]['notificationType'],
              recipientUserId: (student as { user_id: string }).user_id,
              recipientEmail: (student as { email: string }).email,
              recipientName: (student as { display_name: string }).display_name,
              variables: {
                student_name: (student as { display_name: string }).display_name,
                amount: `$${amountDollars.toFixed(2)}`,
                description: input.description ?? input.payment_type.replaceAll('_', ' '),
                date: new Date().toLocaleDateString('en-AU'),
                school_name: (org as { name: string }).name,
              },
            });
          }
        } catch (err) {
          logger.error('Failed to send payment receipt', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    }

    revalidatePath('/dashboard/payments');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record payment';
    return { success: false, error: message };
  }
}

/**
 * Issue a refund on a succeeded payment.
 */
export async function issueRefundAction(
  paymentId: string,
  formData: FormData
): Promise<PaymentActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.PAYMENT_MANAGE);
    const client = await createServerSupabaseClient();

    const amountDollars = parseFloat(formData.get('refund_amount') as string);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      return { success: false, error: 'Refund amount must be positive.' };
    }

    const input = createRefundSchema.parse({
      payment_id: paymentId,
      amount_cents: Math.round(amountDollars * 100),
      reason: formData.get('reason') || null,
    });

    const refund = await createRefund(client, auth, input);
    audit(client, auth, {
      action: 'payment.refunded',
      resourceType: 'refund',
      resourceId: refund.id,
      details: { payment_id: paymentId, amount_cents: input.amount_cents },
    });

    revalidatePath('/dashboard/payments');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to issue refund';
    return { success: false, error: message };
  }
}
