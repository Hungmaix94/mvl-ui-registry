import { describe, expect, it } from 'vitest'

import { isSimpleProfile } from '@/features/sales/_shared/reconciliation/recon-kind'
import { f2ReconciliationConfig } from '@/features/sales/f2-reconciliations/config/f2-reconciliation-config'

describe('f2ReconciliationConfig (simple/Sàn F2 preset)', () => {
  it('is the simple F2 profile: no manual create, no manual invoice', () => {
    expect(f2ReconciliationConfig.kind).toBe('f2')
    expect(f2ReconciliationConfig.counterpartyLabel).toBe('Sàn F2')
    expect(f2ReconciliationConfig.proposalColumnLabel).toBe('F2 đề nghị')
    expect(f2ReconciliationConfig.payerLabel).toBe('MV')
    expect(f2ReconciliationConfig.beneficiaryLabel).toBe('F2')
    expect(f2ReconciliationConfig.supplementaryRowLabel).toBe('Thưởng cam kết')
    expect(isSimpleProfile(f2ReconciliationConfig)).toBe(true)
    // F2 vẫn theo VAT (chỉ CTV dùng PIT).
    expect(f2ReconciliationConfig.taxMode).toBe('vat')
    expect(f2ReconciliationConfig.allowCreate).toBe(false)
    expect(f2ReconciliationConfig.features).toEqual({
      // 2026-06-25 (ngài chốt): đối chiếu F2 KHÔNG có "Kiểm tra điều kiện tất toán".
      settlementCheck: false,
      createInvoice: false,
      importExcel: false,
      periodType: false,
      extraBonus: false,
      saleSplit: false,
      payoutRatio: false,
    })
  })

  it('disables line-level actions (v1 UI confirms the whole sheet, like CĐT)', () => {
    expect(f2ReconciliationConfig.lineActions).toEqual({
      confirm: false,
      void: false,
      resync: false,
    })
  })
})
