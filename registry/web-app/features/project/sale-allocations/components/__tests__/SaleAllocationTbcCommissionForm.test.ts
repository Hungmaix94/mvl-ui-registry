import { vi, describe, expect, it } from 'vitest'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}))
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
}))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
}))

import { tbcCommissionSchema } from '../SaleAllocationTbcCommissionForm'

describe('tbcCommissionSchema', () => {
  it('should validate a valid commission payload with pct_kpi_revenue_slk and amt_kpi_revenue_slk', () => {
    const validData = {
      effective_from: '18/07/2026',
      effective_to: '19/07/2026',
      pct_agency_fee: '90',
      amt_agency_fee: '',
      is_agency_fee_include_vat: true,
      pct_investor_bonus: '',
      amt_investor_bonus: '10000000',
      is_investor_bonus_include_vat: false,
      pct_shared_bonus: '',
      amt_shared_bonus: '',
      is_shared_bonus_include_vat: null,
      pct_sale_commission: '1.2',
      amt_sale_commission: '',
      is_sale_commission_include_vat: true,
      pct_investor_bonus_to_sale: '',
      amt_investor_bonus_to_sale: '5000000',
      is_investor_bonus_to_sale_include_vat: false,
      pct_revenue: '70',
      amt_revenue: '',
      pct_kpi_revenue_slk: '80',
      amt_kpi_revenue_slk: '',
      note: 'Test SLK KPI fields',
    }

    const result = tbcCommissionSchema.safeParse(validData)
    if (!result.success) {
      console.log('VALIDATION ERRORS:', result.error.format())
    }
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pct_kpi_revenue_slk).toBe(80)
      expect(result.data.amt_kpi_revenue_slk).toBeNull()
      expect(result.data.pct_revenue).toBe(70)
    }
  })

  it('should fail validation if effective_to is before effective_from', () => {
    const invalidDates = {
      effective_from: '20/07/2026',
      effective_to: '10/07/2026',
      pct_agency_fee: '90',
      pct_revenue: '70',
      pct_kpi_revenue_slk: '80',
    }

    const result = tbcCommissionSchema.safeParse(invalidDates)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('effective_to'))
      expect(issue).toBeDefined()
      expect(issue?.message).toBe('Ngày kết thúc phải sau ngày bắt đầu')
    }
  })

  it('should accept null or empty values for SLK KPI fields', () => {
    const emptySlkFields = {
      effective_from: '18/07/2026',
      pct_agency_fee: '90',
      pct_revenue: '70',
      pct_kpi_revenue_slk: '',
      amt_kpi_revenue_slk: null,
    }

    const result = tbcCommissionSchema.safeParse(emptySlkFields)
    if (!result.success) {
      console.log('VALIDATION ERRORS:', result.error.format())
    }
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pct_kpi_revenue_slk).toBeNull()
      expect(result.data.amt_kpi_revenue_slk).toBeNull()
    }
  })
})
