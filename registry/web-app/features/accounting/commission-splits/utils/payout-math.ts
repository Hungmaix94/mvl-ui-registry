// Single source of truth for the "chia thực nhận" per-payee money derivation, shared by the
// read pivot (RecipientPayoutTable) and the edit modal (RecipientSplitEditor) so the two never
// drift. TNCN is a FE preview only — the authoritative PIT/net lives on the BE payee account.
export const CTV_PIT_RATE = 0.1

// Reconciliation fee-deduction bucket (BE rule (b), PR #2735): the position carries
// is_deduction=true and NEGATIVE amounts. The FE keeps its historical convention of
// handling the deduction as a POSITIVE magnitude in derivePayout/rows, so callers
// normalise with Math.abs at the ingestion point. Prefer the BE flag; the pct_type
// match keeps older cached payloads working.
//
// KHÔNG dùng cờ này để hỏi "dòng này có được phép âm không". Từ 2026-08-06 một dòng
// phí/thưởng THƯỜNG (`is_deduction: false`) cũng mang số âm khi BE thu hồi phần chi dư.
// Cờ chỉ trả lời "dòng này có thuộc kênh giảm trừ không" — dấu thì đọc từ chính con số.
export const isDeductionType = (posData: { is_deduction?: boolean; pct_type?: string }): boolean =>
  posData?.is_deduction === true ||
  posData?.pct_type === 'pct_fee_deduction_to_sale' ||
  posData?.pct_type === 'pct_fee_deduction_to_f2' ||
  posData?.pct_type === 'fee_deduction'

/**
 * Tiền THỰC RA của một dòng sau khi trừ phần giữ lại — kẹp 0 đúng một phía.
 *
 * Dải DƯƠNG: khoản giữ có thể vượt tiền của dòng (giữ theo tài khoản trừ vào một dải), nên
 * kẹp ở 0 — chi ra âm là vô nghĩa.
 * Dải ÂM: đó là khoản ĐÒI LẠI (BE thu hồi phần chi dư, 2026-08-06) và phải giữ nguyên dấu;
 * kẹp về 0 làm ô hiện 0 và ô TỔNG cộng thiếu so với BE.
 *
 * Cùng quy ước với `thucNhan` trong `derivePayout`.
 */
export function netAfterHold(amount: number, hold: number): number {
  const net = amount - hold
  return amount >= 0 ? Math.max(0, net) : net
}

export function derivePayout({
  bonus,
  fee,
  deduction = 0,
  isCtv,
  paid,
  preTaxHold = 0,
  postTaxHold = 0,
}: {
  bonus: number
  fee: number
  deduction?: number
  isCtv: boolean
  paid: number
  preTaxHold?: number
  postTaxHold?: number
}) {
  const tongTra = bonus + fee - deduction
  // pre-tax hold reduces the taxable base for CTVs
  const taxableIncome = Math.max(0, tongTra - preTaxHold)
  const tncn = isCtv ? Math.round(CTV_PIT_RATE * taxableIncome) : null
  // net payout = gross payout minus PIT tax minus holds.
  // A hold withholds money that is PART of the gross — it can zero out the net but never
  // make it negative. The original over-hold that made this floor load-bearing is FIXED on
  // the BE (the cert hold now nets the giảm-trừ share instead of skipping it, so the payee's
  // held total is 20% of what they actually net). The floor stays as a safety net for the
  // remaining case: a deal-wide account hold subtracted from a single band slice (a payee
  // appearing in several bands). A genuinely net-negative band (deduction > commission, no
  // holds) is kept as-is — only the hold subtraction is floored.
  const netBeforeHold = tongTra - (tncn ?? 0)
  const thucNhan =
    netBeforeHold >= 0 ? Math.max(0, netBeforeHold - preTaxHold - postTaxHold) : netBeforeHold
  // Kẹp 0 chỉ cho dải DƯƠNG (đã trả nhiều hơn thực nhận thì không còn gì để chi). Một dải
  // ÂM là khoản ĐÒI LẠI (BE thu hồi phần chi dư, 2026-08-06) — kẹp về 0 ở đây làm cột
  // "còn lại" hiện 0, đọc thành "không còn gì" trong khi đang có nợ.
  const remaining = thucNhan - paid
  const conLai = thucNhan >= 0 ? Math.max(0, remaining) : remaining
  return { tongTra, tncn, thucNhan, conLai }
}
