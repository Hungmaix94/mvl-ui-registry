/**
 * Ràng buộc dùng chung cho ô "Số tài khoản" của **khách hàng**.
 *
 * Vì sao phải gom về một chỗ (ClickUp 86eyqjbtb, QA trả task 25/08/2026): hộp thoại Hoàn tiền
 * của HĐ cọc chỉ chặn ô trống (`min(1)`) rồi thả mọi chuỗi khác đi qua. Bên BE
 * `DepositRefundSerializer.refund_payee_account_number` khai `CharField(required=True)` trần —
 * không `max_length`, không khuôn dạng — nên gõ rác vào ô vẫn nhận **200**, đúng như QA mô tả.
 *
 * **Số tài khoản ngân hàng Việt Nam là CHỮ SỐ.** Chữ cái, dấu cách, dấu gạch đều là lỗi nhập.
 * Luật này đến từ nghiệp vụ, **không** suy ra từ dữ liệu đang lưu: DB dev có lẫn test/dummy data
 * nên "trong DB có bản ghi chứa chữ cái" chỉ nói lên chuyện seed, không nói ngân hàng cấp số kiểu gì.
 *
 * `BANK_ACCOUNT_NUMBER_MAX_LENGTH` thì bám theo DB: các cột `*_account_number` bên BE đều là
 * `CharField(max_length=50)`. Chuỗi dài hơn 50 không dừng ở "dữ liệu xấu" mà thành lỗi 500 ở
 * tầng DB — đã dựng lại được trên Postgres 17: `value too long for type character varying(50)`.
 *
 * **KHÔNG tự sửa dữ liệu người dùng** (bỏ dấu cách, bỏ dấu nháy, viết hoa): chốt với user
 * 25/08/2026 — chỉ chặn và báo, không biến đổi ngầm. Hệ quả cần biết: số tài khoản chép từ mặt
 * thẻ theo kiểu `0123 4567 89`, hoặc dán từ Excel còn dính dấu `'` đầu chuỗi, sẽ bị từ chối.
 *
 * ⚠️ Luật này dành cho TK **khách hàng**. Danh mục tài khoản ngân hàng của công ty
 * ([`bank-account-types.ts`](../features/accounting/bank-accounts/types/bank-account-types.ts))
 * cố ý dùng luật rộng hơn — xem ghi chú ở đó.
 */
export const BANK_ACCOUNT_NUMBER_MAX_LENGTH = 50

/** Không gắn cờ `g` — regex có `g` mang trạng thái `lastIndex`, gọi lần hai trả kết quả khác. */
export const BANK_ACCOUNT_NUMBER_PATTERN = /^[0-9]+$/

export const BANK_ACCOUNT_NUMBER_FORMAT_MESSAGE = 'Số tài khoản chỉ được chứa chữ số'

export const BANK_ACCOUNT_NUMBER_MAX_MESSAGE = `Số tài khoản không vượt quá ${BANK_ACCOUNT_NUMBER_MAX_LENGTH} ký tự`

/**
 * Chuỗi RỖNG trả `false`, nhưng đừng dùng hàm này để báo "chưa nhập" — luật `required` của
 * từng form nói câu khác nhau ("số tài khoản nhận" / "số tài khoản nguồn") và phải chạy trước,
 * nếu không người dùng bỏ trống ô lại nhận thông báo về khuôn dạng.
 */
export function isValidBankAccountNumber(value: string): boolean {
  return value.length <= BANK_ACCOUNT_NUMBER_MAX_LENGTH && BANK_ACCOUNT_NUMBER_PATTERN.test(value)
}
