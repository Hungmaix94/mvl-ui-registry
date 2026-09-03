import { useMemo } from 'react'
import {
  IconBookmark,
  IconFolderplus,
  IconInfo,
  IconPencilsimple,
  IconShare,
  IconTrash,
  IconUploadsimple,
} from '@/assets/icons'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { PROJECT_DOCUMENT_CONTEXT_ACTION } from '@/constants/project-document'
import type { ContextMenuAction } from '../components/document-content/DocumentContentContextMenu'
import type { ContextMenuState } from '../types'
import type { BulkDocumentPermissions } from './useBulkDocumentPermissions'
import type { DocumentItemPermissions } from './useDocumentItemPermissions'

type UseProjectDocumentsContextMenuActionsParams = {
  contextMenu: ContextMenuState
  selectedIds: number[]
  shareableCount: number
  selectedPrimaryItem: RealestateLibraryFileRead | null
  /** Quyền per-item của item đang hover/select đơn (xem implementation-plan.md §6.3). */
  primaryItemPermissions: DocumentItemPermissions
  /** Counts permission cho selection hiện tại — gate cho menu multi-select. */
  selectionPermissions: BulkDocumentPermissions
  importantById: Record<number, boolean>
  projectId: number
  currentParentId: number | null
  setPage: (page: number | ((prev: number) => number)) => void
  clearSelection: () => void
  syncDetailMode: (count: number) => void
  setDetailClosed: (closed: boolean) => void
  openCreateFolderDialog: (
    projectId: number,
    parentId: number | null,
    onSuccess?: () => void
  ) => void
  openCreateDialog: (params: {
    projectId: number
    currentParentId: number | null
    onSuccess?: () => void
    initialFileToken?: string
    initialTitle?: string
    uploadAreaTrigger?: 'context_menu' | 'drag_drop'
  }) => void
  canCreateFolder?: boolean
  canUploadDocument?: boolean
  openEditDialog: (params: {
    projectId: number
    item: RealestateLibraryFileRead
    onSuccess?: () => void
  }) => void
  handleOpenShare: () => void
  handleMarkImportant: () => void
  handleUnmarkImportant: () => void
  handleDeleteSelected: () => void
}

export function useProjectDocumentsContextMenuActions({
  contextMenu,
  selectedIds,
  shareableCount,
  selectedPrimaryItem,
  primaryItemPermissions,
  selectionPermissions,
  importantById,
  projectId,
  currentParentId,
  setPage,
  clearSelection,
  syncDetailMode,
  setDetailClosed,
  openCreateFolderDialog,
  openCreateDialog,
  canCreateFolder = true,
  canUploadDocument = true,
  openEditDialog,
  handleOpenShare,
  handleMarkImportant,
  handleUnmarkImportant,
  handleDeleteSelected,
}: UseProjectDocumentsContextMenuActionsParams): ContextMenuAction[] {
  return useMemo(() => {
    if (contextMenu.targetType === 'canvas') {
      return [
        ...(canCreateFolder
          ? [
              {
                key: 'create-folder',
                label: 'Tạo thư mục',
                icon: <IconFolderplus size={16} />,
                onClick: () => openCreateFolderDialog(projectId, currentParentId, () => setPage(1)),
              } satisfies ContextMenuAction,
            ]
          : []),
        ...(canUploadDocument
          ? [
              {
                key: 'upload',
                label: 'Tải lên tài liệu',
                icon: <IconUploadsimple size={16} />,
                onClick: () =>
                  openCreateDialog({
                    projectId,
                    currentParentId,
                    uploadAreaTrigger: 'context_menu',
                    onSuccess: () => {
                      setPage(1)
                      clearSelection()
                    },
                  }),
              } satisfies ContextMenuAction,
            ]
          : []),
      ]
    }
    if (selectedIds.length > 1) {
      const importantCount = selectedIds.filter((id) => importantById[id]).length
      const allImportant = importantCount === selectedIds.length
      const allNotImportant = importantCount === 0
      const importantActions: ContextMenuAction[] = []
      if (!allImportant) {
        importantActions.push({
          key: PROJECT_DOCUMENT_CONTEXT_ACTION.MARK_IMPORTANT,
          label: 'Đánh dấu quan trọng',
          icon: <IconBookmark size={16} />,
          onClick: handleMarkImportant,
        })
      }
      if (!allNotImportant) {
        importantActions.push({
          key: PROJECT_DOCUMENT_CONTEXT_ACTION.UNMARK_IMPORTANT,
          label: 'Bỏ đánh dấu quan trọng',
          icon: <IconBookmark size={16} />,
          onClick: handleUnmarkImportant,
        })
      }
      const shareAction: ContextMenuAction[] =
        shareableCount > 0
          ? [
              {
                key: PROJECT_DOCUMENT_CONTEXT_ACTION.SHARE,
                label: `Chia sẻ (${shareableCount})`,
                icon: <IconShare size={16} />,
                onClick: handleOpenShare,
              },
            ]
          : []
      const deleteAction: ContextMenuAction[] =
        selectionPermissions.deletableCount > 0
          ? [
              {
                key: PROJECT_DOCUMENT_CONTEXT_ACTION.DELETE,
                label: `Xoá (${selectionPermissions.deletableCount})`,
                icon: <IconTrash size={16} />,
                variant: 'danger',
                onClick: handleDeleteSelected,
              },
            ]
          : []

      return [...shareAction, ...importantActions, ...deleteAction]
    }
    const isPrimaryImportant = selectedPrimaryItem
      ? (importantById[selectedPrimaryItem.id] ?? false)
      : false
    const importantAction: ContextMenuAction = isPrimaryImportant
      ? {
          key: PROJECT_DOCUMENT_CONTEXT_ACTION.UNMARK_IMPORTANT,
          label: 'Bỏ đánh dấu quan trọng',
          icon: <IconBookmark size={16} />,
          onClick: handleUnmarkImportant,
        }
      : {
          key: PROJECT_DOCUMENT_CONTEXT_ACTION.MARK_IMPORTANT,
          label: 'Đánh dấu quan trọng',
          icon: <IconBookmark size={16} />,
          onClick: handleMarkImportant,
        }
    const canShareSingle = primaryItemPermissions.canShare && shareableCount > 0
    // Cho phép chỉnh sửa cả thư mục (đổi tên/mô tả/hiển thị): canEdit đã gồm
    // isOwner + quyền partial_update; form đã ẩn phần tệp khi item là thư mục.
    const canEditSingle = primaryItemPermissions.canEdit
    const canDeleteSingle = primaryItemPermissions.canDelete

    const singleItemActions: ContextMenuAction[] = [
      ...(canShareSingle
        ? [
            {
              key: PROJECT_DOCUMENT_CONTEXT_ACTION.SHARE,
              label: 'Chia sẻ',
              icon: <IconShare size={16} />,
              onClick: handleOpenShare,
            } satisfies ContextMenuAction,
          ]
        : []),
      ...(canEditSingle
        ? [
            {
              key: PROJECT_DOCUMENT_CONTEXT_ACTION.EDIT,
              label: 'Chỉnh sửa thông tin',
              icon: <IconPencilsimple size={16} />,
              onClick: () =>
                selectedPrimaryItem &&
                openEditDialog({
                  projectId,
                  item: selectedPrimaryItem,
                  onSuccess: () => setPage(1),
                }),
            } satisfies ContextMenuAction,
          ]
        : []),
      importantAction,
      {
        key: PROJECT_DOCUMENT_CONTEXT_ACTION.DETAILS,
        label: 'Thông tin chi tiết',
        icon: <IconInfo size={16} />,
        onClick: () => {
          syncDetailMode(selectedIds.length)
          setDetailClosed(false)
        },
      },
      ...(canDeleteSingle
        ? [
            {
              key: PROJECT_DOCUMENT_CONTEXT_ACTION.DELETE,
              label: 'Xoá',
              icon: <IconTrash size={16} />,
              variant: 'danger',
              onClick: handleDeleteSelected,
            } satisfies ContextMenuAction,
          ]
        : []),
    ]
    return singleItemActions
  }, [
    contextMenu.targetType,
    selectedIds,
    shareableCount,
    selectedPrimaryItem,
    primaryItemPermissions,
    selectionPermissions,
    importantById,
    projectId,
    currentParentId,
    setPage,
    clearSelection,
    syncDetailMode,
    setDetailClosed,
    openCreateFolderDialog,
    openCreateDialog,
    canCreateFolder,
    canUploadDocument,
    openEditDialog,
    handleOpenShare,
    handleMarkImportant,
    handleUnmarkImportant,
    handleDeleteSelected,
  ])
}
