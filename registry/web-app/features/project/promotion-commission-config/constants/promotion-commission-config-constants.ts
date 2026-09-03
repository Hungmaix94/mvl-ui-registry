/**
 * Constants for the project-level Promotion Commission Config ("Cấu hình HH") tab.
 *
 * Data source: GET/PUT /api/realestate/projects/{project_pk}/promotion-commission-config/
 * (singleton config + nested recipients). Mirrors the SA TBC-recipient table but
 * adds the project-level `pct_promotion_revenue` column.
 */

/** Fixed display order for recipient group rows (matches ProjectPromotionRecipient pct_type enum). */
export const PROMOTION_PCT_TYPE_ORDER = [
  'pct_relationship',
  'pct_planning',
  'pct_packaging',
  'pct_sales_support',
  'pct_coordination',
] as const

export type PromotionPctType = (typeof PROMOTION_PCT_TYPE_ORDER)[number]

/** Config-level percent fields that map 1:1 to a recipient pct_type ("Tỷ lệ In-house"). */
export const PROMOTION_CONFIG_PCT_FIELDS = PROMOTION_PCT_TYPE_ORDER

/**
 * Permission codes.
 *
 * NOTE: the singleton config endpoints (GET/PUT/POST/PATCH/DELETE
 * /promotion-commission-config/) have NO `Require permission` annotation in
 * schema.ts — only the recipients sub-resource is annotated. We therefore gate:
 *   - read/tab visibility on `project_promotion_recipient.list`
 *   - save (PUT replace-all of config + recipients) on recipient update/create/destroy
 * Flagged to BE: annotate the singleton config endpoints, then tighten these gates.
 */
export const PROMOTION_RECIPIENT_SUBJECT = 'project_promotion_recipient' as const

export const PROMOTION_RECIPIENT_PERMISSIONS = {
  LIST: 'project_promotion_recipient.list',
  CREATE: 'project_promotion_recipient.create',
  RETRIEVE: 'project_promotion_recipient.retrieve',
  UPDATE: 'project_promotion_recipient.update',
  DESTROY: 'project_promotion_recipient.destroy',
  PARTIAL_UPDATE: 'project_promotion_recipient.partial_update',
} as const

/** Project subject used as an additional gate for the config-level save (no annotated config perm). */
export const PROMOTION_CONFIG_PROJECT_SUBJECT = 'project' as const

/** Header label for the new project-level promotion-revenue column. */
export const PROMOTION_REVENUE_COLUMN_LABEL = 'Tỷ lệ doanh thu xúc tiến (%)'

/**
 * localStorage key (scoped per username) remembering that the user opted to skip the
 * "create config" prompt and jump straight into the create form on a missing config (404).
 */
const AUTO_CREATE_KEY_PREFIX = 'promotion-commission-config:auto-create:'
export const getAutoCreateStorageKey = (username: string) => `${AUTO_CREATE_KEY_PREFIX}${username}`
