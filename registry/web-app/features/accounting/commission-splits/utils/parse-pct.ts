/**
 * Decimal-as-string của BE → số, KHÔNG bao giờ trả `NaN`.
 *
 * Chặn `!= null` là chưa đủ: chuỗi RỖNG lọt qua được mà `parseFloat('')` ra `NaN`. `NaN` lọt
 * vào state dial là hỏng cả màn — nó lan sang mọi phép tính tiền của Mục ④/⑤⑥, và nếu phép so
 * "dial đã ổn định" dùng `===` thì `isDialSyncing` kẹt vĩnh viễn, `BusyOverlay` phủ chết Mục
 * ③④⑤⑥ (xem `dialSettled` trong `useWorksheetDial`, nay đã dùng `eq` của lodash). Chặn ngay
 * tại cửa vẫn là tuyến phòng thủ đúng thay vì chỉ chữa ở phép so.
 *
 * `dialCaps` trong cùng feature đã chặn `v !== ''` từ trước — tức dữ liệu rỗng là có thật.
 *
 * Để ở `utils/` chứ KHÔNG để trong `useWorksheetDial`: đây là hàm thuần, mà file hook kéo
 * theo cả chuỗi service/store — test nào import nó sẽ nổ ở vòng khởi tạo `BaseApiService`.
 */
export const parsePct = <T extends number | null>(
  raw: string | null | undefined,
  fallback: T
): number | T => {
  if (raw == null || raw === '') return fallback
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}
