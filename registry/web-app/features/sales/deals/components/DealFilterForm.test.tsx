import { createRef } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  fields: [] as Array<{ name: string; fieldProps: Record<string, any> }>,
}))

vi.mock('@/components/ui/form/FormController', () => ({
  default: (props: Record<string, any>) => {
    h.fields.push({ name: props.name, fieldProps: props.fieldProps })
    return null
  },
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMap: new Map(),
    constants: {},
    keysMapOptions: new Map([
      [
        'DealStatus',
        [
          { value: 'active', label: 'Đang hoạt động' },
          { value: 'completed', label: 'Đã hoàn thành' },
        ],
      ],
    ]),
  }),
}))

vi.mock('@/features/project/booking-contract/services/useBookingContractLoadOptions', () => ({
  useBookingContractLoadOptions: () => ({
    loadProjectOptions: vi.fn(),
    loadInitialProjectOptions: vi.fn(),
    loadSalesAllocationOptions: vi.fn(),
    loadInitialSalesAllocationOptions: vi.fn(),
  }),
}))

vi.mock('@/hooks/useEmployeeSelect', () => ({
  useEmployeeSelect: () => ({
    loadEmployeeOptions: vi.fn(),
    loadInitialEmployeeOptions: vi.fn(),
  }),
}))

vi.mock('@/hooks/useExchangeSelect', () => ({
  useExchangeSelect: () => ({
    loadExchangeOptions: vi.fn(),
    loadInitialExchangeOptions: vi.fn(),
  }),
}))

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({
    getInvestorDropdown: vi.fn(),
  }),
}))

vi.mock('@/services/sales-service', () => ({
  getSaleService: () => ({
    getCollaborators: vi.fn(),
    getCollaborator: vi.fn(),
  }),
}))

import DealFilterForm, { type DealFilterFormRef } from './DealFilterForm'

const field = (name: string) => {
  const matches = h.fields.filter((f) => f.name === name)
  return matches[matches.length - 1]?.fieldProps
}

beforeEach(() => {
  h.fields.length = 0
})

describe('DealFilterForm', () => {
  it('configures employee select field with multiple: true', () => {
    const ref = createRef<DealFilterFormRef>()
    render(<DealFilterForm ref={ref} isOpen={true} />)

    const empField = field('employee')
    expect(empField).toBeDefined()
    expect(empField.label).toBe('Nhân viên giao dịch')
    expect(empField.multiple).toBe(true)
    expect(empField.clearable).toBe(true)
    expect(empField.enableSearch).toBe(true)
  })

  it('hydrates initial values including multi-employee array', () => {
    const ref = createRef<DealFilterFormRef>()
    render(
      <DealFilterForm
        ref={ref}
        isOpen={true}
        initialValues={{
          employee: ['10', '20'],
          code: 'DEAL-001',
          amt_agency_fee_min: 1000000,
        }}
      />
    )

    const values = ref.current?.getValues()
    expect(values?.employee).toEqual(['10', '20'])
    expect(values?.code).toBe('DEAL-001')
    expect(values?.amt_agency_fee_min).toBe(1000000)
  })

  it('clears form state on clearForm call', () => {
    const ref = createRef<DealFilterFormRef>()
    render(
      <DealFilterForm
        ref={ref}
        isOpen={true}
        initialValues={{
          employee: ['10', '20'],
          code: 'DEAL-001',
        }}
      />
    )

    ref.current?.clearForm()
    const values = ref.current?.getValues()
    expect(values?.employee).toBeUndefined()
    expect(values?.code).toBeUndefined()
  })
})

describe('DealFilterForm — Ngày làm phiếu TTGD (độc lập với Ngày cọc)', () => {
  it('configures the transaction-sheet date fields next to the deposit-date fields', () => {
    const ref = createRef<DealFilterFormRef>()
    render(<DealFilterForm ref={ref} isOpen={true} />)

    expect(field('transaction_sheet_date_from').label).toBe('Ngày làm phiếu TTGD từ')
    expect(field('transaction_sheet_date_to').label).toBe('Ngày làm phiếu TTGD đến')
    // Same control shape as the existing deposit-date fields it sits beside.
    expect(field('transaction_sheet_date_from').allowManualInput).toBe(true)
    expect(field('transaction_sheet_date_from').clearable).toBe(true)
  })

  it('hydrates transaction_sheet_date_from/to independently from deposit_date_from/to', () => {
    const ref = createRef<DealFilterFormRef>()
    render(
      <DealFilterForm
        ref={ref}
        isOpen={true}
        initialValues={{
          deposit_date_from: '01/07/2026',
          deposit_date_to: '31/07/2026',
          transaction_sheet_date_from: '01/08/2026',
          transaction_sheet_date_to: '15/08/2026',
        }}
      />
    )

    const values = ref.current?.getValues()
    expect(values?.deposit_date_from).toBe('01/07/2026')
    expect(values?.deposit_date_to).toBe('31/07/2026')
    expect(values?.transaction_sheet_date_from).toBe('01/08/2026')
    expect(values?.transaction_sheet_date_to).toBe('15/08/2026')
  })

  it('clears transaction_sheet_date_from/to on clearForm, alongside deposit_date_from/to', () => {
    const ref = createRef<DealFilterFormRef>()
    render(
      <DealFilterForm
        ref={ref}
        isOpen={true}
        initialValues={{
          deposit_date_from: '01/07/2026',
          transaction_sheet_date_from: '01/08/2026',
        }}
      />
    )

    ref.current?.clearForm()
    const values = ref.current?.getValues()
    expect(values?.deposit_date_from).toBeUndefined()
    expect(values?.transaction_sheet_date_from).toBeUndefined()
    expect(values?.transaction_sheet_date_to).toBeUndefined()
  })
})
