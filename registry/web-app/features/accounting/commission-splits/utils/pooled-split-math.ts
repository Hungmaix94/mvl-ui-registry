/**
 * Pure math for the pooled split (chia gop cho doi tuong khac) — the accountant's
 * spreadsheet flow: one outside payee takes `x` percent (against the deal
 * fee-calculation basis) and every stand person keeps their own percent minus a
 * pro-rata cut that follows the participation ratio:
 *
 *   cutPct_i   = x × sharePct_i / ΣsharePct
 *   afterPct_i = sharePct_i − cutPct_i
 *
 * Period money scales by the same x/Σ ratio against each group's period allocation;
 * the last row absorbs integer-rounding drift so the cut amounts sum exactly to the
 * payee's period total. The BE recomputes the authoritative per-RAL amounts on save —
 * this preview must only agree with the BE up to display rounding.
 */

export interface PooledMathGroup {
  /** Stand-level "% phí từng sale" of the group (share percentage). */
  sharePct: number
  /** Fee money allocated to the group this period (worksheet grain). */
  feeExpected: number
  /** Portion of feeExpected still on the stand person's own row (cut ceiling). */
  ownerAmount: number
  /** Bonus money allocated to the group this period (BONUS channel pool share). */
  bonusExpected?: number
  /** Deduction allocated to the group this period — NEGATIVE money. */
  deductionExpected?: number
}

export interface PooledMathRow<G extends PooledMathGroup> {
  group: G
  cutPct: number
  cutAmount: number
  afterPct: number
  afterAmount: number
  insufficient: boolean
  /** Bonus taken from this group by the BONUS channel. */
  bonusCutAmount: number
  /**
   * Deduction the payee takes off this group — NEGATIVE, and derived from the FEE ratio
   * only (the BONUS channel never feeds it). 0 when the payee takes no fee.
   */
  deductionCutAmount: number
}

export interface PooledMathResult<G extends PooledMathGroup> {
  rows: PooledMathRow<G>[]
  /** Payee FEE money this period (sum of the per-group cuts, exact). */
  payeeAmount: number
  /** Payee money over the whole deal: x% × basis. */
  payeeFullAmount: number
  /** Payee BONUS money this period. */
  payeeBonusAmount: number
  /** Payee DEDUCTION this period — NEGATIVE. */
  payeeDeductionAmount: number
  /** fee + bonus + deduction — the band's "Tổng trả". */
  payeeTotalAmount: number
}

export interface PooledBonusInput {
  /** % (0-100) of this period's allocated bonus pool. Mutually exclusive with `amount`. */
  poolPct?: number | null
  /** Absolute VND out of this period's allocated bonus pool. */
  amount?: number | null
}

/**
 * Fan an integral total across weights, last row absorbing the drift so the parts sum
 * exactly to `total`. Sign-agnostic (deduction weights/totals are negative).
 */
function fanExact(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((s, w) => s + w, 0)
  if (!weights.length) return []
  if (weightSum === 0) return weights.map(() => 0)
  let running = 0
  return weights.map((w, idx) => {
    if (idx === weights.length - 1) return total - running
    const part = Math.round(total * (w / weightSum))
    running += part
    return part
  })
}

export function computePooledSplit<G extends PooledMathGroup>(
  groups: G[],
  x: number,
  feeBasis: number,
  bonus?: PooledBonusInput
): PooledMathResult<G> | null {
  const totalSharePct = groups.reduce((s, g) => s + g.sharePct, 0)
  if (!groups.length || totalSharePct <= 0) return null
  const totalFeeExpected = groups.reduce((s, g) => s + g.feeExpected, 0)
  const ratio = totalSharePct > 0 ? x / totalSharePct : 0
  const payeeAmount = Math.round(totalFeeExpected * ratio)

  // BONUS: a slice of THIS period's allocated bonus pool, fanned by each group's share.
  const bonusWeights = groups.map((g) => g.bonusExpected || 0)
  const bonusPool = bonusWeights.reduce((s, w) => s + w, 0)
  const bonusTarget =
    bonus?.amount != null
      ? Math.min(bonus.amount, bonusPool)
      : bonus?.poolPct != null
        ? Math.round(bonusPool * (bonus.poolPct / 100))
        : 0
  const bonusCuts = fanExact(bonusTarget, bonusWeights)

  // DEDUCTION: no input — each group's deduction times the FEE ratio taken FROM THAT GROUP.
  // Per group (not one global ratio) mirrors the BE, and degrades to 0 with no fee.
  let feeRunning = 0
  const feeCuts = groups.map((group, idx) => {
    if (idx === groups.length - 1) return payeeAmount - feeRunning
    const cut = Math.round(group.feeExpected * ratio)
    feeRunning += cut
    return cut
  })
  const deductionCuts = groups.map((group, idx) => {
    const feeAllocated = group.feeExpected
    if (!feeAllocated) return 0
    const groupRatio = Math.min(feeCuts[idx] / feeAllocated, 1)
    return Math.round((group.deductionExpected || 0) * groupRatio)
  })

  const rows = groups.map((group, idx) => {
    const cutPct = x * (group.sharePct / totalSharePct)
    const cutAmount = feeCuts[idx]
    return {
      group,
      cutPct,
      cutAmount,
      afterPct: group.sharePct - cutPct,
      afterAmount: group.feeExpected - cutAmount,
      // Sign-aware: "dòng chính chủ không gánh nổi phần cắt" nghĩa là phần cắt ĐI XA 0 hơn
      // dòng chính chủ. Với tiền âm (dòng đòi lại) thì `cutAmount > ownerAmount` đọc ngược —
      // -300k > -1tr ra true và nút Lưu tắt vĩnh viễn dù thừa sức cắt.
      insufficient:
        group.ownerAmount >= 0
          ? cutAmount > group.ownerAmount + 1
          : cutAmount < group.ownerAmount - 1,
      bonusCutAmount: bonusCuts[idx] || 0,
      deductionCutAmount: deductionCuts[idx] || 0,
    }
  })

  const payeeBonusAmount = bonusCuts.reduce((s, v) => s + v, 0)
  const payeeDeductionAmount = deductionCuts.reduce((s, v) => s + v, 0)
  return {
    rows,
    payeeAmount,
    payeeFullAmount: Math.round((x / 100) * feeBasis),
    payeeBonusAmount,
    payeeDeductionAmount,
    payeeTotalAmount: payeeAmount + payeeBonusAmount + payeeDeductionAmount,
  }
}
