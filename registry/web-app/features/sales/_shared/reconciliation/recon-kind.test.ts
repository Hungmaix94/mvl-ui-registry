import { describe, expect, it } from 'vitest'

import {
  INVESTOR_RECON_KIND_CONFIG,
  isRichProfile,
  isSimpleProfile,
  type ReconKindConfig,
} from '@/features/sales/_shared/reconciliation/recon-kind'

describe('INVESTOR_RECON_KIND_CONFIG (rich/CĐT preset = engine fallback)', () => {
  it('is the rich investor profile with manual create + manual invoice', () => {
    expect(INVESTOR_RECON_KIND_CONFIG.kind).toBe('investor')
    expect(INVESTOR_RECON_KIND_CONFIG.counterpartyLabel).toBe('CĐT')
    expect(INVESTOR_RECON_KIND_CONFIG.proposalColumnLabel).toBe('CĐT đề nghị')
    expect(INVESTOR_RECON_KIND_CONFIG.payerLabel).toBe('CĐT')
    expect(INVESTOR_RECON_KIND_CONFIG.beneficiaryLabel).toBe('MV')
    expect(INVESTOR_RECON_KIND_CONFIG.supplementaryRowLabel).toBe('Thưởng cam kết HĐPP')
    expect(INVESTOR_RECON_KIND_CONFIG.profile).toBe('rich')
    expect(INVESTOR_RECON_KIND_CONFIG.allowCreate).toBe(true)
    expect(INVESTOR_RECON_KIND_CONFIG.features).toEqual({
      settlementCheck: true,
      createInvoice: true,
      importExcel: true,
      periodType: true,
      extraBonus: true,
      saleSplit: true,
      payoutRatio: true,
    })
  })

  it('has no line-level workflow actions (investor finalizes via sheet-confirm)', () => {
    expect(INVESTOR_RECON_KIND_CONFIG.lineActions).toEqual({
      confirm: false,
      void: false,
      resync: false,
    })
  })
})

describe('profile guards', () => {
  const simple: ReconKindConfig = { ...INVESTOR_RECON_KIND_CONFIG, profile: 'simple' }

  it('isRichProfile / isSimpleProfile are mutually exclusive', () => {
    expect(isRichProfile(INVESTOR_RECON_KIND_CONFIG)).toBe(true)
    expect(isSimpleProfile(INVESTOR_RECON_KIND_CONFIG)).toBe(false)
    expect(isRichProfile(simple)).toBe(false)
    expect(isSimpleProfile(simple)).toBe(true)
  })
})
