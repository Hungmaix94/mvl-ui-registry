import { describe, expect, it } from 'vitest'

import { ReconciliationStatus as Status } from '@/constants/api-schema-aliases'

import { summarizeReconHistory } from './recon-history-summary'

type Rows = Parameters<typeof summarizeReconHistory>[0]

// API trả mới→cũ. `id` đồng biến thứ tự tạo (per-căn) ⇒ id lớn = kỳ tạo sau.
const rows = [
  {
    id: 30,
    investor_sheet: 903,
    status: Status.confirmed,
    total_amount_with_vat: '7000000',
    progress_to_pct: '60',
  },
  {
    id: 20,
    investor_sheet: 902,
    status: Status.confirmed,
    total_amount_with_vat: '11000000',
    progress_to_pct: '30',
  },
  {
    id: 10,
    investor_sheet: 901,
    status: Status.confirmed,
    total_amount_with_vat: '4000000',
    progress_to_pct: '15',
  },
] as Rows

describe('summarizeReconHistory', () => {
  it('counts all rows but accumulates only CONFIRMED with-VAT totals (no current sheet = create)', () => {
    const s = summarizeReconHistory(rows)
    expect(s.count).toBe(3)
    expect(s.hasHistory).toBe(true)
    expect(s.cumulativeAmount).toBe(22_000_000) // 7 + 11 + 4
    expect(s.latestProgressToPct).toBe(60) // newest countable row
    expect(s.maxConfirmedProgressToPct).toBe(60)
  })

  it('DISPLAY fields reflect every OTHER period, but the retro BASELINE is strictly-prior only', () => {
    // Viewing sheet 902 (id 20). Header/display must still reflect the later sheet 903 (id 30) — the căn
    // has been reconciled further. But the truy-hồi baseline (maxConfirmed + agreed terms) must use ONLY
    // the earlier sheet 901 (id 10): the later period must NOT inflate the retroactive calculation.
    const s = summarizeReconHistory(rows, 902)
    expect(s.count).toBe(3) // allRows length unchanged
    expect(s.hasHistory).toBe(true)
    expect(s.cumulativeAmount).toBe(11_000_000) // display: 903 (7) + 901 (4), self (902) excluded
    expect(s.latestProgressToPct).toBe(60) // display: latest across other periods (incl. later 903)
    expect(s.maxConfirmedProgressToPct).toBe(15) // baseline: only the EARLIER period (NOT 60)
  })

  it('earliest period still shows căn history in the header, but has NO retro baseline', () => {
    // Viewing the earliest sheet 901 (id 10): later periods 902/903 still count for DISPLAY (so the
    // header is NOT "first reconciliation"), yet nothing precedes it ⇒ truy hồi baseline = empty ⇒ 0.
    const s = summarizeReconHistory(rows, 901)
    expect(s.hasHistory).toBe(true) // other periods exist ⇒ not the "first reconciliation" text
    expect(s.cumulativeAmount).toBe(18_000_000) // display: 903 (7) + 902 (11)
    expect(s.latestProgressToPct).toBe(60) // display: căn reconciled up to 60% overall
    expect(s.maxConfirmedProgressToPct).toBeNull() // baseline: nothing before it ⇒ retro = 0
    expect(s.latestConfirmedAgreedTerms).toBeNull()
  })

  it('latest confirmed fields fall back to null base when legacy rows lack base_progress_to_pct', () => {
    // The shared `rows` carry no base_progress_to_pct ⇒ base is null, progress is the newest confirmed.
    const s = summarizeReconHistory(rows)
    expect(s.latestConfirmedProgressToPct).toBe(60)
    expect(s.latestConfirmedBaseProgressToPct).toBeNull()
  })
})

// "Đã ĐC <%>" + "ĐC base <%>" = kỳ confirmed MỚI NHẤT của căn, tính trên TẤT CẢ kỳ (gồm phiếu đang
// xem), CHỈ confirmed (bỏ nháp/chờ duyệt). Khác `latestProgressToPct` (mới nhất trong các kỳ KHÁC).
describe('summarizeReconHistory — latest confirmed (header "Đã ĐC / ĐC base")', () => {
  const confirmedWithBase = [
    {
      id: 1393,
      investor_sheet: 1360,
      status: Status.confirmed,
      progress_to_pct: '50.00',
      base_progress_to_pct: '50.49',
    },
    {
      id: 1170,
      investor_sheet: 1181,
      status: Status.confirmed,
      progress_to_pct: '40.00',
      base_progress_to_pct: '40.39',
    },
    {
      id: 1168,
      investor_sheet: 1180,
      status: Status.confirmed,
      progress_to_pct: '20.00',
      base_progress_to_pct: '20.20',
    },
  ] as Rows

  it('reflects the latest confirmed period EVEN when it is the one being viewed (no exclusion)', () => {
    // Recon 1360: viewing the newest confirmed sheet — "Đã ĐC" must be its own 50% / 50,49%, NOT the
    // prior period's 40%. Contrast latestProgressToPct (over OTHER rows) which drops back to 40.
    const s = summarizeReconHistory(confirmedWithBase, 1360)
    expect(s.latestConfirmedProgressToPct).toBe(50)
    expect(s.latestConfirmedBaseProgressToPct).toBe(50.49)
    expect(s.latestProgressToPct).toBe(40)
  })

  it('ignores a NEWER draft period — only confirmed counts (recon 1384 case)', () => {
    const rowsWithDraft = [
      {
        id: 1419,
        investor_sheet: 1385,
        status: Status.draft,
        progress_to_pct: '22.00',
        base_progress_to_pct: '22.02',
      },
      {
        id: 1418,
        investor_sheet: 1384,
        status: Status.confirmed,
        progress_to_pct: '10.00',
        base_progress_to_pct: '10.00',
      },
    ] as Rows
    const s = summarizeReconHistory(rowsWithDraft, 1384)
    expect(s.latestConfirmedProgressToPct).toBe(10)
    expect(s.latestConfirmedBaseProgressToPct).toBe(10)
  })

  it('confirmed-fee-deduction totals are 0 when rows carry no deduction fields', () => {
    const s = summarizeReconHistory(confirmedWithBase)
    expect(s.confirmedFeeDeductionTotal).toBe(0)
    expect(s.confirmedFeeDeductionToSaleTotal).toBe(0)
  })

  it('is null when no confirmed period exists yet (first draft)', () => {
    const draftOnly = [
      {
        id: 5,
        investor_sheet: 5,
        status: Status.draft,
        progress_to_pct: '5.00',
        base_progress_to_pct: '5.05',
      },
    ] as Rows
    const s = summarizeReconHistory(draftOnly)
    expect(s.latestConfirmedProgressToPct).toBeNull()
    expect(s.latestConfirmedBaseProgressToPct).toBeNull()
  })
})

// Lũy kế giảm trừ các kỳ ĐÃ DUYỆT — CỐ Ý confirmed-only + PRE-VAT (mirror `prior_fee_deduction_total`
// / `prior_fee_deduction_to_sale_total` của BE), KHÁC tổng gồm-VAT của computeReconSettlement.
describe('summarizeReconHistory — confirmed fee-deduction cumulative (pre-VAT)', () => {
  const deductionRows = [
    {
      // Nhập GỒM VAT 10% ⇒ quy về trước VAT: 2.200.000 / 1,1 = 2.000.000; sale 1.100.000 / 1,1 = 1.000.000.
      id: 40,
      investor_sheet: 904,
      status: Status.confirmed,
      fee_deduction: '2200000',
      fee_deduction_to_sale_amount: '1100000',
      is_fee_deduction_include_vat: true,
      vat_rate: '10',
    },
    {
      // Nhập CHƯA gồm VAT ⇒ giữ nguyên; sale null ⇒ 0.
      id: 30,
      investor_sheet: 903,
      status: Status.confirmed,
      fee_deduction: '3000000',
      fee_deduction_to_sale_amount: null,
      is_fee_deduction_include_vat: false,
      vat_rate: '10',
    },
    {
      // DRAFT ⇒ KHÔNG tính (confirmed-only).
      id: 20,
      investor_sheet: 902,
      status: Status.draft,
      fee_deduction: '9000000',
      fee_deduction_to_sale_amount: '9000000',
      is_fee_deduction_include_vat: false,
      vat_rate: '10',
    },
    {
      // GỒM VAT nhưng vat_rate null (dữ liệu cũ) ⇒ resolveReconVatRate fallback 10%: 1.100.000/1,1 = 1.000.000.
      id: 10,
      investor_sheet: 901,
      status: Status.confirmed,
      fee_deduction: '1100000',
      fee_deduction_to_sale_amount: '550000',
      is_fee_deduction_include_vat: true,
      vat_rate: null,
    },
  ] as Rows

  it('sums CONFIRMED rows only, normalizing each row to pre-VAT by its own flag/rate', () => {
    const s = summarizeReconHistory(deductionRows)
    // 2.000.000 (÷1,1) + 3.000.000 (giữ nguyên) + 1.000.000 (÷1,1, rate mặc định) — draft bỏ qua.
    expect(s.confirmedFeeDeductionTotal).toBeCloseTo(6_000_000)
    // 1.000.000 + 0 (null→0) + 500.000
    expect(s.confirmedFeeDeductionToSaleTotal).toBeCloseTo(1_500_000)
  })

  it('excludes the sheet being viewed via the existing exclusion mechanism', () => {
    const s = summarizeReconHistory(deductionRows, 904)
    expect(s.confirmedFeeDeductionTotal).toBeCloseTo(4_000_000) // 3.000.000 + 1.000.000
    expect(s.confirmedFeeDeductionToSaleTotal).toBeCloseTo(500_000)
  })

  it('returns zeros for an empty history', () => {
    const s = summarizeReconHistory([])
    expect(s.confirmedFeeDeductionTotal).toBe(0)
    expect(s.confirmedFeeDeductionToSaleTotal).toBe(0)
  })
})

// Chế độ phí đại lý đã "chốt" của căn = chế độ (pct/amt) của các kỳ ĐÃ DUYỆT khác. FE dùng để cảnh báo
// sớm khi kỳ đang nhập chọn lệch, trước khi BE (_validate_agency_fee_mode_consistency) chặn lúc xác nhận.
describe('summarizeReconHistory — established agency fee mode', () => {
  it("returns 'pct' when confirmed prior periods use pct_agency_fee", () => {
    const rows = [
      { id: 20, investor_sheet: 902, status: Status.confirmed, pct_agency_fee: '2.5' },
      { id: 10, investor_sheet: 901, status: Status.confirmed, pct_agency_fee: '2.5' },
    ] as Rows
    expect(summarizeReconHistory(rows).establishedAgencyFeeMode).toBe('pct')
  })

  it("returns 'amt' when confirmed prior periods use amt_agency_fee", () => {
    const rows = [
      { id: 10, investor_sheet: 901, status: Status.confirmed, amt_agency_fee: '5000000' },
    ] as Rows
    expect(summarizeReconHistory(rows).establishedAgencyFeeMode).toBe('amt')
  })

  it('is null when no confirmed period exists yet (only a draft)', () => {
    const rows = [
      { id: 10, investor_sheet: 901, status: Status.draft, pct_agency_fee: '2.5' },
    ] as Rows
    expect(summarizeReconHistory(rows).establishedAgencyFeeMode).toBeNull()
  })

  it('ignores the sheet being viewed — a căn with only its own draft has no established mode', () => {
    const rows = [
      { id: 30, investor_sheet: 903, status: Status.confirmed, amt_agency_fee: '5000000' },
      { id: 20, investor_sheet: 902, status: Status.confirmed, amt_agency_fee: '5000000' },
    ] as Rows
    // Viewing 902 still sees the OTHER confirmed period 903 ⇒ established 'amt'.
    expect(summarizeReconHistory(rows, 902).establishedAgencyFeeMode).toBe('amt')
  })

  it('empty history ⇒ null', () => {
    expect(summarizeReconHistory([]).establishedAgencyFeeMode).toBeNull()
  })
})
