import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
// import { IconReceipt } from '@/assets/icons'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { APP_PATH } from '@/routes'
import { useEmployeePayoutBatches } from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { CommPaymentTable } from '@/features/accounting/commissions/components/CommPaymentTable'
import {
  CommPaymentFilter,
  type CommPaymentFilterRef,
} from '@/features/accounting/commissions/components/CommPaymentFilter'

const CommPaymentListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef<CommPaymentFilterRef>(null)

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = allPeriods ?? []

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentYear = parsePositiveInt(searchParams.get('year'))
  const currentMonth = parsePositiveInt(searchParams.get('month'))
  const currentStatus = searchParams.get('status') || undefined

  const activePeriodId = useMemo(() => {
    if (currentYear && currentMonth) {
      return periods.find((p) => p.year === currentYear && p.month === currentMonth)?.id || null
    }
    return null
  }, [periods, currentYear, currentMonth])

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
      status: currentStatus,
    }),
    [currentStatus]
  )

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return {
      page: currentPage,
      page_size: pageSize,
      year: currentYear,
      month: currentMonth,
      status: currentStatus,
    }
  }, [isUrlReady, currentPage, pageSize, currentYear, currentMonth, currentStatus])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useEmployeePayoutBatches(
    { ...(apiParams || {}), status: apiParams?.status as any },
    { enabled: isUrlReady && !!apiParams }
  )

  const totalRecords = listResponse?.count ?? 0

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleApplyFilter = () => {
    const formData = filterRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))
    if (formData.status) newParams.set('status', formData.status)
    else newParams.delete('status')

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }

  const handleClearFilter = () => {
    filterRef.current?.clearForm()
  }

  /* const totals = useMemo(() => {
    return (listResponse?.results ?? []).reduce(
      (acc, curr) => {
        return {
          amount: acc.amount + Number(curr.total_amount || 0),
        }
      },
      { amount: 0 }
    )
  }, [listResponse?.results]) */

  const filterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('status')) count++
    return count
  }, [searchParams])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Đợt thanh toán hoa hồng"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterCount}
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
        customActions={
          <Button variant="primary" onClick={() => navigate(APP_PATH.COMM_PAYMENT_CREATE)}>
            + Tạo đợt chi
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-6 overflow-y-auto pt-4 pb-6">
        <CommPaymentTable
          data={listResponse?.results ?? []}
          isLoading={isLoading}
          error={error}
          totalRecords={totalRecords}
          pageSize={pageSize}
          currentPageIndex={currentPage - 1}
          onPaginationChange={handlePaginationChange}
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        content={
          <CommPaymentFilter ref={filterRef} initialValues={currentFilters} isOpen={isFilterOpen} />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
      />
    </div>
  )
}

export default CommPaymentListPage
