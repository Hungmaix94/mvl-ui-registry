import * as TableComponents from '@radix-ui/themes'
import { Loading } from '@/components/Loading'
import { formatCurrencyVND } from '@/utils/common'

type DebtReportTableProps = {
  data?: {
    receivable?: string
    payable?: string
    hold_balance?: string
    advance_outstanding?: string
    cash_flow_net?: string
  }
  isLoading?: boolean
}

const DebtReportTable = ({ data, isLoading }: DebtReportTableProps) => {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
        <p className="text-content-dark-3">Không có dữ liệu</p>
      </div>
    )
  }

  const rows = [
    {
      label: 'Phải thu',
      value: Number(data.receivable || 0),
      colorClass: 'text-content-dark-1 font-semibold',
    },
    { label: 'Phải trả', value: Number(data.payable || 0), colorClass: 'text-content-dark-1' },
    { label: 'Tạm giữ', value: Number(data.hold_balance || 0), colorClass: 'text-blue-600' },
    {
      label: 'Tạm ứng chưa hoàn',
      value: Number(data.advance_outstanding || 0),
      colorClass: 'text-red-600',
    },
    {
      label: 'Dòng tiền thuần',
      value: Number(data.cash_flow_net || 0),
      colorClass: 'text-green-600 font-semibold',
    },
  ]

  return (
    <div className="border-border-1 bg-content-light-1 max-w-2xl overflow-x-auto border">
      <TableComponents.Table.Root className="w-full border-collapse text-sm">
        <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
          <TableComponents.Table.Row>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
              Chỉ tiêu công nợ
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-3 py-[10px] text-right !shadow-none">
              Giá trị
            </TableComponents.Table.ColumnHeaderCell>
          </TableComponents.Table.Row>
        </TableComponents.Table.Header>
        <TableComponents.Table.Body>
          {rows.map((row, rowIdx) => (
            <TableComponents.Table.Row
              key={rowIdx}
              className="border-border-1 hover:bg-data-light-grey-hover border-b bg-white transition-colors last:border-b-0"
            >
              <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left font-medium">
                {row.label}
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell className={`px-3 py-[10px] text-right ${row.colorClass}`}>
                {formatCurrencyVND(row.value)}
              </TableComponents.Table.Cell>
            </TableComponents.Table.Row>
          ))}
        </TableComponents.Table.Body>
      </TableComponents.Table.Root>
    </div>
  )
}

export default DebtReportTable
