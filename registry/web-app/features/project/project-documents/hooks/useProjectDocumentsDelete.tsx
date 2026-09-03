import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import DeleteDocumentsConfirmContent from '../components/form/DeleteDocumentsConfirmContent'
import { Button } from '@/components/ui'

type UseProjectDocumentsDeleteParams = {
  projectId: number
  items: RealestateLibraryFileRead[]
  deleteMutation: {
    mutateAsync: (params: { projectId: number; documentId: number }) => Promise<unknown>
  }
  clearSelection: () => void
  setPage: (page: number | ((prev: number) => number)) => void
  /** Invalidate once after batch delete (avoids N× global refetch when deleting N items). */
  listInvalidateQueryKey: (projectId: number) => readonly unknown[]
}

const UNDO_DELAY_MS = 3000

function UndoToastContent({ onUndo }: { onUndo: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>Đang thực hiện xoá</span>
      <Button
        variant="text"
        size="small"
        className="typo-body-sm-medium shrink-0 underline"
        onClick={(e) => {
          e.stopPropagation()
          onUndo()
        }}
      >
        Hoàn tác
      </Button>
    </div>
  )
}

export function useProjectDocumentsDelete({
  projectId,
  items,
  deleteMutation,
  clearSelection,
  setPage,
  listInvalidateQueryKey,
}: UseProjectDocumentsDeleteParams) {
  const queryClient = useQueryClient()
  const { displayCustom, updateConfig } = useDialog()

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [pendingDeleteItems, setPendingDeleteItems] = useState<RealestateLibraryFileRead[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([])

  const pendingDeleteItemsRef = useRef<RealestateLibraryFileRead[]>([])
  const cancelledRef = useRef(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    pendingDeleteItemsRef.current = pendingDeleteItems
  }, [pendingDeleteItems])

  const handleRemoveDeleteItem = useCallback((itemId: number) => {
    setPendingDeleteItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  const executeBatchDelete = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return

      const results = await Promise.allSettled(
        ids.map((id) => deleteMutation.mutateAsync({ projectId, documentId: id }))
      )

      const failedIds: number[] = []
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedIds.push(ids[index])
        }
      })

      setPendingDeleteIds([])

      const successCount = ids.length - failedIds.length
      if (successCount > 0) {
        clearSelection()
        setPage(1)
        void queryClient.invalidateQueries({
          queryKey: [...listInvalidateQueryKey(projectId)],
        })
      }

      if (failedIds.length > 0) {
        toastService.error(`Xoá thất bại ${failedIds.length} mục`)
      } else {
        toastService.success('Xoá tài liệu thành công')
      }
    },
    [clearSelection, deleteMutation, listInvalidateQueryKey, projectId, queryClient, setPage]
  )

  const startUndoCountdown = useCallback(
    (ids: number[]) => {
      cancelledRef.current = false

      const toastId = toast(
        <UndoToastContent
          onUndo={() => {
            cancelledRef.current = true
            toast.dismiss(toastId)
            setPendingDeleteIds([])
          }}
        />,
        {
          autoClose: UNDO_DELAY_MS,
          closeOnClick: false,
          pauseOnHover: false,
          onClose: () => {
            if (cancelledRef.current) return
            void executeBatchDelete(ids)
          },
          type: 'warning',
        }
      )
    },
    [executeBatchDelete]
  )

  const handleConfirmDelete = useCallback(() => {
    const finalItems = pendingDeleteItemsRef.current
    const finalIds = finalItems.map((item) => item.id)
    if (finalIds.length === 0) return

    setIsDeleteDialogOpen(false)
    setPendingDeleteIds(finalIds)
    setPendingDeleteItems([])
    startUndoCountdown(finalIds)
  }, [startUndoCountdown])

  const openDeleteConfirm = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return

      const resolvedItems = items.filter((item) => ids.includes(item.id))
      if (resolvedItems.length === 0) return

      setPendingDeleteItems(resolvedItems)
      setIsDeleteDialogOpen(true)

      displayCustom({
        size: '2xl',
        title: 'Xoá tài liệu',
        content: (
          <DeleteDocumentsConfirmContent
            items={resolvedItems}
            onRemoveItem={handleRemoveDeleteItem}
          />
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        disableConfirm: resolvedItems.length === 0,
        onConfirm: handleConfirmDelete,
        onCancel: () => {
          setIsDeleteDialogOpen(false)
          setPendingDeleteItems([])
        },
        onClose: () => {
          setIsDeleteDialogOpen(false)
          setPendingDeleteItems([])
        },
        footerFlexJustify: 'end',
      })
    },
    [displayCustom, handleConfirmDelete, handleRemoveDeleteItem, items]
  )

  useEffect(() => {
    if (!isDeleteDialogOpen) return

    updateConfig({
      content: (
        <DeleteDocumentsConfirmContent
          items={pendingDeleteItems}
          onRemoveItem={handleRemoveDeleteItem}
        />
      ),
      disableConfirm: pendingDeleteItems.length === 0,
    })
  }, [handleRemoveDeleteItem, isDeleteDialogOpen, pendingDeleteItems, updateConfig])

  useEffect(
    () => () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
        undoTimerRef.current = null
      }
    },
    []
  )

  return {
    pendingDeleteIds,
    openDeleteConfirm,
  }
}
