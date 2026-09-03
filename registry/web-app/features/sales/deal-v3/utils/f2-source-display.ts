/**
 * Nguồn F2 của một dòng bán — ai mang sàn liên kết về cho CHÍNH giao dịch này.
 *
 * Bug 86eya66m0: cột "Phòng ban / Nguồn" của Mục 05 chỉ hiện `department`, mà mọi dòng F2
 * đều neo vào cùng một phòng "Sàn Liên Kết & Cộng Tác Viên" — nên giao dịch do Giám đốc
 * kinh doanh mang về vẫn đọc ra tên phòng dùng chung. Nguồn thật nằm theo TỪNG dòng bán
 * (`DepositContractSale.f2_source`), BE trả kèm ở `rows[*].f2_source` +
 * `rows[*].f2_source_director_detail` — cùng tên khoá với màn HĐ đặt cọc.
 *
 * Hai chỗ hiển thị dùng chung file này: bảng Mục 05 của màn chi tiết giao dịch
 * (`DealCommissionTab`) và khối mượn lại bên Chia HH sale (`DealSplitSection`).
 */

/**
 * Nhãn dự phòng khi chưa tải được `F2SourceType` từ app-constant.
 * Chép đúng chữ server đang trả (`/api/constants/?modules=realestate`) để lúc constant chưa về
 * không nháy sang một cách gọi khác — nhãn đã tự mang chữ "Nguồn", đừng thêm tiền tố lần nữa.
 */
export const F2_SOURCE_FALLBACK_LABELS: Record<string, string> = {
  linked: 'Nguồn sàn liên kết',
  company: 'Nguồn công ty',
  director: 'Nguồn giám đốc kinh doanh',
}

/** Dòng cũ chưa từng chọn nguồn đọc là `linked` — cùng quy ước với BE (`F2Reconciliation.f2_source`). */
export const DEFAULT_F2_SOURCE = 'linked'

export type F2SourceLike = {
  f2_source?: string | null
  f2_source_director_detail?: { fullname?: string | null; code?: string | null } | null
} | null

/**
 * Chuỗi hiển thị nguồn F2, hoặc `null` khi dòng không phải F2.
 *
 * @param row dòng của bảng Mục 05 (`commission-shares/split`)
 * @param isF2 dòng này có phải dòng sàn F2 không — sale MV / CTV / F1 ôm giỏ thì không có nguồn
 * @param labels nhãn từ app-constant `F2SourceType`; thiếu thì rơi về nhãn tĩnh
 */
export function getF2SourceDisplay(
  row: F2SourceLike,
  isF2: boolean,
  labels?: Record<string, string>
): string | null {
  if (!isF2 || !row) return null

  const source = row.f2_source || DEFAULT_F2_SOURCE
  const label = labels?.[source] ?? F2_SOURCE_FALLBACK_LABELS[source] ?? source

  // Chỉ nguồn "Giám đốc kinh doanh" mới đích danh một người; hai nguồn kia là tổ chức.
  if (source !== 'director') return label

  const director = row.f2_source_director_detail
  const name = director?.fullname || director?.code
  return name ? `${label} — ${name}` : label
}
