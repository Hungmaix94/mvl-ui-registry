import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'

import DepositContractListTable from './components/DepositContractListTable'
import DepositContractFilter, { DepositContractFilterRef } from './components/DepositContractFilter'
import AppDialog from '@/components/dialog/AppDialog.tsx'

import {
  useDepositContracts,
  useBulkApproveDepositContracts,
  GetDepositContractsParams,
} from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility } from '@/lib/ability'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases'
import {
  applyFilterValuesToParams,
  buildApiParams,
  buildFilterValuesFromUrl,
  countActiveFilters,
} from '@/features/sales/deposit-contracts/utils/deposit-contract-filter-params'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useBulkApproveSelection } from '@/features/sales/_shared/bulk-approve/useBulkApproveSelection'
import { BulkApproveBar } from '@/features/sales/_shared/bulk-approve/BulkApproveBar'
import { BulkApproveConfirmDialog } from '@/features/sales/_shared/bulk-approve/BulkApproveConfirmDialog'
import { BulkApproveResultDialog } from '@/features/sales/_shared/bulk-approve/BulkApproveResultDialog'
import {
  createStepResolver,
  describeSalesRow,
} from '@/features/sales/_shared/bulk-approve/bulk-approve-row'
import { resolveBulkApproveAccess } from '@/features/sales/_shared/bulk-approve/bulk-approve-access'

const ENTITY_LABEL = 'hợp đồng đặt cọc'

const resolveDepositStep = createStepResolver({
  pendingAdmin: DepositContractApprovalStatus.pending_admin,
  pendingAdminLead: DepositContractApprovalStatus.pending_admin_lead,
  pendingAccountant: DepositContractApprovalStatus.pending_accountant,
})

const DepositContractsPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const formRef = useRef<DepositContractFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  // Ép remount cả form lọc mỗi lần mở dialog: form KHÔNG có effect đồng bộ lại `initialValues`
  // (conventions.md cấm), nên `defaultValues` chỉ tươi khi component mount lại.
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  // Search input state
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  useEffect(() => {
    const defaultParams = new URLSearchParams(searchParams)
    let isModified = false

    if (!defaultParams.has('page')) {
      defaultParams.set('page', '1')
      isModified = true
    }

    if (isModified) {
      setSearchParams(defaultParams, { replace: true })
    }

    setIsUrlReady(true)
  }, [searchParams, setSearchParams])

  // Sync search input when URL changes externally
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return
    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const page = Number(searchParams.get('page')) || 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentFilters = useMemo(() => buildFilterValuesFromUrl(searchParams), [searchParams])

  const apiParams = useMemo(
    () =>
      ({
        page,
        page_size: pageSize,
        ...buildApiParams(currentFilters),
      }) as GetDepositContractsParams,
    [page, pageSize, currentFilters]
  )

  const {
    data: listResponse,
    isLoading,
    error,
  } = useDepositContracts(apiParams, { enabled: isUrlReady })

  // ===== Duyệt nhiều (CR STT35) =====
  // Kiểm đủ HAI tầng quyền như BE: `deposit_contract.bulk_approve` cho endpoint, và quyền của
  // từng bàn duyệt cho từng bản ghi. Xem `resolveBulkApproveAccess`.
  const { enabled: canBulkApprove, canRunStep: canRunDepositStep } = useMemo(
    () =>
      resolveBulkApproveAccess(
        (action, subject) => ability.can(action, subject),
        'deposit_contract'
      ),
    [ability]
  )
  const { mutateAsync: bulkApprove, isPending: isBulkApproving } = useBulkApproveDepositContracts()

  // Bỏ `page`/`page_size` khỏi khoá phạm vi: đổi trang phải GIỮ lựa chọn, đổi bộ lọc thì xoá.
  const selectionScopeKey = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    params.delete('page_size')
    return params.toString()
  }, [searchParams])

  const rows = useMemo(() => listResponse?.results ?? [], [listResponse])
  const bulk = useBulkApproveSelection({
    rows,
    scopeKey: selectionScopeKey,
    enabled: canBulkApprove,
    getRowId: (row) => row.id,
    resolveStep: (row) => resolveDepositStep(row.approval_status),
    canRunStep: canRunDepositStep,
    describeRow: (row) => describeSalesRow(row),
    submit: bulkApprove,
  })

  const handleBulkApprove = useCallback(async () => {
    try {
      const outcome = await bulk.runApprove()
      if (outcome && outcome.skippedRows.length === 0) {
        toastService.success(`Đã duyệt ${outcome.approvedRows.length} ${ENTITY_LABEL}`)
      }
    } catch (err) {
      // Lỗi cấp-lô (mất mạng, 500, vượt trần) — lỗi của từng bản ghi đã nằm ở `skipped`.
      toastService.error(extractErrorMessage(err))
      bulk.closeConfirm()
    }
  }, [bulk])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
      // Scroll main content area to top
      const mainEl = document.querySelector('main') || document.querySelector('[data-main-content]')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((prev) => prev + 1)
    setIsFilterDialogOpen(true)
  }, [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    setSearchParams((prev) => applyFilterValuesToParams(prev, formData))
    setIsFilterDialogOpen(false)
  }, [setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))
    setSearchParams(newParams, { replace: true })
  }, [pageSize, setSearchParams])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.DEPOSIT_CONTRACT_CREATE)
  }, [navigate])

  const activeFilterCount = useMemo(() => countActiveFilters(currentFilters), [currentFilters])

  return (
    // Khung chuẩn của trang danh sách (AGENTS.md): `h-full` + `overflow-hidden` để chiều cao bị
    // CHẶN, nhờ đó div bọc bảng bên dưới mới có scrollport riêng — `sticky top-0` của hàng tiêu
    // đề chỉ bám theo scrollport gần nhất, không có nó thì cả trang cuộn và tiêu đề trôi mất.
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã HĐ, tên KH..."
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'deposit_contract') ? handleCreateNew : undefined}
      />

      <BulkApproveBar
        selectedCount={bulk.selectedCount}
        countByStep={bulk.countByStep}
        entityLabel={ENTITY_LABEL}
        isOverLimit={bulk.isOverLimit}
        loading={isBulkApproving}
        onClear={bulk.clearSelection}
        onApprove={bulk.openConfirm}
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        {/* Vùng cuộn của trang. Bảng rộng ~2400px nên phải có container cuộn thật ở đây:
            `Table` chỉ dựng `HorizontalScrollBar` ở nhánh `paginationPosition="static"`,
            và `useStickyTableHeader` tìm đúng phần tử mang cả hai lớp overflow này. */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
          <DepositContractListTable
            data={rows}
            isLoading={isLoading}
            error={error}
            totalRecords={listResponse?.count ?? 0}
            pageSize={pageSize}
            currentPageIndex={page - 1}
            onPaginationChange={handlePaginationChange}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
            selectionEnabled={bulk.selectionEnabled}
            isRowSelectable={bulk.isRowSelectable}
            rowSelection={bulk.rowSelection}
            onRowSelectionChange={bulk.setRowSelection}
          />
        </div>
      </div>

      <BulkApproveConfirmDialog
        open={bulk.confirmOpen}
        candidates={bulk.candidates}
        countByStep={bulk.countByStep}
        entityLabel={ENTITY_LABEL}
        notes={bulk.notes}
        onNoteChange={bulk.setNote}
        loading={isBulkApproving}
        onConfirm={handleBulkApprove}
        onClose={bulk.closeConfirm}
      />

      <BulkApproveResultDialog
        outcome={bulk.outcome}
        entityLabel={ENTITY_LABEL}
        onClose={bulk.closeOutcome}
      />

      {/* Filter Dialog */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DepositContractFilter
            key={filterDialogOpenKey}
            ref={formRef}
            initialValues={currentFilters}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </div>
  )
}

export default DepositContractsPage
