import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'

import { Text } from '@/components/ui'
import { type PageTitleToolbarProps } from '@/components/ui/page-title/PageTitleToolbar'
import AppDialog from '@/components/dialog/AppDialog'
import { PAGE_SIZE } from '@/constants/table'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'
import { useAuth } from '@/store/auth-store'
import { useSalesAllocation } from '@/features/project/sale-allocations/services/sales-allocation-service'

import { LAD_SUBJECT, LadBatchStatus } from '../constants/lad-constants'
import { useLadActions } from '../hooks/useLadActions'
import { useCreateLadBatch, useLadBatches } from '../services/commission-adjustment-batch-service'
import type { LadFilterCriteria } from '../types/lad-types'
import LadBatchFilterForm, { type LadBatchFilterFormRef } from './LadBatchFilterForm'
import { LadBatchListTable } from './LadBatchListTable'

/** Toolbar slots the LAD list lifts up to the host PageTitle (project tabs pattern). */
export type LadTabSlots = { toolbarProps?: PageTitleToolbarProps }

export interface LadBatchListViewProps {
  saleAllocationId: number
  isReadOnly?: boolean
  onOpenBatch: (batchId: number) => void
  onCreateBatch: (batchId: number, step?: number) => void
  /** Lift the list toolbar (search / filter / Tạo lô mới) into the PageTitle tab toolbar. */
  setTabSlots?: (slots: LadTabSlots | null) => void
}

export function LadBatchListView({
  saleAllocationId,
  isReadOnly,
  onOpenBatch,
  onCreateBatch,
  setTabSlots,
}: LadBatchListViewProps) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch] = useDebounceValue(searchInput, 500)
  const [status, setStatus] = useState<LadBatchStatus | ''>('')
  const [mine, setMine] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterFormRef = useRef<LadBatchFilterFormRef>(null)

  const { user } = useAuth()
  const currentUserId = user?.id
  const ability = useAbility()
  const { submitBatch, confirmDelete, confirmApprove, promptReject, confirmClone } = useLadActions()
  const canUpdate = ability.can('update', LAD_SUBJECT)
  const canDestroy = ability.can('destroy', LAD_SUBJECT)
  const canSubmit = ability.can('submit', LAD_SUBJECT)
  const canApprove = ability.can('approve', LAD_SUBJECT)
  const canReject = ability.can('reject', LAD_SUBJECT)
  const canClone = ability.can('clone', LAD_SUBJECT)

  const { data: sa } = useSalesAllocation(saleAllocationId)
  const saData = sa as { code?: string; name?: string; project?: { id?: number } } | undefined
  const projectId = saData?.project?.id
  const saCode = saData?.code

  const activeFilterCount = (status ? 1 : 0) + (mine ? 1 : 0)

  // "Của tôi" → filter by the current user's id (fallback to 'me' if id not loaded yet).
  const createdByFilter = mine ? (currentUserId != null ? String(currentUserId) : 'me') : undefined

  const listParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status || undefined,
      created_by: createdByFilter,
      page: pageIndex + 1,
      page_size: PAGE_SIZE,
      sales_allocation: saleAllocationId,
    }),
    [debouncedSearch, status, createdByFilter, pageIndex, saleAllocationId]
  )

  const { data, isLoading, error } = useLadBatches(listParams)
  // Destructure the stable `mutateAsync` (the mutation object identity changes each render — depending
  // on it in handleCreate would re-fire the toolbar-lift effect on every render → loop).
  const { mutateAsync: createBatchAsync } = useCreateLadBatch()

  const batches = data?.results ?? []
  const totalRecords = data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    setPageIndex(0)
  }, [])

  const handleOpenFilter = useCallback(() => setIsFilterDialogOpen(true), [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues?.()
    setStatus((formData?.status as LadBatchStatus | '') ?? '')
    setMine(!!formData?.mine)
    setPageIndex(0)
    setIsFilterDialogOpen(false)
  }, [])

  const handleCreate = useCallback(async () => {
    try {
      const filter_criteria: LadFilterCriteria = {
        sales_allocation_id: saleAllocationId,
        project_id: projectId ?? null,
      }
      const created = await createBatchAsync({ filter_criteria })
      if (created?.id) onCreateBatch(created.id, 1)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [saleAllocationId, projectId, createBatchAsync, onCreateBatch])

  // Chuyển sang dự kiến ngay từ list — mirror màn detail: nếu còn GD chưa xác nhận / doanh thu vượt
  // phí đại lý, điều hướng vào wizard ở đúng bước để người tạo sửa (Bước 1 = phạm vi, Bước 2 = cấu hình).
  const handleSubmitBatch = useCallback(
    (batchId: number) =>
      submitBatch(batchId, {
        onUnconfirmed: () => onCreateBatch(batchId, 1),
        onRevenueError: () => onCreateBatch(batchId, 2),
      }),
    [submitBatch, onCreateBatch]
  )

  // Nhân bản: tạo lô nháp mới rồi mở wizard của lô đó — giống hệt onCloned ở màn detail (cùng goCreate).
  const handleCloneBatch = useCallback(
    (batchId: number) => confirmClone(batchId, onCreateBatch),
    [confirmClone, onCreateBatch]
  )

  // Lift the list toolbar into the host PageTitle; clear it when the list view unmounts
  // (switching to the wizard/detail sub-view) so those screens show no list toolbar.
  useEffect(() => {
    setTabSlots?.({
      toolbarProps: {
        handleSearch,
        searchValue: searchInput,
        searchPlaceholder: 'Tìm theo mã lô, tên lô, người tạo...',
        handleFilter: handleOpenFilter,
        filterBadgeCount: activeFilterCount,
        handleCreateNew: isReadOnly ? undefined : handleCreate,
        titleCreateNew: 'Tạo lô mới',
      },
    })
    return () => setTabSlots?.(null)
  }, [
    setTabSlots,
    handleSearch,
    searchInput,
    handleOpenFilter,
    activeFilterCount,
    isReadOnly,
    handleCreate,
  ])

  return (
    <Flex direction="column" gap="5">
      {/* Section header */}
      <div className="flex flex-col gap-1">
        <Text className="typo-heading-h4 text-content-dark-1 font-semibold">
          Lô áp dụng cấu hình phí &amp; thưởng
        </Text>
        <Text className="typo-body-sm-regular text-content-dark-3 max-w-2xl">
          Mọi thay đổi phí và thưởng đều đi qua một lô. Mỗi lô = scope GD + snapshot phí-thưởng tại
          thời điểm áp dụng.
        </Text>
      </div>

      <LadBatchListTable
        data={batches}
        isLoading={isLoading}
        error={error}
        totalRecords={totalRecords}
        pageSize={PAGE_SIZE}
        pageCount={pageCount}
        currentPageIndex={pageIndex}
        saCode={saCode}
        onPaginationChange={(nextIndex) => setPageIndex(nextIndex)}
        onOpenBatch={onOpenBatch}
        onEditBatch={!isReadOnly && canUpdate ? (id) => onCreateBatch(id) : undefined}
        onDeleteBatch={!isReadOnly && canDestroy ? confirmDelete : undefined}
        onSubmitBatch={!isReadOnly && canSubmit ? handleSubmitBatch : undefined}
        onApproveBatch={!isReadOnly && canApprove ? confirmApprove : undefined}
        onRejectBatch={!isReadOnly && canReject ? promptReject : undefined}
        onCloneBatch={!isReadOnly && canClone ? handleCloneBatch : undefined}
      />

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc lô áp dụng"
        content={
          <LadBatchFilterForm ref={filterFormRef} initialValues={{ status: status || '', mine }} />
        }
        onClearFilter={() => filterFormRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </Flex>
  )
}

export default LadBatchListView
