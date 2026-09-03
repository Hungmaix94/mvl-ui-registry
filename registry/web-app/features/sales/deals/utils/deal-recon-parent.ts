/**
 * Tra ngược một dòng đối chiếu F2/CTV về **đối chiếu CĐT gốc** (ClickUp 86eyb9a4z).
 *
 * BE trả sẵn FK `parent_investor_reconciliation` (+ `..._detail`) trên cả `F2Reconciliation`
 * lẫn `CTVReconciliation` — đây là nguồn khớp duy nhất đáng tin. KHÔNG suy ra parent bằng
 * hậu tố mã: mã con dạng `<mã CĐT>-F2` / `-CTV` nên `code.split('-').pop()` luôn ra `F2`/`CTV`
 * và không mã CĐT nào kết thúc bằng `-F2` → mọi lần tra đều trượt (đúng lỗi QA báo).
 */

/** Dòng đối chiếu F2/CTV — chỉ những field cần để tra parent. */
export type ChildReconLike = {
  code?: string | null
  parent_investor_reconciliation?: number | null
  parent_investor_reconciliation_detail?: {
    id?: number
    code?: string
    /** Id BẢNG đối chiếu CĐT — BE expose ra nested từ PR #2833, dùng thẳng để điều hướng. */
    investor_sheet?: number | null
  } | null
  /** Field BE cũ (không có trong schema hiện tại) — giữ làm fallback hiển thị. */
  investor_reconciliation_code?: string | null
}

/** Dòng đối chiếu CĐT — `investor_sheet` là id BẢNG đối chiếu, tức id mà route chi tiết cần. */
export type ParentReconLike = {
  id: number
  code?: string | null
  investor_sheet?: number | null
  progress_from_pct?: string | null
  progress_to_pct?: string | null
}

/** Chỉ mục tra parent trong O(1) — dựng một lần cho cả bảng thay vì quét lại từng dòng. */
export type ParentReconIndex<T extends ParentReconLike> = {
  readonly byId: ReadonlyMap<number, T>
  readonly byCode: ReadonlyMap<string, T>
}

export function buildParentReconIndex<T extends ParentReconLike>(
  parents: readonly T[]
): ParentReconIndex<T> {
  const byId = new Map<number, T>()
  const byCode = new Map<string, T>()
  for (const parent of parents) {
    byId.set(parent.id, parent)
    if (parent.code) byCode.set(parent.code, parent)
  }
  return { byId, byCode }
}

/** Tìm đối chiếu CĐT gốc: ưu tiên FK id, sau đó khớp mã (khi BE chỉ trả detail/mã). */
export function findParentInvestorRecon<T extends ParentReconLike>(
  row: ChildReconLike,
  index: ParentReconIndex<T>
): T | undefined {
  if (row.parent_investor_reconciliation != null) {
    const byId = index.byId.get(row.parent_investor_reconciliation)
    if (byId) return byId
  }

  const parentCode =
    row.parent_investor_reconciliation_detail?.code || row.investor_reconciliation_code
  return parentCode ? index.byCode.get(parentCode) : undefined
}

/**
 * Id BẢNG đối chiếu CĐT để điều hướng — route chi tiết nhận `investor_sheet`, KHÔNG phải
 * id dòng đối chiếu. Trả `null` khi chưa tra được (UI hiển thị mã dạng text, không link).
 *
 * Ưu tiên `parent_investor_reconciliation_detail.investor_sheet` (BE trả sẵn trên nested từ
 * PR #2833): link không còn phụ thuộc việc dòng CĐT cha có nằm trong trang danh sách đang tải
 * hay không — đúng lỗi cũ khiến link biến mất ở deal nhiều kỳ. Fallback tra trong danh sách để
 * response cũ / phiếu cũ vẫn link được.
 */
export function parentInvestorSheetId<T extends ParentReconLike>(
  row: ChildReconLike,
  index: ParentReconIndex<T>
): number | null {
  return (
    row.parent_investor_reconciliation_detail?.investor_sheet ??
    findParentInvestorRecon(row, index)?.investor_sheet ??
    null
  )
}

/**
 * Mã đối chiếu CĐT gốc cho cột "Sinh từ" — **chỉ đọc từ dữ liệu của chính phiếu cha**:
 * nested detail, field BE cũ, hoặc dòng CĐT tra được trong danh sách của deal. Trả `null`
 * khi không nguồn nào có (UI hiển thị "-").
 *
 * Cùng thứ tự nguồn với `parentInvestorSheetId` — hai hàm phải khớp nhau, nếu không sẽ có
 * dòng tra được `investor_sheet` (đủ để link) mà lại không có mã để hiển thị.
 *
 * TUYỆT ĐỐI KHÔNG suy ra mã cha bằng cách gọt hậu tố `-F2`/`-CTV` của mã con: đó là bịa một
 * khoá quan hệ từ quy ước đặt tên, và quy ước đó đã đổi (mã thật là `DAAS2T-IRS1525-F2-001`
 * — cụm `-F2` nằm giữa, CTV thì không có cụm nào). Tệ hơn: chuỗi bịa ra trùng luôn mã dòng
 * con nên màn hình vẫn "có chữ", che mất việc BE thiếu field và khiến bug 86eyb9a4z sống sót
 * qua nhiều vòng fix. Thiếu dữ liệu thì phải hiện là thiếu.
 */
export function parentInvestorReconCode<T extends ParentReconLike>(
  row: ChildReconLike,
  index: ParentReconIndex<T>
): string | null {
  return (
    row.parent_investor_reconciliation_detail?.code ||
    row.investor_reconciliation_code ||
    findParentInvestorRecon(row, index)?.code ||
    null
  )
}

/**
 * Phiếu đối chiếu đã bị huỷ chưa — dùng để loại khỏi mọi phép cộng tiền/tiến độ.
 *
 * Dấu huỷ chuẩn là `voided_at`, KHÔNG phải `status`. SRS 18.5 §test-spec 16 ghi rõ:
 * *"Void = set voided_at (status giữ nguyên)"* — nên `status !== 'voided'` là một phép lọc
 * no-op và phiếu đã huỷ vẫn lọt vào TỔNG (đã gặp trên deal 2896: phiếu F2 huỷ lúc 14:08
 * vẫn được cộng 2.560.000 vào "Tổng dự kiến chi Sàn F2"). Vẫn giữ luôn nhánh `status` vì
 * enum của BE có giá trị `voided` và một vài luồng cũ có thể set nó.
 */
export function isVoidedRecon(row: { voided_at?: string | null; status?: string }): boolean {
  return row.voided_at != null || row.status === 'voided'
}

/** % của dòng con, thiếu thì lấy theo đối chiếu CĐT gốc, thiếu nữa thì 0. */
export function resolveProgressPct(
  own: string | null | undefined,
  parent: string | null | undefined
): number {
  const raw = own ?? parent
  if (raw == null) return 0
  const parsed = parseFloat(raw)
  return Number.isNaN(parsed) ? 0 : parsed
}
