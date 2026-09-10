'use client';

import { useState, useTransition } from 'react';
import { updateProgressAction } from './actions';

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface ProgressEntry {
  skill_id: string;
  level: string;
  notes: string | null;
  assessed_at: string | null;
}

interface Props {
  studentId: string;
  skills: Skill[];
  progress: ProgressEntry[];
  primaryColor: string;
}

const LEVELS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
  { value: 'needs_practice', label: 'Needs Practice', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { value: 'developing', label: 'Developing', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  { value: 'competent', label: 'Competent', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'confident', label: 'Confident', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
];

export function ProgressEditor({ studentId, skills, progress, primaryColor }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null);

  const progressMap = new Map(progress.map((p) => [p.skill_id, p]));

  // Group skills by category
  const categories = new Map<string, Skill[]>();
  for (const skill of skills) {
    const list = categories.get(skill.category) ?? [];
    list.push(skill);
    categories.set(skill.category, list);
  }

  function handleLevelChange(skillId: string, newLevel: string) {
    setError(null);
    setUpdatingSkill(skillId);
    startTransition(async () => {
      const result = await updateProgressAction(studentId, skillId, newLevel);
      if (!result.success) setError(result.error ?? 'Failed');
      setUpdatingSkill(null);
    });
  }

  // Compute overall progress
  const totalSkills = skills.length;
  const assessedSkills = progress.filter((p) => p.level !== 'not_started').length;
  const competentOrAbove = progress.filter(
    (p) => p.level === 'competent' || p.level === 'confident'
  ).length;
  const progressPercent = totalSkills > 0 ? Math.round((competentOrAbove / totalSkills) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Overall Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
              />
            </div>
          </div>
          <span className="text-sm font-bold" style={{ color: primaryColor }}>
            {progressPercent}%
          </span>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{assessedSkills}/{totalSkills} assessed</span>
          <span>{competentOrAbove} competent or above</span>
        </div>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 italic">
          Progress tracking is for guidance only and does not predict test outcomes.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Skills by Category */}
      {Array.from(categories.entries()).map(([category, categorySkills]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 capitalize">
            {category}
          </h3>
          <div className="space-y-2">
            {categorySkills.map((skill) => {
              const entry = progressMap.get(skill.id);
              const currentLevel = entry?.level ?? 'not_started';
              const isUpdating = updatingSkill === skill.id;

              return (
                <div
                  key={skill.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {skill.name}
                      </p>
                      {entry?.assessed_at && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Last assessed {new Date(entry.assessed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {isUpdating && (
                      <div
                        className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent shrink-0"
                        style={{ borderTopColor: primaryColor }}
                      />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl.value}
                        type="button"
                        onClick={() => handleLevelChange(skill.id, lvl.value)}
                        disabled={isPending}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                          currentLevel === lvl.value
                            ? `${lvl.color} ring-2 ring-offset-1 dark:ring-offset-gray-800`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        style={currentLevel === lvl.value ? { '--tw-ring-color': primaryColor } as React.CSSProperties : undefined}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {skills.length === 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No driving skills configured. Add skills in school settings.
          </p>
        </div>
      )}
    </div>
  );
}
