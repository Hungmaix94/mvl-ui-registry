import { describe, expect, test } from 'vitest'

import {
  formatLedgerAmount,
  getLedgerAmountDirection,
  getLedgerAmountTone,
} from './investor-advance-ledger'

describe('getLedgerAmountDirection', () => {
  test('treats a negative amount as money leaving the fund', () => {
    // Arrange — ADVANCE_PAY / DRAWDOWN đều trả số âm
    const amount = '-2200000'

    // Act
    const direction = getLedgerAmountDirection(amount)

    // Assert
    expect(direction).toBe('out')
  })

  test('treats a positive amount as money entering the fund', () => {
    expect(getLedgerAmountDirection('200000000')).toBe('in')
  })

  test('returns zero for a 0 amount so the row stays uncoloured', () => {
    expect(getLedgerAmountDirection('0')).toBe('zero')
    expect(getLedgerAmountDirection(0)).toBe('zero')
  })

  test('returns zero for null, undefined and empty string', () => {
    expect(getLedgerAmountDirection(null)).toBe('zero')
    expect(getLedgerAmountDirection(undefined)).toBe('zero')
    expect(getLedgerAmountDirection('')).toBe('zero')
  })

  test('returns zero for a non-numeric value instead of throwing', () => {
    expect(getLedgerAmountDirection('abc')).toBe('zero')
  })

  test('accepts numbers as well as strings', () => {
    expect(getLedgerAmountDirection(-1)).toBe('out')
    expect(getLedgerAmountDirection(1)).toBe('in')
  })
})

describe('getLedgerAmountTone', () => {
  test('uses the data-red token for outgoing money', () => {
    expect(getLedgerAmountTone('-9000000')).toBe('text-data-red-default')
  })

  test('uses the data-green token for incoming money', () => {
    expect(getLedgerAmountTone('100000000')).toBe('text-data-green-default')
  })

  test('falls back to the neutral content token for zero', () => {
    expect(getLedgerAmountTone(0)).toBe('text-content-dark-1')
  })

  test('never returns an undefined semantic-* token', () => {
    // Arrange — họ token `semantic-*` không tồn tại trong tailwind-colors.css
    const inputs = ['-2200000', '200000000', 0, null, undefined, 'abc']

    // Act
    const tones = inputs.map(getLedgerAmountTone)

    // Assert
    tones.forEach((tone) => {
      expect(tone).not.toContain('semantic-')
      expect(tone).toMatch(/^text-(data-(red|green)-default|content-dark-1)$/)
    })
  })
})

describe('formatLedgerAmount', () => {
  test('prefixes incoming money with an explicit plus sign', () => {
    // Arrange
    const deposit = '200000000'

    // Act
    const label = formatLedgerAmount(deposit)

    // Assert
    expect(label.startsWith('+')).toBe(true)
    expect(label.endsWith(' đ')).toBe(true)
  })

  test('keeps the existing minus sign for outgoing money and adds no plus', () => {
    const label = formatLedgerAmount('-2200000')

    expect(label.startsWith('-')).toBe(true)
    expect(label).not.toContain('+')
  })

  test('renders zero without any sign prefix', () => {
    const label = formatLedgerAmount(0)

    expect(label).not.toContain('+')
    expect(label).not.toContain('-')
  })

  test('renders 0 đ for a broken value instead of NaN or a dash', () => {
    // Arrange — formatCurrencyVND trả '-' cho chuỗi rỗng; helper phải chặn trước
    const broken = ['', null, undefined, 'abc']

    // Act
    const labels = broken.map(formatLedgerAmount)

    // Assert
    labels.forEach((label) => {
      expect(label).not.toContain('NaN')
      expect(label).toMatch(/0\s*đ$/)
    })
  })
})
