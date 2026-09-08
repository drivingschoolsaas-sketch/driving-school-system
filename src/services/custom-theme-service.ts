// ==================================================
// Custom Theme Service
// ==================================================
// Manages extended theming for tenant websites.
// Gated by custom_branding_enabled entitlement.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { CustomTheme } from '@/types/database';
import { logger } from '@/lib/logging';

/**
 * Get the custom theme for an organization.
 */
export async function getCustomTheme(
  client: SupabaseClient,
  organizationId: string
): Promise<CustomTheme | null> {
  const { data, error } = await client
    .from('custom_themes')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as CustomTheme | null;
}

/**
 * Create or update the custom theme for an organization.
 * Uses upsert since there's a UNIQUE constraint on organization_id.
 */
export async function upsertCustomTheme(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string | null;
    background_color?: string | null;
    text_color?: string | null;
    header_bg_color?: string | null;
    footer_bg_color?: string | null;
    heading_font?: string | null;
    body_font?: string | null;
    header_style?: string;
    footer_style?: string;
    hero_style?: string;
    corner_radius?: string;
    custom_css?: string | null;
  }
): Promise<CustomTheme> {
  const { data, error } = await client
    .from('custom_themes')
    .upsert(
      {
        organization_id: context.organizationId,
        ...input,
      },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();

  if (error) throw error;

  logger.info('Custom theme updated', {
    organizationId: context.organizationId,
    updatedBy: context.userId,
  });

  return data as CustomTheme;
}

/**
 * Delete the custom theme for an organization (revert to defaults).
 */
export async function deleteCustomTheme(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<void> {
  const { error } = await client
    .from('custom_themes')
    .delete()
    .eq('organization_id', context.organizationId);

  if (error) throw error;

  logger.info('Custom theme deleted (reverted to default)', {
    organizationId: context.organizationId,
  });
}

/**
 * Generate CSS custom properties from a theme.
 * Used by the tenant layout to apply theming.
 */
export function themeToCSS(theme: CustomTheme): string {
  const vars: string[] = [];

  vars.push(`--theme-primary: ${theme.primary_color}`);
  vars.push(`--theme-secondary: ${theme.secondary_color}`);

  if (theme.accent_color) {
    vars.push(`--theme-accent: ${theme.accent_color}`);
  }
  if (theme.background_color) {
    vars.push(`--theme-bg: ${theme.background_color}`);
  }
  if (theme.text_color) {
    vars.push(`--theme-text: ${theme.text_color}`);
  }
  if (theme.header_bg_color) {
    vars.push(`--theme-header-bg: ${theme.header_bg_color}`);
  }
  if (theme.footer_bg_color) {
    vars.push(`--theme-footer-bg: ${theme.footer_bg_color}`);
  }
  if (theme.heading_font) {
    vars.push(`--theme-heading-font: '${theme.heading_font}', sans-serif`);
  }
  if (theme.body_font) {
    vars.push(`--theme-body-font: '${theme.body_font}', sans-serif`);
  }

  const radiusMap: Record<string, string> = {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '1rem',
  };
  vars.push(
    `--theme-radius: ${radiusMap[theme.corner_radius] ?? radiusMap.medium}`
  );

  return vars.join('; ');
}
