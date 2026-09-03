import {
  FEE_SUPPORT_APPROVED_STATUSES,
  FEE_SUPPORT_BLOCKING_STATUSES,
  FEE_SUPPORT_CANCELLABLE_STATUSES,
} from '../constants/fee-support-request-constants'
import type { FeeSupportRequestBrief } from '../services/fee-support-request-service'

export type FeeSupportUntickPlan =
  | { kind: 'free' }
  | { kind: 'cancellable'; cancellableIds: number[] }
  | { kind: 'blocked' }

/**
 * Quyết định hành vi khi user BỎ TICK "đề xuất hỗ trợ phí" trên HĐ cọc, dựa trên
 * danh sách phiếu liên kết:
 * - blocked: có phiếu đã duyệt → chặn bỏ tick (ưu tiên cao nhất).
 * - cancellable: có phiếu nháp/chờ duyệt → hủy (withdraw) rồi bỏ tick.
 * - free: không còn phiếu "sống" (rỗng / chỉ rejected|withdrawn) → bỏ tự do.
 */
export function classifyFeeSupportUntick(requests: FeeSupportRequestBrief[]): FeeSupportUntickPlan {
  const list = requests ?? []
  const hasBlocking = list.some((r) => FEE_SUPPORT_BLOCKING_STATUSES.includes(r.status))
  if (hasBlocking) return { kind: 'blocked' }

  const cancellableIds = list
    .filter((r) => FEE_SUPPORT_CANCELLABLE_STATUSES.includes(r.status))
    .map((r) => r.id)

  if (cancellableIds.length > 0) return { kind: 'cancellable', cancellableIds }
  return { kind: 'free' }
}

/** Có phiếu đang "sống" (draft/pending/approved) — dùng để ẩn nút "Tạo phiếu". */
export function hasActiveFeeSupport(requests: FeeSupportRequestBrief[]): boolean {
  return classifyFeeSupportUntick(requests).kind !== 'free'
}

/** HĐ cọc đã đóng — tạo phiếu hỗ trợ không còn ý nghĩa. */
const CLOSED_DEPOSIT_STATUSES = ['rejected', 'abandoned', 'refunded']

/**
 * HĐ cọc đang bị BE CHẶN DUYỆT vì phiếu hỗ trợ phí chưa duyệt xong?
 *
 * Đây là bản dựng lại phía client của `fee_support_gate.blocking_proposals` — chỉ
 * dùng khi BE chưa trả `fee_support_gate_blocked` (endpoint mới chưa deploy).
 * Nguồn chân lý vẫn là cờ của server; xem `isDepositFeeSupportBlocked`.
 */
export function isFeeSupportGateBlocked({
  hasFeeSupportProposal,
  requests,
}: {
  hasFeeSupportProposal: boolean
  requests: FeeSupportRequestBrief[]
}): boolean {
  if (!hasFeeSupportProposal) return false
  return !(requests ?? []).some((r) => FEE_SUPPORT_APPROVED_STATUSES.includes(r.status))
}

/**
 * Verdict dùng cho UI, ưu tiên cờ của server.
 *
 * BE trả `fee_support_gate_blocked` trên detail HĐ cọc (chính là luật gate của nó).
 * Field mới nên chưa có trong schema sinh tự động → đọc qua cast; khi endpoint chưa
 * deploy thì rơi về bản dựng lại phía client.
 */
export function isDepositFeeSupportBlocked(deposit: {
  has_fee_support_proposal?: boolean | null
  fee_support_requests?: FeeSupportRequestBrief[] | null
}): boolean {
  const serverVerdict = (deposit as { fee_support_gate_blocked?: boolean }).fee_support_gate_blocked
  if (typeof serverVerdict === 'boolean') return serverVerdict
  return isFeeSupportGateBlocked({
    hasFeeSupportProposal: !!deposit.has_fee_support_proposal,
    requests: deposit.fee_support_requests ?? [],
  })
}

/**
 * Có mời tạo phiếu hỗ trợ NGAY trên màn CHI TIẾT HĐ cọc không?
 *
 * Sinh ra để gỡ deadlock: HĐ cọc tick cờ nhưng chưa có phiếu ĐÃ DUYỆT thì BE chặn
 * duyệt cọc. Khi cọc trôi tới `pending_accountant` thì màn SỬA bị ẩn (nơi duy nhất
 * có nút tạo phiếu neo theo HĐ cọc), còn màn "Quản lý phiếu đề xuất phí" chỉ chọn
 * được theo GIAO DỊCH — mà giao dịch chỉ sinh ra sau khi kế toán duyệt. Nút ở màn
 * chi tiết là lối ra duy nhất không phải nới quyền sửa HĐ đang chờ duyệt.
 *
 * (Từ 2026-08 BE chặn sớm ngay ở bước đẩy sang kế toán, nên cọc bị chặn thường
 * dừng ở trạng thái còn sửa được — nút này vẫn giữ cho dữ liệu cũ đã kẹt.)
 */
export function canOfferFeeSupportCreate({
  hasFeeSupportProposal,
  requests,
  depositStatus,
}: {
  hasFeeSupportProposal: boolean
  requests: FeeSupportRequestBrief[]
  depositStatus?: string | null
}): boolean {
  if (!hasFeeSupportProposal) return false
  if (depositStatus && CLOSED_DEPOSIT_STATUSES.includes(depositStatus)) return false
  return !hasActiveFeeSupport(requests ?? [])
}
