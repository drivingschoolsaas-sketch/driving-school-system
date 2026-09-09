// ==================================================
// Dashboard: Success Stories Management Page
// ==================================================
// Full CRUD for success stories with photo upload,
// consent tracking, and publish workflow.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getSuccessStories } from '@/services/success-story-service';
import { SuccessStoryManager } from './success-story-manager';

export default async function SuccessStoriesAdminPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { auth } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.SUCCESS_STORY_MANAGE);

  const client = await createServerSupabaseClient();
  const statusFilter = searchParams.status;
  const stories = await getSuccessStories(client, auth, {
    status: statusFilter,
  });

  // Get students and instructors for dropdowns
  const [studentsRes, instructorsRes] = await Promise.all([
    client
      .from('students')
      .select('id, display_name')
      .eq('organization_id', auth.organizationId)
      .order('display_name'),
    client
      .from('instructors')
      .select('id, display_name')
      .eq('organization_id', auth.organizationId)
      .eq('is_active', true)
      .order('display_name'),
  ]);

  return (
    <SuccessStoryManager
      stories={stories}
      students={studentsRes.data ?? []}
      instructors={instructorsRes.data ?? []}
      statusFilter={statusFilter}
    />
  );
}
