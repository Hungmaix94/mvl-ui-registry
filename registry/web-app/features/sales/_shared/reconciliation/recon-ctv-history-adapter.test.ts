import { describe, expect, it } from 'vitest'

import {
  CTVReconciliationPeriod_type,
  CTVReconciliationReconciliation_type,
  type components,
} from '@/api/schema'
import { ReconciliationStatus as Status } from '@/constants/api-schema-aliases'

import { mapCtvHistoryRowToCanonical } from './recon-ctv-history-adapter'
import { summarizeReconHistory } from './recon-history-summary'

type CtvRow = components['schemas']['CTVReconciliationHistory']

/**
 * Complete CTV history row — typed so a future schema regen that adds/renames a required field breaks
 * THIS fixture at compile time, forcing the adapter (and this contract test) to be revisited.
 *
 * PIT values: total_amount (pre-tax) 50tr → pit 5tr → total_amount_after_pit (net thực nhận) 45tr.
 */
function makeCtvRow(overrides: Partial<CtvRow> = {}): CtvRow {
  return {
    id: 99,
    code: 'DALVT-CRS0138-001',
    deal: 1576,
    product_inventory: 2130,
    product_inventory_detail: null,
    ctv_sheet: 138,
    ctv_sheet_detail: {
      id: 138,
      code: 'DALVT-CRS0138',
      status: Status.confirmed,
      reconciliation_date: '2026-06-17',
    },
    // BE PR #2847: quan hệ về phiếu CĐT gốc, FK NOT NULL nên serializer trả bắt buộc.
    // `investor_sheet` bên trong nested VẪN nullable — đó là id BẢNG mà link "Sinh từ" cần.
    parent_investor_reconciliation: 1580,
    parent_investor_reconciliation_detail: {
      id: 1580,
      code: 'DAAS2T-IRS1525-001',
      total_amount_with_vat: '132000000',
      status: Status.confirmed,
      investor_sheet: 1525,
    },
    collaborator: 88,
    collaborator_name: 'Nguyễn Văn CTV',
    superseded_by: null,
    reconciliation_type: CTVReconciliationReconciliation_type.advance,
    period_type: CTVReconciliationPeriod_type.normal_payment,
    listed_price: '15200000000',
    fee_calculation_price: '14988999666',
    pct_commission: '2',
    amt_payment_this_period: '45000000',
    progress_from_pct: '0',
    progress_to_pct: '15',
    retroactive_adjustment_amount: '0',
    shared_bonus_amount: '7497800',
    extra_bonus_pct: null,
    extra_bonus_amount: null,
    fee_deduction: '3000000',
    vat_rate: '0',
    sub_total_commission: '50000000',
    total_amount: '50000000',
    vat_amount: '0',
    total_amount_with_vat: '50000000',
    pit_rate: '10',
    pit_amount: '5000000',
    total_amount_after_pit: '45000000',
    note: '',
    status: Status.confirmed,
    confirmed_at: '2026-06-17T00:00:00Z',
    voided_at: null,
    voided_by: null,
    void_reason: '',
    created_by: null,
    created_at: '2026-06-17T00:00:00Z',
    updated_at: '2026-06-17T00:00:00Z',
    ...overrides,
  }
}

describe('mapCtvHistoryRowToCanonical', () => {
  it('renames the CTV commission line + sheet linkage onto the canonical fields', () => {
    const out = mapCtvHistoryRowToCanonical(makeCtvRow())

    expect(out.pct_agency_fee).toBe('2') // ← pct_commission
    expect(out.investor_sheet).toBe(138) // ← ctv_sheet
    expect(out.investor_sheet_detail.code).toBe('DALVT-CRS0138') // ← ctv_sheet_detail
    expect(out.investor_sheet_detail.reconciliation_date).toBe('2026-06-17')
    // CTV không có exchange đối chứng → source_exchange null; amt_agency_fee không dùng (chỉ pct).
    expect(out.source_exchange).toBeNull()
    expect(out.amt_agency_fee).toBeNull()
  })

  it('is PIT (no VAT): all include_vat flags false + amount = net after PIT', () => {
    const out = mapCtvHistoryRowToCanonical(makeCtvRow())

    expect(out.is_agency_fee_include_vat).toBe(false)
    expect(out.is_shared_bonus_include_vat).toBe(false)
    expect(out.is_extra_bonus_include_vat).toBe(false)
    expect(out.is_fee_deduction_include_vat).toBe(false)
    // "Thành tiền" ledger = tiền thực nhận sau TNCN; NET == Phải thu ⇒ không dòng VAT giả.
    expect(out.total_amount).toBe('45000000') // ← total_amount_after_pit (was 50tr pre-tax)
    expect(out.total_amount_with_vat).toBe('45000000') // ← total_amount_after_pit
  })

  it('passes common fields through unchanged', () => {
    const out = mapCtvHistoryRowToCanonical(makeCtvRow())

    expect(out.status).toBe(Status.confirmed)
    expect(out.period_type).toBe(CTVReconciliationPeriod_type.normal_payment)
    expect(out.fee_calculation_price).toBe('14988999666')
    expect(out.progress_to_pct).toBe('15')
  })

  it('fills rich-only (investor) fields absent on the simple CTV profile with safe defaults', () => {
    const out = mapCtvHistoryRowToCanonical(makeCtvRow())

    expect(out.commission_fee_calculation_price).toBeNull()
    expect(out.base_pct_agency_fee).toBeNull()
    expect(out.extra_bonus_progress_from_pct).toBeNull()
    expect(out.extra_bonus_period_amount).toBeNull()
    // CTV bonus (mirror F2): shared_bonus_amount → recognized-this-period; pct/to_sale_pct null.
    expect(out.shared_bonus_period_amount).toBe('7497800')
    expect(out.shared_bonus_pct).toBeNull()
    expect(out.shared_bonus_to_sale_pct).toBeNull()
    expect(out.investor).toBe(0)
    expect(out.project).toBe(0)
    expect(out.amount_retained).toBeNull()
    expect(out.cancellation_reason).toBe('')
    expect(out.reject_reason).toBe('')
    expect(out.submitted_at).toBeNull()
    expect(out.approved_at).toBeNull()
  })

  it('coerces a null product_inventory to 0 (canonical field is non-nullable)', () => {
    const out = mapCtvHistoryRowToCanonical(makeCtvRow({ product_inventory: null }))
    expect(out.product_inventory).toBe(0)
  })

  it('produces rows the canonical history summariser consumes (ctv_sheet drives round filtering)', () => {
    const rows = [
      makeCtvRow({
        id: 20,
        ctv_sheet: 140,
        total_amount_after_pit: '20000000',
        progress_to_pct: '30',
      }),
      makeCtvRow({
        id: 10,
        ctv_sheet: 138,
        total_amount_after_pit: '45000000',
        progress_to_pct: '15',
      }),
    ].map(mapCtvHistoryRowToCanonical)

    // Cumulative reads total_amount_with_vat (= after-PIT sau adapter) → 20tr + 45tr.
    const all = summarizeReconHistory(rows)
    expect(all.cumulativeAmount).toBe(65_000_000)
    expect(all.latestProgressToPct).toBe(30)

    // Excluding the current CTV sheet (140) drops only its row — proves ctv_sheet → investor_sheet.
    const excludingCurrent = summarizeReconHistory(rows, 140)
    expect(excludingCurrent.cumulativeAmount).toBe(45_000_000)
  })
})
