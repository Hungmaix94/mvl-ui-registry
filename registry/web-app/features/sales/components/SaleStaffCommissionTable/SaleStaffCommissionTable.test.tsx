import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import { Theme } from '@radix-ui/themes'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

const mockUseProductInventoryCurrentF2Commissions = vi.fn().mockReturnValue({ data: null })
const mockUseCommissionWorkspaceSAF2 = vi.fn().mockReturnValue({ data: null })
const mockUseProductInventoryCurrentCommission = vi.fn().mockReturnValue({ data: null })
const mockUseCommissionWorkspaceSACore = vi.fn().mockReturnValue({ data: null })

vi.mock('@/services/realestate-service', () => ({
  useProductInventoryCurrentF2Commissions: (...args: any[]) =>
    mockUseProductInventoryCurrentF2Commissions(...args),
  useCommissionWorkspaceSAF2: (...args: any[]) => mockUseCommissionWorkspaceSAF2(...args),
  useProductInventoryCurrentCommission: (...args: any[]) =>
    mockUseProductInventoryCurrentCommission(...args),
  useCommissionWorkspaceSACore: (...args: any[]) => mockUseCommissionWorkspaceSACore(...args),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMapOptions: new Map([['sale_type_choices', [{ value: 'employee', label: 'Nhân viên' }]]]),
  }),
}))

import { CommonSaleStaffTable } from './SaleStaffCommissionTable'

function TestWrapper({ defaultValues }: { defaultValues?: any }) {
  const methods = useForm({
    defaultValues: {
      sales_staff: [],
      sales_allocation: 1826,
      product_inventory_id: 100,
      ...defaultValues,
    },
  })
  return (
    <Theme>
      <FormProvider {...methods}>
        <CommonSaleStaffTable module="booking" paymentAmount={10000000} />
      </FormProvider>
    </Theme>
  )
}

describe('CommonSaleStaffTable', () => {
  it('calls useCommissionWorkspaceSAF2 with salesAllocationId even when product_inventory_id exists', () => {
    mockUseProductInventoryCurrentF2Commissions.mockReturnValue({
      data: { f2_commissions: [] },
    })
    mockUseCommissionWorkspaceSAF2.mockReturnValue({
      data: {
        current: [
          {
            exchange_id: 99,
            exchange_name: 'Sàn F2 Làng Vân',
            is_configured: true,
            resolution_tier: 'sa',
            entry: null,
          },
        ],
      },
    })
    mockUseProductInventoryCurrentCommission.mockReturnValue({
      data: null,
    })

    render(<TestWrapper />)

    expect(mockUseCommissionWorkspaceSAF2).toHaveBeenCalledWith(1826)
  })

  it('falls back to sales_allocation_id from currentF2Data when sales_allocation is not in form', () => {
    mockUseProductInventoryCurrentF2Commissions.mockReturnValue({
      data: { sales_allocation_id: 2024, f2_commissions: [] },
    })
    mockUseCommissionWorkspaceSAF2.mockReturnValue({
      data: { current: [] },
    })
    mockUseProductInventoryCurrentCommission.mockReturnValue({
      data: null,
    })

    render(
      <TestWrapper defaultValues={{ sales_allocation: undefined, product_inventory_id: 50 }} />
    )

    expect(mockUseCommissionWorkspaceSAF2).toHaveBeenCalledWith(2024)
  })

  // Regression: a partner row with a zero commission takes the F2-fallback branch of
  // the totals useMemo, which reads `f2Commissions`. That memo must therefore be
  // declared BEFORE the totals memo — otherwise the read hits the temporal dead zone
  // and the whole form crashes with "Cannot access 'f2Commissions' before initialization".
  describe('partner row with zero commission', () => {
    const PARTNER_ZERO_COMMISSION = {
      sales_staff: [
        {
          sale_type: 'partner',
          exchange_id: 13,
          participation_percentage: 100,
          pct_commission: 0,
          amt_commission: null,
        },
      ],
    }

    function mockF2ExchangeCommission(pctF2Commission: number | null) {
      mockUseProductInventoryCurrentF2Commissions.mockReturnValue({
        data: {
          f2_commissions: [
            {
              exchange_id: 13,
              exchange_name: 'SAO VÀNG HOLDINGS',
              is_configured: true,
              current_commission:
                pctF2Commission === null ? null : { pct_f2_commission: pctF2Commission },
            },
          ],
        },
      })
      mockUseCommissionWorkspaceSAF2.mockReturnValue({ data: null })
      mockUseProductInventoryCurrentCommission.mockReturnValue({ data: null })
      mockUseCommissionWorkspaceSACore.mockReturnValue({ data: null })
    }

    it('renders without throwing when the F2 exchange has no configured commission', () => {
      mockF2ExchangeCommission(null)

      expect(() => render(<TestWrapper defaultValues={PARTNER_ZERO_COMMISSION} />)).not.toThrow()
    })

    it('falls back to the F2 exchange commission when computing tổng hoa hồng', () => {
      mockF2ExchangeCommission(2)

      const { container } = render(<TestWrapper defaultValues={PARTNER_ZERO_COMMISSION} />)

      // 10.000.000 (payment) × 100% (participation) × 2% (F2 fallback) = 200.000
      expect(container.textContent).toMatch(/200[.,]000/)
    })
  })
})
