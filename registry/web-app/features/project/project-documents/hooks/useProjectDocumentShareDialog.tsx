import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog'
import ProjectDocumentShareForm from '../components/form/ProjectDocumentShareForm'
import ProjectDocumentExistingSharesList, {
  type LibraryShareRead,
} from '../components/form/ProjectDocumentExistingSharesList'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { Button } from '@/components/ui'
import { IconLinksimple } from '@/assets/icons'
import { type components } from '@/api/schema'
import toastService from '@/services/toast-service'
import { useItemsShareLinks } from './useItemsShareLinks'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

type ShareLink = components['schemas']['LibraryAccessTokenRead']

export type CopyLinksHandlerParams = {
  itemIds: number[]
  existingLinksByItemId: Map<number, ShareLink | null>
}

export type UseItemSharesHook = (
  itemId: number,
  options?: { enabled?: boolean }
) => {
  data?: { results?: LibraryShareRead[] } | LibraryShareRead[]
  isLoading: boolean
  refetch?: () => void
}

export type UseDeleteShareMutationHook = () => {
  mutateAsync: (shareId: number) => Promise<unknown>
  isPending?: boolean
}

type UseProjectDocumentShareDialogParams = {
  /** Hook load existing shares (xem implementation-plan.md §7.3). */
  useItemSharesHook?: UseItemSharesHook
  /** Hook mutation xoá share (default elibrary). */
  useDeleteShareMutationHook?: UseDeleteShareMutationHook
  /** Callback gọi sau khi unshare thành công — usually invalidate list query. */
  onAfterUnshare?: () => void
}

type OpenProjectDocumentShareDialogParams = {
  title: string
  initialItems: RealestateLibraryFileRead[]
  visibilityOptions: { value: string; label: string }[]
  visibilityEnumOptions: string[]
  shareVisibility: ElibraryVisibility
  onShareVisibilityChange: (value: ElibraryVisibility) => void
  isDepartmentVisibility: boolean
  selectedDepartmentIds: number[]
  onSelectedDepartmentIdsChange: (ids: number[]) => void
  selectedEmployeeIds: number[]
  onSelectedEmployeeIdsChange: (ids: number[]) => void
  onConfirm: (itemIds: number[]) => void | Promise<void>
  onCopyLinks: (params: CopyLinksHandlerParams) => void | Promise<void>
  /**
   * IDs của items mà current user là owner. Quyết định hiển thị nút "Chia sẻ liên kết"
   * (BE chỉ cho owner tạo share-link).
   */
  ownableItemIds: number[]
}

export function useProjectDocumentShareDialog(params: UseProjectDocumentShareDialogParams = {}) {
  const { useItemSharesHook, useDeleteShareMutationHook, onAfterUnshare } = params
  const { displayCustom, displayClose, updateConfig, setLoading } = useDialog()
  const shareFormMountKeyRef = useRef(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [shareItems, setShareItems] = useState<RealestateLibraryFileRead[]>([])
  const [dialogParams, setDialogParams] = useState<OpenProjectDocumentShareDialogParams | null>(
    null
  )
  const [shareVisibility, setShareVisibility] = useState<ElibraryVisibility>(
    ElibraryVisibility.company
  )
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([])

  /** ID của item đơn cần tải shares — null khi multi-select (xem §7.5). */
  const singleItemId = shareItems.length === 1 ? shareItems[0]!.id : null

  const sharesQuery = useItemSharesHook?.(singleItemId ?? 0, {
    enabled: !!singleItemId && isOpen,
  })
  const deleteShareMutation = useDeleteShareMutationHook?.()

  const existingShares = useMemo<LibraryShareRead[]>(() => {
    const data = sharesQuery?.data
    if (!data) return []
    if (Array.isArray(data)) return data
    return data.results ?? []
  }, [sharesQuery?.data])

  const isLoadingShares = !!sharesQuery?.isLoading
  const isUnsharing = !!deleteShareMutation?.isPending

  const handleUnshare = useCallback(
    async (shareId: number) => {
      if (!deleteShareMutation) return
      try {
        await deleteShareMutation.mutateAsync(shareId)
        toastService.success('Đã huỷ chia sẻ')
        sharesQuery?.refetch?.()
        onAfterUnshare?.()
      } catch {
        toastService.error('Không thể huỷ chia sẻ. Vui lòng thử lại.')
      }
    },
    [deleteShareMutation, sharesQuery, onAfterUnshare]
  )

  const existingSharesSlot = useMemo<ReactNode>(() => {
    if (!useItemSharesHook) return null
    if (!singleItemId) return null
    return (
      <ProjectDocumentExistingSharesList
        shares={existingShares}
        isLoading={isLoadingShares}
        onUnshare={handleUnshare}
        isUnsharing={isUnsharing}
      />
    )
  }, [useItemSharesHook, singleItemId, existingShares, isLoadingShares, handleUnshare, isUnsharing])

  const itemIds = useMemo(() => shareItems.map((item) => item.id), [shareItems])

  /**
   * IDs trong selection hiện tại mà user là owner.
   * Giao giữa `ownableItemIds` (từ caller) với items còn lại sau khi user click "X" loại bỏ.
   */
  const ownableItemIds = useMemo(() => {
    const ownableSet = new Set(dialogParams?.ownableItemIds ?? [])
    return itemIds.filter((id) => ownableSet.has(id))
  }, [dialogParams?.ownableItemIds, itemIds])

  // Batch-load share-links cho tất cả items trong dialog. Dùng để:
  //  (1) render icon trạng thái cạnh tên file
  //  (2) trong handleCopyLinks: phân biệt item nào reuse link cũ vs tạo mới.
  const { activeLinkByItemId, isLoading: isLoadingShareLinks } = useItemsShareLinks(itemIds, {
    enabled: isOpen,
  })

  /**
   * Có thể copy link khi: có ít nhất 1 item user owns (để có thể tạo mới)
   * HOẶC có ít nhất 1 item đã có active link (để reuse).
   */
  const hasAnyActiveLink = useMemo(() => {
    return itemIds.some((id) => activeLinkByItemId.get(id) != null)
  }, [activeLinkByItemId, itemIds])
  const canCopyShareLinks = ownableItemIds.length > 0 || hasAnyActiveLink

  const resetShareDialogState = useCallback(() => {
    setIsOpen(false)
    setIsSaved(false)
    setShareItems([])
    setSelectedDepartmentIds([])
    setSelectedEmployeeIds([])
    setDialogParams(null)
  }, [])

  const handleClose = useCallback(() => {
    resetShareDialogState()
    displayClose()
  }, [displayClose, resetShareDialogState])

  const handleConfirm = useCallback(async () => {
    if (!dialogParams) return
    if (itemIds.length === 0) return

    if (isSaved) {
      // Sau Save: button "Sao chép liên kết chia sẻ" — reuse link cũ + tạo cho item
      // chưa có (chỉ owner). KHÔNG đóng dialog sau khi copy: user phải click "Đóng".
      if (!canCopyShareLinks) return
      try {
        setLoading(true)
        await dialogParams.onCopyLinks({
          itemIds,
          existingLinksByItemId: activeLinkByItemId,
        })
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      setLoading(true)
      await dialogParams.onConfirm(itemIds)
      setIsSaved(true)
    } finally {
      setLoading(false)
    }
  }, [
    activeLinkByItemId,
    canCopyShareLinks,
    dialogParams,
    handleClose,
    isSaved,
    itemIds,
    setLoading,
  ])

  const handleCopyLinks = useCallback(async () => {
    if (!dialogParams) return
    if (!canCopyShareLinks) return
    try {
      setLoading(true)
      await dialogParams.onCopyLinks({
        itemIds,
        existingLinksByItemId: activeLinkByItemId,
      })
    } finally {
      setLoading(false)
    }
  }, [activeLinkByItemId, canCopyShareLinks, dialogParams, itemIds, setLoading])

  /**
   * Copy link cho 1 item (click icon link cạnh dung lượng).
   * Reuse `onCopyLinks` với chỉ 1 itemId — shareState tự xử lý reuse vs tạo mới.
   */
  const handleCopyItemLink = useCallback(
    async (itemId: number) => {
      if (!dialogParams) return
      try {
        setLoading(true)
        await dialogParams.onCopyLinks({
          itemIds: [itemId],
          existingLinksByItemId: activeLinkByItemId,
        })
      } finally {
        setLoading(false)
      }
    },
    [activeLinkByItemId, dialogParams, setLoading]
  )

  const handleRemoveItem = useCallback((id: number) => {
    setShareItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const openShareDialog = useCallback(
    (params: OpenProjectDocumentShareDialogParams) => {
      const { title, initialItems } = params

      setDialogParams(params)
      setShareItems(initialItems)
      setIsOpen(true)
      setIsSaved(false)
      setShareVisibility(params.shareVisibility)
      setSelectedDepartmentIds(params.selectedDepartmentIds)
      setSelectedEmployeeIds(params.selectedEmployeeIds)

      shareFormMountKeyRef.current += 1
      const shareFormKey = `${shareFormMountKeyRef.current}-${initialItems
        .map((item) => item.id)
        .sort((a, b) => a - b)
        .join('-')}`

      displayCustom({
        size: '2xl',
        title,
        content: (
          <ProjectDocumentShareForm
            key={shareFormKey}
            items={initialItems}
            onRemoveItem={handleRemoveItem}
            visibilityOptions={params.visibilityOptions}
            visibilityEnumOptions={params.visibilityEnumOptions}
            shareVisibility={params.shareVisibility}
            onShareVisibilityChange={(value) => {
              setShareVisibility(value)
              params.onShareVisibilityChange(value)
            }}
            isDepartmentVisibility={params.shareVisibility === ElibraryVisibility.department}
            selectedDepartmentIds={params.selectedDepartmentIds}
            onSelectedDepartmentIdsChange={(ids) => {
              setSelectedDepartmentIds(ids)
              params.onSelectedDepartmentIdsChange(ids)
            }}
            selectedEmployeeIds={params.selectedEmployeeIds}
            onSelectedEmployeeIdsChange={(ids) => {
              setSelectedEmployeeIds(ids)
              params.onSelectedEmployeeIdsChange(ids)
            }}
            existingSharesSlot={existingSharesSlot}
            activeShareLinkByItemId={activeLinkByItemId}
            isLoadingShareLinks={isLoadingShareLinks}
            ownableItemIds={params.ownableItemIds}
            onCopyItemLink={handleCopyItemLink}
          />
        ),
        confirmText: 'Lưu',
        cancelText: 'Huỷ',
        onConfirm: handleConfirm,
        onCancel: handleClose,
        // Important: dialog-store calls config.onClose already, so do NOT call displayClose() here.
        onClose: resetShareDialogState,
        disableConfirm: initialItems.length === 0,
        disableBackdropClose: true,
        // Share dialog là multi-step (save → copy link) — dialog hook tự đóng khi cần.
        disableAutoCloseOnConfirm: true,
        footerFlexJustify: 'end',
        leftFooterContent: canCopyShareLinks ? (
          <Button
            variant="text"
            size="small"
            leftIcon={<IconLinksimple size={16} />}
            className="text-action-primary-red-default hover:text-action-primary-red-hover"
            onClick={() => {
              void handleCopyLinks()
            }}
          >
            Chia sẻ liên kết
          </Button>
        ) : null,
      })
    },
    [
      canCopyShareLinks,
      displayCustom,
      handleClose,
      handleConfirm,
      handleCopyLinks,
      handleCopyItemLink,
      handleRemoveItem,
      activeLinkByItemId,
      isLoadingShareLinks,
    ]
  )

  useEffect(() => {
    if (!isOpen || !dialogParams) return

    const shareFormKey = `${shareFormMountKeyRef.current}-${shareItems
      .map((item) => item.id)
      .sort((a, b) => a - b)
      .join('-')}`

    updateConfig({
      title: dialogParams.title,
      content: (
        <ProjectDocumentShareForm
          key={shareFormKey}
          items={shareItems}
          onRemoveItem={handleRemoveItem}
          visibilityOptions={dialogParams.visibilityOptions}
          visibilityEnumOptions={dialogParams.visibilityEnumOptions}
          shareVisibility={shareVisibility}
          onShareVisibilityChange={(value) => {
            setShareVisibility(value)
            dialogParams.onShareVisibilityChange(value)
          }}
          isDepartmentVisibility={shareVisibility === ElibraryVisibility.department}
          selectedDepartmentIds={selectedDepartmentIds}
          onSelectedDepartmentIdsChange={(ids) => {
            setSelectedDepartmentIds(ids)
            dialogParams.onSelectedDepartmentIdsChange(ids)
          }}
          selectedEmployeeIds={selectedEmployeeIds}
          onSelectedEmployeeIdsChange={(ids) => {
            setSelectedEmployeeIds(ids)
            dialogParams.onSelectedEmployeeIdsChange(ids)
          }}
          existingSharesSlot={existingSharesSlot}
          activeShareLinkByItemId={activeLinkByItemId}
          isLoadingShareLinks={isLoadingShareLinks}
          ownableItemIds={ownableItemIds}
          onCopyItemLink={handleCopyItemLink}
        />
      ),
      // Sau Save: confirm button đổi thành "Sao chép liên kết".
      // Nếu user không owner item nào → disable confirm, chỉ giữ Đóng.
      // Click confirm KHÔNG đóng dialog — user phải click "Đóng" để thoát.
      confirmText: isSaved ? 'Sao chép liên kết' : 'Lưu',
      cancelText: isSaved ? 'Đóng' : 'Huỷ',
      confirmButtonClassName: isSaved ? 'whitespace-nowrap' : undefined,
      onConfirm: handleConfirm,
      onCancel: handleClose,
      disableConfirm: shareItems.length === 0 || (isSaved && !canCopyShareLinks),
      footerFlexJustify: 'end',
      disableBackdropClose: true,
      // Multi-step: stay open sau khi save để user có thể tiếp tục thao tác.
      disableAutoCloseOnConfirm: true,
      leftFooterContent:
        canCopyShareLinks && !isSaved ? (
          <Button
            variant="text"
            size="small"
            leftIcon={<IconLinksimple size={16} />}
            className="text-action-primary-red-default hover:text-action-primary-red-hover"
            disabled={shareItems.length === 0}
            onClick={() => {
              void handleCopyLinks()
            }}
          >
            Chia sẻ liên kết
          </Button>
        ) : null,
    })
  }, [
    activeLinkByItemId,
    canCopyShareLinks,
    dialogParams,
    handleClose,
    handleConfirm,
    handleCopyLinks,
    handleCopyItemLink,
    handleRemoveItem,
    isLoadingShareLinks,
    isOpen,
    isSaved,
    ownableItemIds,
    selectedDepartmentIds,
    selectedEmployeeIds,
    shareItems,
    shareVisibility,
    existingSharesSlot,
    updateConfig,
  ])

  return {
    openShareDialog,
  }
}
