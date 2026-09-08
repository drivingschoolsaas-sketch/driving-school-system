// ==================================================
// Student Portal — Progress
// ==================================================
// Shows the student's progress on driving skills.
// Spec: Section 30 — STUDENT PROGRESS.
// Note: "Do not represent progress as a guaranteed
// prediction of test success."

import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { SKILL_LEVELS_ORDERED } from '@/config/constants';
import type { DrivingSkill, StudentProgress } from '@/types/database';
import type { SkillLevel } from '@/config/constants';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Progress',
};

const LEVEL_DISPLAY: Record<SkillLevel, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'Not Started', color: 'text-gray-400 dark:text-gray-500', bgColor: 'bg-gray-200 dark:bg-gray-700' },
  needs_practice: { label: 'Needs Practice', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  developing: { label: 'Developing', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  competent: { label: 'Competent', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  confident: { label: 'Confident', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
};

export default async function PortalProgressPage() {
  const { auth, student, settings } = await getPortalContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const [skillsRes, progressRes] = await Promise.all([
    client
      .from('driving_skills')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('category')
      .order('sort_order')
      .order('name'),
    client
      .from('student_progress')
      .select('*')
      .eq('organization_id', orgId)
      .eq('student_id', student.id),
  ]);

  const skills = (skillsRes.data ?? []) as DrivingSkill[];
  const progress = (progressRes.data ?? []) as StudentProgress[];
  const progressMap = new Map(progress.map((p) => [p.skill_id, p]));

  // Group skills by category
  const categories = new Map<string, DrivingSkill[]>();
  for (const skill of skills) {
    const group = categories.get(skill.category) ?? [];
    group.push(skill);
    categories.set(skill.category, group);
  }

  // Calculate overall progress
  const totalSkills = skills.length;
  const competentOrAbove = progress.filter(
    (p) => p.level === 'competent' || p.level === 'confident'
  ).length;
  const progressPercent = totalSkills > 0 ? Math.round((competentOrAbove / totalSkills) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Progress</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track your driving skills development.
        </p>
      </div>

      {/* Overall progress */}
      {totalSkills > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Overall Progress
            </h2>
            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
              {progressPercent}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {competentOrAbove} of {totalSkills} skills at competent level or above
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {SKILL_LEVELS_ORDERED.map((level) => {
          const display = LEVEL_DISPLAY[level];
          return (
            <div key={level} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${display.bgColor}`} />
              <span className={display.color}>{display.label}</span>
            </div>
          );
        })}
      </div>

      {/* Skills by category */}
      {skills.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No skills have been configured by your driving school yet.
          </p>
        </div>
      ) : (
        Array.from(categories.entries()).map(([category, catSkills]) => (
          <section key={category}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-4">
              {category}
            </h2>
            <div className="space-y-2">
              {catSkills.map((skill) => {
                const sp = progressMap.get(skill.id);
                const level = sp?.level ?? 'not_started';
                const display = LEVEL_DISPLAY[level];
                const levelIndex = SKILL_LEVELS_ORDERED.indexOf(level);
                const barWidth = ((levelIndex + 1) / SKILL_LEVELS_ORDERED.length) * 100;

                return (
                  <div
                    key={skill.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {skill.name}
                        </p>
                        {skill.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {skill.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${display.bgColor} ${display.color}`}
                      >
                        {display.label}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${display.bgColor}`}
                        style={{ width: `${level === 'not_started' ? 0 : barWidth}%` }}
                      />
                    </div>
                    {sp?.assessed_at && (
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                        Last assessed: {new Date(sp.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center italic">
        Progress assessments are provided by your instructor for guidance only and do not guarantee driving test outcomes.
      </p>
    </div>
  );
}
