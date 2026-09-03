import { formatCurrencyVND } from '@/utils/common'
import type { DepartmentCommissionPool } from '../services/department-commission-pools-service'

/**
 * Nhãn cho dropdown chọn pool khi nhập chia hoa hồng.
 *
 * ⚠️ Tiền: tên phòng ban **KHÔNG unique** — `Department.unique_together = [["code","block"]]`,
 * nên hai phòng cùng tên ở khác khối/chi nhánh là hợp lệ. Từ CR 86eyj407z, `department_name`
 * của API không còn kèm mã phòng, nên nếu nhãn chỉ ghi mỗi tên thì hai phòng đó hiện y hệt
 * nhau và kế toán có thể import file chia hoa hồng vào **pool sai phòng** — tiền của phòng này
 * ghi nhận cho nhân viên phòng kia. Khối/chi nhánh là thứ phân biệt chúng, đừng rút gọn đi.
 */
export function buildDeptPoolOptionLabel(
  pool: Pick<
    DepartmentCommissionPool,
    'department_name' | 'block_name' | 'branch_name' | 'total_amount'
  >
): string {
  const org = [pool.block_name, pool.branch_name].filter(Boolean).join(' · ')
  const amount = formatCurrencyVND(Number(pool.total_amount || 0))
  return org
    ? `${pool.department_name} — ${org} (${amount})`
    : `${pool.department_name} (${amount})`
}
