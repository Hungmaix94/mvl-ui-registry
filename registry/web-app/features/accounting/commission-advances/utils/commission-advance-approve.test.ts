import { describe, expect, it } from 'vitest'
import { buildApprovedAmounts, findInvalidApprovedAmount } from './commission-advance-approve'

describe('buildApprovedAmounts', () => {
  it('maps each line id -> recipient_line_id with the approved amount as a string', () => {
    expect(
      buildApprovedAmounts([
        { id: 10, approved_amount: 5_000_000 },
        { id: 11, approved_amount: 3_000_000 },
      ])
    ).toEqual([
      { recipient_line_id: 10, approved_amount: '5000000' },
      { recipient_line_id: 11, approved_amount: '3000000' },
    ])
  })

  it('returns an empty array when there are no lines', () => {
    expect(buildApprovedAmounts([])).toEqual([])
  })
})

describe('findInvalidApprovedAmount', () => {
  const requestedById = new Map([
    [10, 5_000_000],
    [11, 3_000_000],
  ])

  it('returns undefined when every approved amount is within (0, requested]', () => {
    expect(
      findInvalidApprovedAmount(
        [
          { id: 10, approved_amount: 5_000_000 }, // equal to requested is allowed
          { id: 11, approved_amount: 1 },
        ],
        requestedById
      )
    ).toBeUndefined()
  })

  it('flags a line that exceeds its requested amount', () => {
    expect(
      findInvalidApprovedAmount([{ id: 10, approved_amount: 6_000_000 }], requestedById)
    ).toEqual({ id: 10, approved_amount: 6_000_000 })
  })

  it('flags a non-positive approved amount', () => {
    expect(findInvalidApprovedAmount([{ id: 11, approved_amount: 0 }], requestedById)).toEqual({
      id: 11,
      approved_amount: 0,
    })
  })

  it('treats an unknown recipient-line id as requested 0 and flags it', () => {
    expect(findInvalidApprovedAmount([{ id: 999, approved_amount: 100 }], requestedById)).toEqual({
      id: 999,
      approved_amount: 100,
    })
  })
})
