import { Fragment } from 'react'

import { IconLock, IconLockopen, IconPencilsimple, IconTrash } from '@/assets/icons'
import { EmployeeProfileLink } from '@/components/commons'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { cn } from '@/utils'
import { formatCurrencyVND, formatPct, formatPctFloor } from '@/utils/common'

import { derivePayout, isDeductionType } from '../utils/payout-math'

import type { PayeeHoldValues, PositionValues } from './commission-split-form.types'

/**
 * Read-only "chia thực nhận" table for Mục 4 — ONE table, one header, with a band per
 * stand person (CommissionShare owner). Each band lists the actual payees (người thực
 * nhận) pivoted into the accountant's Excel columns AC->AK; a payee can receive fee-only,
 * bonus-only, or both. Per-stand business actions (Chia/Sửa, Hold) live in the last
 * "Thao tác" column on the band row and open modals in the parent.
 *
 * PIT (Thuế TNCN) is a FE preview: 10% for CTV payees, blank for employees (D2). Per-payee
 * account facts (advance/hold/paid) come from the BE payee account; a cross-share "nhận hộ"
 * payee shows the account columns once (deduped via accountOwnerByPayee).
 */

const COL_COUNT = 13 // data columns before the "Thao tác" column (+1: Thưởng MV)

const STAFF_INCENTIVE_PCT_TYPE = 'staff_incentive'

export interface PayeeRow {
  key: string
  name: string
  isCtv: boolean
  isExchange: boolean
  isProxy: boolean
  bonus: number
  /** Phần Thưởng MV NẰM TRONG `bonus` — tách ra chỉ để hiển thị riêng.
   *  KHÔNG cộng thêm vào bất kỳ phép tính nào: `bonus` vẫn là tổng thưởng của dòng, nên
   *  Tổng trả / hold / preview giữ nguyên công thức cũ. */
  incentive: number
  fee: number
  participationPct: number | null
  feePct: number | null
  deduction: number
  deductionPct: number | null
  advance: number
  accountHold: number
  ralHold: number
  preTaxHold: number
  postTaxHold: number
  hold: number
  paid: number
  isHeld?: boolean
  /** WS2 per-payee hold directive still PENDING (PBTV DRAFT — amount fixed at approve). */
  holdPending?: boolean
  /** True when any hold on the row is the AUTO broker-cert policy hold (origin auto_cert). */
  holdAutoCert?: boolean
  /** True when the row carries a MANUAL hold (WS2 directive or RAL-level hold) — the only kind
   *  the row action may release; auto-cert holds are lifted by adding a valid CCMG instead. */
  holdManual?: boolean
  /** Distinct hold_reason codes of the row's per-payee holds (for the labelled chip). */
  holdReasons?: string[]
  /** Giữ trước thuế ở mức TÀI KHOẢN người nhận (khác `preTaxHold` mức share). */
  accountPreTaxHold?: number
  /** Giữ sau thuế ở mức TÀI KHOẢN người nhận (khác `postTaxHold` mức share). */
  accountPostTaxHold?: number
  /** Loại thuế của lệnh giữ còn PENDING — số tiền chỉ chốt lúc duyệt phiếu. */
  pendingHoldTaxBase?: string | null
}

export interface PayeeRowComputed extends PayeeRow {
  tongTra: number
  tncn: number | null
  thucNhan: number
  conLai: number
}

/** Tiền/tỷ lệ: BE trả decimal-as-string, vài đường đã parse sẵn — nhận cả hai. */
type Money = number | string | null | undefined

/** Chỉ cần bốn field định danh — nhận mọi dòng người nhận, dù của form hay của BE. */
export type PayeeIdentity = {
  employee_id?: number | string | null
  collaborator_id?: number | string | null
  exchange_id?: number | string | null
  recipient_name?: string | null
}

/**
 * Một dòng người nhận như BẢNG NÀY đọc nó — liệt kê ĐÚNG những field nó chạm, không hơn.
 *
 * Khai riêng thay vì suy từ `PositionValues['recipients']`: bảng còn được gọi với dữ liệu
 * thẳng từ BE (và từ fixture test) chứ không chỉ với dữ liệu form, nên nó phải rộng hơn
 * form một chút. Vẫn hơn hẳn `any`: các nhánh `||` bên dưới dò lần lượt nhiều tên field vì
 * BE đổi tên qua các phiên bản, và đây là chỗ DUY NHẤT liệt kê được các tên đó — gõ sai một
 * tên là lỗi biên dịch, chứ không phải `undefined` âm thầm rồi ra tiền = 0.
 */
export type PayoutRecipientData = PayeeIdentity & {
  amount?: Money
  pct_of_parent?: Money
  hold_amount?: Money
  hold_reason?: string | null
  reason?: string | null
  tax_base?: string | null
  is_held?: boolean | null
  pooled_allocation_id?: number | null
  advance_granted_amount?: Money
  account_hold_amount?: Money
  paid_amount?: Money
  account_pre_tax_hold_amount?: Money
  pre_tax_hold_amount?: Money
  account_post_tax_hold_amount?: Money
  post_tax_hold_amount?: Money
  deduction_amount?: Money
  fee_deduction?: Money
  deduction?: Money
  fee_deduction_to_sale_amount?: Money
}

/** Các field của position mà bảng luôn ép số trước khi dùng — nới kiểu ở `PayoutPositionData`. */
type PayoutMoneyField =
  | 'recipients'
  | 'pct'
  | 'percentage'
  | 'participation'
  | 'expected_amount'
  | 'share_full_amount'
  | 'actual_amount'
  | 'admin_hold'

/**
 * Một position như bảng này đọc nó.
 *
 * Phần schema neo vào `PositionValues` qua `Partial` — giữ liên kết với zod nên đổi tên
 * field bên đó là lỗi ngay tại đây, mà không bắt caller phải cung cấp những field bảng
 * không dùng. Phần còn lại là các field mức share BE gắn kèm: cờ giữ cả share
 * (`is_held`/`held_amount`/`tax_base`) và bucket giảm trừ.
 */
export type PayoutPositionData = Partial<Omit<PositionValues, PayoutMoneyField>> & {
  // Mọi field tiền/tỷ lệ đều nới về `Money`: bảng luôn đọc chúng qua `Number()`/`parseFloat()`,
  // và nguồn gọi vào không chỉ có form (BE trả chuỗi, fixture test truyền số).
  pct?: Money
  percentage?: Money
  participation?: Money
  expected_amount?: Money
  share_full_amount?: Money
  actual_amount?: Money
  admin_hold?: Money
  recipients?: PayoutRecipientData[] | null
  payee_holds?: PayeeHoldValues[] | null
  is_held?: boolean | null
  held_amount?: Money
  tax_base?: string | null
  fee_deduction?: Money
  deduction_amount?: Money
  deduction?: Money
}

interface GroupPosition {
  posIdx: number
  posData: PayoutPositionData
}

export interface Muc6Group {
  code: string
  name: string
  recipient_type: string
  recipient_id: number | string
  participationPct: number | null
  positions: GroupPosition[]
}

export const identityKey = (r: PayeeIdentity): string =>
  r.employee_id
    ? `employee-${r.employee_id}`
    : r.collaborator_id
      ? `collaborator-${r.collaborator_id}`
      : r.exchange_id
        ? `exchange-${r.exchange_id}`
        : `name-${r.recipient_name || ''}`

/**
 * Does this payee still own an UNTAGGED (non-pooled) recipient row in this position?
 *
 * A `payee_holds` directive is scoped to the (share, payee) pair, so when the same person
 * holds both a pooled row and a plain "nhận hộ" row on that share the directive covers the
 * visible row too — it must stay ON the row and NOT be claimed by the pooled band, or the
 * money is subtracted from the wrong place and counted twice (UAT ws151, mirrored).
 */
export const payeeHasPlainRowIn = (
  posData: PayoutPositionData | undefined,
  payeeKey: string
): boolean =>
  (posData?.recipients || []).some(
    (r) => identityKey(r) === payeeKey && r.pooled_allocation_id == null
  )

/** Pivot a stand person's positions (fee + bonus buckets) into per-payee rows. */
export function buildPayeeRows(
  positions: GroupPosition[],
  opts: {
    isCommissionType: (t: string) => boolean
    ownerType: string
    ownerId: number | string
    participationPct?: number | null
    /**
     * Skip recipients tagged with a pooled_allocation_id (chia gộp): those render once
     * as the pooled band, NOT under each stand person. Per-ROW, not per-payee — the
     * same person can ALSO hold an untagged manual "nhận hộ" row from one sale, and
     * that row must stay under that sale's band.
     */
    excludePooled?: boolean
  }
): PayeeRow[] {
  const { isCommissionType, ownerType, ownerId, participationPct, excludePooled } = opts
  const map = new Map<string, PayeeRow>()
  // Payees excluded as pooled rows: their payee_holds must not stub per-sale rows either
  // (the pooled band shows the person + their hold once).
  const pooledKeys = new Set<string>()

  positions.forEach(({ posData }) => {
    const isFee = isCommissionType(posData.pct_type || '')
    const isDeduction = isDeductionType(posData)
    // A whole-share hold reaches us TWICE: as the position's RAL-level `held_amount` flag
    // and as a `payee_holds` row of scope 'share'. Same money — `held_amount` is the
    // "held, not yet materialized" state, the row is what the payment gate enforces. Once
    // the row exists it is the authoritative figure; adding the flag on top double-counts
    // it (prod ws151 share 8664: 8,600,000 read as 17,200,000).
    const hasMaterializedShareHold = (posData.payee_holds || []).some((ph) => ph?.scope === 'share')

    // Amount-based shares (e.g. the F2 exchange fee, fixed_amount mode) carry NO
    // percentage — leave the fee-% cell empty ('—') instead of misreading the
    // participation % (e.g. 30%) as a fee %. The amount column still shows the money.
    const feePct = posData.percentage != null ? parseFloat(String(posData.percentage)) : null
    // Personal effective fee rate = pool rate × tỷ lệ tham gia. The participation factor is
    // right (a 3.50% pool at 60% participation IS 2.10% for that person), but it may only
    // SCALE a real rate — never stand in for a missing one. `null` keeps the '—' for
    // amount-based shares so the participation % can't masquerade as a fee %.
    const standPersonFeePct =
      feePct != null ? feePct * (participationPct != null ? participationPct / 100 : 1) : null
    ;(posData.recipients || []).forEach((r, rIdx) => {
      if (excludePooled && r.pooled_allocation_id != null) {
        pooledKeys.add(identityKey(r))
        return
      }
      const key = identityKey(r)
      const pctOfParent = r.pct_of_parent != null ? parseFloat(String(r.pct_of_parent)) : 100
      const existing =
        map.get(key) ||
        ({
          key,
          name: r.recipient_name || '—',
          isCtv: !!r.collaborator_id,
          isExchange: !!r.exchange_id,
          isProxy: !(
            (ownerType === 'employee' && String(r.employee_id) === String(ownerId)) ||
            (ownerType === 'collaborator' && String(r.collaborator_id) === String(ownerId)) ||
            (ownerType === 'exchange' && String(r.exchange_id) === String(ownerId))
          ),
          bonus: 0,
          incentive: 0,
          fee: 0,
          participationPct: pctOfParent,
          feePct: null,
          deduction: 0,
          deductionPct: null,
          advance: Number(r.advance_granted_amount || 0),
          accountHold: Number(r.account_hold_amount || 0),
          accountPreTaxHold: Number(r.account_pre_tax_hold_amount || r.pre_tax_hold_amount || 0),
          accountPostTaxHold: Number(r.account_post_tax_hold_amount || r.post_tax_hold_amount || 0),
          ralHold: 0,
          preTaxHold: 0,
          postTaxHold: 0,
          hold: 0,
          paid: Number(r.paid_amount || 0),
          isHeld: false,
        } satisfies PayeeRow)

      const rDeduction = Number(
        r.deduction_amount ||
          r.fee_deduction ||
          r.deduction ||
          r.fee_deduction_to_sale_amount ||
          posData.fee_deduction ||
          posData.deduction_amount ||
          posData.deduction ||
          0
      )

      if (isDeduction || rDeduction > 0) {
        // BE stores deduction amounts NEGATIVE (signed money); this table keeps the
        // historical positive-magnitude convention, so normalise with Math.abs here.
        existing.deduction += rDeduction > 0 ? rDeduction : Math.abs(Number(r.amount || 0))
        if (standPersonFeePct != null)
          existing.deductionPct = (pctOfParent / 100) * standPersonFeePct
      } else if (isFee) {
        existing.fee += Number(r.amount || 0)
        if (standPersonFeePct != null) existing.feePct = (pctOfParent / 100) * standPersonFeePct
      } else {
        existing.bonus += Number(r.amount || 0)
        // Thưởng MV chi TRỌN ở kỳ hoa hồng đầu tiên (pool drawdown), không đi theo
        // dial "% TT thưởng kỳ này" như thưởng CĐT — nên phải đứng cột riêng, nếu không cột
        // % bên cạnh đang giải thích cho một con số mà nó không hề chi phối.
        if ((posData.pct_type || '') === STAFF_INCENTIVE_PCT_TYPE)
          existing.incentive += Number(r.amount || 0)
      }

      // held_amount is a SHARE-level total (sum across every recipient of this share). When
      // the share splits to ≥2 recipients, prorate it by the same pct_of_parent BE already
      // used to slice `amount` ("được chia") — otherwise dumping the whole total on rIdx===0
      // makes "tạm giữ" > "được chia" for that person and 0 for everyone else (bug 86eyc1cqy).
      // Last recipient absorbs the 2dp rounding remainder, mirroring BE's own pct_of_parent
      // rounding (see apps/accounting/services/commission_split_aggregator.py
      // `_recipients_for_share`), so the prorated parts always sum back to held_amount exactly.
      const recipientsInPos = posData.recipients || []
      const shareHeldTotal = Number(posData.held_amount || 0)
      const shouldProrateShareHold =
        !!posData.is_held && !hasMaterializedShareHold && shareHeldTotal !== 0
      let shareHoldForThisRecipient = 0
      if (shouldProrateShareHold) {
        const isLastRecipient = rIdx === recipientsInPos.length - 1
        if (isLastRecipient) {
          const allocatedSoFar = recipientsInPos.slice(0, rIdx).reduce((sum, rec) => {
            const p = rec.pct_of_parent != null ? parseFloat(String(rec.pct_of_parent)) : 100
            return sum + Math.round((shareHeldTotal * p) / 100)
          }, 0)
          shareHoldForThisRecipient = shareHeldTotal - allocatedSoFar
        } else {
          shareHoldForThisRecipient = Math.round((shareHeldTotal * pctOfParent) / 100)
        }
      }
      const holdAmt = Number(r.hold_amount || shareHoldForThisRecipient || 0)
      // `!== 0` throughout: a hold on a deduction (giảm trừ) share is NEGATIVE — it relieves
      // the payee's withheld total rather than adding to it. Guarding on `> 0` dropped that
      // relief on the floor (the row still counts as held, and the untagged fallback below
      // must carry the negative too or the band's hold total drifts).
      const isHeld = !!(posData.is_held || r.is_held || holdAmt !== 0)
      existing.isHeld = existing.isHeld || isHeld
      if (isHeld) existing.holdManual = true
      const taxBase = r.tax_base || (posData.is_held ? posData.tax_base : null)

      existing.ralHold += holdAmt
      if (taxBase === 'PRE_TAX') {
        existing.preTaxHold += holdAmt
      } else if (taxBase === 'POST_TAX') {
        existing.postTaxHold += holdAmt
      } else if (holdAmt !== 0) {
        existing.preTaxHold += holdAmt
      }

      map.set(key, existing)
    })
  })

  // WS2 per-payee hold directives (posData.payee_holds) — recipients[] rows do NOT carry
  // these: a PENDING directive (PBTV DRAFT, amount fixed at approve → hold_amount null) or
  // a MATERIALIZED one whose splits were voided would otherwise be invisible and the row's
  // hold/release action state wrong. Deduped by directive id (a share can span positions).
  const seenDirectives = new Set<number>()
  positions.forEach(({ posData }) => {
    ;(posData.payee_holds || []).forEach((ph) => {
      if (ph.id != null) {
        if (seenDirectives.has(ph.id)) return
        seenDirectives.add(ph.id)
      }
      if (!ph.payee_type || ph.payee_id == null) return
      const key = `${ph.payee_type}-${ph.payee_id}`
      // The pooled payee's holds (e.g. the auto cert hold on their pooled cut) belong to
      // the pooled band, not to a per-sale stub row under every stand person — but ONLY
      // where the pooled row is this payee's only row on the share. The same person can
      // ALSO hold an untagged "nhận hộ" row here (a CTV participant receiving another
      // sale's split); that row stays visible, so its hold must stay on it and NOT be
      // claimed by the band. `bandHoldInfo` applies the mirror rule so neither drops it
      // nor counts it twice.
      if (excludePooled && pooledKeys.has(key) && !payeeHasPlainRowIn(posData, key)) return
      let row = map.get(key)
      if (!row) {
        // Materialized hold voids the payee's splits → they vanish from recipients[];
        // stub a row so the held person + amount still show in the band.
        row = {
          key,
          name: ph.payee_name || '—',
          isCtv: ph.payee_type === 'collaborator',
          isExchange: ph.payee_type === 'exchange',
          isProxy: !(
            (ownerType === 'employee' &&
              ph.payee_type === 'employee' &&
              String(ph.payee_id) === String(ownerId)) ||
            (ownerType === 'collaborator' &&
              ph.payee_type === 'collaborator' &&
              String(ph.payee_id) === String(ownerId)) ||
            (ownerType === 'exchange' &&
              ph.payee_type === 'exchange' &&
              String(ph.payee_id) === String(ownerId))
          ),
          bonus: 0,
          incentive: 0,
          fee: 0,
          participationPct: null,
          feePct: null,
          deduction: 0,
          deductionPct: null,
          advance: 0,
          accountHold: 0,
          accountPreTaxHold: 0,
          accountPostTaxHold: 0,
          ralHold: 0,
          preTaxHold: 0,
          postTaxHold: 0,
          hold: 0,
          paid: 0,
          isHeld: false,
        }
        map.set(key, row)
      }
      row.isHeld = true
      if (ph.origin === 'auto_cert') row.holdAutoCert = true
      else row.holdManual = true
      if (ph.hold_reason) {
        row.holdReasons = row.holdReasons || []
        if (!row.holdReasons.includes(ph.hold_reason)) row.holdReasons.push(ph.hold_reason)
      }
      if (ph.hold_amount != null) {
        const amt = Number(ph.hold_amount)
        row.ralHold += amt
        if (ph.tax_base === 'POST_TAX') row.postTaxHold += amt
        else row.preTaxHold += amt
      } else {
        row.holdPending = true
        row.pendingHoldTaxBase = ph.tax_base || row.pendingHoldTaxBase
      }
    })
  })

  return Array.from(map.values()).map((row): PayeeRow => {
    // Per-share holds (payee_holds fold / recipient hold fields) are the figures for
    // THIS band's slice. The account hold is the payee's WHOLE-DEAL total — using it
    // when the payee appears in several bands (e.g. a participant CTV who also
    // receives another sale's split, UAT ws151) subtracts the deal-wide hold from a
    // single row's money and drives "thực nhận" negative. Fall back to the account
    // figure only when no per-share hold info exists for this row (account-grain
    // holds with no share, e.g. bulk-hold-by-payee).
    const useAccount = row.accountHold > 0 && row.ralHold === 0
    let preTaxHold = useAccount ? (row.accountPreTaxHold ?? 0) : row.preTaxHold
    let postTaxHold = useAccount ? (row.accountPostTaxHold ?? 0) : row.postTaxHold
    let totalHold = useAccount ? row.accountHold : row.ralHold

    if (totalHold > 0 && preTaxHold === 0 && postTaxHold === 0) {
      preTaxHold = totalHold
    }
    // PENDING manual directive: preview the POST-APPROVE state — the manual hold takes the
    // payee's whole allocation (fee + bonus − deduction) and SUPERSEDES any auto cert hold,
    // so it overrides the current account/cert figures instead of only filling zero.
    if (row.holdPending) {
      const pendingAmt = Math.max(0, row.fee + row.bonus - row.deduction)
      if (pendingAmt > 0) {
        totalHold = pendingAmt
        if (row.pendingHoldTaxBase === 'POST_TAX') {
          postTaxHold = pendingAmt
          preTaxHold = 0
        } else {
          preTaxHold = pendingAmt
          postTaxHold = 0
        }
      }
    }

    return {
      ...row,
      preTaxHold,
      postTaxHold,
      hold: totalHold,
      isHeld: row.isHeld || totalHold > 0,
    }
  })
}

export function computeRow(row: PayeeRow): PayeeRowComputed {
  return {
    ...row,
    ...derivePayout({
      bonus: row.bonus,
      fee: row.fee,
      deduction: row.deduction,
      isCtv: row.isCtv,
      paid: row.paid,
      preTaxHold: row.preTaxHold,
      postTaxHold: row.postTaxHold,
    }),
  }
}

export const HOLD_REASON_CHIP_LABELS: Record<string, string> = {
  CARRYOVER: 'chưa nhận kỳ này',
  MANUAL: 'giữ tay',
  MISSING_BROKER_CERT: 'thiếu CCMG',
  EXPIRED_BROKER_CERT: 'CCMG hết hạn',
  PENDING_BROKER_CERT: 'CCMG chờ cấp',
}

const CERT_REASONS = new Set(['MISSING_BROKER_CERT', 'EXPIRED_BROKER_CERT', 'PENDING_BROKER_CERT'])

/** Auto-cert and manual holds can COEXIST on one row (hold placed while the cert hold is
 *  live) — render one chip per source, never let one swallow the other. */
export function certChipLabel(row: PayeeRow): string {
  const reason = (row.holdReasons || [])
    .filter((r) => CERT_REASONS.has(r))
    .map((r) => HOLD_REASON_CHIP_LABELS[r] || r)
    .join(', ')
  return `Tự động giữ · ${reason || 'thiếu CCMG'}`
}

export function manualChipLabel(row: PayeeRow): string {
  if (row.holdPending) return 'Giữ theo người · chờ duyệt chi'
  const reason = (row.holdReasons || [])
    .filter((r) => !CERT_REASONS.has(r))
    .map((r) => HOLD_REASON_CHIP_LABELS[r] || r)
    .join(', ')
  return reason ? `Tạm giữ · ${reason}` : 'Tạm giữ'
}

/** @deprecated single-label variant kept for callers/tests that want one string. */
export function holdChipLabel(row: PayeeRow): string {
  if (row.holdManual) return manualChipLabel(row)
  if (row.holdAutoCert) return certChipLabel(row)
  return 'Tạm giữ'
}

const standKindLabel = (type: string) =>
  type === 'collaborator' ? 'CTV' : type === 'exchange' ? 'F2' : 'Sale'

/**
 * Tên người đứng tên của một band, dạng "mã - tên" và là TEXT LINK mở TAB MỚI sang hồ sơ.
 *
 * `recipient_type` chỉ có ba giá trị (`collaborator` / `exchange` / còn lại là nhân viên) nên
 * map thẳng sang ba quyền tương ứng; thiếu quyền thì rơi về chữ thường, vẫn đọc được tên.
 * Cùng quy ước với Mục ① và với màn danh sách — mã đứng trước tên vì tên người trùng nhau
 * được, mã thì không.
 */
function StandIdentityLink({ group }: { group: Muc6Group }) {
  const ability = useAbility()
  const label = [group.code, group.name].filter(Boolean).join(' - ') || group.name || '—'
  const id = group.recipient_id
  const cls = 'text-action-primary-red-default hover:underline focus-visible:underline'

  if (id == null) return <span>{label}</span>

  if (group.recipient_type === 'exchange') {
    return ability.can('retrieve', 'exchange') ? (
      <a
        href={APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(':id', String(id))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cls}
      >
        {label}
      </a>
    ) : (
      <span>{label}</span>
    )
  }

  if (group.recipient_type === 'collaborator') {
    return ability.can('retrieve', 'collaborator') ? (
      <a
        href={APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(id))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cls}
      >
        {label}
      </a>
    ) : (
      <span>{label}</span>
    )
  }

  return <EmployeeProfileLink employeeId={Number(id)}>{label}</EmployeeProfileLink>
}

/**
 * One pooled-split band (chia gop): an outside payee that takes fee_pct x basis in one
 * line while every stand person keeps the pro-rata remainder. Rendered AFTER the stand
 * bands; the per-sale "nhận hộ" rows it generated are hidden via hidePayeeKeys.
 */
export interface PooledBand {
  id: number
  payeeKey: string
  name: string
  isCtv: boolean
  isExchange: boolean
  feePct: number | null
  fee: number
  bonus: number
  /** POSITIVE magnitude of the deduction the payee bears (BE sends it negative). */
  deduction: number
  /** % of the bonus pool entered by the accountant (null = BONUS channel off). */
  bonusPoolPct: number | null
  /** Ratio the deduction was taken at = the fee ratio. Display-only, explains `deduction`. */
  deductionRatioPct: number | null
}

/**
 * Chia tiền của một nhóm (một người đứng tên) thành phần đã chốt và phần còn sửa được.
 *
 * Một kỳ có thể được chốt MỘT PHẦN: đợt tiền về trước đã có phiếu chi nên bị đóng băng,
 * đợt sau vẫn mở. BE trả `locked_amount` / `editable_amount` cho từng position, ở đây gộp
 * lại theo nhóm để biết dòng nào còn cho sửa. Khoá theo ĐỢT (quyết định 03/08) nên cả cụm
 * của đợt đã chi bị đóng băng, kể cả phần chưa chi cho người khác trong cùng đợt đó.
 */
export function groupLockState(group: Muc6Group) {
  let locked = 0
  let editable = 0
  for (const pos of group.positions) {
    locked += Number((pos.posData as { locked_amount?: string }).locked_amount ?? 0)
    editable += Number((pos.posData as { editable_amount?: string }).editable_amount ?? 0)
  }
  return {
    locked,
    editable,
    // Không còn đồng nào sửa được mà vẫn có tiền đã chốt -> nhóm này đóng băng hoàn toàn.
    isFullyLocked: editable === 0 && locked > 0,
    isPartiallyLocked: editable > 0 && locked > 0,
  }
}

interface Props {
  groups: Muc6Group[]
  isCommissionType: (t: string) => boolean
  /** payeeKey -> group code that displays the per-payee account columns. */
  accountOwnerByPayee: Map<string, string>
  canEdit: boolean
  isDisbursementApproved?: boolean
  onEditGroup: (code: string) => void
  onHoldGroup: (code: string, rowKey?: string) => void
  /** Hide "nhận hộ" (proxy) payee rows — used by the admin/"Giao dịch tiền về" view. */
  hideProxy?: boolean
  /**
   * Hide the "Giữ lại HH" and "Còn lại" columns. Temporary: the admin-preview projection
   * does not carry per-payee hold/paid, so these would always read 0.
   */
  hideHoldCols?: boolean
  hideReceived?: boolean
  /**
   * "% TT phí" của kỳ đang xem — cột "% TT phí kỳ này", đặt ngay cạnh "Phí từng sale" vì nó
   * CHỈ nói về track phí. Tên cũ "% thanh toán kỳ này" phủ cả dòng, nên kế toán đọc ô Thưởng
   * và ô Giảm trừ cũng tưởng đang nhìn tiến độ của chúng — hai thứ mà dial phí không chạm.
   * `null`/bỏ trống = ẩn cột (màn admin "Giao dịch tiền về đợt này" không hiển thị).
   */
  periodFeePct?: number | null
  /**
   * "% TT thưởng" của kỳ đang xem — cột riêng cạnh "Thưởng sale". Thưởng đi theo đối chiếu
   * CĐT nhân tỉ lệ tiền về, không theo dial phí, nên nó phải có con số của chính nó.
   * Giảm trừ KHÔNG có cột %: nó theo tỉ lệ thu của hoá đơn thuộc từng đợt đối chiếu, khác
   * nhau từng đợt, nên một con số chung cho cả dòng là bịa.
   */
  periodBonusPct?: number | null
  /** % TT phí riêng cho sàn F2 (nếu có) */
  periodF2Pct?: number | null
  /** % TT thưởng riêng cho sàn F2 (nếu có) */
  periodBonusF2Pct?: number | null
  /** Pooled-split bands (chia gop) rendered after the stand bands. */
  pooledBands?: PooledBand[]
  /**
   * Hide the recipients rows TAGGED with pooled_allocation_id from the stand bands
   * (they render once as pooled bands). Per-row FK, never payee identity: an untagged
   * manual "nhận hộ" row of the SAME person must stay under its sale's band.
   */
  hidePooledRows?: boolean
  onEditPooled?: (band: PooledBand) => void
  onCancelPooled?: (band: PooledBand) => void
  /** Hold/release action for the pooled payee (spans every share they were carved from). */
  onHoldPooled?: (band: PooledBand) => void
}

/**
 * Aggregate the pooled payee's holds across every group's positions (band display).
 *
 * `allocation` is the band's own money (fee + bonus). It is only needed to preview a
 * PENDING directive, whose `hold_amount` is null until "Duyệt chi thực nhận" — mirroring
 * what `buildPayeeRows` does for payee rows, so the band can't show a "đang giữ" chip next
 * to a 0 in the Tạm giữ columns and a full Thực nhận.
 */
export function bandHoldInfo(groups: Muc6Group[], payeeKey: string, allocation = 0) {
  let preTax = 0
  let postTax = 0
  let autoCert = false
  let manual = false
  let pending = false
  let pendingTaxBase: string | null = null
  const reasons: string[] = []
  const seenDirectives = new Set<number>()
  groups.forEach((g) =>
    g.positions.forEach(({ posData }) => {
      // Mirror of the `buildPayeeRows` rule: a share where this person ALSO has an
      // untagged "nhận hộ" row keeps its hold on that visible row — the band must not
      // claim it, or the same money is subtracted in two places.
      if (payeeHasPlainRowIn(posData, payeeKey)) {
        return
      }
      // Manual holds parked on the pooled rows themselves (recipient-level `hold_amount`,
      // the pre-WS2 shape `buildPayeeRows` still honours) — otherwise the band shows no
      // chip, no figure, and offers "Tạm giữ" on an already-held payee.
      ;(posData.recipients || []).forEach((r) => {
        if (identityKey(r) !== payeeKey || r.pooled_allocation_id == null) return
        const amt = Number(r.hold_amount || 0)
        if (!(amt > 0)) return
        manual = true
        if (r.reason && !reasons.includes(r.reason)) reasons.push(r.reason)
        if (r.tax_base === 'POST_TAX') postTax += amt
        else preTax += amt
      })
      ;(posData.payee_holds || []).forEach((ph) => {
        if (`${ph.payee_type}-${ph.payee_id}` !== payeeKey) return
        if (ph.id != null) {
          if (seenDirectives.has(ph.id)) return
          seenDirectives.add(ph.id)
        }
        if (ph.origin === 'auto_cert') autoCert = true
        else manual = true
        if (ph.hold_reason && !reasons.includes(ph.hold_reason)) reasons.push(ph.hold_reason)
        if (ph.hold_amount != null) {
          const amt = Number(ph.hold_amount)
          if (ph.tax_base === 'POST_TAX') postTax += amt
          else preTax += amt
        } else {
          pending = true
          pendingTaxBase = ph.tax_base || pendingTaxBase
        }
      })
    })
  )

  // PENDING manual directive: preview the POST-APPROVE figure — the hold takes the payee's
  // whole allocation and SUPERSEDES any auto cert hold, so it overrides rather than adds.
  if (pending && allocation > 0) {
    if (pendingTaxBase === 'POST_TAX') {
      postTax = allocation
      preTax = 0
    } else {
      preTax = allocation
      postTax = 0
    }
  }

  return { preTax, postTax, total: preTax + postTax, autoCert, manual, pending, reasons }
}

export const RecipientPayoutTable = ({
  groups,
  isCommissionType,
  accountOwnerByPayee,
  canEdit,
  isDisbursementApproved = false,
  onEditGroup,
  onHoldGroup,
  hideProxy = false,
  hideHoldCols = false,
  hideReceived = false,
  periodFeePct = null,
  periodBonusPct = null,
  periodF2Pct = null,
  periodBonusF2Pct = null,
  pooledBands = [],
  hidePooledRows = false,
  onEditPooled,
  onCancelPooled,
  onHoldPooled,
}: Props) => {
  if (groups.length === 0) {
    return (
      <div className="border-border-1 rounded border bg-white py-6 text-center text-[13px] text-neutral-400">
        Không có dữ liệu chia thực nhận sales
      </div>
    )
  }

  const th = 'px-3 py-2.5 text-[11px] font-medium text-neutral-500 whitespace-nowrap'
  const td = 'px-3 py-3 text-[13px]'
  // Hai cột % chỉ có ở màn kế toán — bỏ sót ở colCount là lệch colSpan của dòng band.
  const showPeriodFeePct = periodFeePct != null || periodF2Pct != null
  const showPeriodBonusPct = periodBonusPct != null || periodBonusF2Pct != null
  let colCount = COL_COUNT
  if (hideHoldCols) colCount -= 2
  if (hideReceived) colCount -= 2
  if (showPeriodFeePct) colCount += 1
  if (showPeriodBonusPct) colCount += 1

  return (
    <div className="border-border-1 overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs [&_td]:align-middle [&_th]:align-middle">
          <thead className="border-border-1 bg-background-2 border-b">
            <tr>
              <th className={`${th} text-left`}>Đối tượng / Thành viên</th>
              <th className={th}>Thưởng sale</th>
              {showPeriodBonusPct && <th className={th}>% TT thưởng kỳ này</th>}
              <th className={th}>Thưởng MV</th>
              <th className={th}>Đã tạm ứng</th>
              <th className={th}>% chia</th>
              <th className={th}>% Phí từng sale</th>
              {showPeriodFeePct && <th className={th}>% TT phí kỳ này</th>}
              <th className={th}>Phí từng sale</th>
              <th className={th}>Giảm trừ</th>
              <th className={th}>Tổng trả</th>
              {!hideReceived && <th className={th}>Thuế TNCN</th>}
              {!hideReceived && <th className={th}>Thực nhận</th>}
              {!hideHoldCols && <th className={th}>Tạm giữ trước thuế</th>}
              {!hideHoldCols && <th className={th}>Tạm giữ sau thuế</th>}
              <th
                className={`${th} sticky right-0 z-20 bg-neutral-50 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}
              >
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => {
              const rows = buildPayeeRows(group.positions, {
                isCommissionType,
                ownerType: group.recipient_type,
                ownerId: group.recipient_id,
                participationPct: group.participationPct,
                // Tagged pooled rows render once in their band, not per stand person.
                excludePooled: hidePooledRows,
              })
                .map(computeRow)
                .filter((r) => !hideProxy || !r.isProxy)
              return (
                <Fragment key={group.code}>
                  <tr className="group/header border-border-1 bg-red-10 hover:bg-red-20 border-b">
                    <td colSpan={colCount} className="px-3 py-2 text-left">
                      <span className="text-[13px] font-bold">
                        <span className="text-action-primary-red-default">
                          {gi + 1}. {standKindLabel(group.recipient_type)} ·{' '}
                        </span>
                        {/* Mã đã nằm trong nhãn "mã - tên" nên bỏ ô mã mono rời phía sau. */}
                        <StandIdentityLink group={group} />
                      </span>
                      {group.participationPct != null && (
                        <span className="bg-red-20 text-action-primary-red-default ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          Tham gia {group.participationPct}%
                        </span>
                      )}
                      {groupLockState(group).locked > 0 && (
                        <span
                          className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600"
                          title={
                            groupLockState(group).isFullyLocked
                              ? 'Đợt tiền về của phần này đã có phiếu chi — không sửa được nữa'
                              : 'Một phần đã chốt theo đợt đã chi; phần còn lại vẫn sửa được'
                          }
                        >
                          🔒 Đã chốt {formatCurrencyVND(groupLockState(group).locked)} đ
                          {/* Vế còn lại vẫn được tính sẵn trong groupLockState nhưng trước đây chỉ
                              dùng để bật/tắt nút sửa — kế toán không có chỗ nào đọc ra con số mình
                              thực sự được phép chia. */}
                          {groupLockState(group).isPartiallyLocked && (
                            <> · còn {formatCurrencyVND(groupLockState(group).editable)} đ</>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="bg-red-10 group-hover/header:bg-red-20 sticky right-0 z-10 px-3 py-2 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      {canEdit && (
                        <button
                          type="button"
                          disabled={isDisbursementApproved || groupLockState(group).isFullyLocked}
                          onClick={() => onEditGroup(group.code)}
                          title={
                            groupLockState(group).isFullyLocked
                              ? 'Đợt tiền về của phần này đã có phiếu chi — huỷ phiếu chi trước nếu cần sửa'
                              : isDisbursementApproved
                                ? 'Đã duyệt chi thực nhận (Khóa sửa)'
                                : 'Chia / Sửa thực nhận'
                          }
                          className={cn(
                            'border-border-1 inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                            isDisbursementApproved
                              ? 'cursor-not-allowed bg-neutral-100 text-neutral-400 opacity-60'
                              : 'hover:bg-neutral-30 bg-white text-neutral-700'
                          )}
                        >
                          <IconPencilsimple className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                  {rows.map((row) => {
                    const showAccount =
                      (accountOwnerByPayee.get(row.key) ?? group.code) === group.code
                    return (
                      <tr
                        key={`${group.code}-${row.key}`}
                        className="group/row border-border-1 hover:bg-data-light-grey-hover border-b"
                      >
                        <td className={`${td} pl-6 text-left`}>
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-medium text-neutral-900">{row.name}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                                row.isProxy
                                  ? 'bg-[#FEF3C7] text-[#92400E]'
                                  : 'bg-[#DCFCE7] text-[#166534]'
                              }`}
                            >
                              {row.isProxy
                                ? `nhận hộ${row.isCtv ? ' · CTV' : row.isExchange ? ' · sàn' : ''}`
                                : 'chính chủ'}
                            </span>
                            {row.holdAutoCert && (
                              <span
                                className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white"
                                title="Tạm giữ TỰ ĐỘNG theo chính sách chứng chỉ môi giới (CCMG) — bổ sung chứng chỉ hợp lệ để hệ thống tự gỡ."
                              >
                                {certChipLabel(row)}
                              </span>
                            )}
                            {row.holdManual && (
                              <span
                                className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-amber-600"
                                title={
                                  row.holdPending
                                    ? 'Kế toán đã đặt giữ theo người — hiệu lực và chốt số khi Duyệt chi thực nhận (thay thế phần giữ tự động nếu có).'
                                    : 'Khoản của người này đang bị kế toán tạm giữ.'
                                }
                              >
                                {manualChipLabel(row)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={td}>
                          {row.bonus - row.incentive !== 0
                            ? formatCurrencyVND(row.bonus - row.incentive)
                            : '—'}
                        </td>
                        {showPeriodBonusPct && (
                          <td className={td}>
                            {formatPctFloor(
                              group.recipient_type === 'exchange' && periodBonusF2Pct != null
                                ? periodBonusF2Pct
                                : periodBonusPct,
                              2
                            )}
                          </td>
                        )}
                        <td className={td}>
                          {row.incentive !== 0 ? formatCurrencyVND(row.incentive) : '—'}
                        </td>
                        <td className={`${td} text-neutral-500`}>
                          {showAccount ? (
                            row.advance > 0 ? (
                              <div className="flex flex-col items-end leading-tight">
                                <span>{formatCurrencyVND(row.advance)}</span>
                                {row.paid > 0 && (
                                  <span className="text-[10px] text-neutral-400">
                                    hoàn {formatCurrencyVND(Math.min(row.advance, row.paid))}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '0'
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={td}>{formatPct(row.participationPct, 2)}</td>
                        <td className={td}>{formatPct(row.feePct, 4)}</td>
                        {showPeriodFeePct && (
                          <td className={td}>
                            {/* FLOOR như Mục 2 và như ô dial: cột này bám thẳng vào state dial,
                                nên half-up ở đây là chỗ DUY NHẤT còn hiện 35% trong khi Mục 2
                                hiện 34,99% cho cùng một con số. */}
                            {formatPctFloor(
                              group.recipient_type === 'exchange' && periodF2Pct != null
                                ? periodF2Pct
                                : periodFeePct,
                              2
                            )}
                          </td>
                        )}
                        <td className={td}>{row.fee !== 0 ? formatCurrencyVND(row.fee) : '—'}</td>
                        <td className={`${td} text-[#DC2626]`}>
                          {row.deduction > 0 ? `-${formatCurrencyVND(row.deduction)}` : '—'}
                        </td>
                        <td className={`${td} font-medium`}>{formatCurrencyVND(row.tongTra)}</td>
                        {!hideReceived && (
                          <td className={`${td} text-[#DC2626]`}>
                            {row.tncn != null ? `-${formatCurrencyVND(row.tncn)}` : '—'}
                          </td>
                        )}
                        {!hideReceived && (
                          <td
                            className={`${td} font-semibold ${row.thucNhan < 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}
                          >
                            {formatCurrencyVND(row.thucNhan)}
                          </td>
                        )}
                        {/* Hold cells are PER-SHARE figures of THIS row's slice (not the
                            whole-deal account totals), so they render in EVERY band the
                            payee appears in — hiding them outside the "account owner" band
                            left a 0-thực-nhận row with no visible hold to explain it
                            (UAT ws151: nhận-hộ row of a participant CTV). advance/paid stay
                            gated by showAccount (those ARE account-level, deal-wide). */}
                        {/* `!== 0`, not `> 0`: a deduction band's cert hold is NEGATIVE (BE nets
                            the giảm-trừ share into the payee's withheld total), and rendering it
                            as a flat '0' hid the relief that explains the payee's hold figure. */}
                        {!hideHoldCols && (
                          <td className={`${td} font-medium text-[#D97706]`}>
                            {row.preTaxHold !== 0 ? formatCurrencyVND(row.preTaxHold) : '0'}
                          </td>
                        )}
                        {!hideHoldCols && (
                          <td className={`${td} font-medium text-[#D97706]`}>
                            {row.postTaxHold !== 0 ? formatCurrencyVND(row.postTaxHold) : '0'}
                          </td>
                        )}
                        <td className="group-hover/row:bg-data-light-grey-hover sticky right-0 z-10 bg-white px-3 py-1.5 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          {/* Action rules: manual hold -> release it (never touches the auto cert
                              hold); auto-cert PARTIAL (sale 20%) -> "hold the rest" (manual hold
                              supersedes the cert one); auto-cert FULL with nothing left payable
                              (CTV 100%) -> no action — the cert hold lifts only via a valid CCMG. */}
                          {/* KHÔNG tạm giữ hoa hồng của Sàn F2 (ClickUp `86eyc1n13`). "Tạm giữ" là
                              công cụ giữ tiền của NGƯỜI LÀM CÔNG (sale/CTV); tiền của sàn liên kết
                              thanh toán theo hợp đồng giữa hai công ty nên không thuộc diện này. BE
                              vẫn cho giữ (`beneficiary_exchange` hợp lệ) ⇒ đây là luật của MÀN.

                              Xét NGƯỜI NHẬN TIỀN (`row.isExchange`), KHÔNG xét `recipient_type` của
                              band: một band F2 có thể trả cho một CTV "nhận hộ" — người thật, có
                              khấu trừ TNCN — và dòng đó VẪN phải giữ được (BA chốt 2026-08-19).
                              Cùng luật với dải chia gộp bên dưới (`!band.isExchange`). */}
                          {canEdit &&
                            !row.isExchange &&
                            !(row.holdAutoCert && !row.holdManual && row.isCtv) && (
                              <button
                                type="button"
                                disabled={isDisbursementApproved}
                                onClick={() => onHoldGroup(group.code, row.key)}
                                title={
                                  isDisbursementApproved
                                    ? 'Đã duyệt chi thực nhận (Khóa tạm giữ)'
                                    : row.holdManual
                                      ? 'Bỏ tạm giữ hoa hồng / thưởng cá nhân (không gỡ phần giữ tự động thiếu CCMG)'
                                      : row.holdAutoCert
                                        ? 'Giữ thêm phần còn lại (đang bị giữ tự động một phần do CCMG)'
                                        : 'Tạm giữ hoa hồng / thưởng cá nhân'
                                }
                                className={cn(
                                  'border-border-1 inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                                  isDisbursementApproved
                                    ? 'cursor-not-allowed bg-neutral-100 text-neutral-400 opacity-60'
                                    : row.holdManual
                                      ? 'border-amber-200 bg-amber-50 text-[#D97706] hover:bg-amber-100'
                                      : 'hover:bg-neutral-30 bg-white text-neutral-700'
                                )}
                              >
                                {row.holdManual ? (
                                  <IconLock className="h-4 w-4" />
                                ) : (
                                  <IconLockopen className="h-4 w-4" />
                                )}
                              </button>
                            )}
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
            {pooledBands.map((band, bi) => {
              // The pooled payee's holds (auto cert / manual) live on the band — the
              // per-sale stub rows are hidden, so this is the one place they show. The
              // allocation feeds the PENDING preview (hold_amount is null on a DRAFT PBTV).
              const hi = bandHoldInfo(
                groups,
                band.payeeKey,
                Math.max(0, band.fee + band.bonus - band.deduction)
              )
              const payout = derivePayout({
                bonus: band.bonus,
                fee: band.fee,
                // Was hardcoded 0 while the DEDUCTION channel did not exist. The payee now
                // bears the deduction at the fee ratio, so it must net into Tổng trả (and
                // therefore into the CTV PIT preview) exactly like a stand person's row.
                deduction: band.deduction,
                isCtv: band.isCtv,
                paid: 0,
                preTaxHold: hi.preTax,
                postTaxHold: hi.postTax,
              })
              const bandRowForChips = {
                holdReasons: hi.reasons,
                holdPending: hi.pending,
                holdManual: hi.manual,
                holdAutoCert: hi.autoCert,
              } as PayeeRow
              return (
                <Fragment key={`pooled-${band.id}`}>
                  <tr className="group/header border-border-1 border-b bg-[#F0FDF4] hover:bg-[#DCFCE7]">
                    <td colSpan={colCount} className="px-3 py-2 text-left">
                      <span className="text-[13px] font-bold text-[#15803D]">
                        {groups.length + bi + 1}.{' '}
                        {band.isCtv ? 'CTV' : band.isExchange ? 'F2' : 'Sale'} · {band.name}
                      </span>
                      <span className="ml-2 rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-bold text-[#166534]">
                        Chia gộp
                        {band.feePct != null ? ` · phí ${formatPct(band.feePct, 4)}` : ''}
                        {band.bonusPoolPct != null
                          ? ` · thưởng ${formatPct(band.bonusPoolPct, 2)} pool`
                          : band.bonus > 0
                            ? ' · thưởng theo số tiền'
                            : ''}
                      </span>
                      <span className="ml-2 text-[11px] text-neutral-400">
                        nhận độc lập — các sale/F2 còn lại chia phần còn lại theo tỷ lệ tham gia
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-[#F0FDF4] px-3 py-2 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] group-hover/header:bg-[#DCFCE7]">
                      {canEdit && (onEditPooled || onCancelPooled) && (
                        <div className="inline-flex items-center gap-1">
                          {onEditPooled && (
                            <button
                              type="button"
                              disabled={isDisbursementApproved}
                              onClick={() => onEditPooled(band)}
                              title={
                                isDisbursementApproved
                                  ? 'Đã duyệt chi thực nhận (Khóa sửa)'
                                  : 'Sửa chia gộp'
                              }
                              className={cn(
                                'border-border-1 inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                                isDisbursementApproved
                                  ? 'cursor-not-allowed bg-neutral-100 text-neutral-400 opacity-60'
                                  : 'hover:bg-neutral-30 bg-white text-neutral-700'
                              )}
                            >
                              <IconPencilsimple className="h-4 w-4" />
                            </button>
                          )}
                          {onCancelPooled && (
                            <button
                              type="button"
                              disabled={isDisbursementApproved}
                              onClick={() => onCancelPooled(band)}
                              title={
                                isDisbursementApproved
                                  ? 'Đã duyệt chi thực nhận (Khóa hủy)'
                                  : 'Hủy chia gộp — trả phần trừ về từng sale'
                              }
                              className={cn(
                                'border-border-1 inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                                isDisbursementApproved
                                  ? 'cursor-not-allowed bg-neutral-100 text-neutral-400 opacity-60'
                                  : 'bg-white text-red-500 hover:bg-red-50'
                              )}
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr className="group/row border-border-1 hover:bg-data-light-grey-hover border-b">
                    <td className={`${td} pl-6 text-left`}>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium text-neutral-900">{band.name}</span>
                        <span className="rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-[#166534]">
                          chia gộp{band.isCtv ? ' · CTV' : band.isExchange ? ' · sàn' : ''}
                        </span>
                        {hi.autoCert && (
                          <span
                            className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white"
                            title="Tạm giữ TỰ ĐỘNG theo chính sách chứng chỉ môi giới (CCMG) — bổ sung chứng chỉ hợp lệ để hệ thống tự gỡ."
                          >
                            {certChipLabel(bandRowForChips)}
                          </span>
                        )}
                        {hi.manual && (
                          <span
                            className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-amber-600"
                            title={
                              hi.pending
                                ? 'Kế toán đã đặt giữ theo người — hiệu lực và chốt số khi Duyệt chi thực nhận (thay thế phần giữ tự động nếu có).'
                                : 'Khoản của người này đang bị kế toán tạm giữ.'
                            }
                          >
                            {manualChipLabel(bandRowForChips)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={td}>{band.bonus !== 0 ? formatCurrencyVND(band.bonus) : '—'}</td>
                    {showPeriodBonusPct && (
                      <td className={td}>{formatPctFloor(periodBonusPct, 2)}</td>
                    )}
                    {/* Chia gộp cắt từ pool thưởng CĐT, không đụng Thưởng MV. */}
                    <td className={td}>—</td>
                    <td className={`${td} text-neutral-500`}>0</td>
                    <td className={td}>—</td>
                    <td className={td}>{formatPct(band.feePct, 4)}</td>
                    {showPeriodFeePct && <td className={td}>{formatPctFloor(periodFeePct, 2)}</td>}
                    <td className={td}>{band.fee !== 0 ? formatCurrencyVND(band.fee) : '—'}</td>
                    <td className={`${td} text-[#DC2626]`}>
                      {band.deduction > 0 ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span>-{formatCurrencyVND(band.deduction)}</span>
                          {band.deductionRatioPct != null && (
                            <span
                              className="text-[10px] text-neutral-400"
                              title="Giảm trừ gánh theo ĐÚNG tỷ lệ phí đã nhận. Muốn chia khác thì dùng Chia/Sửa từng nhóm."
                            >
                              {formatPct(band.deductionRatioPct, 2)} theo phí
                            </span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${td} font-medium`}>{formatCurrencyVND(payout.tongTra)}</td>
                    {!hideReceived && (
                      <td className={`${td} text-[#DC2626]`}>
                        {payout.tncn != null ? `-${formatCurrencyVND(payout.tncn)}` : '—'}
                      </td>
                    )}
                    {!hideReceived && (
                      <td
                        className={`${td} font-semibold ${payout.thucNhan < 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}
                      >
                        {formatCurrencyVND(payout.thucNhan)}
                      </td>
                    )}
                    {!hideHoldCols && (
                      <td className={`${td} font-medium text-[#D97706]`}>
                        {hi.preTax > 0 ? formatCurrencyVND(hi.preTax) : '0'}
                      </td>
                    )}
                    {!hideHoldCols && (
                      <td className={`${td} font-medium text-[#D97706]`}>
                        {hi.postTax > 0 ? formatCurrencyVND(hi.postTax) : '0'}
                      </td>
                    )}
                    <td className="group-hover/row:bg-data-light-grey-hover sticky right-0 z-10 bg-white px-3 py-1.5 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      {/* Same action rules as payee rows: manual -> release; cert PARTIAL ->
                          "hold the rest"; CTV fully cert-held -> no action (lifts via CCMG). */}
                      {canEdit &&
                        onHoldPooled &&
                        !band.isExchange &&
                        !(hi.autoCert && !hi.manual && band.isCtv) && (
                          <button
                            type="button"
                            disabled={isDisbursementApproved}
                            onClick={() => onHoldPooled(band)}
                            title={
                              isDisbursementApproved
                                ? 'Đã duyệt chi thực nhận (Khóa tạm giữ)'
                                : hi.manual
                                  ? 'Bỏ tạm giữ hoa hồng / thưởng cá nhân (không gỡ phần giữ tự động thiếu CCMG)'
                                  : hi.autoCert
                                    ? 'Giữ thêm phần còn lại (đang bị giữ tự động một phần do CCMG)'
                                    : 'Tạm giữ hoa hồng / thưởng cá nhân'
                            }
                            className={cn(
                              'border-border-1 inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                              isDisbursementApproved
                                ? 'cursor-not-allowed bg-neutral-100 text-neutral-400 opacity-60'
                                : hi.manual
                                  ? 'border-amber-200 bg-amber-50 text-[#D97706] hover:bg-amber-100'
                                  : 'hover:bg-neutral-30 bg-white text-neutral-700'
                            )}
                          >
                            {hi.manual ? (
                              <IconLock className="h-4 w-4" />
                            ) : (
                              <IconLockopen className="h-4 w-4" />
                            )}
                          </button>
                        )}
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 px-3 py-2 text-[11px] text-neutral-400">
        <span>Tổng trả = Thưởng + Phí từng sale</span>
        <span>Thực nhận = Tổng trả − TNCN − Tạm giữ trước thuế − Tạm giữ sau thuế</span>
        <span>TNCN: CTV 10% (preview), NV để trống</span>
        <span>Còn lại = Thực nhận − đã chi</span>
      </div>
    </div>
  )
}
