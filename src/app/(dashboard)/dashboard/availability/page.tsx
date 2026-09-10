// ==================================================
// Availability Management Page
// ==================================================
// Shows instructor availability rules, exceptions, and
// blocked times. Admins see all; instructors see their own.

import { getDashboardContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { isOrgAdminRole } from '@/permissions/roles';
import { DAYS_OF_WEEK_ORDERED } from '@/config/constants';
import type { AvailabilityRule, AvailabilityException, BlockedTime, Instructor } from '@/types/database';
import type { Metadata } from 'next';
import {
  AddRuleForm,
  AddExceptionForm,
  AddBlockedTimeForm,
  DeleteRuleButton,
  DeleteExceptionButton,
  DeleteBlockedTimeButton,
} from './availability-forms-client';

export const metadata: Metadata = {
  title: 'Availability',
};

interface AvailabilityPageProps {
  searchParams: Promise<{ instructor?: string }>;
}

export default async function AvailabilityPage({ searchParams }: AvailabilityPageProps) {
  const { auth, settings } = await getDashboardContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const params = await searchParams;

  const isAdmin = isOrgAdminRole(auth.role);

  // Determine instructor filter
  let instructorId: string | null = null;
  let instructors: Instructor[] = [];

  if (isAdmin) {
    const { data } = await client
      .from('instructors')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('display_name');
    instructors = (data ?? []) as Instructor[];
    instructorId = params.instructor ?? (instructors[0]?.id ?? null);
  } else {
    const { data: instData } = await client
      .from('instructors')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (instData) {
      instructorId = instData.id;
      instructors = [instData as Instructor];
    }
  }

  // Load availability data for selected instructor
  let rules: AvailabilityRule[] = [];
  let exceptions: AvailabilityException[] = [];
  let blockedTimes: BlockedTime[] = [];

  if (instructorId) {
    const [rulesRes, exceptionsRes, blockedRes] = await Promise.all([
      client
        .from('availability_rules')
        .select('*')
        .eq('organization_id', orgId)
        .eq('instructor_id', instructorId)
        .order('day_of_week'),
      client
        .from('availability_exceptions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('instructor_id', instructorId)
        .gte('exception_date', new Date().toISOString().split('T')[0])
        .order('exception_date')
        .limit(20),
      client
        .from('blocked_times')
        .select('*')
        .eq('organization_id', orgId)
        .eq('instructor_id', instructorId)
        .gte('end_datetime', new Date().toISOString())
        .order('start_datetime')
        .limit(20),
    ]);

    rules = (rulesRes.data ?? []) as AvailabilityRule[];
    exceptions = (exceptionsRes.data ?? []) as AvailabilityException[];
    blockedTimes = (blockedRes.data ?? []) as BlockedTime[];
  }

  // Group rules by day
  const rulesByDay = new Map<string, AvailabilityRule[]>();
  for (const day of DAYS_OF_WEEK_ORDERED) {
    rulesByDay.set(day, []);
  }
  for (const rule of rules) {
    const dayRules = rulesByDay.get(rule.day_of_week);
    if (dayRules) dayRules.push(rule);
  }

  const selectedInstructor = instructors.find((i) => i.id === instructorId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Availability</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage weekly schedules, exceptions, and blocked times.
        </p>
      </div>

      {/* Instructor selector (admin) */}
      {isAdmin && instructors.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {instructors.map((inst) => (
            <a
              key={inst.id}
              href={`/dashboard/availability?instructor=${inst.id}`}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                instructorId === inst.id
                  ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {inst.display_name}
            </a>
          ))}
        </div>
      )}

      {!instructorId ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No instructors configured.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Weekly Schedule */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Weekly Schedule — {selectedInstructor?.display_name}
              </h2>
              <AddRuleForm instructorId={instructorId} primaryColor={primaryColor} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
              {DAYS_OF_WEEK_ORDERED.map((day) => {
                const dayRules = rulesByDay.get(day) ?? [];
                const activeRules = dayRules.filter((r) => r.is_active);

                return (
                  <div
                    key={day}
                    className={`rounded-lg border p-3 ${
                      activeRules.length > 0
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-900 dark:text-white capitalize mb-1">
                      {day}
                    </p>
                    {activeRules.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Day off</p>
                    ) : (
                      activeRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between gap-1">
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {formatTime(rule.start_time)} – {formatTime(rule.end_time)}
                          </p>
                          <DeleteRuleButton ruleId={rule.id} />
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upcoming Exceptions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upcoming Exceptions
              </h2>
              <AddExceptionForm instructorId={instructorId} primaryColor={primaryColor} />
            </div>
            {exceptions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming exceptions.</p>
            ) : (
              <div className="space-y-2">
                {exceptions.map((exc) => (
                  <div
                    key={exc.id}
                    className={`flex items-center gap-4 rounded-lg border p-3 ${
                      exc.is_available
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <span className="text-lg">{exc.is_available ? '✅' : '❌'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(exc.exception_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {exc.is_available
                          ? `Available ${formatTime(exc.start_time ?? '')} – ${formatTime(exc.end_time ?? '')}`
                          : 'Unavailable all day'}
                        {exc.reason && ` — ${exc.reason}`}
                      </p>
                    </div>
                    <DeleteExceptionButton exceptionId={exc.id} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Blocked Times */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Blocked Times
              </h2>
              <AddBlockedTimeForm instructorId={instructorId} primaryColor={primaryColor} />
            </div>
            {blockedTimes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming blocked times.</p>
            ) : (
              <div className="space-y-2">
                {blockedTimes.map((bt) => {
                  const start = new Date(bt.start_datetime);
                  const end = new Date(bt.end_datetime);

                  return (
                    <div
                      key={bt.id}
                      className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
                    >
                      <span className="text-lg">🚫</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {bt.reason.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {bt.is_all_day
                            ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                        {bt.notes && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{bt.notes}</p>
                        )}
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                      >
                        {bt.reason.replace('_', ' ')}
                      </span>
                      <DeleteBlockedTimeButton blockedTimeId={bt.id} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}
