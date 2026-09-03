import { describe, expect, it } from 'vitest'
import type { AdvanceSettlementRow } from '@/features/accounting/reports/services/report-service'
import {
  getAdvanceRecipientLines,
  getAdvanceRowEmployees,
  getAdvanceSettlementDate,
  hasAdvanceRecipientBreakdown,
} from './advance-report-utils'

function makeEmployee(id = 1, code = 'MV0001', fullname = 'Nguyễn Văn A') {
  return {
    id,
    code,
    fullname,
    email: 'a@mvl.vn',
  } as unknown as AdvanceSettlementRow['requester_employee']
}

function makeRow(overrides: Partial<AdvanceSettlementRow> = {}): AdvanceSettlementRow {
  return {
    id: 1,
    code: 'ADV-0001',
    requester_employee: makeEmployee(),
    deal: null,
    requested_amount: '5000000',
    paid_amount: '5000000',
    recovered_amount: '0',
    days_outstanding: 10,
    status: 'PAID',
    recipient_lines: [],
    ...overrides,
  } as AdvanceSettlementRow
}

describe('getAdvanceRowEmployees', () => {
  it('returns every recipient when the request paid out to more than one person', () => {
    const row = makeRow({
      recipient_lines: [
        { id: 1, recipient_employee: makeEmployee(2, 'MV0002') },
        { id: 2, recipient_employee: makeEmployee(3, 'MV0003') },
      ] as unknown as AdvanceSettlementRow['recipient_lines'],
    })

    expect(getAdvanceRowEmployees(row).map((e) => e.code)).toEqual(['MV0002', 'MV0003'])
  })

  it('falls back to the requester when there are no recipient lines', () => {
    expect(getAdvanceRowEmployees(makeRow()).map((e) => e.code)).toEqual(['MV0001'])
  })

  it('returns an empty list when the row carries nobody at all', () => {
    expect(getAdvanceRowEmployees(makeRow({ requester_employee: null }))).toEqual([])
  })
})

describe('getAdvanceSettlementDate', () => {
  it('reads the backend field', () => {
    expect(getAdvanceSettlementDate(makeRow({ settlement_date: '2026-08-01' }))).toBe('2026-08-01')
  })

  it('is undefined while nothing has been recovered', () => {
    expect(getAdvanceSettlementDate(makeRow({ settlement_date: null }))).toBeUndefined()
    expect(getAdvanceSettlementDate(makeRow())).toBeUndefined()
  })
})

/** Two people on one advance, told apart by how much each still owes. */
function makeSharedRow() {
  return makeRow({
    paid_amount: '50000000',
    recovered_amount: '10000000',
    recipient_lines: [
      {
        id: 7,
        recipient_employee: makeEmployee(2, 'MV0002'),
        requested_amount: '30000000',
        paid_amount: '30000000',
        recovered_amount: '10000000',
      },
      {
        id: 8,
        recipient_employee: makeEmployee(3, 'MV0003'),
        requested_amount: '20000000',
        paid_amount: '20000000',
        recovered_amount: '0',
      },
    ] as unknown as AdvanceSettlementRow['recipient_lines'],
  })
}

describe('getAdvanceRecipientLines', () => {
  it('keeps each recipient with their own paid / recovered / remaining figures', () => {
    const lines = getAdvanceRecipientLines(makeSharedRow())

    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({
      paidAmount: 30000000,
      recoveredAmount: 10000000,
      remainingAmount: 20000000,
    })
    expect(lines[1]).toMatchObject({
      paidAmount: 20000000,
      recoveredAmount: 0,
      remainingAmount: 20000000,
    })
    expect(lines.map((line) => line.employee?.code)).toEqual(['MV0002', 'MV0003'])
  })

  it('adds up to the advance the lines belong to', () => {
    const lines = getAdvanceRecipientLines(makeSharedRow())
    const paid = lines.reduce((total, line) => total + line.paidAmount, 0)

    expect(paid).toBe(50000000)
  })

  it('reads a missing amount as zero rather than NaN', () => {
    const row = makeRow({
      recipient_lines: [
        { id: 1, recipient_employee: makeEmployee(2, 'MV0002') },
      ] as unknown as AdvanceSettlementRow['recipient_lines'],
    })

    expect(getAdvanceRecipientLines(row)[0]).toMatchObject({
      paidAmount: 0,
      recoveredAmount: 0,
      remainingAmount: 0,
    })
  })

  it('is empty for an advance that carries no recipient lines', () => {
    expect(getAdvanceRecipientLines(makeRow())).toEqual([])
  })
})

describe('hasAdvanceRecipientBreakdown', () => {
  it('is true only once a second recipient shares the advance', () => {
    expect(hasAdvanceRecipientBreakdown(makeSharedRow())).toBe(true)
  })

  it('is false for one recipient — the name already fits on the advance row', () => {
    const row = makeRow({
      recipient_lines: [
        { id: 1, recipient_employee: makeEmployee(2, 'MV0002') },
      ] as unknown as AdvanceSettlementRow['recipient_lines'],
    })

    expect(hasAdvanceRecipientBreakdown(row)).toBe(false)
  })

  it('is false for a legacy advance with no recipient lines at all', () => {
    expect(hasAdvanceRecipientBreakdown(makeRow())).toBe(false)
  })
})
