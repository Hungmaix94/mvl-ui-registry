import { APP_PATH } from '@/routes/AppRoute.constant'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'

import { PageTitle, TextArea, Select } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt, formatCurrencyVND } from '@/utils/common'

import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { useBankAccounts } from '@/features/accounting/bank-accounts/services/bank-account-service'
import { formatDateToApi } from '@/utils/date-utils'

import {
  useCommissionAdvances,
  useAdminApproveCommissionAdvance,
  useRejectCommissionAdvance,
  useResubmitCommissionAdvance,
  useMarkPaidCommissionAdvance,
  useDeleteCommissionAdvance,
  type CommissionAdvance,
} from '@/features/accounting/commission-advances/services/commission-advance-service'
import CommissionAdvanceTable from '@/features/accounting/commission-advances/components/CommissionAdvanceTable'
import CommissionAdvanceApproveDialog from '@/features/accounting/commission-advances/components/CommissionAdvanceApproveDialog'
import { getRecipientName } from '@/features/accounting/commission-advances/utils/commission-advance-recipient-name'
import CommissionAdvanceFilter, {
  type CommissionAdvanceFilterRef,
} from '@/features/accounting/commission-advances/components/CommissionAdvanceFilter'
import {
  buildCommissionAdvanceApiParams,
  getCommissionAdvanceFilterValues,
  countCommissionAdvanceActiveFilters,
  applyCommissionAdvanceFilterToParams,
} from '@/features/accounting/commission-advances/utils/commission-advance-filter-params'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { VoucherPaymentMethod } from '@/constants/api-schema-aliases'

const CommissionAdvanceListPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const filterRef = useRef<CommissionAdvanceFilterRef>(null)

  // ── Actions State ────────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState<CommissionAdvance | null>(null)
  const [actionType, setActionType] = useState<
    | 'ADMIN_APPROVE'
    | 'ADMIN_LEAD_APPROVE'
    | 'APPROVE'
    | 'REJECT'
    | 'RESUBMIT'
    | 'MARK_PAID'
    | 'DELETE'
    | null
  >(null)
  const [rejectReason, setRejectReason] = useState('')

  // States for Mark Paid dialog
  const [voucherDate, setVoucherDate] = useState(() => formatDateToApi(new Date()))
  const [paymentMethod, setPaymentMethod] = useState<
    'TRANSFER' | 'CASH' | 'OFFSET' | 'ADVANCE_DRAWDOWN'
  >('TRANSFER')
  const [fromBankAccountId, setFromBankAccountId] = useState<number | null>(null)
  const [recipientLineIds, setRecipientLineIds] = useState<number[]>([])

  useEffect(() => {
    if (selectedItem?.recipient_lines) {
      setRecipientLineIds(selectedItem.recipient_lines.map((l) => l.id))
    }
  }, [selectedItem])

  const { data: bankAccountsResponse } = useBankAccounts(
    { page_size: 100 },
    { enabled: actionType === 'MARK_PAID' }
  )

  const bankOptions = useMemo(() => {
    return (bankAccountsResponse?.results ?? []).map((acc) => ({
      value: acc.id,
      label: `${acc.account_number} - ${acc.bank_name} (${acc.account_holder})`,
    }))
  }, [bankAccountsResponse])

  const recipientLineOptions = useMemo(() => {
    return (selectedItem?.recipient_lines ?? []).map((line) => ({
      value: line.id,
      label: `${getRecipientName(line)} - ${formatCurrencyVND(Number(line.requested_amount || 0))} ₫`,
    }))
  }, [selectedItem])

  // ── Mutations ─────────────────────────────────────────────────────────────
  // Hai bậc duyệt CÓ sửa số tiền (TP TKKD + kế toán) nằm trong
  // `CommissionAdvanceApproveDialog` — dialog đó tự giữ mutation của nó, và là cùng một dialog
  // màn Chi tiết đang dùng, nên duyệt nhanh ở đây không còn là hộp xác nhận trơn nữa.
  const adminApproveMutation = useAdminApproveCommissionAdvance()
  const rejectMutation = useRejectCommissionAdvance()
  const resubmitMutation = useResubmitCommissionAdvance()
  const markPaidMutation = useMarkPaidCommissionAdvance()
  const deleteMutation = useDeleteCommissionAdvance()

  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, [])

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isUrlReady) return
    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch === currentSearchTerm) return
    const newParams = new URLSearchParams(searchParams)
    if (debouncedSearch) newParams.set('search', debouncedSearch)
    else newParams.delete('search')
    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  const searchQueryKey = searchParams.toString()

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildCommissionAdvanceApiParams(new URLSearchParams(searchQueryKey))
  }, [isUrlReady, searchQueryKey])

  const {
    data: listResponse,
    isLoading,
    refetch,
  } = useCommissionAdvances(apiParams, { enabled: isUrlReady && !!apiParams })

  const activeFilterCount = useMemo(
    () => countCommissionAdvanceActiveFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/commission-advances/export/',
    'tam-ung-hoa-hong.xlsx'
  )
  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((k) => k + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterRef.current?.getValues()
    if (!formData) return

    const newParams = applyCommissionAdvanceFilterToParams(formData, {
      pageSize: searchParams.get('page_size') || String(PAGE_SIZE),
      search: debouncedSearch || undefined,
    })

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [debouncedSearch, searchParams, setSearchParams])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  const handleClearFilter = useCallback(() => {
    filterRef.current?.clearForm()
  }, [])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const urlPage = parsePositiveInt(searchParams.get('page')) ?? 1
      const effectiveUrlPageSize = parsePositiveInt(searchParams.get('page_size')) || PAGE_SIZE

      if (nextPage === urlPage && newPageSize === effectiveUrlPageSize) return

      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })

      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleAction = async () => {
    if (!selectedItem || !actionType) return

    try {
      const id = selectedItem.id

      if (actionType === 'ADMIN_APPROVE') {
        // TKKD tier of a mobile-initiated advance (PENDING_ADMIN -> PENDING_ADMIN_LEAD). Note-only.
        await adminApproveMutation.mutateAsync({ id, data: {} })
        toastService.success('TKKD duyệt thành công, chuyển TP TKKD duyệt')
      } else if (actionType === 'RESUBMIT') {
        await resubmitMutation.mutateAsync({ id, data: {} })
        toastService.success('Đã gửi lại đề xuất cho TP TKKD duyệt')
      } else if (actionType === 'REJECT') {
        if (!rejectReason.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          return
        }
        await rejectMutation.mutateAsync({
          id,
          data: { reason: rejectReason },
        })
        toastService.success('Từ chối đề xuất thành công')
      } else if (actionType === 'MARK_PAID') {
        if (!voucherDate) {
          toastService.error('Vui lòng chọn ngày chứng từ')
          return
        }
        if (paymentMethod === 'TRANSFER' && !fromBankAccountId) {
          toastService.error('Vui lòng chọn tài khoản ngân hàng chi')
          return
        }
        if (recipientLineIds.length === 0) {
          toastService.error('Vui lòng chọn ít nhất một dòng thụ hưởng')
          return
        }
        await markPaidMutation.mutateAsync({
          id,
          data: {
            voucher_date: voucherDate,
            payment_method: paymentMethod as VoucherPaymentMethod,
            from_bank_account_id:
              paymentMethod === 'TRANSFER' ? (fromBankAccountId ?? undefined) : undefined,
            recipient_line_ids: recipientLineIds,
          },
        })
        toastService.success('Cập nhật trạng thái đã chi thành công')
      } else if (actionType === 'DELETE') {
        await deleteMutation.mutateAsync(id)
        toastService.success('Xóa đề xuất thành công')
      }

      setSelectedItem(null)
      setActionType(null)
      setRejectReason('')
      refetch()
    } catch (err) {
      toastService.error(handleApiError(err))
    }
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Phiếu đề xuất tạm ứng hoa hồng"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm theo mã phiếu, nhân viên, lý do..."
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={() => navigate(APP_PATH.COMMISSION_ADVANCE_CREATE)}
        titleCreateNew="Tạo đề xuất"
      />

      <div className="flex-1 overflow-x-auto overflow-y-auto pt-4 pb-10">
        <CommissionAdvanceTable
          data={listResponse?.results || []}
          isLoading={isLoading}
          totalRecords={totalRecords}
          pageSize={pageSize}
          pageCount={pageCount}
          currentPageIndex={currentPage - 1}
          onPaginationChange={handlePaginationChange}
          onAdminApprove={(item) => {
            setSelectedItem(item)
            setActionType('ADMIN_APPROVE')
          }}
          onAdminLeadApprove={(item) => {
            setSelectedItem(item)
            setActionType('ADMIN_LEAD_APPROVE')
          }}
          onApprove={(item) => {
            setSelectedItem(item)
            setActionType('APPROVE')
          }}
          onResubmit={(item) => {
            setSelectedItem(item)
            setActionType('RESUBMIT')
          }}
          onReject={(item) => {
            setSelectedItem(item)
            setActionType('REJECT')
          }}
          onMarkPaid={(item) => {
            setSelectedItem(item)
            setActionType('MARK_PAID')
          }}
          onDelete={(item) => {
            setSelectedItem(item)
            setActionType('DELETE')
          }}
          isShowTableColumnConfig={shouldShowConfig}
        />
      </div>

      {/* Filter Dialog */}
      <AppDialog
        key={filterDialogOpenKey}
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        variant="filter"
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
        onClearFilter={handleClearFilter}
        content={
          <CommissionAdvanceFilter
            ref={filterRef}
            initialValues={getCommissionAdvanceFilterValues(searchParams)}
            isOpen={isFilterDialogOpen}
          />
        }
      />

      {/* Duyệt nhanh CÓ sửa số tiền (TP TKKD + kế toán) — CÙNG một dialog với màn Chi tiết,
          nên số tiền duyệt, nguồn tiền và thuế suất tạm tính có đủ ở đây (ClickUp 86eympqft). */}
      <CommissionAdvanceApproveDialog
        open={actionType === 'ADMIN_LEAD_APPROVE' || actionType === 'APPROVE'}
        // CHỈ truyền id khi thao tác đang chọn là duyệt. `selectedItem` cũng được set cho Từ chối /
        // Đã chi / Xoá, mà dialog này tải phiếu + bảng chia + quỹ CĐT theo `advanceId` — truyền vô
        // điều kiện là 3 request thừa cho những thao tác không cần đến chúng.
        advanceId={
          actionType === 'ADMIN_LEAD_APPROVE' || actionType === 'APPROVE'
            ? (selectedItem?.id ?? null)
            : null
        }
        mode={actionType === 'ADMIN_LEAD_APPROVE' ? 'ADMIN_LEAD_APPROVE' : 'APPROVE'}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
            setActionType(null)
          }
        }}
        onSuccess={refetch}
      />

      {/* TKKD duyệt / Từ chối / Gửi lại — ba thao tác không sửa con số nào */}
      <AppDialog
        open={
          actionType === 'ADMIN_APPROVE' || actionType === 'REJECT' || actionType === 'RESUBMIT'
        }
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
            setActionType(null)
            setRejectReason('')
          }
        }}
        onCancel={() => {
          setSelectedItem(null)
          setActionType(null)
          setRejectReason('')
        }}
        title={
          actionType === 'ADMIN_APPROVE'
            ? 'TKKD duyệt đề xuất'
            : actionType === 'RESUBMIT'
              ? 'Gửi lại đề xuất'
              : 'Từ chối đề xuất'
        }
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleAction}
        loading={
          adminApproveMutation.isPending || rejectMutation.isPending || resubmitMutation.isPending
        }
        confirmText={
          actionType === 'REJECT' ? 'Từ chối' : actionType === 'RESUBMIT' ? 'Gửi lại' : 'Duyệt'
        }
        content={
          <div className="py-4">
            {actionType === 'REJECT' ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">Vui lòng nhập lý do từ chối:</p>
                <TextArea
                  placeholder="Nhập lý do..."
                  value={rejectReason}
                  onChange={(val) => setRejectReason(val)}
                  rows={4}
                />
              </div>
            ) : actionType === 'RESUBMIT' ? (
              <p className="text-sm text-gray-600">
                Gửi lại đề xuất <strong>{selectedItem?.code}</strong> cho TP TKKD duyệt? Nếu giao
                dịch đã có phiếu tạm ứng khác đang hiệu lực, hệ thống sẽ từ chối.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Xác nhận TKKD duyệt đề xuất <strong>{selectedItem?.code}</strong> và chuyển sang
                bước TP TKKD duyệt.
              </p>
            )}
          </div>
        }
      />

      {/* Mark Paid Dialog */}
      <AppDialog
        open={actionType === 'MARK_PAID'}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
            setActionType(null)
          }
        }}
        onCancel={() => {
          setSelectedItem(null)
          setActionType(null)
        }}
        title="Xác nhận đã chi"
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleAction}
        loading={markPaidMutation.isPending}
        confirmText="Xác nhận"
        cancelText="Hủy"
        content={
          <div className="flex min-w-[480px] flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <span className="typo-body-base-semibold text-content-dark-3">
                Ngày lập chứng từ <span className="text-action-primary-red-default">*</span>
              </span>
              <DatePicker
                value={voucherDate}
                onChange={(val) => setVoucherDate(val || '')}
                placeholder="Chọn ngày chứng từ"
              />
            </div>

            <Select
              label="Hình thức thanh toán"
              required
              value={paymentMethod}
              onChange={(val) => {
                setPaymentMethod(val as any)
                if (val !== 'TRANSFER') {
                  setFromBankAccountId(null)
                }
              }}
              options={[
                { value: 'TRANSFER', label: 'Chuyển khoản' },
                { value: 'CASH', label: 'Tiền mặt' },
                { value: 'OFFSET', label: 'Bù trừ' },
                { value: 'ADVANCE_DRAWDOWN', label: 'Rút tạm ứng' },
              ]}
            />

            {paymentMethod === 'TRANSFER' && (
              <Select
                label="Tài khoản ngân hàng chi"
                required
                value={fromBankAccountId ?? undefined}
                onChange={(val) => setFromBankAccountId(val ? Number(val) : null)}
                placeholder="Chọn tài khoản ngân hàng nguồn"
                options={bankOptions}
                clearable
              />
            )}

            <Select
              label="Danh sách dòng thụ hưởng thanh toán"
              required
              multiple
              value={recipientLineIds}
              onChange={(val) => setRecipientLineIds(val as number[])}
              placeholder="Chọn dòng thụ hưởng"
              options={recipientLineOptions}
            />
          </div>
        }
      />

      {/* Delete Dialog */}
      <AppDialog
        open={actionType === 'DELETE'}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
            setActionType(null)
          }
        }}
        onCancel={() => {
          setSelectedItem(null)
          setActionType(null)
        }}
        title="Xóa đề xuất"
        variant="alert"
        onConfirm={handleAction}
        loading={deleteMutation.isPending}
        confirmText="Xóa"
        content={
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa đề xuất <strong>{selectedItem?.code}</strong> này không?
            </p>
          </div>
        }
      />
    </div>
  )
}

export default CommissionAdvanceListPage
