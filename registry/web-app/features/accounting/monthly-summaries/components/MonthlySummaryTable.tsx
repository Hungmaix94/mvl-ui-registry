import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import TableError from '@/components/ui/table/TableError'
import { PAGE_SIZE } from '@/constants/table'
import { formatCurrencyVND } from '@/utils/common'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

type Props = {
  data: any[] // We assume the backend API returns Deals for this view now
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onRowClick?: (row: any) => void
}

const MonthlySummaryTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onRowClick,
}: Props) => {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_BENEFICIARY_TYPE_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES,
    ],
  })

  const beneficiaryTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_BENEFICIARY_TYPE_CHOICES
  ) as Record<string, string> | null

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES
  ) as Record<string, string> | null

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: 'beneficiary',
        header: 'Người thụ hưởng',
        cell: ({ row }) => {
          const r = row.original
          if (r.beneficiary_type === 'EMPLOYEE')
            return (
              r.beneficiary_employee_name ||
              r.beneficiary_employee_detail?.fullname ||
              `Nhân viên #${r.beneficiary_employee || ''}`
            )
          if (r.beneficiary_type === 'COLLABORATOR')
            return (
              r.beneficiary_collaborator_name ||
              r.beneficiary_collaborator_detail?.fullname ||
              `CTV #${r.beneficiary_collaborator || ''}`
            )
          if (r.beneficiary_type === 'EXCHANGE')
            return (
              r.beneficiary_exchange_name ||
              r.beneficiary_exchange_detail?.name ||
              `Sàn GD #${r.beneficiary_exchange || ''}`
            )
          if (r.deal_code === 'TỔNG CỘNG')
            return <span className="text-brand-primary-default font-semibold">TỔNG CỘNG</span>
          return '-'
        },
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        id: 'beneficiary_type',
        header: 'Đối tượng',
        cell: ({ row }) => {
          if (row.original._isPinned) return null
          const type = row.original.beneficiary_type
          return (type && beneficiaryTypeLabels?.[type]) || type || '-'
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        id: 'sale_total',
        header: 'Bán hàng',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.sale_total || 0)),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        id: 'mgmt_total',
        header: 'Quản lý',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.mgmt_total || 0)),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        id: 'f2_total',
        header: 'F2',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.f2_total || 0)),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        id: 'slk_total',
        header: 'Sàn liên kết',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.slk_total || 0)),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        id: 'pre_tax_total',
        header: 'Tổng trước thuế',
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800">
            {formatCurrencyVND(Number(row.original.pre_tax_total || 0))}
          </span>
        ),
        meta: { width: 'w-[140px]', sortable: false, align: 'right' },
      },
      {
        id: 'pit_amount',
        header: 'Thuế TNCN',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.pit_amount || 0)),
        meta: { width: 'w-[120px]', sortable: false, align: 'right' },
      },
      {
        id: 'hold_amount',
        header: 'Giữ lại',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.hold_amount || 0)),
        meta: { width: 'w-[120px]', sortable: false, align: 'right' },
      },
      {
        id: 'recovered_advance_amount',
        header: 'Trừ tạm ứng',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.recovered_advance_amount || 0)),
        meta: { width: 'w-[120px]', sortable: false, align: 'right' },
      },
      {
        id: 'net_payable',
        header: 'Thực nhận',
        cell: ({ row }) => (
          <span className="text-brand-primary-default font-bold">
            {formatCurrencyVND(Number(row.original.net_payable || 0))}
          </span>
        ),
        meta: { width: 'w-[140px]', sortable: false, align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          if (row.original._isPinned) return null
          const status = row.original.status

          let variant = ColoredValueVariant.GREY
          let label = statusLabels?.[status] ?? status

          if (status === 'PAID') {
            variant = ColoredValueVariant.GREEN
            if (label === 'Paid') label = 'Đã thanh toán'
          } else if (status === 'CONFIRMED') {
            variant = ColoredValueVariant.BLUE
            if (label === 'CONFIRMED') label = 'Đã xác nhận'
          } else if (status === 'DRAFT') {
            variant = ColoredValueVariant.GREY
            if (label === 'DRAFT' || label === 'Bản nháp') label = 'Nháp'
          }

          return <Chip label={label} variant={variant} />
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
    ],
    [beneficiaryTypeLabels, statusLabels]
  )

  /**
   * Dòng "TỔNG CỘNG" phải được gộp NGAY trong useMemo này.
   *
   * Trước đây nó là một object literal dựng ngoài useMemo, nên mỗi lần render lại là một
   * object mới ⇒ `tableData` cũng là mảng mới ⇒ `data` truyền vào TanStack Table đổi tham
   * chiếu ở MỌI lần render. Mà `autoResetPageIndex` của TanStack mặc định bật khi
   * `manualPagination` tắt: hễ `data` đổi tham chiếu là nó gọi `onPaginationChange`, hàm
   * này đẩy ngược lên trang cha ⇒ `setSearchParams` ⇒ render lại ⇒ mảng mới ⇒ lặp vô hạn.
   * Đo được 207 lần ghi URL trong 12 giây, trình duyệt đứng hình. Kỳ không có dữ liệu thì
   * không có dòng tổng nên không lặp — vì thế bug chỉ lộ ra khi chọn kỳ CÓ dữ liệu.
   */
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return data || []

    const sum = (key: string) => data.reduce((acc, row) => acc + Number(row[key] || 0), 0)

    return [
      ...data,
      {
        deal_code: 'TỔNG CỘNG', // Used by the cell renderer to identify the pinned row
        sale_total: sum('sale_total'),
        mgmt_total: sum('mgmt_total'),
        f2_total: sum('f2_total'),
        slk_total: sum('slk_total'),
        pre_tax_total: sum('pre_tax_total'),
        pit_amount: sum('pit_amount'),
        hold_amount: sum('hold_amount'),
        recovered_advance_amount: sum('recovered_advance_amount'),
        net_payable: sum('net_payable'),
        _isPinned: true,
      },
    ]
  }, [data])

  // Phải đặt SAU toàn bộ hook: return sớm ở trên chúng làm số hook giữa các lần render lệch
  // nhau, React ném "Rendered fewer hooks than expected" ngay khi query lỗi.
  if (error) {
    return <TableError />
  }

  return (
    <Table
      className="p-0"
      tableContainerClassName="rounded-lg shadow-sm"
      data={tableData}
      columns={columns}
      isLoading={isLoading}
      // Phân trang do server làm (trang cha fetch theo page/page_size). Thiếu cờ này thì
      // TanStack vừa cắt trang lại ở client vừa bật autoResetPageIndex — nguồn của vòng lặp.
      manualPagination
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      onRowClick={onRowClick}
    />
  )
}

export default MonthlySummaryTable
