import type { TObjectValues } from '@/types'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

export const PROJECT_DOCUMENT_VISIBILITY_ENUM_OPTIONS = Object.values(ElibraryVisibility)

export const PROJECT_DOCUMENT_DETAIL_MODE = {
  CURRENT_FOLDER: 'current-folder',
  ITEM: 'item',
  SELECTION: 'selection',
} as const

export type ProjectDocumentDetailMode = TObjectValues<typeof PROJECT_DOCUMENT_DETAIL_MODE>

/** Default TTL khi tạo public share-link: 7 ngày. */
export const DEFAULT_SHARE_LINK_TTL_SECONDS = 7 * 24 * 60 * 60

/** Default max_uses: null = unlimited. */
export const DEFAULT_SHARE_LINK_MAX_USES: number | null = null
