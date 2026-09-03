/**
 * Permission codes & resource subjects cho document/folder management.
 *
 * - elibrary scope (MY/DEPARTMENT/COMPANY/SHARED_WITH_ME) → resource `elibrary_item`
 * - project scope (tab Documents trong Project) → resource `project_document`
 *
 * Pattern dùng cùng `useAbility()`: `ability.can(ACTION.<X>, RESOURCE.ELIBRARY_ITEM)`.
 *
 * Quy ước:
 * - Resource subjects luôn dùng `RESOURCE.*` map (không hardcode string)
 * - Action luôn dùng `ACTION.*` map
 * - Toggle favorite & unshare đều dùng namespace `elibrary_*` cho cả 2 module
 *   (xem implementation-plan.md §13.2 & §13.6)
 */

export const DOCUMENT_PERMISSION_RESOURCE = {
  ELIBRARY_ITEM: 'elibrary_item',
  PROJECT_DOCUMENT: 'project_document',
  ELIBRARY_SHARE: 'elibrary_share',
} as const

export type DocumentPermissionResource =
  (typeof DOCUMENT_PERMISSION_RESOURCE)[keyof typeof DOCUMENT_PERMISSION_RESOURCE]

/** Resource cho item (`elibrary_item` | `project_document`) — phục vụ adapter chọn namespace. */
export type DocumentItemResource =
  | typeof DOCUMENT_PERMISSION_RESOURCE.ELIBRARY_ITEM
  | typeof DOCUMENT_PERMISSION_RESOURCE.PROJECT_DOCUMENT

export const DOCUMENT_PERMISSION_ACTION = {
  LIST: 'list',
  RETRIEVE: 'retrieve',
  CREATE: 'create',
  PARTIAL_UPDATE: 'partial_update',
  DESTROY: 'destroy',
  SHARE: 'share',
  SHARES: 'shares',
  BULK_SHARE: 'bulk_share',
  BULK_CREATE_FILES: 'bulk_create_files',
  BULK_UPDATE: 'bulk_update',
  CREATE_FOLDER: 'create_folder',
  TOGGLE_FAVORITE: 'toggle_favorite',
  BROWSE: 'browse',
} as const

export type DocumentPermissionAction =
  (typeof DOCUMENT_PERMISSION_ACTION)[keyof typeof DOCUMENT_PERMISSION_ACTION]
