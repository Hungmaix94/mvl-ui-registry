import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { IconPlus } from '@/assets/icons'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { useMonthlySummaries } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { CommSaleMonthlyTable } from '@/features/accounting/commissions/components/CommSaleMonthlyTable'
import CommSaleMonthlyFilter, {
  type CommSaleMonthlyFilterRef,
} from '@/features/accounting/commissions/components/CommSaleMonthlyFilter'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

const CommSaleMonthlyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterRef = useRef<CommSaleMonthlyFilterRef>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
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
  const beneficiaryEmployee = searchParams.get('beneficiary_employee') || undefined
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
      beneficiary_employee: beneficiaryEmployee,
    }),
    [status, beneficiaryEmployee]
  )

  const {
    data: listResponse,
    isLoading,
    error,
  } = useMonthlySummaries(
    'sales',
    {
      month: month || 1,
      year: year || 2000,
      status: status as MonthlyStatus,
      beneficiary_employee: beneficiaryEmployee ? Number(beneficiaryEmployee) : undefined,
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
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams, pageSizeFromUrl]
  )

  const handleApplyFilter = useCallback(() => {
    const formData = filterRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    if (formData.status) newParams.set('status', formData.status)
    else newParams.delete('status')

    if (formData.beneficiary_employee) {
      newParams.set('beneficiary_employee', formData.beneficiary_employee)
    } else {
      newParams.delete('beneficiary_employee')
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  const handleSearch = useCallback(
    (val: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', '1')
      if (val) newParams.set('q', val)
      else newParams.delete('q')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const filterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('status')) count++
    if (searchParams.has('beneficiary_employee')) count++
    return count
  }, [searchParams])

  const results = useMemo(() => listResponse?.results ?? [], [listResponse])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/monthly-summaries/sales/export/',
    'hoa-hong-sale-thang.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({
      month: month || undefined,
      year: year || undefined,
      status: status || undefined,
      beneficiary_employee: beneficiaryEmployee ? Number(beneficiaryEmployee) : undefined,
      search: searchQuery || undefined,
    })
  }, [openExportDialog, month, year, status, beneficiaryEmployee, searchQuery])

  /* const totals = useMemo(() => {
    return (results as any[]).reduce(
      (acc: { sale: number; received: number; net: number }, curr: any) => {
        const sale = Number(curr.sale_total || 0)
        return {
          sale: acc.sale + sale,
          received: acc.received + Number(curr.pre_tax_total || 0),
          net: acc.net + Number(curr.net_payable || 0),
        }
      },
      { sale: 0, received: 0, net: 0 }
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
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-4 pb-10"
        >
          <CommSaleMonthlyTable
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
          <CommSaleMonthlyFilter
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

export default CommSaleMonthlyPage
