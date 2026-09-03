/**
 * Calculates the total and details of prior allocations for a specific recipient and commission type.
 */
export function getPriorAllocation(
  r: {
    employee_id?: string | number | null
    collaborator_id?: string | number | null
    exchange_id?: string | number | null
  },
  pctType: string,
  previousPeriods: any[] = []
) {
  let total = 0
  const details: { code: string; amount: number }[] = []

  if (!previousPeriods || previousPeriods.length === 0) {
    return { total, details }
  }

  previousPeriods.forEach((period: any) => {
    const positions = period.positions || []
    positions.forEach((pos: any) => {
      if (pos.pct_type !== pctType) return

      const recipients = pos.recipients || []
      recipients.forEach((rec: any) => {
        let isMatch = false
        const empId = rec.employee_id || rec.recipient_employee?.id
        const collabId = rec.collaborator_id || rec.recipient_collaborator?.id
        const exchId = rec.exchange_id || rec.recipient_exchange?.id

        if (r.employee_id && empId && String(empId) === String(r.employee_id)) {
          isMatch = true
        } else if (
          r.collaborator_id &&
          collabId &&
          String(collabId) === String(r.collaborator_id)
        ) {
          isMatch = true
        } else if (r.exchange_id && exchId && String(exchId) === String(r.exchange_id)) {
          isMatch = true
        }

        if (isMatch) {
          const amt = Number(rec.amount || 0)
          if (amt > 0) {
            total += amt
            details.push({
              code: `Kỳ ${String(period.period_month).padStart(2, '0')}/${period.period_year}`,
              amount: amt,
            })
          }
        }
      })
    })
  })

  return { total, details }
}

/** Parse một ô % của BE: phân biệt "không có giá trị" với số 0 hợp lệ (dial ghim 0%). */
function pctCandidate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export type WorksheetPaymentPctRow = {
  fee_progress_pct?: string | number | null
  total_distribution_pct?: string | number | null
  paid_pct?: string | number | null
}

/**
 * "% Thanh toán" của một dòng worksheet (deal × kỳ) trên danh sách 20.8.
 *
 * Thứ tự ưu tiên:
 * 1. `fee_progress_pct` — dial % TT phí kế toán đã ghim cho kỳ. Đây là con số điều khiển
 *    tiền chi thực tế của kỳ, nên nó phải là con số màn danh sách hiển thị (khớp Mục 3
 *    của màn chi tiết). Ghim 0% là giá trị hợp lệ, KHÔNG được coi là "chưa ghim".
 * 2. `total_distribution_pct` — kỳ chưa ghim dial: dùng Σ distribution_pct, tức
 *    `fee_cash / (agency_fee_gross − total_fee_deduction)`. Cùng mẫu số `fee_base_net`
 *    với `fee_collected_cap_pct` (trần Mục 2, BE PR #2856) nên hai màn không lệch nhau,
 *    và đây cũng đúng là auto-default của dial phí bên BE
 *    (`worksheet_service.default_dials`: `fee_default = min(Σ distribution_pct, cap)`).
 * 3. `paid_pct` — chỉ là lưới an toàn cho payload cũ thiếu field trên. KHÔNG dùng làm
 *    nguồn chính: mẫu số của nó là phí GROSS (chưa trừ giảm trừ) và tử là tiền phiếu thu
 *    trong kỳ, nên nó lệch trần mỗi khi deal có giảm trừ / truy hồi / xuất theo giá cũ.
 */
export function worksheetPaymentPct(row: WorksheetPaymentPctRow): number {
  return (
    pctCandidate(row.fee_progress_pct) ??
    pctCandidate(row.total_distribution_pct) ??
    pctCandidate(row.paid_pct) ??
    0
  )
}

/** True khi con số hiển thị là dial kế toán ghim, không phải % tiền về suy ra. */
export function isWorksheetPaymentPctPinned(row: WorksheetPaymentPctRow): boolean {
  return pctCandidate(row.fee_progress_pct) !== null
}

/**
 * Dynamically computes pct_of_parent for each split item proportional to its amount,
 * ensuring they are all non-negative, and the sum of percentages is exactly 100.00%.
 */
export function redistributePercentages<
  T extends { amount: string | number; pct_of_parent: string },
>(splits: T[]): T[] {
  if (splits.length === 0) return splits

  const totalAmount = splits.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  let remainingPct = 100.0
  const len = splits.length

  splits.forEach((split, idx) => {
    if (idx === len - 1) {
      split.pct_of_parent = remainingPct.toFixed(2)
    } else {
      // `!== 0`, không phải `> 0`: nhóm giảm trừ mang tiền ÂM nên tổng cũng âm — âm/âm vẫn
      // ra tỉ lệ dương đúng. Chặn theo `> 0` là rơi vào nhánh chia đều: một dòng gánh hết
      // vẫn bị ghi 50%.
      const rawPct = totalAmount !== 0 ? (Number(split.amount || 0) / totalAmount) * 100 : 100 / len
      const pct = Math.max(0, Math.min(remainingPct, Math.round(rawPct * 100) / 100))
      split.pct_of_parent = pct.toFixed(2)
      remainingPct = Math.round((remainingPct - pct) * 100) / 100
    }
  })

  return splits
}
