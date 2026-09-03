import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type components } from '@/api/schema'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import {
  DEFAULT_SHARE_LINK_MAX_USES,
  DEFAULT_SHARE_LINK_TTL_SECONDS,
  PROJECT_DOCUMENT_VISIBILITY_ENUM_OPTIONS,
} from '../constants'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import toastService from '@/services/toast-service'
import { RadioGroup } from '@/components/ui/radio-group.tsx'
import { Button } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import { useUserInfo } from '@/store/auth-store'
import { buildPublicDocViewerUrl } from '@/utils/share-link'
import { ElibraryNodeType, ElibraryVisibility } from '@/constants/api-schema-aliases'

type UseProjectDocumentsShareStateParams = {
  projectId: number
  items: RealestateLibraryFileRead[]
  selectedIds: number[]
  selectedPrimaryItem: RealestateLibraryFileRead | null
  updateMutation: {
    mutateAsync: (params: {
      projectId: number
      documentId: number
      data: { visibility: ElibraryVisibility }
    }) => Promise<unknown>
  }
  shareMutation: {
    mutateAsync: (params: {
      projectId: number
      documentId: number
      data: { department_ids?: number[]; employee_ids?: number[] }
    }) => Promise<unknown>
  }
  /**
   * Mutation tạo public share-link cho 1 item.
   * Bắt buộc — explorer luôn truyền vào (adapter override hoặc default `useCreateElibraryShareLink`).
   */
  createShareLinkMutation: {
    mutateAsync: (params: {
      id: number
      data: components['schemas']['LibraryAccessTokenCreateRequest']
    }) => Promise<components['schemas']['LibraryAccessTokenRead']>
    isPending?: boolean
  }
  /** Override TTL/max_uses cho share-link (default: 30 ngày, unlimited). */
  shareLinkConfig?: {
    ttlSeconds?: number
    maxUses?: number | null
  }
  visibilityConstantConfig?: {
    module: 'files' | 'elibrary'
    key: string
  }
  openShareDialog: (params: {
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
    onCopyLinks: (params: {
      itemIds: number[]
      existingLinksByItemId: Map<number, components['schemas']['LibraryAccessTokenRead'] | null>
    }) => void | Promise<void>
    /** Items mà current user là owner — quyết định hiển thị nút "Chia sẻ liên kết". */
    ownableItemIds: number[]
  }) => void
  onSuccess?: () => void
  /** Invalidate once after share completes (avoids 2× global refetch from PATCH + POST share). */
  listInvalidateQueryKey: (projectId: number) => readonly unknown[]
}

type VisibilityOption = { value: string; label: string }

type VisibilityBatchUpdateResult = {
  succeededItems: RealestateLibraryFileRead[]
  failedItems: RealestateLibraryFileRead[]
}

type VisibilityUpdateDialogContentProps = {
  privateItems: RealestateLibraryFileRead[]
  visibilityOptions: VisibilityOption[]
  visibilityEnumOptions: string[]
  defaultVisibility: ElibraryVisibility
  onVisibilityChange: (value: ElibraryVisibility) => void
}

function FileNameList({ items }: { items: RealestateLibraryFileRead[] }) {
  return (
    <div className="bg-background-2 border-border-1 rounded-sm border p-3">
      <ul className="max-h-[180px] space-y-1 overflow-auto">
        {items.map((item) => (
          <li
            key={item.id}
            className="typo-body-sm-regular text-content-dark-2 truncate"
            title={item.name ?? '-'}
          >
            - {item.name ?? '-'}
          </li>
        ))}
      </ul>
    </div>
  )
}

function VisibilityUpdateDialogContent({
  privateItems,
  visibilityOptions,
  visibilityEnumOptions,
  defaultVisibility,
  onVisibilityChange,
}: VisibilityUpdateDialogContentProps) {
  const [visibility, setVisibility] = useState(defaultVisibility)

  return (
    <div className="space-y-4">
      <p className="typo-body-sm-regular text-content-dark-2">
        Vui lòng cập nhật phạm vi truy cập cho các file có phạm vi truy cập là &quot;cá nhân&quot;
        trước khi tiếp tục chia sẻ.
      </p>

      <FileNameList items={privateItems} />

      <RadioGroup
        id="update-private-visibility"
        label="Phạm vi truy cập mới"
        disabled={false}
        options={
          visibilityOptions.length > 0
            ? visibilityOptions
            : visibilityEnumOptions.map((value) => ({ value, label: value }))
        }
        value={visibility}
        onChange={(valueOrEvent: string | FormEvent<HTMLDivElement>) => {
          if (typeof valueOrEvent !== 'string') return
          const nextValue = valueOrEvent as ElibraryVisibility
          setVisibility(nextValue)
          onVisibilityChange(nextValue)
        }}
      />
    </div>
  )
}

function dedupeItemsById(items: RealestateLibraryFileRead[]) {
  const map = new Map<number, RealestateLibraryFileRead>()
  items.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  })
  return Array.from(map.values())
}

function orderItemsBySource(
  source: RealestateLibraryFileRead[],
  targetItems: RealestateLibraryFileRead[]
) {
  const targetIdSet = new Set(targetItems.map((item) => item.id))
  return source.filter((item) => targetIdSet.has(item.id))
}

export function useProjectDocumentsShareState({
  projectId,
  items,
  selectedIds,
  selectedPrimaryItem,
  updateMutation,
  shareMutation,
  createShareLinkMutation,
  shareLinkConfig,
  openShareDialog,
  onSuccess,
  visibilityConstantConfig,
  listInvalidateQueryKey,
}: UseProjectDocumentsShareStateParams) {
  const currentUser = useUserInfo()
  const { displayCustom, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const { keysMapOptions } = useAppConstant({
    module: visibilityConstantConfig?.module ?? 'files',
    keys: [visibilityConstantConfig?.key ?? APP_CONSTANT_KEY.FILES.DOCUMENT_VISIBILITY],
  })

  const visibilityOptions = useMemo(() => {
    const key = visibilityConstantConfig?.key ?? APP_CONSTANT_KEY.FILES.DOCUMENT_VISIBILITY
    return keysMapOptions.get(key) ?? []
  }, [keysMapOptions, visibilityConstantConfig?.key])

  const [shareVisibility, setShareVisibility] = useState<ElibraryVisibility>(
    ElibraryVisibility.company
  )
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([])

  /**
   * `useProjectDocumentShareDialog` snapshots `onConfirm` when the dialog opens. Without refs,
   * `handleApplyShare` would close over empty selection state and omit `employee_ids` / `department_ids`.
   */
  const shareVisibilityRef = useRef(shareVisibility)
  const selectedDepartmentIdsRef = useRef(selectedDepartmentIds)
  const selectedEmployeeIdsRef = useRef(selectedEmployeeIds)

  useEffect(() => {
    shareVisibilityRef.current = shareVisibility
  }, [shareVisibility])

  useEffect(() => {
    selectedDepartmentIdsRef.current = selectedDepartmentIds
  }, [selectedDepartmentIds])

  useEffect(() => {
    selectedEmployeeIdsRef.current = selectedEmployeeIds
  }, [selectedEmployeeIds])

  const itemById = useMemo(() => {
    const map = new Map<number, RealestateLibraryFileRead>()
    items.forEach((item) => map.set(item.id, item))
    if (selectedPrimaryItem) map.set(selectedPrimaryItem.id, selectedPrimaryItem)
    return map
  }, [items, selectedPrimaryItem])

  const handleApplyShare = useCallback(
    async (itemIds: number[]) => {
      const ids = Array.from(new Set(itemIds))
      if (ids.length === 0) return

      const visibility = shareVisibilityRef.current
      const deptIds = selectedDepartmentIdsRef.current
      const empIds = selectedEmployeeIdsRef.current

      const hasExplicitDepartmentTargets =
        visibility === ElibraryVisibility.department && (deptIds.length > 0 || empIds.length > 0)

      // Only send `department_ids` / `employee_ids` when:
      // - user selected "department" visibility, AND
      // - at least one department/employee is explicitly selected.
      const shareData: { department_ids?: number[]; employee_ids?: number[] } =
        visibility === ElibraryVisibility.department
          ? {
              ...(deptIds.length > 0 ? { department_ids: deptIds } : {}),
              ...(empIds.length > 0 ? { employee_ids: empIds } : {}),
            }
          : {}

      try {
        await Promise.all(
          ids.map(async (id) => {
            await updateMutation.mutateAsync({
              projectId,
              documentId: id,
              data: { visibility },
            })

            if (hasExplicitDepartmentTargets) {
              await shareMutation.mutateAsync({
                projectId,
                documentId: id,
                data: shareData,
              })
            }
          })
        )
      } catch (error) {
        toastService.error('Có lỗi xảy ra khi chia sẻ tài liệu. Vui lòng thử lại.')
        throw error
      }

      void queryClient.invalidateQueries({
        queryKey: [...listInvalidateQueryKey(projectId)],
      })
      onSuccess?.()
    },
    [projectId, listInvalidateQueryKey, queryClient, updateMutation, shareMutation, onSuccess]
  )

  const handleCopyLinks = useCallback(
    async (params: {
      itemIds: number[]
      existingLinksByItemId: Map<number, components['schemas']['LibraryAccessTokenRead'] | null>
    }) => {
      const ids = Array.from(new Set(params.itemIds))
      if (ids.length === 0) {
        toastService.error('Không có tệp để sao chép liên kết')
        return
      }
      if (currentUser?.id == null) {
        toastService.error('Không xác định được người dùng hiện tại')
        return
      }

      // Phân loại từng id: đã có link → reuse; chưa có nhưng là owner → cần tạo;
      // chưa có và không phải owner → skip (BE chặn).
      const reusedLinks = new Map<number, components['schemas']['LibraryAccessTokenRead']>()
      const idsNeedCreate: number[] = []
      const skippedIds: number[] = []

      ids.forEach((id) => {
        const existing = params.existingLinksByItemId.get(id)
        if (existing) {
          reusedLinks.set(id, existing)
          return
        }
        const item = itemById.get(id)
        if (item && item.owner === currentUser.id) {
          idsNeedCreate.push(id)
        } else {
          skippedIds.push(id)
        }
      })

      if (reusedLinks.size === 0 && idsNeedCreate.length === 0) {
        toastService.error('Bạn không có quyền tạo liên kết cho các tài liệu này')
        return
      }

      const requestBody: components['schemas']['LibraryAccessTokenCreateRequest'] = {
        ttl_seconds: shareLinkConfig?.ttlSeconds ?? DEFAULT_SHARE_LINK_TTL_SECONDS,
        max_uses:
          shareLinkConfig?.maxUses !== undefined
            ? shareLinkConfig.maxUses
            : DEFAULT_SHARE_LINK_MAX_USES,
      }

      const createdLinks = new Map<number, components['schemas']['LibraryAccessTokenRead']>()
      let failedCreateCount = 0

      if (idsNeedCreate.length > 0) {
        const results = await Promise.allSettled(
          idsNeedCreate.map((id) =>
            createShareLinkMutation
              .mutateAsync({ id, data: requestBody })
              .then((value) => ({ id, value }))
          )
        )
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { id, value } = result.value
            if (value?.url) {
              createdLinks.set(id, value)
              return
            }
          }
          failedCreateCount += 1
        })
      }

      // Build clipboard text theo đúng thứ tự ids ban đầu.
      const lines: string[] = []
      const missingItemNames: string[] = []

      ids.forEach((id) => {
        const link = reusedLinks.get(id) ?? createdLinks.get(id)
        const item = itemById.get(id)
        const name = item?.name ?? `#${id}`
        // Copy URL trang xem public của web (`/docs/:token`) thay vì URL API thô,
        // để người nhận mở được giao diện xem trước / tải tài liệu.
        // Chỉ copy URL thuần, không kèm tên file (để người dùng paste dùng ngay).
        if (link?.token) {
          lines.push(buildPublicDocViewerUrl(link.token))
        } else {
          missingItemNames.push(name)
        }
      })

      if (lines.length === 0) {
        toastService.error('Không tạo được liên kết chia sẻ. Vui lòng thử lại.')
        return
      }

      try {
        await navigator.clipboard.writeText(lines.join('\n'))
      } catch {
        toastService.error('Không thể sao chép vào clipboard')
        return
      }

      const skippedCount = skippedIds.length + failedCreateCount
      if (skippedCount > 0) {
        toastService.warning(
          `Đã sao chép ${lines.length} liên kết. Bỏ qua ${skippedCount} tài liệu (${missingItemNames
            .slice(0, 3)
            .join(', ')}${missingItemNames.length > 3 ? '…' : ''})`
        )
        return
      }

      toastService.success(`Đã sao chép ${lines.length} liên kết chia sẻ`)
    },
    [createShareLinkMutation, currentUser?.id, itemById, shareLinkConfig]
  )

  const getOwnableItemIds = useCallback(
    (files: RealestateLibraryFileRead[]) => {
      if (currentUser?.id == null) return []
      return files.filter((item) => item.owner === currentUser.id).map((item) => item.id)
    },
    [currentUser?.id]
  )

  const getSelectedFileItems = useCallback(() => {
    const fromSelection =
      selectedIds.length > 0 ? items.filter((item) => selectedIds.includes(item.id)) : []
    const fallback = selectedPrimaryItem ? [selectedPrimaryItem] : []
    const source = fromSelection.length > 0 ? fromSelection : fallback

    return source.filter((item) => item.node_type === ElibraryNodeType.file)
  }, [items, selectedIds, selectedPrimaryItem])

  const nonPrivateVisibilityOptions = useMemo(
    () => visibilityOptions.filter((option) => option.value !== ElibraryVisibility.private),
    [visibilityOptions]
  )

  const nonPrivateVisibilityEnumOptions = useMemo(
    () =>
      PROJECT_DOCUMENT_VISIBILITY_ENUM_OPTIONS.filter(
        (value) => value !== ElibraryVisibility.private
      ),
    []
  )

  const defaultVisibilityForPrivateUpdate = useMemo(() => {
    const firstFromOptions = nonPrivateVisibilityOptions[0]?.value
    const firstFromEnums = nonPrivateVisibilityEnumOptions[0]
    const fallback = firstFromOptions ?? firstFromEnums ?? ElibraryVisibility.company

    return fallback as ElibraryVisibility
  }, [nonPrivateVisibilityOptions, nonPrivateVisibilityEnumOptions])

  const pendingPrivateUpdateVisibilityRef = useRef<ElibraryVisibility>(
    defaultVisibilityForPrivateUpdate
  )

  useEffect(() => {
    pendingPrivateUpdateVisibilityRef.current = defaultVisibilityForPrivateUpdate
  }, [defaultVisibilityForPrivateUpdate])

  const updateVisibilityBatch = useCallback(
    async (
      targetItems: RealestateLibraryFileRead[],
      targetVisibility: ElibraryVisibility
    ): Promise<VisibilityBatchUpdateResult> => {
      const settledResults = await Promise.allSettled(
        targetItems.map(async (item) => {
          await updateMutation.mutateAsync({
            projectId,
            documentId: item.id,
            data: { visibility: targetVisibility },
          })
          return item
        })
      )

      const succeededItems: RealestateLibraryFileRead[] = []
      const failedItems: RealestateLibraryFileRead[] = []

      settledResults.forEach((result, index) => {
        const item = targetItems[index]
        if (!item) return
        if (result.status === 'fulfilled') {
          succeededItems.push(item)
          return
        }
        failedItems.push(item)
      })

      return { succeededItems, failedItems }
    },
    [projectId, updateMutation]
  )

  const openShareDialogWithItems = useCallback(
    (files: RealestateLibraryFileRead[]) => {
      const shareableFiles = dedupeItemsById(files)
      if (shareableFiles.length === 0) {
        toastService.error('Vui lòng chọn ít nhất một tệp để chia sẻ')
        return
      }

      // Fresh form each open — do not reuse visibility / department / employee from a previous share.
      const defaultVisibility = ElibraryVisibility.company
      setShareVisibility(defaultVisibility)
      setSelectedDepartmentIds([])
      setSelectedEmployeeIds([])
      shareVisibilityRef.current = defaultVisibility
      selectedDepartmentIdsRef.current = []
      selectedEmployeeIdsRef.current = []

      openShareDialog({
        title: 'Chia sẻ tài liệu',
        initialItems: shareableFiles,
        visibilityOptions,
        visibilityEnumOptions: PROJECT_DOCUMENT_VISIBILITY_ENUM_OPTIONS,
        shareVisibility: defaultVisibility,
        onShareVisibilityChange: setShareVisibility,
        isDepartmentVisibility: false,
        selectedDepartmentIds: [],
        onSelectedDepartmentIdsChange: setSelectedDepartmentIds,
        selectedEmployeeIds: [],
        onSelectedEmployeeIdsChange: setSelectedEmployeeIds,
        onConfirm: handleApplyShare,
        onCopyLinks: handleCopyLinks,
        ownableItemIds: getOwnableItemIds(shareableFiles),
      })
    },
    [getOwnableItemIds, handleApplyShare, handleCopyLinks, openShareDialog, visibilityOptions]
  )

  const openNoShareableDialog = useCallback(
    (selectedFiles: RealestateLibraryFileRead[], privateFiles: RealestateLibraryFileRead[]) => {
      displayCustom({
        title: 'Không có files nào có thể chia sẻ',
        content: (
          <div className="space-y-4">
            <p className="typo-body-sm-regular text-content-dark-2">
              Không có files nào có thể chia sẻ trong số các file vừa được chọn do phạm vi truy cập
              của các file sau là &quot;cá nhân&quot;.
            </p>

            <div className="space-y-2">
              <p className="typo-body-sm-medium text-content-dark-1">Danh sách file đã chọn:</p>
              <FileNameList items={selectedFiles} />
            </div>

            <div className="space-y-2">
              <p className="typo-body-sm-medium text-content-dark-1">
                Danh sách file có phạm vi truy cập &quot;cá nhân&quot;:
              </p>
              <FileNameList items={privateFiles} />
            </div>
          </div>
        ),
        confirmText: 'Đóng',
        footerFlexJustify: 'end',
      })
    },
    [displayCustom]
  )

  const continueShareWithoutPrivate = useCallback(
    (selectedFiles: RealestateLibraryFileRead[], privateFiles: RealestateLibraryFileRead[]) => {
      const privateIdSet = new Set(privateFiles.map((item) => item.id))
      const shareableFiles = selectedFiles.filter((item) => !privateIdSet.has(item.id))
      if (shareableFiles.length === 0) {
        openNoShareableDialog(selectedFiles, privateFiles)
        return
      }
      openShareDialogWithItems(shareableFiles)
    },
    [openNoShareableDialog, openShareDialogWithItems]
  )

  const openNextTick = useCallback((callback: () => void) => {
    setTimeout(callback, 0)
  }, [])

  const handleVisibilityUpdateFailure = useCallback(
    (params: {
      failedPrivateItems: RealestateLibraryFileRead[]
      succeededItems: RealestateLibraryFileRead[]
      shareableAfterUpdate: RealestateLibraryFileRead[]
      allSelectedFiles: RealestateLibraryFileRead[]
      onRetry: () => void
    }) => {
      const {
        failedPrivateItems,
        succeededItems,
        shareableAfterUpdate,
        allSelectedFiles,
        onRetry,
      } = params

      displayCustom({
        title: 'Cập nhật phạm vi truy cập thất bại',
        content: (
          <div className="space-y-4">
            <p className="typo-body-sm-regular text-content-dark-2">
              Không thể cập nhật phạm vi truy cập cho một số file. Bạn có muốn thử lại việc cập nhật
              visibility của các file này không?
            </p>
            {succeededItems.length > 0 && (
              <div className="space-y-2">
                <p className="typo-body-sm-medium text-content-dark-1">Đã cập nhật thành công:</p>
                <FileNameList items={succeededItems} />
              </div>
            )}
            <div className="space-y-2">
              <p className="typo-body-sm-medium text-content-dark-1">
                Cập nhật thất bại (sẽ thử lại):
              </p>
              <FileNameList items={failedPrivateItems} />
            </div>
          </div>
        ),
        confirmText: 'Thử lại',
        cancelText: 'Huỷ',
        footerFlexJustify: 'end',
        disableBackdropClose: true,
        leftFooterContent: (
          <Button
            variant="text"
            size="small"
            className="text-action-primary-red-default hover:text-action-primary-red-hover"
            onClick={() => {
              openNextTick(() =>
                continueShareWithoutPrivate(
                  orderItemsBySource(allSelectedFiles, shareableAfterUpdate),
                  failedPrivateItems
                )
              )
            }}
          >
            Không và tiếp tục chia sẻ các mục còn lại
          </Button>
        ),
        onConfirm: () => {
          openNextTick(onRetry)
        },
      })
    },
    [continueShareWithoutPrivate, displayCustom, openNextTick]
  )

  const runPrivateVisibilityUpdateFlow = useCallback(
    async (params: {
      pendingPrivateItems: RealestateLibraryFileRead[]
      allSelectedFiles: RealestateLibraryFileRead[]
      allPrivateFiles: RealestateLibraryFileRead[]
      shareableBeforeUpdate: RealestateLibraryFileRead[]
      targetVisibility: ElibraryVisibility
    }) => {
      const {
        pendingPrivateItems,
        allSelectedFiles,
        allPrivateFiles,
        shareableBeforeUpdate,
        targetVisibility,
      } = params

      if (pendingPrivateItems.length === 0) {
        openShareDialogWithItems(orderItemsBySource(allSelectedFiles, shareableBeforeUpdate))
        return
      }

      setLoading(true)
      try {
        const { succeededItems, failedItems } = await updateVisibilityBatch(
          pendingPrivateItems,
          targetVisibility
        )

        const shareableAfterUpdate = dedupeItemsById([...shareableBeforeUpdate, ...succeededItems])
        const orderedShareableFiles = orderItemsBySource(allSelectedFiles, shareableAfterUpdate)

        if (failedItems.length === 0) {
          openNextTick(() => openShareDialogWithItems(orderedShareableFiles))
          return
        }

        openNextTick(() =>
          handleVisibilityUpdateFailure({
            failedPrivateItems: failedItems,
            succeededItems,
            shareableAfterUpdate,
            allSelectedFiles,
            onRetry: () => {
              void runPrivateVisibilityUpdateFlow({
                pendingPrivateItems: failedItems,
                allSelectedFiles,
                allPrivateFiles,
                shareableBeforeUpdate: shareableAfterUpdate,
                targetVisibility,
              })
            },
          })
        )
      } finally {
        setLoading(false)
      }
    },
    [
      handleVisibilityUpdateFailure,
      openNextTick,
      openShareDialogWithItems,
      setLoading,
      updateVisibilityBatch,
    ]
  )

  const openPrivateVisibilityUpdateDialog = useCallback(
    (params: {
      allSelectedFiles: RealestateLibraryFileRead[]
      privateFiles: RealestateLibraryFileRead[]
      nonPrivateFiles: RealestateLibraryFileRead[]
    }) => {
      const { allSelectedFiles, privateFiles, nonPrivateFiles } = params
      pendingPrivateUpdateVisibilityRef.current = defaultVisibilityForPrivateUpdate

      displayCustom({
        size: '2xl',
        title: 'Cập nhật phạm vi truy cập',
        content: (
          <VisibilityUpdateDialogContent
            privateItems={privateFiles}
            visibilityOptions={nonPrivateVisibilityOptions}
            visibilityEnumOptions={nonPrivateVisibilityEnumOptions}
            defaultVisibility={defaultVisibilityForPrivateUpdate}
            onVisibilityChange={(value) => {
              pendingPrivateUpdateVisibilityRef.current = value
            }}
          />
        ),
        confirmText: 'Cập nhật',
        cancelText: 'Huỷ',
        footerFlexJustify: 'end',
        disableBackdropClose: true,
        onConfirm: async () => {
          const targetVisibility = pendingPrivateUpdateVisibilityRef.current
          await runPrivateVisibilityUpdateFlow({
            pendingPrivateItems: privateFiles,
            allSelectedFiles,
            allPrivateFiles: privateFiles,
            shareableBeforeUpdate: nonPrivateFiles,
            targetVisibility,
          })
        },
      })
    },
    [
      defaultVisibilityForPrivateUpdate,
      displayCustom,
      nonPrivateVisibilityEnumOptions,
      nonPrivateVisibilityOptions,
      runPrivateVisibilityUpdateFlow,
    ]
  )

  const openPrivateVisibilityDecisionDialog = useCallback(
    (params: {
      selectedFiles: RealestateLibraryFileRead[]
      privateFiles: RealestateLibraryFileRead[]
      nonPrivateFiles: RealestateLibraryFileRead[]
    }) => {
      const { selectedFiles, privateFiles, nonPrivateFiles } = params

      displayCustom({
        size: '2xl',
        title: 'Xác nhận chia sẻ tài liệu',
        content: (
          <div className="space-y-4">
            <p className="typo-body-sm-regular text-content-dark-2">
              Danh sách các file sẽ được chia sẻ sẽ gồm:
            </p>
            <FileNameList items={selectedFiles} />

            <p className="typo-body-sm-regular text-content-dark-2">
              Trong đó có các file sau có phạm vi truy cập là &quot;cá nhân&quot;. Cần cập nhật phạm
              vi truy cập của các file này trước khi tiếp tục chia sẻ chúng:
            </p>
            <FileNameList items={privateFiles} />
          </div>
        ),
        confirmText: 'Có, cập nhật',
        cancelText: 'Không cập nhật',
        footerFlexJustify: 'end',
        disableBackdropClose: true,
        onConfirm: () => {
          openNextTick(() => {
            openPrivateVisibilityUpdateDialog({
              allSelectedFiles: selectedFiles,
              privateFiles,
              nonPrivateFiles,
            })
          })
        },
        onCancel: () => {
          openNextTick(() => {
            continueShareWithoutPrivate(selectedFiles, privateFiles)
          })
        },
      })
    },
    [continueShareWithoutPrivate, displayCustom, openNextTick, openPrivateVisibilityUpdateDialog]
  )

  const handleOpenShare = useCallback(() => {
    const selectedFileItems = getSelectedFileItems()
    if (selectedFileItems.length === 0) {
      toastService.error('Vui lòng chọn ít nhất một tệp để chia sẻ')
      return
    }

    const privateFiles = selectedFileItems.filter(
      (item) => item.visibility === ElibraryVisibility.private
    )
    const nonPrivateFiles = selectedFileItems.filter(
      (item) => item.visibility !== ElibraryVisibility.private
    )

    if (privateFiles.length === 0) {
      openShareDialogWithItems(selectedFileItems)
      return
    }

    openPrivateVisibilityDecisionDialog({
      selectedFiles: selectedFileItems,
      privateFiles,
      nonPrivateFiles,
    })
  }, [getSelectedFileItems, openPrivateVisibilityDecisionDialog, openShareDialogWithItems])

  return {
    shareVisibility,
    setShareVisibility,
    selectedDepartmentIds,
    setSelectedDepartmentIds,
    selectedEmployeeIds,
    setSelectedEmployeeIds,
    handleApplyShare,
    handleOpenShare,
  }
}
