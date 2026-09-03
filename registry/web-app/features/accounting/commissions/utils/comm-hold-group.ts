import type {
  CommissionHold,
  CommissionHoldGroup,
  GetCommissionHoldsParams,
} from '@/features/accounting/commission-holds/services/commission-hold-service'
import { CommissionHoldBeneficiaryType as BeneficiaryType } from '@/constants/api-schema-aliases'

export type HoldBreakdownItem = { key: string; label: string; amount: number }

// Nhãn phân loại giữ — map cứng cục bộ khớp nhãn export BE (advance_hold_payout.py),
// không qua constants API (BE có thể chưa deploy enum mới khi FE lên trước).
export const HOLD_KIND_LABELS: Record<string, string> = {
  FEE: 'Phí hoa hồng',
  BONUS: 'Thưởng',
  // Share giảm trừ mang tiền ÂM nên hold của nó cũng âm — trước 04/08 nó bị xếp vào FEE,
  // ra 2 dòng cùng nhãn "Phí hoa hồng" (1 dương 1 âm) trên cùng một phiếu thu.
  DEDUCTION: 'Giảm trừ',
  ALL: 'Toàn bộ (phí + thưởng)',
}

export const HOLD_ORIGIN_LABELS: Record<string, string> = {
  MANUAL: 'Giữ tay',
  AUTO_CERT: 'Tự động (CCMG)',
  CARRYOVER: 'Chưa nhận kỳ này',
}

/**
 * Các bucket ACTIVE khác 0 của một group (người + kỳ), theo thứ tự hiển thị cố định.
 *
 * `deduction_amount` (bucket riêng từ 04/08) mang tiền ÂM — trước đó nó bị net thẳng vào
 * bucket phí nên cột "Chi tiết giữ" hiện một số phí đã bị trừ ngầm. Vì vậy lọc theo
 * `!== 0` chứ không phải `> 0`, nếu không dòng giảm trừ sẽ bị vứt.
 */
export function buildHoldBreakdown(group: CommissionHoldGroup): HoldBreakdownItem[] {
  // `deduction_amount` chưa có trong schema.ts (chỉ regen từ spec canonical sau khi BE deploy).
  const deductionAmount = (group as CommissionHoldGroup & { deduction_amount?: string | null })
    .deduction_amount
  const entries: Array<[string, string, string | null | undefined]> = [
    ['manual_fee', 'Giữ tay · Phí', group.manual_fee_amount],
    ['manual_bonus', 'Giữ tay · Thưởng', group.manual_bonus_amount],
    ['auto_cert_fee', 'Tự động (CCMG) · Phí', group.auto_cert_fee_amount],
    ['auto_cert_bonus', 'Tự động (CCMG) · Thưởng', group.auto_cert_bonus_amount],
    ['deduction', 'Giảm trừ', deductionAmount],
    ['other', 'Khác (toàn bộ / chưa nhận)', group.other_amount],
  ]
  return entries
    .map(([key, label, amount]) => ({ key, label, amount: Number(amount || 0) }))
    .filter((item) => item.amount !== 0)
}

// ==========================================
// Tạm giữ tự động — không giải phóng/huỷ bằng tay
// ==========================================

/**
 * Hold "tự động" = do policy chứng chỉ môi giới sinh ra (`hold_origin = AUTO_CERT`, tức
 * `hold_reason ∈ BROKER_CERT_HOLD_REASONS`). Vòng đời của nó thuộc về sweep/signal chứng chỉ:
 * BE tự release khi `BrokerCertificate.is_valid()` chuyển sang True (FSD 20.15 §5.4), và
 * `payout_split_service` cũng loại cert-hold khỏi mọi luồng release thủ công.
 *
 * ⇒ UI KHÔNG cho kế toán bấm Giải phóng **hay** Huỷ trên dòng này: cả hai đều làm tiền chảy
 * ra khỏi lệnh giữ, nên để hở nút Huỷ là lách được rule. Người dùng phải cập nhật CCMG hợp lệ,
 * trigger BE sẽ tự giải phóng.
 */
export function isAutoCertHold(hold: Pick<CommissionHold, 'hold_origin'>): boolean {
  return hold.hold_origin === 'AUTO_CERT'
}

export const AUTO_HOLD_LOCK_HINT =
  'Tạm giữ tự động — hệ thống tự giải phóng khi người nhận có CCMG hợp lệ'

// ==========================================
// Phiếu thu nguồn của lệnh giữ
// ==========================================

export type HoldReceiptVoucherInfo = { id: number | null; code: string; date: string | null }

// `receipt_voucher*` mới bổ sung vào `DealPeriodAllocationNested` ở BE; schema.ts chỉ regen
// từ spec canonical sau khi BE deploy nên đọc qua shape phụ + cast tại chỗ (không sửa type sinh).
type PbtvWithReceipt = {
  receipt_voucher?: number | null
  receipt_voucher_code?: string | null
  receipt_voucher_date?: string | null
}

/**
 * Phiếu thu sinh ra lệnh giữ.
 *
 * Một worksheet có NHIỀU phiếu thu, mỗi phiếu thu một PBTV, và các PBTV cùng worksheet dùng
 * chung cấu hình chia — nên mã PBTV không đủ để phân biệt lệnh giữ thuộc lần thu nào. Trả
 * `null` khi hold không sinh từ PBTV (giữ tay / theo kỳ tháng) hoặc khi BE chưa trả field.
 */
export function resolveHoldReceiptVoucher(
  hold: Pick<CommissionHold, 'source_pbtv_detail'>
): HoldReceiptVoucherInfo | null {
  const pbtv = hold.source_pbtv_detail as
    | (CommissionHold['source_pbtv_detail'] & PbtvWithReceipt)
    | null
  if (!pbtv) return null
  const id = pbtv.receipt_voucher ?? null
  const code = pbtv.receipt_voucher_code ?? ''
  if (!id && !code) return null
  return { id, code: code || `#${id}`, date: pbtv.receipt_voucher_date ?? null }
}

// ==========================================
// Điều hướng list → chi tiết (người nhận × kỳ)
// ==========================================

/**
 * Group không có id riêng (BE gộp runtime theo `beneficiary × kỳ`), nên URL chi tiết mang đủ
 * 4 mảnh khoá: loại người nhận, id người nhận, năm, tháng.
 */
export type HoldGroupIdentity = {
  beneficiaryType: BeneficiaryType
  beneficiaryId: number
  year: number
  month: number
}

/** Id người nhận theo đúng nhánh `beneficiary_type` của row/group. */
export function resolveBeneficiaryId(row: BeneficiaryLike): number | null {
  switch (row.beneficiary_type) {
    case BeneficiaryType.EMPLOYEE:
      return row.beneficiary_employee ?? null
    case BeneficiaryType.COLLABORATOR:
      return row.beneficiary_collaborator ?? null
    case BeneficiaryType.EXCHANGE:
      return row.beneficiary_exchange ?? null
    default:
      return null
  }
}

/** Khoá điều hướng của một group; `null` khi thiếu id/kỳ (không dựng được URL chi tiết). */
export function holdGroupIdentity(group: CommissionHoldGroup): HoldGroupIdentity | null {
  const beneficiaryId = resolveBeneficiaryId(group)
  if (!beneficiaryId || !group.commission_period_year || !group.commission_period_month) return null
  return {
    beneficiaryType: group.beneficiary_type,
    beneficiaryId,
    year: group.commission_period_year,
    month: group.commission_period_month,
  }
}

/** Parse ngược 4 param URL; `null` nếu param thiếu/sai định dạng → trang chi tiết báo 404. */
export function parseHoldGroupIdentity(params: {
  beneficiaryType?: string
  beneficiaryId?: string
  year?: string
  month?: string
}): HoldGroupIdentity | null {
  const beneficiaryType = params.beneficiaryType as BeneficiaryType | undefined
  if (!beneficiaryType || !Object.values(BeneficiaryType).includes(beneficiaryType)) return null

  const beneficiaryId = Number(params.beneficiaryId)
  const year = Number(params.year)
  const month = Number(params.month)
  if (!Number.isInteger(beneficiaryId) || beneficiaryId <= 0) return null
  if (!Number.isInteger(year) || year <= 0) return null
  if (!Number.isInteger(month) || month < 1 || month > 12) return null

  return { beneficiaryType, beneficiaryId, year, month }
}

/**
 * Query gọi `GET /commission-holds/grouped/` cho đúng 1 group.
 *
 * Có chủ đích KHÔNG mang theo filter của list (status/tax_base/lý do…): màn chi tiết phải
 * hiện TOÀN BỘ lệnh giữ của người + kỳ đó, nếu không số tổng ở box header sẽ lệch với bảng
 * bên dưới (grouped chỉ cộng những hold khớp filter).
 */
export function buildHoldGroupQuery(identity: HoldGroupIdentity): GetCommissionHoldsParams {
  const params: GetCommissionHoldsParams = {
    beneficiary_type: identity.beneficiaryType,
    commission_period_year: identity.year,
    commission_period_month: identity.month,
    page: 1,
    page_size: 1,
  }
  if (identity.beneficiaryType === BeneficiaryType.EMPLOYEE) {
    params.beneficiary_employee = identity.beneficiaryId
  } else if (identity.beneficiaryType === BeneficiaryType.COLLABORATOR) {
    params.beneficiary_collaborator = identity.beneficiaryId
  } else {
    params.beneficiary_exchange = identity.beneficiaryId
  }
  return params
}

// ==========================================
// Người nhận (dùng chung list + chi tiết)
// ==========================================

export type BeneficiaryMetaRow = { label: string; value: string }
export type BeneficiaryInfo = { name: string; code: string | null; meta: BeneficiaryMetaRow[] }

// Cả row hold phẳng lẫn group (người + kỳ) đều mang đúng bộ field này —
// detail của group nullable tường minh (schema hold để optional không null).
export type BeneficiaryLike = Pick<
  CommissionHold,
  'beneficiary_type' | 'beneficiary_employee' | 'beneficiary_collaborator' | 'beneficiary_exchange'
> & {
  beneficiary_employee_detail?: CommissionHold['beneficiary_employee_detail'] | null
  beneficiary_collaborator_detail?: CommissionHold['beneficiary_collaborator_detail'] | null
  beneficiary_exchange_detail?: CommissionHold['beneficiary_exchange_detail'] | null
}

/** Resolve recipient display info from the typed beneficiary detail objects. */
export function resolveBeneficiary(row: BeneficiaryLike): BeneficiaryInfo {
  switch (row.beneficiary_type) {
    case BeneficiaryType.EMPLOYEE: {
      const d = row.beneficiary_employee_detail
      const meta: BeneficiaryMetaRow[] = []
      if (d?.branch?.name) meta.push({ label: 'Chi nhánh', value: d.branch.name })
      if (d?.block?.name) meta.push({ label: 'Khối', value: d.block.name })
      if (d?.department?.name) meta.push({ label: 'Phòng ban', value: d.department.name })
      return {
        name: d?.fullname || `#${row.beneficiary_employee ?? '?'}`,
        code: d?.code ?? null,
        meta,
      }
    }
    case BeneficiaryType.COLLABORATOR: {
      const d = row.beneficiary_collaborator_detail
      return {
        name: d?.name || `#${row.beneficiary_collaborator ?? '?'}`,
        code: d?.code ?? null,
        meta: d?.phone ? [{ label: 'SĐT', value: d.phone }] : [],
      }
    }
    case BeneficiaryType.EXCHANGE: {
      const d = row.beneficiary_exchange_detail
      return {
        name: d?.name || `#${row.beneficiary_exchange ?? '?'}`,
        code: d?.code ?? null,
        meta: [],
      }
    }
    default:
      return { name: '—', code: null, meta: [] }
  }
}
