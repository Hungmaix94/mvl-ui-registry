import { describe, expect, it } from 'vitest'
import {
  estimateTextWidth,
  getTickLines,
  getXAxisTickLayout,
  TICK_FONT_SIZE,
  wrapTextToLines,
} from './xAxisTickLayout'

/** Mirrors the real chart: 52px left margin + 52px left Y axis. */
const LEFT_OFFSET = 104

describe('wrapTextToLines', () => {
  it('keeps a short label on one line', () => {
    expect(wrapTextToLines('Hà Nội', 200)).toEqual(['Hà Nội'])
  })

  it('wraps at word boundaries when the label is wider than the band', () => {
    expect(wrapTextToLines('MAI VIET INDUSTRIAL', 70)).toEqual(['MAI VIET', 'INDUSTRIAL'])
  })

  it('splits a single word that cannot fit on one line', () => {
    // 30px fits 4 characters at the 12px tick font.
    expect(wrapTextToLines('INDUSTRIAL', 30)).toEqual(['INDU', 'STRI', 'AL'])
  })

  it('returns the raw text when there are no words to wrap', () => {
    expect(wrapTextToLines('', 40)).toEqual([''])
  })

  it('never produces an empty line for a zero-width band', () => {
    expect(wrapTextToLines('AB', 0)).toEqual(['A', 'B'])
  })
})

describe('estimateTextWidth', () => {
  it('scales with character count and font size', () => {
    expect(estimateTextWidth('abcd', TICK_FONT_SIZE)).toBeCloseTo(4 * 12 * 0.58)
    expect(estimateTextWidth('abcd', 24)).toBeCloseTo(2 * estimateTextWidth('abcd', 12))
  })
})

describe('getTickLines', () => {
  const LAYOUT = { shouldRotate: false, labelWidth: 0, bottomMargin: 60, extraLeftMargin: 0 }

  it('keeps a rotated label on a single line', () => {
    const lines = getTickLines('MAI VIỆT GRAND Nha Trang', {
      ...LAYOUT,
      shouldRotate: true,
      labelWidth: 20,
    })

    expect(lines).toEqual(['MAI VIỆT GRAND Nha Trang'])
  })

  it('keeps the label on a single line while the width is unknown', () => {
    expect(getTickLines('MAI VIET INDUSTRIAL', LAYOUT)).toEqual(['MAI VIET INDUSTRIAL'])
  })

  it('wraps a horizontal label to the width it was given', () => {
    expect(getTickLines('MAI VIET INDUSTRIAL', { ...LAYOUT, labelWidth: 70 })).toEqual([
      'MAI VIET',
      'INDUSTRIAL',
    ])
  })
})

describe('getXAxisTickLayout', () => {
  it('falls back to single-line labels before the container is measured', () => {
    const layout = getXAxisTickLayout({
      labels: ['MAI VIET INDUSTRIAL', 'Hà Nội'],
      plotWidth: 0,
      leftOffset: LEFT_OFFSET,
    })

    expect(layout).toEqual({
      shouldRotate: false,
      labelWidth: 0,
      bottomMargin: 60,
      extraLeftMargin: 0,
    })
  })

  it('falls back when there are no categories', () => {
    const layout = getXAxisTickLayout({ labels: [], plotWidth: 900, leftOffset: LEFT_OFFSET })

    expect(layout.shouldRotate).toBe(false)
    expect(layout.bottomMargin).toBe(60)
  })

  it('keeps labels horizontal while the category band is wide enough', () => {
    const layout = getXAxisTickLayout({
      labels: ['Hà Nội', 'Hà Nam', 'Đà Nẵng'],
      plotWidth: 900,
      leftOffset: LEFT_OFFSET,
    })

    expect(layout.shouldRotate).toBe(false)
    expect(layout.labelWidth).toBeGreaterThan(0)
    expect(layout.bottomMargin).toBe(60)
    expect(layout.extraLeftMargin).toBe(0)
  })

  it('rotates labels once wrapping would need more than two lines', () => {
    // 13 branches in ~610px of plot area — the zoomed-in case from the bug report.
    const layout = getXAxisTickLayout({
      labels: [
        'Gia Lâm',
        'Hà Nam',
        'Hà Nội',
        'Hải Phòng 2',
        'Hải phòng',
        'Hồ Chí Minh',
        'MAI VIET INDUSTRIAL',
        'MAI VIỆT GRAND Nha Trang',
        'Thanh Hoá',
        'Thái Nguyên',
        'Đà Nẵng',
      ],
      plotWidth: 610,
      leftOffset: LEFT_OFFSET,
    })

    expect(layout.shouldRotate).toBe(true)
    // Rotated labels are drawn on a single line, so no wrapping width is handed out.
    expect(layout.labelWidth).toBe(0)
    expect(layout.bottomMargin).toBeGreaterThan(60)
  })

  it('caps the bottom margin for extremely long labels', () => {
    const layout = getXAxisTickLayout({
      labels: Array.from({ length: 12 }, () => 'X'.repeat(200)),
      plotWidth: 610,
      leftOffset: LEFT_OFFSET,
    })

    expect(layout.shouldRotate).toBe(true)
    expect(layout.bottomMargin).toBe(170)
    expect(layout.extraLeftMargin).toBe(120)
  })

  it('rotates instead of overlapping when the measured container is narrower than the chart chrome', () => {
    // Call sites clamp a measured-but-tiny plot width to 1px rather than passing <= 0,
    // which would be read as "not measured yet" and leave labels on one overlapping line.
    const layout = getXAxisTickLayout({
      labels: ['MAI VIET INDUSTRIAL', 'Hà Nội', 'Đà Nẵng'],
      plotWidth: 1,
      leftOffset: LEFT_OFFSET,
    })

    expect(layout.shouldRotate).toBe(true)
  })

  it('reserves left margin only when the first rotated label reaches past the plot area', () => {
    const longFirst = getXAxisTickLayout({
      labels: ['CÔNG TY MAI VIỆT LAND CHI NHÁNH NHA TRANG', 'Hà Nội', 'Đà Nẵng', 'Gia Lâm'],
      plotWidth: 200,
      leftOffset: 0,
    })
    expect(longFirst.shouldRotate).toBe(true)
    expect(longFirst.extraLeftMargin).toBeGreaterThan(0)

    const roomyOffset = getXAxisTickLayout({
      labels: ['CÔNG TY MAI VIỆT LAND CHI NHÁNH NHA TRANG', 'Hà Nội', 'Đà Nẵng', 'Gia Lâm'],
      plotWidth: 200,
      leftOffset: 400,
    })
    expect(roomyOffset.shouldRotate).toBe(true)
    expect(roomyOffset.extraLeftMargin).toBe(0)
  })
})
