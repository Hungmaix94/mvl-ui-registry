import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { useBulkMoveProjectDocuments } from '@/services/document-service'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import MoveDocumentsConfirmDialog from '../components/form/MoveDocumentsConfirmDialog.tsx'

type UseProjectDocumentsMoveDialogParams = {
  projectId: number
  currentFolderLabel: string
  items: RealestateLibraryFileRead[]
  selectedIds: number[]
  clearSelection: () => void
  setPage: (page: number | ((prev: number) => number)) => void
  useBulkMoveMutationHook?: typeof useBulkMoveProjectDocuments
}

export function useProjectDocumentsMoveDialog({
  projectId,
  currentFolderLabel,
  items,
  selectedIds,
  clearSelection,
  setPage,
  useBulkMoveMutationHook,
}: UseProjectDocumentsMoveDialogParams) {
  const { displayCustom, updateConfig, setLoading } = useDialog()
  const useBulkMoveHook = useBulkMoveMutationHook ?? useBulkMoveProjectDocuments
  const bulkMoveMutation = useBulkMoveHook()

  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [pendingMoveTargetFolder, setPendingMoveTargetFolder] =
    useState<RealestateLibraryFileRead | null>(null)
  const [pendingMoveItems, setPendingMoveItems] = useState<RealestateLibraryFileRead[]>([])

  const pendingMoveItemsRef = useRef<RealestateLibraryFileRead[]>([])
  const pendingMoveTargetFolderRef = useRef<RealestateLibraryFileRead | null>(null)

  useEffect(() => {
    pendingMoveItemsRef.current = pendingMoveItems
  }, [pendingMoveItems])

  useEffect(() => {
    pendingMoveTargetFolderRef.current = pendingMoveTargetFolder
  }, [pendingMoveTargetFolder])

  const resetPendingMoveState = useCallback(() => {
    setPendingMoveItems([])
    setPendingMoveTargetFolder(null)
    setIsMoveDialogOpen(false)
  }, [])

  const handleRemovePendingMoveItem = useCallback((itemId: number) => {
    setPendingMoveItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  const handleConfirmBulkMove = useCallback(async () => {
    const targetFolder = pendingMoveTargetFolderRef.current
    const moveItems = pendingMoveItemsRef.current
    if (!targetFolder) return
    const moveIds = moveItems.map((item) => item.id)
    if (moveIds.length === 0) return

    try {
      setLoading(true)
      await bulkMoveMutation.mutateAsync({
        projectId,
        ids: moveIds,
        folder: targetFolder.id,
      } as any)
      toastService.success('Di chuyển tài liệu thành công')
      clearSelection()
      setPage(1)
      resetPendingMoveState()
    } catch (error) {
      toastService.error(
        extractErrorMessage(error, 'Không thể di chuyển tài liệu vào thư mục đích')
      )
      const apiError = Object.assign(new Error('project_documents_bulk_move_failed'), {
        isApiError: true,
      })
      throw apiError
    } finally {
      setLoading(false)
    }
  }, [bulkMoveMutation, clearSelection, projectId, resetPendingMoveState, setLoading, setPage])

  const openMoveConfirmDialog = useCallback(
    (targetFolder: RealestateLibraryFileRead, draggingItemId?: number | null) => {
      const selectedItems = items.filter((item) => selectedIds.includes(item.id))

      let resolvedMoveItems: RealestateLibraryFileRead[]
      if (draggingItemId) {
        const selectedContainsDragged = selectedItems.some((item) => item.id === draggingItemId)
        const draggedItem = items.find((item) => item.id === draggingItemId)
        resolvedMoveItems =
          selectedContainsDragged && selectedItems.length > 0
            ? selectedItems
            : draggedItem
              ? [draggedItem]
              : []
      } else {
        resolvedMoveItems = selectedItems
      }

      const normalizedMoveItems = resolvedMoveItems.filter((item) => item.id !== targetFolder.id)
      if (normalizedMoveItems.length === 0) {
        toastService.error('Không có mục hợp lệ để di chuyển')
        return
      }

      setPendingMoveItems(normalizedMoveItems)
      setPendingMoveTargetFolder(targetFolder)
      setIsMoveDialogOpen(true)

      displayCustom({
        size: '2xl',
        title: 'Di chuyển tài liệu',
        content: (
          <MoveDocumentsConfirmDialog
            sourceFolderName={currentFolderLabel}
            targetFolderName={targetFolder.name ?? '-'}
            items={normalizedMoveItems}
            onRemoveItem={handleRemovePendingMoveItem}
          />
        ),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        disableConfirm: normalizedMoveItems.length === 0,
        onConfirm: handleConfirmBulkMove,
        onCancel: resetPendingMoveState,
        onClose: resetPendingMoveState,
        footerFlexJustify: 'end',
      })
    },
    [
      currentFolderLabel,
      displayCustom,
      handleConfirmBulkMove,
      handleRemovePendingMoveItem,
      items,
      resetPendingMoveState,
      selectedIds,
    ]
  )

  useEffect(() => {
    if (!isMoveDialogOpen || !pendingMoveTargetFolder) return

    updateConfig({
      content: (
        <MoveDocumentsConfirmDialog
          sourceFolderName={currentFolderLabel}
          targetFolderName={pendingMoveTargetFolder.name ?? '-'}
          items={pendingMoveItems}
          onRemoveItem={handleRemovePendingMoveItem}
        />
      ),
      disableConfirm: pendingMoveItems.length === 0,
      loading: bulkMoveMutation.isPending,
    })
  }, [
    bulkMoveMutation.isPending,
    currentFolderLabel,
    handleRemovePendingMoveItem,
    isMoveDialogOpen,
    pendingMoveItems,
    pendingMoveTargetFolder,
    updateConfig,
  ])

  return {
    openMoveConfirmDialog,
  }
}
