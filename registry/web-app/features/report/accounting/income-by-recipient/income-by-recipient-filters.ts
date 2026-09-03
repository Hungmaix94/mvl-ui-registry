import { parsePositiveInt } from '@/utils/common'

/** Patch value: `null`/`undefined`/`''` xoá URL param, còn lại thì set. */
export type ReportFilterPatch = Record<string, string | number | null | undefined>

/**
 * Áp một patch nhiều key lên URL params của báo cáo 21.10 và luôn quay về trang 1.
 * Cần patch nhiều key một lượt vì bộ lọc đơn vị đi theo cascade Chi nhánh → Khối →
 * Phòng ban: đổi cấp cha thì các cấp con được gửi về cùng lúc (giá trị rỗng), nếu
 * set từng key một sẽ có nhịp URL trung gian giữ cặp lệch nhau (vd chi nhánh A +
 * phòng ban của chi nhánh B) và báo cáo query một lần vô ích.
 */
export function buildFilterSearchParams(
  current: URLSearchParams,
  changes: ReportFilterPatch
): URLSearchParams {
  const next = new URLSearchParams(current)

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
  }

  next.set('page', '1')
  return next
}

/** Ba cấp đơn vị nằm trong dialog bộ lọc — mỗi cấp là một ô, nên cũng là một tiêu chí. */
export type OrgFilterValues = {
  branch: number | null
  block: number | null
  department: number | null
}

/**
 * Đọc ba cấp đơn vị từ URL, bỏ mọi giá trị không phải id dương.
 *
 * URL gõ tay (`?branch=abc`) mà thả thẳng qua `Number()` sẽ thành `NaN`, đi vào query string là
 * `branch=NaN` và BE trả 400 — cả trang trắng chứ không chỉ hỏng một bộ lọc. Chặn ngay ở đây để
 * API params, giá trị seed lại vào dialog và badge đếm cùng đọc MỘT nguồn đã được làm sạch.
 */
export function parseOrgFilters(params: URLSearchParams): OrgFilterValues {
  return {
    branch: parsePositiveInt(params.get('branch')) ?? null,
    block: parsePositiveInt(params.get('block')) ?? null,
    department: parsePositiveInt(params.get('department')) ?? null,
  }
}

/**
 * Số tiêu chí đang bật, để hiện badge cạnh nút "Bộ lọc".
 *
 * Đếm theo Ô TRONG DIALOG, không theo số query param của trang: `year`/`month` (chọn ở chip Kỳ
 * trên toolbar) và `q` (ô tìm người nhận, cũng ngoài dialog) không được tính — badge phải khớp
 * đúng những gì người dùng thấy khi mở dialog ra, nếu không họ mở ra và đếm không đủ.
 */
export function countActiveOrgFilters(params: URLSearchParams): number {
  const org = parseOrgFilters(params)
  return [org.branch, org.block, org.department].filter((value) => value !== null).length
}
