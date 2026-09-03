import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { IconCheck, IconEnvelopesimple } from '@/assets/icons'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt, formatCurrencyVND } from '@/utils/common'
import {
  useMonthlySummaries,
  useBatchApproveMonthlySummaries,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { CommF2MonthlyTable } from '@/features/accounting/commissions/components/CommF2MonthlyTable'
import { useCommissionEmailDialogs } from '@/features/accounting/commissions/hooks/useCommissionEmailDialogs'
import CommF2MonthlyFilter, {
  type CommF2MonthlyFilterRef,
} from '@/features/accounting/commissions/components/CommF2MonthlyFilter'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

const CommF2MonthlyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterRef = useRef<CommF2MonthlyFilterRef>(null)
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
  const beneficiaryExchange = searchParams.get('beneficiary_exchange') || undefined
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
      beneficiary_exchange: beneficiaryExchange,
    }),
    [status, beneficiaryExchange]
  )

  const {
    data: listResponse,
    isLoading,
    error,
  } = useMonthlySummaries(
    'f2',
    {
      month: month || 1,
      year: year || 2000,
      status: status as MonthlyStatus,
      beneficiary_exchange: beneficiaryExchange ? Number(beneficiaryExchange) : undefined,
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

    if (formData.beneficiary_exchange) {
      newParams.set('beneficiary_exchange', formData.beneficiary_exchange)
    } else {
      newParams.delete('beneficiary_exchange')
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
    if (searchParams.has('beneficiary_exchange')) count++
    return count
  }, [searchParams])

  const results = useMemo(() => listResponse?.results ?? [], [listResponse])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/monthly-summaries/f2/export/',
    'hoa-hong-f2-thang.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({
      month: month || undefined,
      year: year || undefined,
      status: status || undefined,
      beneficiary_exchange: beneficiaryExchange ? Number(beneficiaryExchange) : undefined,
      search: searchQuery || undefined,
    })
  }, [openExportDialog, month, year, status, beneficiaryExchange, searchQuery])

  const batchApproveMutation = useBatchApproveMonthlySummaries()

  const { openBulk: openBulkEmailDialog, dialogs: emailDialogs } = useCommissionEmailDialogs(
    'f2',
    () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly_summaries'] })
      setSelectedRows([])
    }
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

  return (
    <div className="bg-background-2 flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchQuery || ''}
        searchPlaceholder="Tìm theo mã F2, tên sàn, MST..."
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
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="px-7 pb-6">
        {/* Bulk Action Bar */}
        {selectedRows.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/40 px-5 py-3.5 shadow-sm backdrop-blur-md duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white shadow-sm">
                {selectedRows.length}
              </div>
              <span className="typo-body-base-medium font-medium text-neutral-700">
                Đang chọn{' '}
                <strong className="font-semibold text-neutral-900">{selectedRows.length} F2</strong>
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
              {selectedRows.filter((r) => Number(r.f2_total || 0) > Number(r.pre_tax_total || 0))
                .length > 0 && (
                <span className="font-medium text-amber-600">
                  · ⚠{' '}
                  {
                    selectedRows.filter(
                      (r) => Number(r.f2_total || 0) > Number(r.pre_tax_total || 0)
                    ).length
                  }{' '}
                  F2 thiếu HĐ đầu vào, không thể chi
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

        {emailDialogs}

        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-2 pb-10">
          <CommF2MonthlyTable
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
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <CommF2MonthlyFilter
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

/* const SummaryCard = ({
  label,
  value,
  color = 'text-neutral-900',
  bold = false,
}: {
  label: string
  value: string | number
  color?: string
  bold?: boolean
}) => (
  <div className="flex flex-col justify-center p-3 text-center sm:p-4">
    <div className="text-[11px] font-medium text-neutral-500">{label}</div>
    <div className={`mt-1 text-[15px] ${bold ? 'font-bold' : 'font-medium'} ${color}`}>{value}</div>
  </div>
) */

export default CommF2MonthlyPage
