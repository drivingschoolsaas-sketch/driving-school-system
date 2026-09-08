// ==================================================
// Subscription Service
// ==================================================
// Business logic for plan and subscription management.
// Handles plan queries, subscription lifecycle,
// and suspension rules.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { Plan, Subscription, SubscriptionUsage } from '@/types/database';
import { logger } from '@/lib/logging';

// --------------------------------------------------
// Plans
// --------------------------------------------------

/**
 * Get all active plans (for pricing page).
 */
export async function getPlans(
  client: SupabaseClient
): Promise<Plan[]> {
  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return (data ?? []) as Plan[];
}

/**
 * Get a plan by slug.
 */
export async function getPlanBySlug(
  client: SupabaseClient,
  slug: string
): Promise<Plan | null> {
  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as Plan | null;
}

/**
 * Get the default plan (for new sign-ups).
 */
export async function getDefaultPlan(
  client: SupabaseClient
): Promise<Plan | null> {
  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as Plan | null;
}

// --------------------------------------------------
// Subscriptions
// --------------------------------------------------

/**
 * Get the subscription for an organization.
 */
export async function getSubscription(
  client: SupabaseClient,
  organizationId: string
): Promise<(Subscription & { plan?: Plan }) | null> {
  const { data, error } = await client
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as (Subscription & { plan?: Plan }) | null;
}

/**
 * Create a subscription for an organization (typically during onboarding).
 * Starts with a trial period from the plan's trial_days.
 */
export async function createSubscription(
  client: SupabaseClient,
  organizationId: string,
  planId: string,
  options?: {
    billingInterval?: 'monthly' | 'yearly';
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  }
): Promise<Subscription> {
  // Get the plan for trial days
  const { data: plan } = await client
    .from('plans')
    .select('trial_days')
    .eq('id', planId)
    .single();

  const trialDays = (plan as { trial_days: number } | null)?.trial_days ?? 14;
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  const { data, error } = await client
    .from('subscriptions')
    .insert({
      organization_id: organizationId,
      plan_id: planId,
      status: 'trialing',
      billing_interval: options?.billingInterval ?? 'monthly',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      stripe_subscription_id: options?.stripeSubscriptionId ?? null,
      stripe_customer_id: options?.stripeCustomerId ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  logger.info('Subscription created', {
    subscriptionId: data.id,
    organizationId,
    planId,
    trialDays,
  });

  return data as Subscription;
}

/**
 * Activate a subscription (after payment is set up).
 */
export async function activateSubscription(
  client: SupabaseClient,
  subscriptionId: string,
  organizationId: string,
  periodEnd: Date
): Promise<Subscription> {
  const now = new Date();
  const { data, error } = await client
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Subscription activated', {
    subscriptionId,
    organizationId,
  });

  return data as Subscription;
}

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<Subscription> {
  const { data, error } = await client
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Subscription cancelled', {
    organizationId: context.organizationId,
    cancelledBy: context.userId,
  });

  return data as Subscription;
}

/**
 * Suspend an organization's subscription (admin action).
 * This blocks access to the dashboard and tenant website.
 */
export async function suspendSubscription(
  client: SupabaseClient,
  organizationId: string,
  reason: string
): Promise<Subscription> {
  const { data, error } = await client
    .from('subscriptions')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
    })
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;

  // Also suspend the organization
  await client
    .from('organizations')
    .update({ status: 'suspended' })
    .eq('id', organizationId);

  logger.warn('Subscription suspended', {
    organizationId,
    reason,
  });

  return data as Subscription;
}

/**
 * Reactivate a suspended subscription.
 */
export async function reactivateSubscription(
  client: SupabaseClient,
  organizationId: string
): Promise<Subscription> {
  const { data, error } = await client
    .from('subscriptions')
    .update({
      status: 'active',
      suspended_at: null,
      suspension_reason: null,
    })
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;

  // Also reactivate the organization
  await client
    .from('organizations')
    .update({ status: 'active' })
    .eq('id', organizationId);

  logger.info('Subscription reactivated', {
    organizationId,
  });

  return data as Subscription;
}

/**
 * Change the plan for a subscription.
 */
export async function changePlan(
  client: SupabaseClient,
  organizationId: string,
  newPlanId: string
): Promise<Subscription> {
  const { data, error } = await client
    .from('subscriptions')
    .update({ plan_id: newPlanId })
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Subscription plan changed', {
    organizationId,
    newPlanId,
  });

  return data as Subscription;
}

// --------------------------------------------------
// Usage Tracking
// --------------------------------------------------

/**
 * Get current usage for an organization.
 */
export async function getCurrentUsage(
  client: SupabaseClient,
  organizationId: string
): Promise<SubscriptionUsage | null> {
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('subscription_usage')
    .select('*')
    .eq('organization_id', organizationId)
    .lte('period_start', now)
    .gte('period_end', now)
    .maybeSingle();

  if (error) throw error;
  return data as SubscriptionUsage | null;
}

/**
 * Refresh usage counts for an organization.
 * Called periodically or on resource changes.
 */
export async function refreshUsage(
  client: SupabaseClient,
  organizationId: string
): Promise<SubscriptionUsage> {
  // Get subscription for period bounds
  const sub = await getSubscription(client, organizationId);
  if (!sub) throw new Error('No subscription found');

  const periodStart = sub.current_period_start ?? new Date().toISOString();
  const periodEnd = sub.current_period_end ?? new Date().toISOString();

  // Count current resources
  const [instructors, students, locations, vehicles, bookings] =
    await Promise.all([
      client
        .from('instructors')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      client
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      client
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      client
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      client
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', periodStart),
    ]);

  // Upsert usage record
  const { data, error } = await client
    .from('subscription_usage')
    .upsert(
      {
        organization_id: organizationId,
        subscription_id: sub.id,
        period_start: periodStart,
        period_end: periodEnd,
        instructors_count: instructors.count ?? 0,
        students_count: students.count ?? 0,
        locations_count: locations.count ?? 0,
        vehicles_count: vehicles.count ?? 0,
        bookings_count: bookings.count ?? 0,
      },
      { onConflict: 'organization_id,period_start' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as SubscriptionUsage;
}
