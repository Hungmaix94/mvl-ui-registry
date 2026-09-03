import { BookingRefundSaleSale_type as DepositContractSaleType } from '@/api/schema'

/** Shape tối thiểu để hiển thị một dòng nhân sự bán trên phiếu hỗ trợ phí. */
export type FeeSupportStaffDisplayLike = {
  sale_type?: DepositContractSaleType
  employee_detail?: {
    id?: number
    fullname?: string
    code?: string
    branch?: { name?: string } | null
    block?: { name?: string } | null
    department?: { name?: string } | null
  } | null
  collaborator_name?: string | null
  exchange_detail?: { name?: string; code?: string } | null
}

/**
 * Tên + phụ đề tổ chức của một dòng nhân sự bán (CR STT14 — danh sách hiển thị đủ 3 loại):
 * - `mv`: tên nhân viên + mã, phụ đề chi nhánh · khối · phòng ban.
 * - `collaborator`: `collaborator_name` (không có `employee_detail`), phụ đề "Cộng tác viên".
 * - `partner` (F2): tên sàn liên kết từ `exchange_detail`, phụ đề "Sàn liên kết (F2)" + mã sàn.
 */
export function describeFeeSupportStaff(staff: FeeSupportStaffDisplayLike): {
  name: string
  org: string
} {
  if (staff.sale_type === DepositContractSaleType.collaborator) {
    return { name: staff.collaborator_name || 'Cộng tác viên', org: 'Cộng tác viên' }
  }

  if (staff.sale_type === DepositContractSaleType.partner) {
    const exchange = staff.exchange_detail
    return {
      name: exchange?.name || 'Sàn liên kết',
      org: ['Sàn liên kết (F2)', exchange?.code].filter(Boolean).join(' · '),
    }
  }

  const employee = staff.employee_detail
  const org = [employee?.branch?.name, employee?.block?.name, employee?.department?.name]
    .filter(Boolean)
    .join(' · ')
  return {
    name: `${employee?.fullname || 'Nhân viên'}${employee?.code ? ` (${employee.code})` : ''}`,
    org: org || '—',
  }
}
