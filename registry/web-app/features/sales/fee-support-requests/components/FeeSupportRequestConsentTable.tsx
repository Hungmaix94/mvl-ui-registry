import { useMemo } from 'react'

import { ColoredValueVariant } from '@/api/schema'
import { Chip, Table, type ColumnDef } from '@/components/ui'
import { formatDate } from '@/utils/date-utils'

import type { FeeSupportRequestLine } from '../services/fee-support-request-service'

/** Shape tối thiểu của sales_staff trên HĐ cọc dùng để resolve tên (line.dc_sale = staff.id). */
export type DepositContractStaffLike = {
  id: number
  employee_detail?: { fullname?: string | null; code?: string | null } | null
  collaborator_name?: string | null
}

type Props = {
  lines: FeeSupportRequestLine[]
  /** sales_staff từ HĐ cọc của deal — nguồn tên thật; thiếu thì hiển thị mã dòng. */
  salesStaff?: DepositContractStaffLike[]
  isLoadingStaff?: boolean
}

/**
 * Bảng đồng thuận co-seller (D3) — chỉ có ý nghĩa với phiếu origin=mobile_sale.
 * BE GAP: line không kèm thông tin nhân sự dạng object nên tên resolve qua
 * deposit-contract sales_staff; không khớp được → hiển thị mã tham chiếu.
 */
export function FeeSupportRequestConsentTable({ lines, salesStaff, isLoadingStaff }: Props) {
  const columns: ColumnDef<FeeSupportRequestLine>[] = useMemo(
    () => [
      {
        id: 'salesperson',
        header: 'Nhân sự tham gia',
        cell: ({ row }) => {
          const staff = salesStaff?.find((s) => s.id === row.original.dc_sale)
          const name = staff?.employee_detail?.fullname || staff?.collaborator_name
          if (name) {
            const code = staff?.employee_detail?.code ? ` (${staff.employee_detail.code})` : ''
            return `${name}${code}`
          }
          if (isLoadingStaff) return '…'
          return `NS giao dịch #${row.original.dc_sale}`
        },
      },
      {
        id: 'consented',
        header: 'Trạng thái đồng thuận',
        cell: ({ row }) => (
          <Chip
            label={row.original.is_confirmed ? 'Đã đồng ý' : 'Chờ đồng thuận'}
            variant={
              row.original.is_confirmed ? ColoredValueVariant.GREEN : ColoredValueVariant.ORANGE
            }
            size="small"
          />
        ),
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'consented_at',
        header: 'Thời điểm đồng ý',
        cell: ({ row }) =>
          row.original.confirmed_at ? formatDate(row.original.confirmed_at) : '—',
        meta: { width: 'w-[180px]' },
      },
    ],
    [salesStaff, isLoadingStaff]
  )

  return (
    <Table
      columns={columns}
      data={lines}
      isLoading={false}
      enablePagination={false}
      showActions={false}
      manualPagination={false}
      emptyMessage="Chưa có nhân sự nào trên phiếu"
      // Bảng nằm TRONG section chi tiết: bỏ padding cấp-trang mặc định
      // (`px-7 pb-16`) và bo góc đúng container của Table — page không cần bọc
      // thêm một lớp viền nữa, nếu không sẽ ra 2 khung lồng nhau.
      className="px-0 pb-0"
      tableContainerClassName="rounded-xl"
    />
  )
}

export default FeeSupportRequestConsentTable
