import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'
import InvestorReconciliationSheetTotalV2 from '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationSheetTotalV2'

/**
 * Khối tổng chỉ đọc số của BE, nên fixture chỉ cần đúng những field nó chạm tới.
 * `rounding_gap` chưa có trong `schema.ts` (BE vừa thêm) — ép kiểu ở chỗ dựng fixture, giống
 * cách `recon-rounding-gap.ts` ép ở chỗ đọc.
 */
function makeSheet(roundingGap?: { net: string; vat: string; with_vat: string }) {
  return {
    total_amount: '190',
    total_vat_amount: '19',
    total_amount_with_vat: '210',
    amount_to_collect: '210',
    total_prepaid_advance_amount: '0',
    vat_rates: ['10.00'],
    ...(roundingGap ? { rounding_gap: roundingGap } : {}),
  } as unknown as InvestorReconciliationSheet
}

describe('InvestorReconciliationSheetTotalV2 — chênh lệch làm tròn', () => {
  it('phiếu khớp thì không có chú thích nào', () => {
    render(
      <InvestorReconciliationSheetTotalV2
        sheet={makeSheet({ net: '0', vat: '0', with_vat: '0' })}
      />
    )

    expect(screen.queryByText(/chênh lệch làm tròn/i)).not.toBeInTheDocument()
  })

  it('BE chưa gửi field thì màn hình giữ nguyên hành vi cũ', () => {
    render(<InvestorReconciliationSheetTotalV2 sheet={makeSheet()} />)

    expect(screen.queryByText(/chênh lệch làm tròn/i)).not.toBeInTheDocument()
  })

  /**
   * Ca nghiệm thu chính — `TVVL-IRS0019`: dòng "Tổng tiền (Gồm VAT)" khớp hoàn hảo trong khi hai
   * dòng trên nó lệch 1đ ngược chiều nhau. Chú thích phải xuất hiện ở ĐÚNG hai dòng sai đó, và
   * KHÔNG xuất hiện ở dòng tổng vốn đang đúng.
   */
  it('gồm-VAT khớp mà net/VAT ngược dấu: hiện chú thích đúng hai dòng lệch', () => {
    render(
      <InvestorReconciliationSheetTotalV2
        sheet={makeSheet({ net: '1', vat: '-1', with_vat: '0' })}
      />
    )

    const notes = screen.getAllByText(/chênh lệch làm tròn/i)
    expect(notes).toHaveLength(2)
    expect(notes[0]).toHaveTextContent('gồm +1 đ chênh lệch làm tròn')
    expect(notes[1]).toHaveTextContent('gồm −1 đ chênh lệch làm tròn')
  })

  it('số âm hiện dấu − chứ không bọc ngoặc đơn', () => {
    render(
      <InvestorReconciliationSheetTotalV2
        sheet={makeSheet({ net: '0', vat: '-1', with_vat: '-1' })}
      />
    )

    const notes = screen.getAllByText(/chênh lệch làm tròn/i)
    expect(notes).toHaveLength(2)
    notes.forEach((note) => {
      expect(note.textContent).toContain('−1')
      expect(note.textContent).not.toContain('(1')
    })
  })

  /** Trần khe hở là N/2 đồng, không phải 1đ — MT-IRS0011 (68 căn) đo được 5đ. */
  it('hiện đúng khe hở lớn hơn 1đ', () => {
    render(
      <InvestorReconciliationSheetTotalV2
        sheet={makeSheet({ net: '0', vat: '5', with_vat: '5' })}
      />
    )

    const notes = screen.getAllByText(/chênh lệch làm tròn/i)
    expect(notes).toHaveLength(2)
    notes.forEach((note) => expect(note).toHaveTextContent('gồm +5 đ chênh lệch làm tròn'))
  })
})
