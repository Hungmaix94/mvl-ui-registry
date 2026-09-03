import { useRef, useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconDownload } from '@/assets/icons'
import { Flex } from '@radix-ui/themes'
import { PaginationState } from '@tanstack/react-table'

import { PageTitle, Button } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import {
  F2PaymentListFilter,
  F2PaymentFilterRef,
  F2PaymentFilterFormData,
} from './F2PaymentListFilter'
import { F2PaymentListTable } from './F2PaymentListTable'
import { f2PaymentService } from '../payment-f2-service'
// import { formatCurrencyVND } from '@/utils/common'

export const F2PaymentListFeature = () => {
  const filterRef = useRef<F2PaymentFilterRef>(null)
  const [filters, setFilters] = useState<
    F2PaymentFilterFormData & { year?: string; month?: string }
  >({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = allPeriods ?? []

  const activePeriodId = useMemo(() => {
    if (filters.year && filters.month) {
      return (
        periods.find(
          (p) =>
            Number(p.year) === Number(filters.year) && Number(p.month) === Number(filters.month)
        )?.id || null
      )
    }
    return null
  }, [periods, filters.year, filters.month])

  useEffect(() => {
    if (periods.length > 0 && !filters.year && !filters.month && !isLoadingCurrent) {
      const defaultPeriod = currentPeriod ?? periods[0]
      if (defaultPeriod) {
        setFilters((prev) => ({
          ...prev,
          year: String(defaultPeriod.year),
          month: String(defaultPeriod.month),
        }))
      }
    }
  }, [periods, currentPeriod, isLoadingCurrent, filters.year, filters.month])

  const handlePeriodSelect = (periodId: number) => {
    const period = periods.find((p) => p.id === periodId)
    if (period) {
      setFilters((prev) => ({
        ...prev,
        year: String(period.year),
        month: String(period.month),
      }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
  }

  // Ensure is_overdue & include_voided are properly passed to API (as booleans instead of string 'true' / 'false' from switch if needed, but Switch gives boolean directly).
  const apiFilters = useMemo(() => {
    return {
      ...filters,
      year: filters.year ? Number(filters.year) : undefined,
      month: filters.month ? Number(filters.month) : undefined,
      recipient_type: filters.recipient_type as any,
      status: filters.status as any,
      is_overdue: filters.is_overdue || undefined,
      include_voided: filters.include_voided || undefined,
      page: pagination.pageIndex + 1,
      page_size: pagination.pageSize,
    }
  }, [filters, pagination])

  const { data, isLoading, error } = useQuery({
    queryKey: ['f2-payment-list', apiFilters],
    queryFn: () => f2PaymentService.getPaymentF2List(apiFilters),
    enabled: !!filters.year && !!filters.month,
  })

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const handleApplyFilter = () => {
    if (filterRef.current) {
      const formValues = filterRef.current.getValues()
      setFilters((prev) => ({
        ...prev,
        ...formValues,
      }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      setIsFilterOpen(false)
    }
  }

  const handleClearFilter = () => {
    if (filterRef.current) {
      filterRef.current.clearForm()
    }
  }

  const handleExport = async () => {
    try {
      await f2PaymentService.exportPaymentF2List(apiFilters)
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  const handlePaginationChange = (pageIndex: number, pageSize: number) => {
    setPagination({ pageIndex, pageSize })
  }

  // const summary = data?.summary

  return (
    <>
      <PageTitle
        title="Thanh toán Hoa hồng F2/Sàn"
        handleFilter={() => setIsFilterOpen(true)}
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
        customActions={
          <Button
            variant="secondary-border"
            className="border-neutral-200"
            onClick={handleExport}
            leftIcon={<IconDownload className="h-4 w-4" />}
          >
            Xuất Excel
          </Button>
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="4" className="flex-grow pt-4 pb-6">
        {/* summary && (
          <div className="px-7">
            <Grid columns="4" gap="4">
              <Card size="2">
                <p className="text-sm font-medium text-neutral-500">Tổng hoa hồng</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">
                  {formatCurrencyVND(Number(summary.total_expected))}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{summary.count_total} phiếu</p>
              </Card>
              <Card size="2">
                <p className="text-sm font-medium text-neutral-500">Đã thanh toán</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {formatCurrencyVND(Number(summary.total_paid))}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {summary.count_paid} phiếu đã chi trả
                </p>
              </Card>
              <Card size="2">
                <p className="text-sm font-medium text-neutral-500">Còn phải chi</p>
                <p className="mt-1 text-2xl font-bold text-orange-600">
                  {formatCurrencyVND(Number(summary.total_balance))}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {summary.count_unpaid + summary.count_partial} phiếu tồn
                </p>
              </Card>
              <Card size="2">
                <p className="text-sm font-medium text-neutral-500">Quá hạn</p>
                <p className="mt-1 text-2xl font-bold text-red-600">{summary.count_overdue}</p>
                <p className="mt-1 text-xs text-neutral-500">phiếu thanh toán trễ</p>
              </Card>
            </Grid>
          </div>
        ) */}

        <F2PaymentListTable
          data={data?.rows || []}
          isLoading={isLoading}
          error={error as Error}
          totalRecords={data?.pagination?.total || 0}
          pageSize={pagination.pageSize}
          currentPageIndex={pagination.pageIndex}
          onPaginationChange={handlePaginationChange}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        content={<F2PaymentListFilter ref={filterRef} isOpen={isFilterOpen} />}
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
      />
    </>
  )
}

export default F2PaymentListFeature
