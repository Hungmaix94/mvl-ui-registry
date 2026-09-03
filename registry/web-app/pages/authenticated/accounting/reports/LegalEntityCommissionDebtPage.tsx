import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import * as TableComponents from '@radix-ui/themes'
import { Button, PageTitle } from '@/components/ui'
import { IconDownload } from '@/assets/icons'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import {
  useLegalEntityCommissionDebt,
  type LegalEntityCommissionDebtRow,
} from '@/features/accounting/reports/services/legal-entity-report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'
import { parsePositiveInt } from '@/utils/common'

const LegalEntityCommissionDebtPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = allPeriods ?? []

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))

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

  const {
    data: listResponse,
    isLoading,
    error,
  } = useLegalEntityCommissionDebt(
    {
      month: month || undefined,
      year: year || undefined,
    },
    { enabled: isUrlReady && !!month && !!year }
  )

  const results = useMemo(() => listResponse?.results ?? [], [listResponse])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/legal-entity-commission-debt/',
    'cong-no-hoa-hong-phap-nhan.xlsx'
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Báo cáo công nợ hoa hồng theo pháp nhân"
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
            onClick={() => openExportDialog({ year: year || undefined, month: month || undefined })}
            disabled={!results.length}
          >
            Xuất Excel
          </Button>
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="px-7 pt-4 pb-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading size="lg" />
          </div>
        ) : error ? (
          <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
            <p className="text-content-dark-3 text-red-500">
              Có lỗi xảy ra: {(error as any)?.message}
            </p>
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
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
                    ID Pháp Nhân
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
                    Tên Pháp Nhân
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
                    Mã Số Thuế
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-3 py-[10px] text-right !shadow-none">
                    Tổng hoa hồng chưa chi
                  </TableComponents.Table.ColumnHeaderCell>
                </TableComponents.Table.Row>
              </TableComponents.Table.Header>
              <TableComponents.Table.Body>
                {results.map((row: LegalEntityCommissionDebtRow, rowIdx: number) => (
                  <TableComponents.Table.Row
                    key={row.legal_entity_id || rowIdx}
                    className={cn(
                      'border-border-1 border-b bg-white transition-colors',
                      'last:border-b-0',
                      'hover:bg-data-light-grey-hover',
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                    )}
                  >
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.legal_entity_id}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.name}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.tax_code || '—'}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 px-3 py-[10px] text-right font-semibold">
                      {formatCurrencyVND(Number(row.commission_payable_total || 0))}
                    </TableComponents.Table.Cell>
                  </TableComponents.Table.Row>
                ))}
              </TableComponents.Table.Body>
            </TableComponents.Table.Root>
          </div>
        )}
      </Flex>
    </div>
  )
}

export default LegalEntityCommissionDebtPage
