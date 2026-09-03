import { FC, useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { PageTitle } from '@/components/ui'
import { PAGE_SIZE } from '@/constants/table'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBookings } from '@/services/sales-service'
import BookingContractFilterForm, {
  BookingContractFilterFormRef,
} from '@/features/project/booking-contract/components/BookingContractFilterForm'
import BookingContractTable from '@/features/project/booking-contract/components/BookingContractTable'
import {
  buildBookingContractApiParams,
  buildBookingContractFilterParams,
  buildBookingContractFilterValuesFromUrl,
  countActiveBookingContractFilters,
} from '@/features/project/booking-contract/utils/booking-contract-filter-params'
import AppDialog from '@/components/dialog/AppDialog'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility } from '@/lib/ability'
import { Booking } from '@/services/sales-service'
import { BookingContractStatus } from '@/features/project/booking-contract/types/booking-contract-types'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Button } from '@/components/ui'
import toastService from '@/services/toast-service'
import { IconArrowbenddoubleupright, IconBuildings } from '@/assets/icons'
import { useTransferBooking } from '@/services/sales-service'
import { BookingTransferDialog } from '@/features/project/booking-contract/components/BookingTransferDialog'
import { QUERY_KEYS } from '@/constants'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import { useBulkApproveBookings } from '@/services/sales-service'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases'
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

const ENTITY_LABEL = 'hợp đồng đặt chỗ'

// HĐ đặt chỗ dùng chung enum trạng thái duyệt với HĐ cọc (cùng ba bàn, cùng giá trị chuỗi) —
// đây cũng là enum mà cột "Trạng thái duyệt" của bảng này đang dùng.
const resolveBookingStep = createStepResolver({
  pendingAdmin: DepositContractApprovalStatus.pending_admin,
  pendingAdminLead: DepositContractApprovalStatus.pending_admin_lead,
  pendingAccountant: DepositContractApprovalStatus.pending_accountant,
})

const BookingContractListPage: FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const queryClient = useQueryClient()
  const { mutateAsync: transferBooking } = useTransferBooking()
  const { displayFormContent, displayClose } = useDialog()

  const handleOpenTransferDialog = useCallback(
    (booking: Booking) => {
      displayFormContent({
        title: 'Chuyển hợp đồng đặt chỗ',
        description: 'Vui lòng chọn dự án và sản phẩm mới để chuyển.',
        content: (
          <BookingTransferDialog
            contract={booking}
            onTransfer={async (data) => {
              try {
                await transferBooking({ id: booking.id, data })
                toastService.success('Chuyển hợp đồng đặt chỗ thành công')
                displayClose()
                await queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.SALES.BOOKINGS.LIST({}),
                })
              } catch (err: any) {
                toastService.error(err?.message || 'Có lỗi xảy ra khi chuyển hợp đồng')
              }
            }}
          />
        ),
        hideFooter: true,
        confirmText: '',
      })
    },
    [displayFormContent, transferBooking, queryClient, displayClose]
  )

  const formRef = useRef<BookingContractFilterFormRef>(null)

  // Search input state
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
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

  const pageParam = searchParams.get('page')
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1
  const ordering = searchParams.get('ordering') || '-created_at'

  // URL là nguồn sự thật duy nhất; hàm dùng chung dịch nó thành giá trị form (mảng cho ô chọn
  // nhiều, số cho id) và `buildBookingContractApiParams` dịch tiếp thành query gửi lên API.
  const currentFilters = useMemo(
    () => buildBookingContractFilterValuesFromUrl(searchParams),
    [searchParams]
  )

  const pageSizeParam = searchParams.get('page_size')
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : PAGE_SIZE

  const {
    data: listResponse,
    isLoading,
    error,
  } = useBookings(
    {
      page,
      page_size: pageSize,
      ordering,
      ...(buildBookingContractApiParams(currentFilters) as any),
    },
    { enabled: isUrlReady }
  )

  // ===== Duyệt nhiều (CR STT35) =====
  // Kiểm đủ HAI tầng quyền như BE — xem `resolveBulkApproveAccess`.
  const { enabled: canBulkApprove, canRunStep: canRunBookingStep } = useMemo(
    () => resolveBulkApproveAccess((action, subject) => ability.can(action, subject), 'booking'),
    [ability]
  )
  const { mutateAsync: bulkApprove, isPending: isBulkApproving } = useBulkApproveBookings()

  const selectionScopeKey = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    params.delete('page_size')
    params.delete('ordering')
    return params.toString()
  }, [searchParams])

  const rows = useMemo(() => listResponse?.results || [], [listResponse])
  const bulk = useBulkApproveSelection({
    rows,
    scopeKey: selectionScopeKey,
    enabled: canBulkApprove,
    getRowId: (row) => row.id,
    resolveStep: (row) => resolveBookingStep(row.approval_status),
    canRunStep: canRunBookingStep,
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
      toastService.error(extractErrorMessage(err))
      bulk.closeConfirm()
    }
  }, [bulk])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    // Dựng params từ danh sách ô khai trong `BOOKING_CONTRACT_FILTER_KEYS` thay vì liệt kê tay:
    // bản liệt kê tay đã bỏ sót `customer_name` + `contract_number` suốt từ 13/05/2026 (86eyqj0hf).
    const newParams = buildBookingContractFilterParams(formData)

    // Keep search input in sync
    setSearchInput(formData.search || '')
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [setSearchParams])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
      const mainEl = document.querySelector('main') || document.querySelector('[data-main-content]')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const orderingParam = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', orderingParam)
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const activeFilterCount = useMemo(
    () => countActiveBookingContractFilters(currentFilters),
    [currentFilters]
  )

  // Từ CR STT35, cột checkbox phục vụ HAI việc: chuyển sang HĐ cọc (cần `booked`) và duyệt nhiều
  // (cần đang chờ duyệt). Nút chuyển đổi chỉ tính phần dòng hợp lệ CỦA NÓ — trước đây nó chặn
  // cả lượt khi có dòng không phải `booked`, mà giờ dòng như vậy tích được một cách hợp lệ.
  //
  // Tích luỹ riêng một map thay vì đọc `onSelectionChange`: lựa chọn giờ giữ được qua nhiều
  // trang, nhưng `onSelectionChange` chỉ dò id trong dòng của TRANG hiện tại — nên dòng chọn ở
  // trang 1 sẽ âm thầm rơi khỏi nút chuyển đổi khi sang trang 2.
  const [convertibleMeta, setConvertibleMeta] = useState<Map<number, Booking>>(new Map())

  useEffect(() => {
    setConvertibleMeta((prev) => {
      const next = new Map(prev)
      let changed = false
      for (const id of Array.from(next.keys())) {
        if (!bulk.rowSelection[String(id)]) {
          next.delete(id)
          changed = true
        }
      }
      for (const row of rows) {
        if (!bulk.rowSelection[String(row.id)] || next.has(row.id)) continue
        if ((row.booking_status as string) !== BookingContractStatus.BOOKED) continue
        next.set(row.id, row)
        changed = true
      }
      return changed ? next : prev
    })
  }, [bulk.rowSelection, rows])

  // Đổi bộ lọc thì `useBulkApproveSelection` xoá `rowSelection`, effect trên tự dọn theo.
  const convertibleSelected = useMemo(() => Array.from(convertibleMeta.values()), [convertibleMeta])

  const handleBulkConvertToDeposit = useCallback(() => {
    if (convertibleSelected.length === 0) return
    const bookingIdsStr = convertibleSelected.map((b) => b.id).join(',')
    navigate(`${APP_PATH.DEPOSIT_CONTRACT_CREATE}?booking_ids=${bookingIdsStr}`)
  }, [convertibleSelected, navigate])

  return (
    // Khung chuẩn của trang danh sách (AGENTS.md): `h-full` + `overflow-hidden` để chiều cao bị
    // CHẶN, nhờ đó div bọc bảng bên dưới mới có scrollport riêng — `sticky top-0` của hàng tiêu đề
    // chỉ bám theo scrollport gần nhất, không có nó thì cả trang cuộn và tiêu đề trôi mất.
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã HĐ, tên KH..."
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={
          ability.can('create', 'booking')
            ? () => navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_CREATE)
            : undefined
        }
        customActions={
          convertibleSelected.length > 0 ? (
            <Button variant="secondary" onClick={handleBulkConvertToDeposit}>
              Chuyển sang HĐ cọc ({convertibleSelected.length})
            </Button>
          ) : undefined
        }
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
          Đây mới là khung cuộn thật: `flex-1` + `overflow-*-auto`. `Table` phải tắt overflow bên
          trong (`disableInnerOverflow`) để không sinh khung cuộn thứ hai lồng vào.
        */}
        <div className="flex-1 overflow-x-auto overflow-y-auto pt-0 pb-0">
          <BookingContractTable
            data={rows}
            isLoading={isLoading}
            error={error}
            // Một cột checkbox, hai đích đến: `booked` để chuyển sang HĐ cọc, đang-chờ-duyệt để
            // duyệt nhiều. Mỗi nút chỉ tác động lên phần dòng hợp lệ của chính nó.
            enableRowSelection={(row) =>
              (row.original.booking_status as string) === BookingContractStatus.BOOKED ||
              bulk.isRowSelectable(row.original)
            }
            rowSelection={bulk.rowSelection}
            onRowSelectionChange={bulk.setRowSelection}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            pageSize={pageSize}
            pageCount={listResponse?.count ? Math.ceil(listResponse.count / pageSize) : 1}
            currentPage={page}
            totalRecords={listResponse?.count || 0}
            customRowActions={[
              {
                label: 'Chuyển sang hợp đồng cọc',
                icon: <IconArrowbenddoubleupright size={16} />,
                show: (item) => (item.booking_status as string) === BookingContractStatus.BOOKED,
                onClick: (item) =>
                  navigate(`${APP_PATH.DEPOSIT_CONTRACT_CREATE}?booking_id=${item.id}`),
              },
              {
                label: 'Chuyển hợp đồng đặt chỗ',
                icon: <IconBuildings size={16} />,
                show: (item) => (item.booking_status as string) === BookingContractStatus.BOOKED,
                onClick: (item) => handleOpenTransferDialog(item),
              },
            ]}
            // Bảng này rộng hơn khung nên BẮT BUỘC `static`: chỉ nhánh đó mới dựng
            // `HorizontalScrollBar` + phân trang ghim đáy màn hình.
            paginationPosition="static"
            disableInnerOverflow
            stickyHeader
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <BookingContractFilterForm
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

export default BookingContractListPage
