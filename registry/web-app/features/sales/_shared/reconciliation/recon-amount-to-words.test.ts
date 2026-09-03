import { describe, expect, it } from 'vitest'

import { amountToVietnameseWords } from './recon-amount-to-words'

describe('amountToVietnameseWords', () => {
  it('returns "Không đồng" for zero', () => {
    expect(amountToVietnameseWords(0)).toBe('Không đồng')
  })

  it('renders the mockup example (NET có VAT) without commas', () => {
    // Tổng kết phiếu đối chiếu mockup: 1.136.300.001 đ.
    expect(amountToVietnameseWords(1_136_300_001)).toBe(
      'Một tỷ một trăm ba mươi sáu triệu ba trăm nghìn một đồng'
    )
  })

  it('handles the special tens/units forms (mười / lăm / mốt / lẻ)', () => {
    expect(amountToVietnameseWords(1)).toBe('Một đồng')
    expect(amountToVietnameseWords(15)).toBe('Mười lăm đồng')
    expect(amountToVietnameseWords(21)).toBe('Hai mươi mốt đồng')
    expect(amountToVietnameseWords(105)).toBe('Một trăm lẻ năm đồng')
  })

  it('skips empty groups (1.000.000 ⇒ một triệu, no thousand/units filler)', () => {
    expect(amountToVietnameseWords(1_000_000)).toBe('Một triệu đồng')
  })

  it('rounds to the nearest đồng', () => {
    expect(amountToVietnameseWords(1_000_000.4)).toBe('Một triệu đồng')
    // NB: the converter only inserts "lẻ" WITHIN a 3-digit group, not across group boundaries.
    expect(amountToVietnameseWords(1_000_000.6)).toBe('Một triệu một đồng')
  })

  it('converts by magnitude for negatives (caller prepends "Âm")', () => {
    expect(amountToVietnameseWords(-500)).toBe('Năm trăm đồng')
  })

  it('renders round magnitudes with the right scale words', () => {
    expect(amountToVietnameseWords(1_000)).toBe('Một nghìn đồng')
    expect(amountToVietnameseWords(100_000)).toBe('Một trăm nghìn đồng')
    expect(amountToVietnameseWords(2_000_000_000)).toBe('Hai tỷ đồng')
  })
})
