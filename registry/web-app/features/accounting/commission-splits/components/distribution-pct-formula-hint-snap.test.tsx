// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DistributionPctFormulaHint } from './DistributionPctFormulaHint'

/**
 * Tooltip giải trình "% phân bổ phí" khi BE đã SNAP kỳ về tỷ lệ chốt ở đối chiếu.
 *
 * Bối cảnh (split-sheet 97 / deal HD06-2026-000270): kỳ đối chiếu ghi 35,00%, CĐT trả đủ
 * 107.507.048 đ, nhưng % suy từ tiền ra 34,9999999641 vì tiền là số nguyên đồng còn 35%
 * của 279.239.086 là 97.733.680,10 — lệch 0,1 đồng. BE nay trả `method =
 * fee_track_snapped` với `pct` = span, tiền giữ nguyên.
 *
 * Hệ quả cho tooltip: phép chia in ra KHÔNG còn tái tạo được đúng dòng "Kết quả" (lệch
 * dưới 1 đồng). Nếu không nói ra thì kế toán cộng tay lại thấy vênh và mất tin vào cả cái
 * tooltip — nên nhánh snapped phải kèm câu giải thích.
 */

const SNAPPED = {
  method: 'fee_track_snapped',
  fee_cash: '97733680',
  agency_fee_gross: '279239086',
  total_fee_deduction: '0',
  fee_base_net: '279239086',
  allocated_net: null,
  base_amount: null,
  pct: '35.0000000000',
} as never

const PLAIN = {
  method: 'fee_track',
  fee_cash: '97733680',
  agency_fee_gross: '279239086',
  total_fee_deduction: '0',
  fee_base_net: '279239086',
  allocated_net: null,
  base_amount: null,
  pct: '34.9999999641',
} as never

/** Radix Tooltip chỉ mount nội dung sau khi hover — mở ra rồi mới đọc được. */
function open(breakdown: unknown) {
  render(<DistributionPctFormulaHint breakdown={breakdown as never} />)
  fireEvent.focus(screen.getByLabelText('Giải trình công thức'))
}

describe('DistributionPctFormulaHint — kỳ đã snap về tỷ lệ đối chiếu', () => {
  it('vẫn render công thức (không rơi vào nhánh "không biết method này")', () => {
    open(SNAPPED)

    expect(screen.getAllByText('Tiền phí thực về').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Phí phải thu của căn').length).toBeGreaterThan(0)
  })

  it('nói rõ vì sao ra số tròn — phép chia ở trên không tái tạo được nó', () => {
    open(SNAPPED)

    expect(screen.getAllByText(/đã thu đủ/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/dưới 1 đồng/).length).toBeGreaterThan(0)
  })

  it('kết quả là tỷ lệ đã chốt ở đối chiếu', () => {
    open(SNAPPED)

    expect(screen.getAllByText('35%').length).toBeGreaterThan(0)
  })

  it('kỳ chưa snap KHÔNG có câu giải thích, và % bị CẮT chứ không half-up', () => {
    open(PLAIN)

    expect(screen.queryByText(/đã thu đủ/)).not.toBeInTheDocument()
    // 34,9999999641 half-up ra "35%" — đúng con số làm Mục 2 và tooltip chửi nhau.
    expect(screen.getAllByText('34,99%').length).toBeGreaterThan(0)
  })
})
