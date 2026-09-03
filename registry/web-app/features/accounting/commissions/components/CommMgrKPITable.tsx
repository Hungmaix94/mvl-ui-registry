import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Chip } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import type { EmployeeKpiAssignment } from '@/features/accounting/kpi-assignments/services/kpi-assignment-service'
import type { TableAction } from '@/types/table'
import { ColoredValueVariant } from '@/api/schema'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { KpiAssignmentStatus } from '@/constants/api-schema-aliases'

type Props = {
  data: EmployeeKpiAssignment[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

export const CommMgrKPITable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 25,
  currentPageIndex = 0,
  onPaginationChange,
}: Props) => {
  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<EmployeeKpiAssignment>[]>(
    () => [
      {
        id: 'employee_info',
        header: 'Mã NV / Họ tên',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold">Nhân viên {row.original.employee}</span>
            <code className="bg-transparent p-0 text-[11px] text-gray-400">
              {row.original.employee}
            </code>
          </div>
        ),
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'level_dept',
        header: 'Cấp · Phòng',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Chip
              label={
                row.original.role === 'TPKD'
                  ? 'Trưởng phòng'
                  : row.original.role === 'GDDA'
                    ? 'GĐ Dự án'
                    : row.original.role
              }
              variant={ColoredValueVariant.GREY}
            />
          </div>
        ),
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'target_revenue',
        header: 'Target DT',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.target_amount || 0)),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'actual_revenue',
        header: 'Thực đạt',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.actual_amount || 0)),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'completion_pct',
        header: 'Hoàn thành',
        cell: ({ row }) => {
          const pct = Number(row.original.completion_pct || 0)
          const color =
            pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : 'text-red-600'
          return <span className={`font-semibold ${color}`}>{formatPercent(pct)}</span>
        },
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'tier_label',
        header: 'Tier / Tỷ lệ',
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            <span className="text-[11px] text-gray-500">
              Tier {row.original.applied_tier || '—'}
            </span>
            <span className="font-medium text-blue-600">— %</span>
          </div>
        ),
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'kpi_commission',
        header: 'HH KPI',
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            {formatCurrencyVND(Number(row.original.commission_amount || 0))}
          </span>
        ),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'advance_deduct',
        header: 'Hoàn ứng',
        cell: () => '—',
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'tax_amount',
        header: 'Thuế',
        cell: () => '—',
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'net_payable',
        header: 'Phải chi',
        cell: ({ row }) => (
          <span className="font-bold text-green-700">
            {formatCurrencyVND(Number(row.original.commission_amount || 0))}
          </span>
        ),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const status = row.original.status
          const label =
            status === KpiAssignmentStatus.PENDING
              ? 'Đang chờ'
              : status === KpiAssignmentStatus.CONFIRMED
                ? 'Đã xác nhận'
                : status === KpiAssignmentStatus.PAID
                  ? 'Đã chi'
                  : status
          const variant =
            status === KpiAssignmentStatus.PAID
              ? ColoredValueVariant.GREEN
              : status === KpiAssignmentStatus.CONFIRMED
                ? ColoredValueVariant.BLUE
                : ColoredValueVariant.GREY
          return <Chip label={label || 'Không rõ'} variant={variant} />
        },
        meta: { width: 'w-[130px]' },
      },
    ],
    []
  )

  /**
   * ⚠️ Mục này hiện là HÀNH ĐỘNG RỖNG: thân `onClick` bị comment hết, bấm vào không xảy ra gì —
   * `APP_PATH.COMM_MGR_KPI_DETAIL` cũng không tồn tại trong `AppRoute.tsx`.
   *
   * CỐ Ý không gate bằng quyền (ClickUp 86eync7g0): nó chưa gọi tới đâu nên không có mã quyền
   * nào là đúng, và gắn bừa một mã chỉ làm lỗi khó thấy hơn — nút vẫn vô dụng, chỉ vô dụng với
   * ít người hơn. Cần xử lý riêng: hoặc nối màn chi tiết rồi gate theo `permission:` của route
   * mới, hoặc bỏ hẳn mục này. Đã báo trong phần bàn giao của task.
   */
  const actions: TableAction<EmployeeKpiAssignment>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (_record) => {
          // navigate(APP_PATH.COMM_MGR_KPI_DETAIL.replace(':id', String(record.id)))
        },
      },
    ],
    [navigate]
  )

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Có lỗi xảy ra khi tải dữ liệu: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  return (
    <Table
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
      showSTT
      enablePagination
      manualPagination
      showActions
      rowActions={actions}
      // onRowClick={(record) =>
      //  navigate(APP_PATH.COMM_MGR_KPI_DETAIL.replace(':id', String(record.id)))
      // }
    />
  )
}
