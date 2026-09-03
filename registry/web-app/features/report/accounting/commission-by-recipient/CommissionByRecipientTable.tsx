import { useMemo } from 'react'
import * as TableComponents from '@radix-ui/themes'
import { Badge } from '@radix-ui/themes'

import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'
import type { BeneficiaryCommissionAllocationResponse } from '@/features/accounting/reports/services/report-service'

type CommissionByRecipientTableProps = {
  data?: BeneficiaryCommissionAllocationResponse
  isLoading?: boolean
}

const CommissionByRecipientTable = ({ data, isLoading }: CommissionByRecipientTableProps) => {
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
              ID Người nhận
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
              Loại người nhận
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-center !shadow-none">
              Kỳ báo cáo
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Tổng trước thuế
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Thuế TNCN
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Thực nhận
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
              Hoàn ứng
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
              STK Ngân hàng
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
              Ngân hàng
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
              Chủ tài khoản
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-3 py-[10px] text-center !shadow-none">
              Trạng thái
            </TableComponents.Table.ColumnHeaderCell>
          </TableComponents.Table.Row>
        </TableComponents.Table.Header>
        <TableComponents.Table.Body>
          {tableData.map((row, rowIdx) => {
            const recipientId =
              row.beneficiary_employee_id ||
              row.beneficiary_collaborator_id ||
              row.beneficiary_exchange_id ||
              '-'

            return (
              <TableComponents.Table.Row
                key={row.id || rowIdx}
                className={cn(
                  'border-border-1 border-b transition-colors',
                  'last:border-b-0',
                  'hover:bg-data-light-grey-hover',
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                )}
              >
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                  {recipientId}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                  {row.beneficiary_type}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-center">
                  {row.month && row.year ? `${row.month}/${row.year}` : '-'}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right font-semibold">
                  {formatCurrencyVND(Number(row.pre_tax_total || 0))}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right text-red-600">
                  {formatCurrencyVND(Number(row.pit_amount || 0))}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right text-green-600">
                  {formatCurrencyVND(Number(row.net_payable || 0))}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right text-blue-600">
                  {formatCurrencyVND(Number(row.recovered_advance_amount || 0))}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left font-mono">
                  {(row as any).bank_account_number || (row as any).account_number || '-'}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                  {(row as any).bank_name || '-'}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                  {(row as any).bank_account_holder || (row as any).account_holder || '-'}
                </TableComponents.Table.Cell>
                <TableComponents.Table.Cell className="border-border-1 px-3 py-[10px] text-center">
                  <Badge variant="outline" color={row.status === 'APPROVED' ? 'green' : 'gray'}>
                    {row.status}
                  </Badge>
                </TableComponents.Table.Cell>
              </TableComponents.Table.Row>
            )
          })}
        </TableComponents.Table.Body>
      </TableComponents.Table.Root>
    </div>
  )
}

export default CommissionByRecipientTable
