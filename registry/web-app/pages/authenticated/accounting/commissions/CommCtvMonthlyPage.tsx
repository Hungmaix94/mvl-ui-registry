import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { IconPlus, IconCheck, IconEnvelopesimple } from '@/assets/icons'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt, formatCurrencyVND } from '@/utils/common'
import {
  useMonthlySummaries,
  useBatchApproveMonthlySummaries,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { useCommissionEmailDialogs } from '@/features/accounting/commissions/hooks/useCommissionEmailDialogs'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { CommCtvMonthlyTable } from '@/features/accounting/commissions/components/CommCtvMonthlyTable'
import CommCtvMonthlyFilter, {
  type CommCtvMonthlyFilterRef,
} from '@/features/accounting/commissions/components/CommCtvMonthlyFilter'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

const CommCtvMonthlyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterRef = useRef<CommCtvMonthlyFilterRef>(null)
  const [selectedRows, setSelectedRows] = useState<any[]>([])

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = allPeriods ?? []

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  const status = searchParams.get('status')
  const beneficiaryCollaborator = searchParams.get('beneficiary_collaborator') || undefined
  const searchQuery = searchParams.get('q')

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  useEffect(() => {
    setSelectedRows([])
  }, [activePeriodId])

  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')
    const hasYear = searchParams.has('year')
    const hasMonth = searchParams.has('month')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(pageSize))
      if (!hasYear || !hasMonth) {
        const defaultPeriod = currentPeriod ?? periods[0]
        if (defaultPeriod) {
          newParams.set('year', String(defaultPeriod.year))
          newParams.set('month', String(defaultPeriod.month))
        }
      }
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams, pageSize])

  const handlePeriodSelect = useCallback(
    (periodId: number) => {
      const period = periods.find((p) => p.id === periodId)
      if (period) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('page', '1')
        newParams.set('year', String(period.year))
        newParams.set('month', String(period.month))
        setSearchParams(newParams, { replace: true })
      }
    },
    [periods, searchParams, setSearchParams]
  )

  const currentFilters = useMemo(
    () => ({
      status: status ?? undefined,
      beneficiary_collaborator: beneficiaryCollaborator,
    }),
    [status, beneficiaryCollaborator]
  )

  const {
    data: listResponse,
    isLoading,
    error,
  } = useMonthlySummaries(
    'collaborators',
    {
      month: month || 1,
      year: year || 2000,
      status: status as MonthlyStatus,
      beneficiary_collaborator: beneficiaryCollaborator
        ? Number(beneficiaryCollaborator)
        : undefined,
      search: searchQuery || undefined,
      page: currentPage,
      page_size: pageSize,
    },
    { enabled: isUrlReady && !!month && !!year }
  )

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const urlPage = parsePositiveInt(searchParams.get('page')) ?? 1
      const effectiveUrlPageSize =
        pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

      if (nextPage === urlPage && newPageSize === effectiveUrlPageSize) return

      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })

      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams, pageSizeFromUrl]
  )

  const handleApplyFilter = () => {
    const formData = filterRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    if (formData.status) newParams.set('status', formData.status)
    else newParams.delete('status')

    if (formData.beneficiary_collaborator) {
      newParams.set('beneficiary_collaborator', formData.beneficiary_collaborator)
    } else {
      newParams.delete('beneficiary_collaborator')
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }

  const handleSearch = (val: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    if (val) newParams.set('q', val)
    else newParams.delete('q')
    setSearchParams(newParams, { replace: true })
  }

  const filterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('status')) count++
    if (searchParams.has('beneficiary_collaborator')) count++
    return count
  }, [searchParams])

  const results = useMemo(() => listResponse?.results ?? [], [listResponse])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/monthly-summaries/collaborators/export/',
    'hoa-hong-ctv-thang.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({
      month: month || undefined,
      year: year || undefined,
      status: status || undefined,
      beneficiary_collaborator: beneficiaryCollaborator
        ? Number(beneficiaryCollaborator)
        : undefined,
      search: searchQuery || undefined,
    })
  }, [openExportDialog, month, year, status, beneficiaryCollaborator, searchQuery])

  const batchApproveMutation = useBatchApproveMonthlySummaries()

  // BA yêu cầu bổ sung (ClickUp 86eyexcr3, comment 90180242298469) — tích chọn hàng loạt + gửi
  // email đối chiếu ở màn danh sách CTV, giống Sale. Backend action đã có sẵn
  // (bulk_send_commission_detail_email); chỉ cần wiring UI này.
  const { openBulk: openBulkEmailDialog, dialogs: bulkEmailDialogs } = useCommissionEmailDialogs(
    'collaborators',
    () => queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly_summaries'] })
  )

  const handleBulkApprove = async () => {
    if (selectedRows.length === 0) return
    try {
      await batchApproveMutation.mutateAsync({
        ids: selectedRows.map((r) => r.id),
      })
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'monthly_summaries'],
      })
      setSelectedRows([])
      toastService.success('Duyệt hàng loạt thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const blockedCount = useMemo(() => {
    return selectedRows.filter((r) => {
      // bank_account đã bỏ (không còn fetch collaborators page_size=1000); chỉ kiểm tra CCCD từ nested
      return !r.beneficiary_collaborator_detail?.id_number
    }).length
  }, [selectedRows])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchQuery || ''}
        searchPlaceholder="Tìm theo mã CTV, họ tên, CCCD..."
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
        customActions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              leftIcon={<IconPlus />}
              onClick={() => navigate(APP_PATH.COLLABORATOR_CONTRACT_MANAGEMENT)}
            >
              Mở HĐ CTV
            </Button>
            <Button
              size="small"
              leftIcon={<IconPlus />}
              onClick={() => navigate(APP_PATH.COMM_PAYMENT_CREATE)}
            >
              Tạo đợt chi CTV
            </Button>
          </div>
        }
      />

      <div className="flex flex-grow flex-col gap-0 px-7 pb-6">
        {/* Bulk Action Bar */}
        {selectedRows.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/40 px-5 py-3.5 shadow-sm backdrop-blur-md duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white shadow-sm">
                {selectedRows.length}
              </div>
              <span className="typo-body-base-medium font-medium text-neutral-700">
                Đang chọn{' '}
                <strong className="font-semibold text-neutral-900">
                  {selectedRows.length} CTV
                </strong>
              </span>
              <span className="text-neutral-500">
                · Tổng phải chi:{' '}
                <strong className="font-semibold text-neutral-900">
                  {formatCurrencyVND(
                    selectedRows.reduce((sum, r) => sum + Number(r.net_payable || 0), 0)
                  )}{' '}
                  đ
                </strong>
              </span>
              {blockedCount > 0 && (
                <span className="font-medium text-amber-600">
                  · ⚠ {blockedCount} CTV thiếu giấy tờ, không thể chi
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="primary"
                size="small"
                loading={batchApproveMutation.isPending}
                onClick={handleBulkApprove}
                leftIcon={<IconCheck className="h-4 w-4" />}
              >
                Duyệt hàng loạt
              </Button>
              <Button
                variant="secondary"
                size="small"
                leftIcon={<IconEnvelopesimple className="h-4 w-4" />}
                onClick={() => openBulkEmailDialog(selectedRows.map((r) => r.id))}
              >
                Gửi email đối chiếu
              </Button>

              <button
                onClick={() => setSelectedRows([])}
                className="ml-2 text-xs font-medium text-neutral-500 hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
        {bulkEmailDialogs}

        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-2 pb-10">
          <CommCtvMonthlyTable
            data={results}
            isLoading={isLoading}
            error={error}
            totalRecords={listResponse?.count ?? 0}
            pageSize={pageSize}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <CommCtvMonthlyFilter
            ref={filterRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={() => filterRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}

export default CommCtvMonthlyPage
