import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { IconPlus, IconCheck } from '@/assets/icons'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt, formatCurrencyVND } from '@/utils/common'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  useMonthlySummaries,
  useBatchApproveMonthlySummaries,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { CommMgrMonthlyTable } from '@/features/accounting/commissions/components/CommMgrMonthlyTable'
import CommMgrMonthlyFilter, {
  type CommMgrMonthlyFilterRef,
} from '@/features/accounting/commissions/components/CommMgrMonthlyFilter'
import {
  applyCommMgrMonthlyFilters,
  countCommMgrMonthlyFilters,
} from '@/features/accounting/commissions/utils/comm-mgr-monthly-filters'
import toastService from '@/services/toast-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

const CommMgrMonthlyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterRef = useRef<CommMgrMonthlyFilterRef>(null)
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
  const beneficiaryEmployee = parsePositiveInt(searchParams.get('beneficiary_employee'))
  const branch = parsePositiveInt(searchParams.get('branch'))
  const block = parsePositiveInt(searchParams.get('block'))
  const department = parsePositiveInt(searchParams.get('department'))
  const position = parsePositiveInt(searchParams.get('position'))
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
      status: status ?? null,
      branch: branch ?? null,
      block: block ?? null,
      department: department ?? null,
      position: position ?? null,
      beneficiary_employee: beneficiaryEmployee ?? null,
    }),
    [status, branch, block, department, position, beneficiaryEmployee]
  )

  const {
    data: listResponse,
    isLoading,
    error,
  } = useMonthlySummaries(
    'management',
    {
      month: month || 1,
      year: year || 2000,
      status: status as MonthlyStatus,
      branch: branch ?? undefined,
      block: block ?? undefined,
      department: department ?? undefined,
      position: position ?? undefined,
      beneficiary_employee: beneficiaryEmployee ?? undefined,
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

    const newParams = applyCommMgrMonthlyFilters(searchParams, formData)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

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

  const filterCount = useMemo(() => countCommMgrMonthlyFilters(searchParams), [searchParams])

  const results = useMemo(() => listResponse?.results ?? [], [listResponse])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/monthly-summaries/management/export/',
    'hoa-hong-manager-thang.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({
      month: month || undefined,
      year: year || undefined,
      status: status || undefined,
      branch: branch ?? undefined,
      block: block ?? undefined,
      department: department ?? undefined,
      position: position ?? undefined,
      beneficiary_employee: beneficiaryEmployee ?? undefined,
      search: searchQuery || undefined,
    })
  }, [
    openExportDialog,
    month,
    year,
    status,
    branch,
    block,
    department,
    position,
    beneficiaryEmployee,
    searchQuery,
  ])

  const queryClient = useQueryClient()
  const batchApproveMutation = useBatchApproveMonthlySummaries()

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

  /* const totals = useMemo(() => {
    return (results as any[]).reduce(
      (
        acc: { sale: number; groupA: number; groupB: number; received: number; net: number },
        curr: any
      ) => {
        const { sale, groupA, groupB } = getBreakdown(curr)
        return {
          sale: acc.sale + sale,
          groupA: acc.groupA + groupA,
          groupB: acc.groupB + groupB,
          received: acc.received + Number(curr.pre_tax_total),
          net: acc.net + Number(curr.net_payable),
        }
      },
      { sale: 0, groupA: 0, groupB: 0, received: 0, net: 0 }
    )
  }, [results]) */

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchQuery || ''}
        searchPlaceholder="Tìm theo mã NV, họ tên..."
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
              size="small"
              leftIcon={<IconPlus />}
              onClick={() => navigate(APP_PATH.COMM_PAYMENT_CREATE)}
            >
              Tạo đợt thanh toán
            </Button>
          </div>
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
                <strong className="font-semibold text-neutral-900">
                  {selectedRows.length} quản lý
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

              <button
                onClick={() => setSelectedRows([])}
                className="ml-2 text-xs font-medium text-neutral-500 hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-4 pb-10">
          <CommMgrMonthlyTable
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
          <CommMgrMonthlyFilter
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

/* const getBreakdown = (summary: MonthlyBeneficiaryCommissionSummary) => {
  const lines: any[] = (summary as any).lines ?? []
  return {
    sale: lines
      .filter((l) => l.source_role === 'SALE')
      .reduce((s, l) => s + Number(l.amount || 0), 0),
    groupA: lines
      .filter((l) => l.source_role === 'PROMO')
      .reduce((s, l) => s + Number(l.amount || 0), 0),
    groupB: lines
      .filter((l) => l.source_role === 'MGMT')
      .reduce((s, l) => s + Number(l.amount || 0), 0),
  }
} */

export default CommMgrMonthlyPage
