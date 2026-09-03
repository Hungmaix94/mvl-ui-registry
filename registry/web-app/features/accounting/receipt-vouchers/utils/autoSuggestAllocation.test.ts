import { describe, it, expect } from 'vitest'
import { autoSuggestAllocation, InvoiceLine } from './autoSuggestAllocation'

describe('autoSuggestAllocation', () => {
  const mockLines: InvoiceLine[] = [
    { id: 1, description: 'Line 1', totalAmount: 1000, paidAmount: 0 },
    { id: 2, description: 'Line 2', totalAmount: 500, paidAmount: 200 }, // unpaid: 300
    { id: 3, description: 'Line 3', totalAmount: 2000, paidAmount: 2000 }, // unpaid: 0
    { id: 4, description: 'Line 4', totalAmount: 800, paidAmount: 0 },
  ]

  it('should allocate correctly when total received covers partially', () => {
    // We receive 1200.
    // Line 1 needs 1000. Allocates 1000. Remaining: 200
    // Line 2 needs 300. Allocates 200. Remaining: 0
    // Line 3 needs 0. Allocates 0.
    // Line 4 needs 800. Allocates 0.
    const result = autoSuggestAllocation(mockLines, 1200)

    expect(result).toHaveLength(4)
    expect(result[0].allocatedAmount).toBe(1000)
    expect(result[0].remainingUnpaid).toBe(0)

    expect(result[1].allocatedAmount).toBe(200)
    expect(result[1].remainingUnpaid).toBe(100)

    expect(result[2].allocatedAmount).toBe(0)
    expect(result[2].remainingUnpaid).toBe(0)

    expect(result[3].allocatedAmount).toBe(0)
    expect(result[3].remainingUnpaid).toBe(800)
  })

  it('should allocate fully and ignore overpayment for lines', () => {
    // Total needed: 1000 + 300 + 800 = 2100.
    // Received 3000 (overpayment)
    const result = autoSuggestAllocation(mockLines, 3000)

    expect(result[0].allocatedAmount).toBe(1000)
    expect(result[1].allocatedAmount).toBe(300)
    expect(result[2].allocatedAmount).toBe(0)
    expect(result[3].allocatedAmount).toBe(800)

    // Unpaid should be 0 for all
    expect(result.every((r) => r.remainingUnpaid === 0)).toBe(true)
  })

  it('should throw an error if total received is negative', () => {
    expect(() => autoSuggestAllocation(mockLines, -100)).toThrow('Số tiền thu không được âm')
  })

  it('should return 0 allocation if total received is 0', () => {
    const result = autoSuggestAllocation(mockLines, 0)

    expect(result[0].allocatedAmount).toBe(0)
    expect(result[0].remainingUnpaid).toBe(1000)
    expect(result[1].allocatedAmount).toBe(0)
    expect(result[1].remainingUnpaid).toBe(300)
  })
})
