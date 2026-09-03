import { Table as RadixTable } from '@radix-ui/themes'
import { cn, formatCurrencyVND } from '@/utils'
import { Loading } from '@/components/Loading'
import type { RevenueByBranchYearlyRow } from '@/features/accounting/reports/services/report-service'

const MONTH_HEADERS = Array.from({ length: 12 }, (_, i) => `T${i + 1}`)

type RevenueByBranchYearlyTableProps = {
  rows: RevenueByBranchYearlyRow[]
  isLoading: boolean
}

export default function RevenueByBranchYearlyTable({
  rows,
  isLoading,
}: RevenueByBranchYearlyTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
        <p className="text-content-dark-3">Không có dữ liệu</p>
      </div>
    )
  }

  return (
    <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
      <RadixTable.Root className="w-full border-collapse text-sm" size="1">
        <RadixTable.Header className="bg-neutral-20 border-border-1 border-b">
          <RadixTable.Row>
            <RadixTable.ColumnHeaderCell className="border-border-1 typo-body-base-semibold text-content-dark-2 sticky left-0 min-w-[220px] border-r px-3 py-[10px] !shadow-none">
              Diễn giải
            </RadixTable.ColumnHeaderCell>
            {MONTH_HEADERS.map((m) => (
              <RadixTable.ColumnHeaderCell
                key={m}
                align="right"
                className="border-border-1 typo-body-base-semibold text-content-dark-2 border-r px-3 py-[10px] !shadow-none"
              >
                {m}
              </RadixTable.ColumnHeaderCell>
            ))}
            <RadixTable.ColumnHeaderCell
              align="right"
              className="typo-body-base-semibold text-content-dark-2 px-3 py-[10px] !shadow-none"
            >
              Tổng năm
            </RadixTable.ColumnHeaderCell>
          </RadixTable.Row>
        </RadixTable.Header>
        <RadixTable.Body>
          {rows.map((row, rowIdx) => {
            const isTotal = row.bucket === 'total'
            return (
              <RadixTable.Row
                key={`${row.metric}-${row.bucket}`}
                className={cn(
                  'border-border-1 border-b transition-colors last:border-b-0',
                  isTotal ? 'bg-background-2' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                )}
              >
                <RadixTable.Cell
                  className={cn(
                    'border-border-1 sticky left-0 border-r px-3 py-[10px] text-left',
                    isTotal ? 'text-content-dark-1 font-semibold' : 'text-content-dark-1'
                  )}
                >
                  {row.label}
                </RadixTable.Cell>
                {row.monthly.map((value, monthIdx) => (
                  <RadixTable.Cell
                    key={monthIdx}
                    align="right"
                    className={cn(
                      'border-border-1 border-r px-3 py-[10px]',
                      isTotal ? 'text-content-dark-1 font-semibold' : 'text-content-dark-1'
                    )}
                  >
                    {formatCurrencyVND(Number(value || 0))}
                  </RadixTable.Cell>
                ))}
                <RadixTable.Cell
                  align="right"
                  className={cn(
                    'px-3 py-[10px]',
                    isTotal ? 'text-content-dark-1 font-semibold' : 'text-content-dark-1'
                  )}
                >
                  {formatCurrencyVND(Number(row.total_year || 0))}
                </RadixTable.Cell>
              </RadixTable.Row>
            )
          })}
        </RadixTable.Body>
      </RadixTable.Root>
    </div>
  )
}
