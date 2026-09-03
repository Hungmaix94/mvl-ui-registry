import type { TObjectValues } from '@/types'

export const PROJECT_DOCUMENT_VIEW_MODE = {
  GRID: 'grid',
  LIST: 'list',
} as const

export type ProjectDocumentViewMode = TObjectValues<typeof PROJECT_DOCUMENT_VIEW_MODE>

export const PROJECT_DOCUMENT_SORT_OPTION = {
  UPDATED_DESC: '-created_at',
  UPDATED_ASC: 'created_at',
  NAME_ASC: 'name',
  NAME_DESC: '-name',
} as const

export type ProjectDocumentSortOption = TObjectValues<typeof PROJECT_DOCUMENT_SORT_OPTION>

export const PROJECT_DOCUMENT_CONTEXT_ACTION = {
  SHARE: 'share',
  EDIT: 'edit',
  MARK_IMPORTANT: 'mark_important',
  UNMARK_IMPORTANT: 'unmark_important',
  DETAILS: 'details',
  DELETE: 'delete',
} as const

export type ProjectDocumentContextAction = TObjectValues<typeof PROJECT_DOCUMENT_CONTEXT_ACTION>
