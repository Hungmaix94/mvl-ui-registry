import { useMemo } from 'react'
import * as TableComponents from '@radix-ui/themes'

import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'

type CommissionReportTableProps = {
  data?: {
    total_paid?: string
    per_deal?: Array<{
      deal_id: number | null
      total: string
    }>
  }
  isLoading?: boolean
}

const CommissionReportTable = ({ data, isLoading }: CommissionReportTableProps) => {
  const tableData = useMemo(() => {
    return data?.per_deal || []
  }, [data])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
        <p className="text-content-dark-3">Không có dữ liệu</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {data?.total_paid && (
        <div className="border-border-1 max-w-sm rounded-sm border bg-white p-4">
          <div className="text-content-dark-3 text-xs font-medium tracking-wider uppercase">
            Tổng hoa hồng đã chi
          </div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {formatCurrencyVND(Number(data.total_paid))}
          </div>
        </div>
      )}

      <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
        <TableComponents.Table.Root className="w-full border-collapse text-sm">
          <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
                Mã giao dịch
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-3 py-[10px] text-right !shadow-none">
                Hoa hồng đã chi
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
          </TableComponents.Table.Header>

          <TableComponents.Table.Body>
            {tableData.map((row: any, rowIdx: number) => (
              <TableComponents.Table.Row
                key={rowIdx}
                className={cn(
                  'border-border-1 border-b transition-colors',
                  'last:border-b-0',
                  'hover:bg-data-light-grey-hover',
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                )}
              >
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                  {row.deal_id ?? '-'}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="text-content-dark-1 px-3 py-[10px] text-right font-semibold">
                  {formatCurrencyVND(Number(row.total || 0))}
                </TableComponents.Table.Cell>
              </TableComponents.Table.Row>
            ))}
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
      </div>
    </div>
  )
}

export default CommissionReportTable
