import { useMemo } from 'react'
import * as TableComponents from '@radix-ui/themes'

import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'

type InvestorDebtReportTableProps = {
  data?: {
    by_invoice?: Array<{
      id: number
      code: string
      investor_id: number | null
      total_amount: string
      paid_amount: string
    }>
  }
  isLoading?: boolean
}

const InvestorDebtReportTable = ({ data, isLoading }: InvestorDebtReportTableProps) => {
  const tableData = useMemo(() => {
    return data?.by_invoice || []
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
    <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
      <TableComponents.Table.Root className="w-full border-collapse text-sm">
        <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
          <TableComponents.Table.Row>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
              Mã CĐT
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
              Số hóa đơn
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Tổng giá trị
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Đã thu
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-3 py-[10px] text-right !shadow-none">
              Còn lại
            </TableComponents.Table.ColumnHeaderCell>
          </TableComponents.Table.Row>
        </TableComponents.Table.Header>

        <TableComponents.Table.Body>
          {tableData.map((row: any, rowIdx: number) => {
            const total = Number(row.total_amount || 0)
            const paid = Number(row.paid_amount || 0)
            const remaining = total - paid

            return (
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
                  {row.investor_id ?? '-'}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                  {row.code}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right font-semibold">
                  {formatCurrencyVND(total)}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right text-green-600">
                  {formatCurrencyVND(paid)}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="text-content-dark-1 px-3 py-[10px] text-right text-red-600">
                  {formatCurrencyVND(remaining)}
                </TableComponents.Table.Cell>
              </TableComponents.Table.Row>
            )
          })}
        </TableComponents.Table.Body>
      </TableComponents.Table.Root>
    </div>
  )
}

export default InvestorDebtReportTable
