import { useMemo } from 'react'

import { useAbility } from '@/lib/ability'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { useUserInfo } from '@/store/auth-store'

import { DOCUMENT_PERMISSION_ACTION, type DocumentItemResource } from '../constants/permissions'
import type { DocumentScopeFlags } from './useDocumentItemPermissions'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

export type BulkDocumentPermissions = {
  /** Tổng số item được chọn (echo lại để tiện hiển thị). */
  selectedCount: number
  /** Số item user có quyền edit (chỉ áp cho file, vì folder không edit qua bulk). */
  editableCount: number
  /** Số file user có quyền share (folder không share — xem implementation-plan.md §2.1). */
  shareableCount: number
  /** Số item user có quyền delete (cả file + folder). */
  deletableCount: number
  /** Số item user có quyền move (drag-drop). */
  moveableCount: number
  /** ID items có thể share — dùng để filter payload trước khi gọi API. */
  shareableIds: number[]
  /** ID items có thể delete. */
  deletableIds: number[]
  /** ID items có thể move. */
  moveableIds: number[]
}

const EMPTY_BULK: BulkDocumentPermissions = {
  selectedCount: 0,
  editableCount: 0,
  shareableCount: 0,
  deletableCount: 0,
  moveableCount: 0,
  shareableIds: [],
  deletableIds: [],
  moveableIds: [],
}

/**
 * Tính counts cho selection toolbar (header actions) + context menu multi-select.
 *
 * Logic giống `useDocumentItemPermissions` nhưng vector hoá — tránh gọi hook trong loop
 * (rules-of-hooks) và memo theo `items.map(i => i.id+i.owner).join`.
 */
export function useBulkDocumentPermissions(
  items: RealestateLibraryFileRead[],
  resource: DocumentItemResource,
  scopeFlags?: DocumentScopeFlags
): BulkDocumentPermissions {
  const ability = useAbility()
  const currentUser = useUserInfo()

  return useMemo(() => {
    if (!items.length || currentUser?.id == null) return EMPTY_BULK

    const folderType = ElibraryNodeType.folder
    const fileType = ElibraryNodeType.file

    const canEditAction =
      ability.can(DOCUMENT_PERMISSION_ACTION.PARTIAL_UPDATE, resource) &&
      !scopeFlags?.disableEditItem
    const canShareAction =
      ability.can(DOCUMENT_PERMISSION_ACTION.SHARE, resource) && !scopeFlags?.disableShareItem
    const canDeleteAction =
      ability.can(DOCUMENT_PERMISSION_ACTION.DESTROY, resource) && !scopeFlags?.disableDeleteItem
    const canMoveAction =
      ability.can(DOCUMENT_PERMISSION_ACTION.BULK_UPDATE, resource) &&
      !scopeFlags?.disableMoveIntoFolder

    let editableCount = 0
    let shareableCount = 0
    let deletableCount = 0
    let moveableCount = 0
    const shareableIds: number[] = []
    const deletableIds: number[] = []
    const moveableIds: number[] = []

    for (const item of items) {
      const isOwner = item.owner === currentUser.id
      if (!isOwner) continue

      if (canEditAction && item.node_type === fileType) editableCount += 1

      if (canShareAction && item.node_type !== folderType) {
        shareableCount += 1
        shareableIds.push(item.id)
      }
      if (canDeleteAction) {
        deletableCount += 1
        deletableIds.push(item.id)
      }
      if (canMoveAction) {
        moveableCount += 1
        moveableIds.push(item.id)
      }
    }

    return {
      selectedCount: items.length,
      editableCount,
      shareableCount,
      deletableCount,
      moveableCount,
      shareableIds,
      deletableIds,
      moveableIds,
    }
  }, [ability, currentUser?.id, items, resource, scopeFlags])
}
