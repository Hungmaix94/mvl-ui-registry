import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex, Grid, Card, Text } from '@radix-ui/themes'
import { PageTitle, Select } from '@/components/ui'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useTotalReceivablesReport } from '@/features/accounting/reports/services/report-service'
import { useBranchSelect } from '@/hooks/useBranchSelect'
import { parsePositiveInt } from '@/utils/common'
import { formatCurrencyVND } from '@/utils'
import InternalReportTable from '@/features/report/accounting/internal-report/InternalReportTable'

export default function InternalReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  const branchIdStr = searchParams.get('branch')

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  // Sync parameters with default values on mount
  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const actualUrlParams = new URLSearchParams(window.location.search)
    const hasYear = searchParams.has('year') || actualUrlParams.has('year')
    const hasMonth = searchParams.has('month') || actualUrlParams.has('month')

    if (!hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      const defaultPeriod = currentPeriod ?? periods[0]
      if (defaultPeriod) {
        newParams.set('year', String(defaultPeriod.year))
        newParams.set('month', String(defaultPeriod.month))
      }
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  // Filters object passed to backend query hook
  const filters = useMemo(() => {
    return {
      month: month || undefined,
      year: year || undefined,
      branch: branchIdStr ? Number(branchIdStr) : undefined,
    }
  }, [month, year, branchIdStr])

  const { data, isLoading } = useTotalReceivablesReport(filters, {
    enabled: isUrlReady,
  })

  const reportData = data || null

  const handlePeriodChange = useCallback(
    (periodId: number | string | null) => {
      const period = periods.find((p) => p.id === periodId)
      if (period) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('year', String(period.year))
        newParams.set('month', String(period.month))
        setSearchParams(newParams, { replace: true })
      }
    },
    [periods, searchParams, setSearchParams]
  )

  const handleBranchChange = useCallback(
    (value: string | number | (string | number)[] | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (value) {
        newParams.set('branch', String(value))
      } else {
        newParams.delete('branch')
      }
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.2 Báo cáo tổng hợp dự án (tháng + lũy tiến năm)"
        toolbarLeftContent={
          <Flex gap="3" align="center">
            <AccountingPeriodSelect
              periods={periods}
              selectedPeriodId={activePeriodId}
              onSelect={handlePeriodChange}
            />
            <div className="w-56">
              <Select
                placeholder="Tất cả chi nhánh"
                value={branchIdStr || ''}
                onChange={handleBranchChange}
                loadOptions={loadBranchOptions}
                loadInitialOptions={loadInitialBranchOptions}
                enableSearch
                clearable
              />
            </div>
          </Flex>
        }
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto p-6">
        <Grid columns={{ initial: '1', md: '3', lg: '5' }} gap="4">
          <Card className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" className="font-medium">
                Doanh thu gốc
              </Text>
              <Text size="5" className="font-bold text-blue-700">
                {isLoading ? '...' : formatCurrencyVND(Number(reportData?.receivable || 0))}
              </Text>
            </Flex>
          </Card>
          <Card className="border border-red-200 bg-red-50 p-4 shadow-sm">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" className="font-medium">
                Chi phí hoa hồng
              </Text>
              <Text size="5" className="font-bold text-red-700">
                {isLoading ? '...' : formatCurrencyVND(Number(reportData?.payable || 0))}
              </Text>
            </Flex>
          </Card>
          <Card className="border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" className="font-medium">
                Số dư tạm giữ
              </Text>
              <Text size="5" className="font-bold text-yellow-700">
                {isLoading ? '...' : formatCurrencyVND(Number(reportData?.hold_balance || 0))}
              </Text>
            </Flex>
          </Card>
          <Card className="border border-purple-200 bg-purple-50 p-4 shadow-sm">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" className="font-medium">
                Dư nợ tạm ứng
              </Text>
              <Text size="5" className="font-bold text-purple-700">
                {isLoading
                  ? '...'
                  : formatCurrencyVND(Number(reportData?.advance_outstanding || 0))}
              </Text>
            </Flex>
          </Card>
          <Card className="border border-green-200 bg-green-50 p-4 shadow-sm">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" className="font-medium">
                Lợi nhuận gộp (Net)
              </Text>
              <Text size="5" className="font-bold text-green-700">
                {isLoading ? '...' : formatCurrencyVND(Number(reportData?.cash_flow_net || 0))}
              </Text>
            </Flex>
          </Card>
        </Grid>

        <div className="border-border-1 flex-1 rounded-lg border bg-white p-4 shadow-sm">
          <Text size="4" className="text-content-dark-1 mb-4 block font-bold">
            Chi tiết tổng hợp
          </Text>
          <InternalReportTable data={reportData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
