import type { InvestorReconciliationSheetCreateItemValues } from './recon-sheet-schema'

/** Per-line save state (mirrors the form's badge state). */
export type ReconLineSaveState = 'new' | 'dirty' | 'saved' | 'saving'

/**
 * Trạng thái hiển thị nhóm số DO BE TÍNH ("Số tiền đối chiếu kỳ này" + KPI band):
 * - `hidden`: chưa từng có số BE (căn mới chưa xác nhận) → không hiển thị gì.
 * - `shown`: số BE hiện hành, input khớp lần xác nhận gần nhất.
 * - `stale`: đã có số BE nhưng input vừa đổi (hoặc đang lưu) → hiện số cũ + backdrop "cần xác nhận lại".
 */
export type ReconComputedDisplayState = 'hidden' | 'shown' | 'stale'

export function resolveReconComputedDisplayState(
  saveState: ReconLineSaveState | undefined,
  hasServerTotals: boolean,
  isReadOnly = false
): ReconComputedDisplayState {
  // View/detail: không có save lifecycle — chỉ hiện số BE đã lưu (nếu có), không bao giờ backdrop.
  if (isReadOnly) return hasServerTotals ? 'shown' : 'hidden'
  if (saveState === 'saved') return 'shown'
  return hasServerTotals ? 'stale' : 'hidden'
}

/**
 * Khóa so sánh "dirty" của một căn — CHỈ theo field input của người dùng. Loại
 * `retroactive_adjustment_amount` vì đó là số DO BE tính (FE không gửi); nếu tính vào khóa sẽ báo
 * dirty giả khi giá trị này thay đổi do hydrate từ BE.
 */
export function reconDirtyKey(item: InvestorReconciliationSheetCreateItemValues): string {
  const {
    retroactive_adjustment_amount: _retro,
    progress_from_pct: _from,
    progress_to_pct: _to,
    ...inputFields
  } = item
  return JSON.stringify(inputFields)
}
