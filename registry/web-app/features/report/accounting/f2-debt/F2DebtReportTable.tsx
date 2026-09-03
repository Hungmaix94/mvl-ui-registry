import { useMemo } from 'react'
import * as TableComponents from '@radix-ui/themes'

import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'
import type { F2DebtResponse } from '@/features/accounting/reports/services/report-service'

type F2DebtReportTableProps = {
  data?: F2DebtResponse
  isLoading?: boolean
}

const F2DebtReportTable = ({ data, isLoading }: F2DebtReportTableProps) => {
  const tableData = useMemo(() => {
    return data?.results || []
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
              Mã Sàn F2
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Tổng kỳ vọng
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Đã thanh toán
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-3 py-[10px] text-right !shadow-none">
              Còn lại
            </TableComponents.Table.ColumnHeaderCell>
          </TableComponents.Table.Row>
        </TableComponents.Table.Header>
        <TableComponents.Table.Body>
          {tableData.map((row, rowIdx) => (
            <TableComponents.Table.Row
              key={row.payee_exchange_id || rowIdx}
              className={cn(
                'border-border-1 border-b bg-white transition-colors',
                'last:border-b-0',
                'hover:bg-data-light-grey-hover',
                rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
              )}
            >
              <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                {row.payee_exchange_id}
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right font-semibold">
                {formatCurrencyVND(Number(row.total_expected || 0))}
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right text-green-600">
                {formatCurrencyVND(Number(row.total_paid || 0))}
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 px-3 py-[10px] text-right text-red-600">
                {formatCurrencyVND(Number(row.outstanding || 0))}
              </TableComponents.Table.Cell>
            </TableComponents.Table.Row>
          ))}
        </TableComponents.Table.Body>
      </TableComponents.Table.Root>
    </div>
  )
}

export default F2DebtReportTable
