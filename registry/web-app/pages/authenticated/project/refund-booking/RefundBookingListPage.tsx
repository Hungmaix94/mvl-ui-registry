import { FC, useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { PageTitle } from '@/components/ui'
import { useRefundBookings } from '@/features/project/refund-booking/hooks/useRefundBookings'
import { PAGE_SIZE } from '@/constants/table'
import { resolvePageSize, SEARCH_DEBOUNCE_MS } from '@/utils/table/pagination'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes/AppRoute.constant'

import RefundBookingFilterForm, {
  RefundBookingFilterFormRef,
  RefundBookingFilterFormData,
} from '@/features/project/refund-booking/components/RefundBookingFilterForm'
import RefundBookingTable from '@/features/project/refund-booking/components/RefundBookingTable'
import AppDialog from '@/components/dialog/AppDialog'
import { BookingRefundStatus as BookingRefundStatusFilter } from '@/constants/api-schema-aliases'
import { RefundBookingStatus } from '@/features/project/refund-booking/constants/refund-booking-constants'
import { useBulkApproveBookingRefunds } from '@/services/sales-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatCurrencyVND } from '@/utils/common'
import { useBulkApproveSelection } from '@/features/sales/_shared/bulk-approve/useBulkApproveSelection'
import { BulkApproveBar } from '@/features/sales/_shared/bulk-approve/BulkApproveBar'
import { BulkApproveConfirmDialog } from '@/features/sales/_shared/bulk-approve/BulkApproveConfirmDialog'
import { BulkApproveResultDialog } from '@/features/sales/_shared/bulk-approve/BulkApproveResultDialog'
import {
  createStepResolver,
  describeSalesRow,
} from '@/features/sales/_shared/bulk-approve/bulk-approve-row'
import { resolveBulkApproveAccess } from '@/features/sales/_shared/bulk-approve/bulk-approve-access'

const ENTITY_LABEL = 'phiếu hoàn tiền'

/**
 * Thang duyệt của hoàn tiền khoá theo `status` (không phải `approval_status`).
 *
 * `pending_confirm` KHÔNG có trong bảng này dù nút "Duyệt" lẻ vẫn hiện ở trạng thái đó: bàn xác
 * nhận của sale không thuộc ba endpoint duyệt nên BE loại nó khỏi bulk. Tích được dòng đó chỉ để
 * nhận về "Không nằm trong luồng duyệt" ở cột lý do.
 */
const resolveRefundStep = createStepResolver({
  pendingAdmin: RefundBookingStatus.PENDING_ADMIN,
  pendingAdminLead: RefundBookingStatus.PENDING_ADMIN_LEAD,
  pendingAccountant: RefundBookingStatus.PENDING_ACCOUNTANT,
})

/**
 * BE `search_fields`: `code`, `customer__full_name`, `booking__code`, `customer__phone`
 * (BE confirm 2026-08-03 cho bug 86eygmjj4 — `customer__phone` đã có từ 2026-05-12).
 * Chưa tìm được theo CCCD/MST: `customer__identify_number` là property Python trên model
 * `Customer`, không phải field DB nên không gắn thẳng vào `search_fields` được.
 */
const SEARCH_PLACEHOLDER = 'Tìm theo mã đề nghị, tên KH, SĐT, mã đặt chỗ...'

const REFUND_STATUS_VALUES = Object.values(BookingRefundStatusFilter) as string[]

/**
 * URL là input user sửa được — `?status=abc` không được bắn thẳng xuống API vì DRF trả 400
 * và cả màn rơi vào error state. Giá trị lạ thì coi như không lọc.
 */
function resolveStatus(raw: string | null): BookingRefundStatusFilter | undefined {
  return raw && REFUND_STATUS_VALUES.includes(raw) ? (raw as BookingRefundStatusFilter) : undefined
}

const RefundBookingListPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const ability = useAbility()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const formRef = useRef<RefundBookingFilterFormRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [debouncedSearch] = useDebounceValue(searchInput, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    const defaultParams = new URLSearchParams(searchParams)
    let isModified = false

    // Di trú URL cũ TRƯỚC khi điền mặc định. Bản trước dùng `pageSize` (camelCase, lệch 130 màn
    // còn lại) và `project_id` — tên param BE không nhận nên bộ lọc dự án không có tác dụng.
    // Key chuẩn nếu đã có sẵn trên URL thì thắng, không để giá trị legacy đè lên.
    const legacyMigrations: Array<[legacyKey: string, canonicalKey: string]> = [
      ['pageSize', 'page_size'],
      ['project_id', 'project'],
    ]
    legacyMigrations.forEach(([legacyKey, canonicalKey]) => {
      if (!defaultParams.has(legacyKey)) return
      const legacyValue = defaultParams.get(legacyKey)
      defaultParams.delete(legacyKey)
      if (legacyValue && !defaultParams.has(canonicalKey)) {
        defaultParams.set(canonicalKey, legacyValue)
      }
      isModified = true
    })

    if (!defaultParams.has('page')) {
      defaultParams.set('page', '1')
      isModified = true
    }

    if (!defaultParams.has('page_size')) {
      defaultParams.set('page_size', String(PAGE_SIZE))
      isModified = true
    }

    if (isModified) {
      setSearchParams(defaultParams, { replace: true })
    }

    setIsUrlReady(true)
  }, [searchParams, setSearchParams])

  // URL → ô tìm kiếm (back/forward, hoặc mở link đã có sẵn `search`).
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Ô tìm kiếm → URL, chỉ sau khi ngừng gõ. Trước đây ghi URL ngay mỗi ký tự nên
  // gõ "Nguyễn" bắn 6 request và đẩy 6 entry vào history.
  useEffect(() => {
    if (!isUrlReady) return
    const currentSearchTerm = (searchParams.get('search') || '').trim()
    const trimmedSearch = debouncedSearch.trim()
    if (trimmedSearch === currentSearchTerm) return

    const newParams = new URLSearchParams(searchParams)
    if (trimmedSearch) newParams.set('search', trimmedSearch)
    else newParams.delete('search')
    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const page = Number(searchParams.get('page')) || 1
  const pageSize = resolvePageSize(searchParams.get('page_size'))

  /**
   * Tên key phải khớp query param của filterset BE (`project`, `status`).
   * Trước đây FE gửi `project_id` — DRF bỏ qua param lạ nên bộ lọc dự án không có tác dụng.
   */
  const currentFilters: RefundBookingFilterFormData = useMemo(() => {
    const projectId = Number(searchParams.get('project'))
    const status = resolveStatus(searchParams.get('status'))

    return {
      ...(Number.isFinite(projectId) && projectId > 0 ? { project: projectId } : {}),
      ...(status ? { status } : {}),
    }
  }, [searchParams])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useRefundBookings(
    {
      page,
      page_size: pageSize,
      search: searchParams.get('search') || undefined,
      ...currentFilters,
    },
    { enabled: isUrlReady }
  )

  // ===== Duyệt nhiều (CR STT35) =====
  // Kiểm đủ HAI tầng quyền như BE — xem `resolveBulkApproveAccess`.
  const { enabled: canBulkApprove, canRunStep: canRunRefundStep } = useMemo(
    () =>
      resolveBulkApproveAccess((action, subject) => ability.can(action, subject), 'booking_refund'),
    [ability]
  )
  const { mutateAsync: bulkApprove, isPending: isBulkApproving } = useBulkApproveBookingRefunds()

  const selectionScopeKey = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    params.delete('page_size')
    params.delete('ordering')
    return params.toString()
  }, [searchParams])

  const rows = useMemo(() => listResponse?.results ?? [], [listResponse])
  const bulk = useBulkApproveSelection({
    rows,
    scopeKey: selectionScopeKey,
    enabled: canBulkApprove,
    getRowId: (row) => row.id,
    resolveStep: (row) => resolveRefundStep(row.status),
    canRunStep: canRunRefundStep,
    // Phiếu hoàn tiền không gắn bất động sản, nên số tiền hoàn là thứ phân biệt hai phiếu của
    // cùng một khách — thêm vào dòng nhận diện.
    describeRow: (row) =>
      describeSalesRow(row, [
        row.refund_amount ? formatCurrencyVND(Number(row.refund_amount)) : null,
      ]),
    submit: bulkApprove,
  })

  const handleBulkApprove = useCallback(async () => {
    try {
      const outcome = await bulk.runApprove()
      if (outcome && outcome.skippedRows.length === 0) {
        toastService.success(`Đã duyệt ${outcome.approvedRows.length} ${ENTITY_LABEL}`)
      }
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      bulk.closeConfirm()
    }
  }, [bulk])

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  /**
   * Dựng lại URL từ đầu (giữ lại search/ordering) thay vì merge lên params cũ —
   * cách merge sẽ để sót key filter mà form không còn quản lý.
   */
  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)
    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)

    Object.entries(formData).forEach(([key, value]) => {
      if (value) newParams.set(key, String(value))
    })

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handlePaginationChange = useCallback(
    (newPage: number, newPageSize: number) => {
      const effectivePageSize = resolvePageSize(newPageSize)
      if (newPage === page && effectivePageSize === pageSize) return

      const newParams = new URLSearchParams(searchParams)
      // Đổi số dòng/trang thì phải về trang 1, nếu không trang hiện tại có thể vượt tổng số trang.
      newParams.set('page', String(effectivePageSize === pageSize ? newPage : 1))
      newParams.set('page_size', String(effectivePageSize))
      setSearchParams(newParams, { replace: true })
    },
    [page, pageSize, searchParams, setSearchParams]
  )

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.PROJECT_REFUND_BOOKING_CREATE)
  }, [navigate])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilters.project) count++
    if (currentFilters.status) count++
    return count
  }, [currentFilters])

  return (
    // Khung chuẩn của trang danh sách (AGENTS.md): `h-full` + `overflow-hidden` để chiều cao bị
    // CHẶN, nhờ đó div bọc bảng bên dưới mới có scrollport riêng — `sticky top-0` của hàng tiêu
    // đề chỉ bám theo scrollport gần nhất, không có nó thì cả trang cuộn và tiêu đề trôi mất.
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder={SEARCH_PLACEHOLDER}
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'booking_refund') ? handleCreateNew : undefined}
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
        {/*
          Khung cuộn thật: `flex-1` + `overflow-*-auto`. `Table` phải tắt overflow bên trong
          (`disableInnerOverflow`) để không sinh khung cuộn thứ hai lồng vào.
        */}
        <div className="flex-1 overflow-x-auto overflow-y-auto pt-0 pb-0">
          <RefundBookingTable
            data={rows}
            isLoading={isLoading}
            error={error}
            onPageChange={handlePaginationChange}
            pageCount={listResponse?.count ? Math.ceil(listResponse.count / pageSize) : 1}
            currentPage={page}
            pageSize={pageSize}
            totalRecords={listResponse?.count || 0}
            selectionEnabled={bulk.selectionEnabled}
            isRowSelectable={bulk.isRowSelectable}
            rowSelection={bulk.rowSelection}
            onRowSelectionChange={bulk.setRowSelection}
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <RefundBookingFilterForm
            ref={formRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />

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
    </div>
  )
}

export default RefundBookingListPage
