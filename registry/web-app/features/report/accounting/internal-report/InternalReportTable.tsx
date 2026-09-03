import * as TableComponents from '@radix-ui/themes'
import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'

type InternalReportTableProps = {
  data?: {
    receivable: string
    payable: string
    hold_balance: string
    advance_outstanding: string
    cash_flow_net: string
  } | null
  isLoading?: boolean
}

const InternalReportTable = ({ data, isLoading }: InternalReportTableProps) => {
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
      metric: 'Doanh thu gốc (Phải thu)',
      value: Number(data.receivable || 0),
      description: 'Tổng tiền công ty dự kiến thu về từ các giao dịch',
    },
    {
      metric: 'Chi phí hoa hồng (Phải trả)',
      value: Number(data.payable || 0),
      description: 'Tổng chi phí hoa hồng phải trả cho các bên thụ hưởng',
    },
    {
      metric: 'Số dư tạm giữ',
      value: Number(data.hold_balance || 0),
      description: 'Tổng số tiền hoa hồng đang bị tạm giữ',
    },
    {
      metric: 'Dư nợ tạm ứng',
      value: Number(data.advance_outstanding || 0),
      description: 'Tổng dư nợ tạm ứng chưa hoàn của nhân viên',
    },
    {
      metric: 'Dòng tiền ròng (Lợi nhuận gộp)',
      value: Number(data.cash_flow_net || 0),
      description: 'Doanh thu gốc trừ đi chi phí hoa hồng phải trả',
      highlight: true,
    },
  ]

  return (
    <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
      <TableComponents.Table.Root className="w-full border-collapse text-sm">
        <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
          <TableComponents.Table.Row>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-4 py-3 text-left !shadow-none">
              Chỉ tiêu báo cáo
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-4 py-3 text-left !shadow-none">
              Mô tả chỉ tiêu
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-4 py-3 text-right !shadow-none">
              Giá trị (VNĐ)
            </TableComponents.Table.ColumnHeaderCell>
          </TableComponents.Table.Row>
        </TableComponents.Table.Header>
        <TableComponents.Table.Body>
          {rows.map((row, idx) => (
            <TableComponents.Table.Row
              key={idx}
              className={cn(
                'border-border-1 border-b bg-white transition-colors',
                'last:border-b-0',
                'hover:bg-data-light-grey-hover',
                row.highlight
                  ? 'bg-neutral-10 font-semibold'
                  : idx % 2 === 0
                    ? 'bg-white'
                    : 'bg-neutral-5'
              )}
            >
              <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-4 py-3 text-left font-medium">
                {row.metric}
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell className="border-border-1 text-content-dark-3 border-r px-4 py-3 text-left text-xs">
                {row.description}
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell
                className={cn(
                  'border-border-1 px-4 py-3 text-right',
                  row.highlight ? 'font-bold text-blue-600' : 'text-content-dark-1'
                )}
              >
                {formatCurrencyVND(row.value)}
              </TableComponents.Table.Cell>
            </TableComponents.Table.Row>
          ))}
        </TableComponents.Table.Body>
      </TableComponents.Table.Root>
    </div>
  )
}

export default InternalReportTable
