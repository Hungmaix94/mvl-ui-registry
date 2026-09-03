import { useMemo } from 'react'

import { useAbility } from '@/lib/ability'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { useUserInfo } from '@/store/auth-store'

import {
  DOCUMENT_PERMISSION_ACTION,
  DOCUMENT_PERMISSION_RESOURCE,
  type DocumentItemResource,
} from '../constants/permissions'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

export type DocumentScopeFlags = {
  disableEditItem?: boolean
  disableShareItem?: boolean
  disableDeleteItem?: boolean
  disableMoveIntoFolder?: boolean
}

export type DocumentItemPermissions = {
  isOwner: boolean
  canEdit: boolean
  canShare: boolean
  canDelete: boolean
  canMove: boolean
  canDownload: boolean
  canToggleFavorite: boolean
  canViewDetail: boolean
}

const EMPTY_PERMISSIONS: DocumentItemPermissions = {
  isOwner: false,
  canEdit: false,
  canShare: false,
  canDelete: false,
  canMove: false,
  canDownload: false,
  canToggleFavorite: false,
  canViewDetail: false,
}

/**
 * Tính toán quyền per-item theo Strict mode (xem implementation-plan.md §13.8):
 * - canEdit/canShare/canDelete/canMove: yêu cầu `isOwner && ability.can(...)`
 * - canDownload: luôn cho phép nếu item có view_url/download_url
 * - canToggleFavorite: luôn dùng namespace `elibrary_item.toggle_favorite` (xem §13.2 lưu ý 1)
 *
 * `resource` chỉ định namespace permission của adapter:
 * - 'elibrary_item' cho 4 page elibrary
 * - 'project_document' cho tab Documents trong project
 */
export function useDocumentItemPermissions(
  item: RealestateLibraryFileRead | null | undefined,
  resource: DocumentItemResource,
  scopeFlags?: DocumentScopeFlags
): DocumentItemPermissions {
  const ability = useAbility()
  const currentUser = useUserInfo()

  return useMemo(() => {
    if (!item) return EMPTY_PERMISSIONS

    const isOwner = currentUser?.id != null && item.owner === currentUser.id
    const isFile = item.node_type === ElibraryNodeType.file

    const canEdit =
      isOwner &&
      ability.can(DOCUMENT_PERMISSION_ACTION.PARTIAL_UPDATE, resource) &&
      !scopeFlags?.disableEditItem

    const canShare =
      isOwner &&
      isFile &&
      ability.can(DOCUMENT_PERMISSION_ACTION.SHARE, resource) &&
      !scopeFlags?.disableShareItem

    const canDelete =
      isOwner &&
      ability.can(DOCUMENT_PERMISSION_ACTION.DESTROY, resource) &&
      !scopeFlags?.disableDeleteItem

    const canMove =
      isOwner &&
      ability.can(DOCUMENT_PERMISSION_ACTION.BULK_UPDATE, resource) &&
      !scopeFlags?.disableMoveIntoFolder

    const canDownload = !!(item.download_url || item.view_url)

    const canToggleFavorite = ability.can(
      DOCUMENT_PERMISSION_ACTION.TOGGLE_FAVORITE,
      DOCUMENT_PERMISSION_RESOURCE.ELIBRARY_ITEM
    )

    return {
      isOwner,
      canEdit,
      canShare,
      canDelete,
      canMove,
      canDownload,
      canToggleFavorite,
      canViewDetail: true,
    }
  }, [ability, currentUser?.id, item, resource, scopeFlags])
}
