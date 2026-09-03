/**
 * Hai grain của bảng chia thực nhận, và cách đổi từ cái hiển thị sang cái ghi được.
 *
 * Bảng hiển thị tiền của CẢ kỳ (đợt đã chi + đợt còn mở), còn
 * `update_splits_by_recipient_for_worksheet` chỉ ghi lên các đợt chưa khoá. Mọi thứ suy ra
 * từ tiền — tỉ lệ chia, số giảm trừ đi theo — phải neo vào **cùng một** gốc, nếu không sẽ
 * ra đúng cái bug 07/08: phí neo theo phần ghi được (quy về 0) còn giảm trừ neo theo số
 * hiển thị (13.236.300 chia 50/50), khiến CTV gánh −87.867đ giảm trừ mà nhận 0đ phí.
 *
 * Vì thế toàn bộ khái niệm "grain" gom về một file, không rải trong `build-groups` như cũ.
 */

/** Một dòng người nhận, ở mức tối thiểu mà các helper dưới đây cần. */
export type EditableGrainRecipient = {
  amount: string
  employee_id?: string | null
  collaborator_id?: string | null
  exchange_id?: string | null
}

/** Một xô (position) của bảng chia, ở mức tối thiểu. */
export type EditableGrainPosition = {
  locked_amount?: string | null
  editable_amount?: string | null
  recipients: EditableGrainRecipient[]
}

/** Người đã nhận phần đã chốt của một xô — BE trả `locked_recipients[]`. */
export type LockedRecipient = {
  employee_id?: number | null
  collaborator_id?: number | null
  exchange_id?: number | null
  amount: string | number
}

const sum = (values: number[]) => values.reduce((s, a) => s + a, 0)

/** Số tiền BE cho phép ghi lại của một xô: phần nằm trên các đợt CHƯA khoá. */
export function editableAmountOf(p: EditableGrainPosition): number {
  if (p.editable_amount !== undefined && p.editable_amount !== null && p.editable_amount !== '') {
    return Number(p.editable_amount)
  }
  // Payload BE cũ chưa có cột này: coi như cả xô còn sửa được (đúng với mọi kỳ chưa có đợt
  // nào bị khoá, tức đại đa số) — không được đoán bừa thành 0 rồi xoá sạch phần chia.
  return sum(p.recipients.map((r) => Number(r.amount || 0)))
}

/** Phần tiền của xô đã nằm trên đợt đã chi. */
export function lockedAmountOf(p: EditableGrainPosition): number {
  return Number(p.locked_amount || 0)
}

/**
 * Xô đã chi HẾT: còn tiền đã chốt nhưng không còn đồng nào ghi lại được.
 *
 * Đây là xô mà mọi thao tác của kế toán đều là no-op — % gõ vào không có tác dụng, và
 * tệ hơn, số giảm trừ đi theo nó thì lại có. Trình sửa phải khoá hẳn ô nhập của xô này.
 */
export function isBucketFullyLocked(p: EditableGrainPosition): boolean {
  return editableAmountOf(p) === 0 && lockedAmountOf(p) !== 0
}

/** Xô chốt một phần: vừa có tiền đã chi vừa còn tiền chia được. */
export function isBucketPartiallyLocked(p: EditableGrainPosition): boolean {
  return editableAmountOf(p) !== 0 && lockedAmountOf(p) !== 0
}

/**
 * Quy đổi số tiền từng dòng về ĐÚNG phần còn ghi được, giữ nguyên tỉ lệ.
 *
 * Tỉ lệ giữa những người nhận mới là thứ kế toán thực sự chọn, nên ở đây giữ tỉ lệ và đổi
 * gốc. Dòng cuối ôm phần lẻ để tổng khớp tuyệt đối (BE so sánh bằng `!=`, lệch 1đ là hỏng).
 * Kỳ không có đợt nào bị khoá thì `editable === displayed`, hàm trả về y nguyên.
 */
export function scaleAmountsToEditable(displayed: number[], editable: number): number[] {
  if (displayed.length === 0) return displayed
  const total = sum(displayed)
  if (total === editable) return displayed

  const scaled: number[] = []
  let running = 0
  displayed.forEach((amount, idx) => {
    if (idx === displayed.length - 1) {
      scaled.push(editable - running)
      return
    }
    // `total === 0` mà vẫn còn tiền mở: không suy được tỉ lệ từ tiền, chia đều để BE nhận
    // được một tổng hợp lệ thay vì chặn cả lượt lưu.
    const portion =
      total !== 0
        ? Math.round((amount * editable) / total)
        : Math.round(editable / displayed.length)
    scaled.push(portion)
    running += portion
  })
  return scaled
}

/** Khoá định danh của một dòng người nhận — dùng để khớp với `locked_recipients[]`. */
const payeeKey = (r: {
  employee_id?: string | number | null
  collaborator_id?: string | number | null
  exchange_id?: string | number | null
}) => {
  if (r.employee_id) return `e${r.employee_id}`
  if (r.collaborator_id) return `c${r.collaborator_id}`
  if (r.exchange_id) return `x${r.exchange_id}`
  return ''
}

/**
 * Gốc để tính giảm trừ đi theo phí, theo TỪNG dòng người nhận đang có trên form.
 *
 * Giảm trừ đối chiếu là khoản đòi lại TRÊN PHÍ: ai nhận bao nhiêu phần phí thì gánh bấy
 * nhiêu phần giảm trừ. Câu hỏi là "phần phí" nào:
 *
 * - Xô phí còn mở → phần phí **ghi được** của kỳ này. Số hiển thị gồm cả tiền đã chi ở
 *   đợt trước, neo vào nó là gán giảm trừ cho một tỉ lệ không hiện thực hoá được.
 * - Xô phí đã chi HẾT → phần phí **đã chi** (`locked_recipients[]`). Tiền đã ra khỏi hệ
 *   thống, nhưng người đã nhận nó vẫn là người phải gánh khoản đòi lại. Không có nhánh này
 *   thì hàm chia trả `null` (tổng = 0, không bám vào đâu) và thế chia sai cũ được giữ nguyên.
 *
 * Trả mảng cùng thứ tự/độ dài với `feeRecipients`; dòng nào không khớp người nhận nào của
 * phần đã chi thì mang 0 — đúng nghiệp vụ: không nhận phí thì không gánh giảm trừ.
 */
export function feeAnchorAmounts(
  feePosition: EditableGrainPosition,
  feeRecipients: EditableGrainRecipient[],
  lockedRecipients: LockedRecipient[] = []
): number[] {
  const displayed = feeRecipients.map((r) => Number(r.amount || 0))
  if (!isBucketFullyLocked(feePosition)) {
    return scaleAmountsToEditable(displayed, editableAmountOf(feePosition))
  }
  const byPayee = new Map<string, number>()
  lockedRecipients.forEach((r) => {
    const key = payeeKey(r)
    if (key) byPayee.set(key, (byPayee.get(key) || 0) + Number(r.amount || 0))
  })
  return feeRecipients.map((r) => byPayee.get(payeeKey(r)) || 0)
}
