import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex, Tabs } from '@radix-ui/themes'
import * as TableComponents from '@radix-ui/themes'
import { Button, PageTitle } from '@/components/ui'
import { IconDownload } from '@/assets/icons'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import {
  useCommissionPayableReport,
  useExportCommissionPayableReport,
  type CommissionPayableStatusGroup,
  type GetCommissionPayableReportParams,
} from '@/features/accounting/reports/services/report-service'
import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'
import { parseDateTimeFromApi } from '@/utils/date-utils'
import { parsePositiveInt } from '@/utils/common'

const STATUS_GROUP_PENDING: CommissionPayableStatusGroup = 'pending'
const STATUS_GROUP_PAID: CommissionPayableStatusGroup = 'paid'

const CommissionPayableReportPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  const tabFromUrl = searchParams.get('tab')
  const tab: CommissionPayableStatusGroup =
    tabFromUrl === STATUS_GROUP_PAID ? STATUS_GROUP_PAID : STATUS_GROUP_PENDING

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const hasYear = searchParams.has('year')
    const hasMonth = searchParams.has('month')

    if (!hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      const defaultPeriod = currentPeriod ?? periods[0]
      if (defaultPeriod) {
        newParams.set('year', String(defaultPeriod.year))
        newParams.set('month', String(defaultPeriod.month))
      }
      if (!searchParams.has('tab')) newParams.set('tab', STATUS_GROUP_PENDING)
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  const handlePeriodSelect = useCallback(
    (periodId: number) => {
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

  const handleTabChange = useCallback(
    (next: string) => {
      const validated: CommissionPayableStatusGroup =
        next === STATUS_GROUP_PAID ? STATUS_GROUP_PAID : STATUS_GROUP_PENDING
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', validated)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const queryParams = useMemo<GetCommissionPayableReportParams>(
    () => ({
      status_group: tab as unknown as NonNullable<GetCommissionPayableReportParams>['status_group'],
      year: year || undefined,
      month: month || undefined,
    }),
    [tab, year, month]
  )

  const { data, isLoading, error } = useCommissionPayableReport(queryParams, {
    enabled: isUrlReady && !!year && !!month,
  })

  const { openExportDialog, isExporting } = useExportCommissionPayableReport()

  const handleExport = useCallback(() => {
    openExportDialog(queryParams)
  }, [openExportDialog, queryParams])

  const results = useMemo(() => data?.results ?? [], [data])

  const tabContent = (
    <>
      {data && !isLoading && (
        <div className="flex gap-4 px-7 pt-4">
          <div className="border-border-1 flex min-w-[200px] flex-col gap-1 rounded-lg border bg-white p-4 shadow-sm">
            <span className="text-content-dark-3 text-xs">Tổng dự kiến</span>
            <span className="text-content-dark-1 text-xl font-bold">
              {formatCurrencyVND(Number(data.total_expected || 0))}
            </span>
            <span className="text-content-dark-4 text-xs">VND</span>
          </div>
          <div className="border-border-1 flex min-w-[200px] flex-col gap-1 rounded-lg border bg-white p-4 shadow-sm">
            <span className="text-content-dark-3 text-xs">Tổng thực chi</span>
            <span className="text-content-dark-1 text-xl font-bold">
              {formatCurrencyVND(Number(data.total_actual || 0))}
            </span>
            <span className="text-content-dark-4 text-xs">VND</span>
          </div>
        </div>
      )}

      <Flex flexGrow={'1'} direction="column" gap="0" className="px-7 pt-4 pb-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading size="lg" />
          </div>
        ) : error ? (
          <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
            <p className="text-red-500">Có lỗi xảy ra</p>
          </div>
        ) : results.length === 0 ? (
          <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
            <p className="text-content-dark-3">Không có dữ liệu</p>
          </div>
        ) : (
          <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
            <TableComponents.Table.Root className="w-full border-collapse text-sm">
              <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
                <TableComponents.Table.Row>
                  {[
                    { label: 'Mã phiếu', align: 'left' },
                    { label: 'Trạng thái', align: 'left' },
                    { label: 'Kỳ HH', align: 'left' },
                    { label: 'Người nhận', align: 'left' },
                    { label: 'Dự kiến (VND)', align: 'right' },
                    { label: 'Thực chi (VND)', align: 'right' },
                    { label: 'Ngày chi', align: 'left' },
                  ].map(({ label, align }) => (
                    <TableComponents.Table.ColumnHeaderCell
                      key={label}
                      className={cn(
                        'text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] !shadow-none last:border-r-0',
                        align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {label}
                    </TableComponents.Table.ColumnHeaderCell>
                  ))}
                </TableComponents.Table.Row>
              </TableComponents.Table.Header>
              <TableComponents.Table.Body>
                {results.map((row, rowIdx) => (
                  <TableComponents.Table.Row
                    key={row.id}
                    className={cn(
                      'border-border-1 border-b transition-colors last:border-b-0',
                      'hover:bg-data-light-grey-hover',
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                    )}
                  >
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left font-medium">
                      {row.code}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.status}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.commission_period_year && row.commission_period_month
                        ? `${String(row.commission_period_month).padStart(2, '0')}/${row.commission_period_year}`
                        : '—'}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.payee_name || '—'}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right">
                      {formatCurrencyVND(Number(row.expected_amount || 0))}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right">
                      {formatCurrencyVND(Number(row.actual_amount || 0))}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 px-3 py-[10px] text-left">
                      {row.paid_at ? parseDateTimeFromApi(row.paid_at) : '—'}
                    </TableComponents.Table.Cell>
                  </TableComponents.Table.Row>
                ))}
              </TableComponents.Table.Body>
            </TableComponents.Table.Root>
          </div>
        )}
      </Flex>
    </>
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Báo cáo hoa hồng phải trả"
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
        customActions={
          <Button
            variant="secondary"
            size="small"
            leftIcon={<IconDownload />}
            onClick={handleExport}
            disabled={!results.length || isExporting}
          >
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>
        }
      />

      <Tabs.Root
        value={tab}
        onValueChange={handleTabChange}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <Tabs.List className="px-7 pt-4">
          <Tabs.Trigger value={STATUS_GROUP_PENDING}>Chờ chi</Tabs.Trigger>
          <Tabs.Trigger value={STATUS_GROUP_PAID}>Đã chi</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content
          value={STATUS_GROUP_PENDING}
          className="flex flex-1 flex-col overflow-hidden outline-none"
        >
          {tabContent}
        </Tabs.Content>
        <Tabs.Content
          value={STATUS_GROUP_PAID}
          className="flex flex-1 flex-col overflow-hidden outline-none"
        >
          {tabContent}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

export default CommissionPayableReportPage
