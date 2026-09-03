import { InputInvoiceCounterpartyType } from '../types/input-invoice-types'

/**
 * Mã phiếu đối chiếu được LƯU lên hóa đơn đầu vào — chỉ phiếu F2, không phiếu nào khác.
 *
 * Form dùng CHUNG một ô "Phiếu đối chiếu" cho cả ba loại đối tượng, và nạp lựa chọn từ ba
 * endpoint khác nhau (F2 / CTV / Chủ đầu tư). Nhưng hóa đơn đầu vào chỉ có đúng một khóa
 * ngoại phiếu đối chiếu là `f2_reconciliation_sheet`, trỏ sang `sales.F2ReconciliationSheet`
 * (SRS 20.7 §4.2.4 — phiếu đối chiếu CĐT thuộc về hóa đơn BÁN RA ở 20.6, không phải màn này).
 *
 * Gửi thẳng lựa chọn vào khóa đó nên hỏng theo hai kiểu, tùy id có trùng hay không:
 *
 * - id không tồn tại bên F2 ⇒ **400**, đúng lỗi QA báo (ClickUp 86eyr4wt3, phiếu `DAVTT-IRS1545`).
 * - id tình cờ trùng một phiếu F2 ⇒ **liên kết nhầm, im lặng** — hóa đơn gắn vào một phiếu F2
 *   không liên quan, và vì khóa ngoại là `PROTECT` nên còn khóa luôn việc xóa phiếu đó.
 *
 * Đo trên dev 27/08: 1336 phiếu CĐT đã xác nhận, **72** trong số đó trùng id với một phiếu F2
 * ⇒ nhánh im lặng không hiếm, chỉ là chưa ai bấm trúng (0/215 hóa đơn đang sai).
 *
 * Với đối tượng khác EXCHANGE, ô phiếu đối chiếu vẫn giữ nguyên vai trò **điền sẵn** dòng và
 * tổng tiền; chỉ là lựa chọn đó không phải dữ liệu của hóa đơn nên không được lưu.
 *
 * Dùng ở cả hai chiều — dựng payload lúc gửi, và nạp lại form ở màn Sửa — nên một hóa đơn cũ
 * lỡ mang id sai cũng không hiện ngược lên ô "Phiếu đối chiếu Chủ đầu tư".
 */
export function reconciliationSheetToPersist(
  counterpartyType: InputInvoiceCounterpartyType | null | undefined,
  selectedSheetId: number | null | undefined
): number | null {
  if (counterpartyType !== InputInvoiceCounterpartyType.EXCHANGE) return null
  return selectedSheetId ?? null
}
