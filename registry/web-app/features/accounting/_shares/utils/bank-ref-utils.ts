/**
 * Chuẩn hoá mã tham chiếu ngân hàng trước khi so sánh.
 *
 * BE trả `null`/`undefined` khi phiếu chưa có mã, còn form luôn trả chuỗi
 * (rỗng khi người dùng bỏ trống) — nên phải quy về cùng một mốc.
 */
export function normalizeBankRef(value: string | null | undefined): string {
  return (value ?? '').trim()
}

/**
 * Trả về giá trị mã tham chiếu cần PATCH, hoặc `undefined` khi không có gì đổi.
 *
 * CR 86eycj1de bỏ bắt buộc mã tham chiếu ngân hàng, nên ô này có thể rỗng một
 * cách hợp lệ. Nếu so sánh thô (`'' !== null` → true) thì mọi lần Ghi sổ một
 * phiếu chưa có mã đều bắn kèm một PATCH `bank_ref: ''` vô nghĩa — và sẽ làm
 * hỏng luôn thao tác Ghi sổ nếu BE không chấp nhận chuỗi rỗng.
 */
export function resolveBankRefUpdate(
  currentRef: string | null | undefined,
  nextRef: string | null | undefined
): string | undefined {
  const next = normalizeBankRef(nextRef)
  return next === normalizeBankRef(currentRef) ? undefined : next
}
