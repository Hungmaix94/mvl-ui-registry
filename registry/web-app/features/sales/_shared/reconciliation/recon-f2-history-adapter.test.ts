import { describe, expect, it } from 'vitest'

import {
  CTVReconciliationPeriod_type,
  CTVReconciliationReconciliation_type,
  LinkedExchangeRevenueLineF2_source,
  type components,
} from '@/api/schema'
import { ReconciliationStatus as Status } from '@/constants/api-schema-aliases'

import { mapF2HistoryRowToCanonical } from './recon-f2-history-adapter'
import { summarizeReconHistory } from './recon-history-summary'

type F2Row = components['schemas']['F2ReconciliationHistory']

/**
 * Complete F2 history row — typed so a future schema regen that adds/renames a required field breaks
 * THIS fixture at compile time, forcing the adapter (and this contract test) to be revisited.
 */
function makeF2Row(overrides: Partial<F2Row> = {}): F2Row {
  return {
    id: 99,
    code: 'DALVT-FRS0138-001',
    deal: 1576,
    product_inventory: 2130,
    product_inventory_detail: null,
    f2_sheet: 138,
    f2_sheet_detail: {
      id: 138,
      code: 'DALVT-FRS0138',
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
    exchange: 1896,
    exchange_name: 'Sàn F0 Minh trí',
    superseded_by: null,
    f2_source: LinkedExchangeRevenueLineF2_source.company,
    reconciliation_type: CTVReconciliationReconciliation_type.advance,
    period_type: CTVReconciliationPeriod_type.normal_payment,
    listed_price: '15200000000',
    fee_calculation_price: '14988999666',
    pct_commission: '2',
    amt_agency_fee: null,
    is_commission_include_vat: true,
    amt_payment_this_period: '72464799',
    progress_from_pct: '0',
    progress_to_pct: '15',
    retroactive_adjustment_amount: '0',
    shared_bonus_amount: '7497800',
    is_shared_bonus_include_vat: false,
    extra_bonus_pct: null,
    extra_bonus_amount: null,
    is_extra_bonus_include_vat: false,
    fee_deduction: '3000000',
    is_fee_deduction_include_vat: false,
    vat_rate: '10',
    sub_total_commission: '49414579',
    total_amount: '49914579',
    vat_amount: '4537689',
    total_amount_with_vat: '49914579',
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

describe('mapF2HistoryRowToCanonical', () => {
  it('renames the F2 commission line + sheet linkage onto the canonical fields', () => {
    const out = mapF2HistoryRowToCanonical(makeF2Row())

    expect(out.pct_agency_fee).toBe('2') // ← pct_commission
    expect(out.is_agency_fee_include_vat).toBe(true) // ← is_commission_include_vat
    expect(out.investor_sheet).toBe(138) // ← f2_sheet
    expect(out.investor_sheet_detail.code).toBe('DALVT-FRS0138') // ← f2_sheet_detail
    expect(out.investor_sheet_detail.reconciliation_date).toBe('2026-06-17')
    expect(out.source_exchange).toBe(1896) // ← exchange
  })

  it('passes common fields through unchanged', () => {
    const out = mapF2HistoryRowToCanonical(makeF2Row())

    expect(out.status).toBe(Status.confirmed)
    expect(out.period_type).toBe(CTVReconciliationPeriod_type.normal_payment)
    expect(out.fee_calculation_price).toBe('14988999666')
    expect(out.progress_to_pct).toBe('15')
    expect(out.total_amount_with_vat).toBe('49914579')
    expect(out.amt_agency_fee).toBeNull()
    expect(out.extra_bonus_pct).toBeNull()
  })

  it('fills rich-only (investor) fields absent on the simple F2 profile with safe defaults', () => {
    const out = mapF2HistoryRowToCanonical(makeF2Row())

    expect(out.commission_fee_calculation_price).toBeNull()
    expect(out.extra_bonus_progress_from_pct).toBeNull()
    expect(out.extra_bonus_progress_to_pct).toBeNull()
    expect(out.extra_bonus_period_amount).toBeNull()
    // F2 share maps onto the canonical recognized-this-period bonus; pct/to_sale_pct stay null.
    expect(out.shared_bonus_period_amount).toBe('7497800')
    expect(out.shared_bonus_pct).toBeNull()
    expect(out.shared_bonus_to_sale_pct).toBeNull()
    expect(out.fee_deduction_to_sale_amount).toBeNull()
    expect(out.amount_retained).toBeNull()
    expect(out.prior_received_total).toBeNull()
    expect(out.amount_to_refund).toBeNull()
    expect(out.cancellation_reason).toBe('')
    expect(out.reject_reason).toBe('')
    expect(out.submitted_at).toBeNull()
    expect(out.approved_at).toBeNull()
    expect(out.rejected_at).toBeNull()
  })

  it('coerces a null product_inventory to 0 (canonical field is non-nullable)', () => {
    const out = mapF2HistoryRowToCanonical(makeF2Row({ product_inventory: null }))
    expect(out.product_inventory).toBe(0)
  })

  it('produces rows the canonical history summariser consumes (f2_sheet drives round filtering)', () => {
    const rows = [
      makeF2Row({
        id: 20,
        f2_sheet: 140,
        total_amount_with_vat: '20000000',
        progress_to_pct: '30',
      }),
      makeF2Row({
        id: 10,
        f2_sheet: 138,
        total_amount_with_vat: '10000000',
        progress_to_pct: '15',
      }),
    ].map(mapF2HistoryRowToCanonical)

    const all = summarizeReconHistory(rows)
    expect(all.cumulativeAmount).toBe(30_000_000)
    expect(all.latestProgressToPct).toBe(30)

    // Excluding the current F2 sheet (140) must drop only its row — proves f2_sheet → investor_sheet.
    const excludingCurrent = summarizeReconHistory(rows, 140)
    expect(excludingCurrent.cumulativeAmount).toBe(10_000_000)
  })
})
