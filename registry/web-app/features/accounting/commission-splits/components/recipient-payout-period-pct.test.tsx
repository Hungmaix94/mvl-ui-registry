import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { type Muc6Group, RecipientPayoutTable } from './RecipientPayoutTable'

/**
 * Hai cột % tiến độ ở bảng "Chia thực nhận — theo từng đối tượng".
 *
 * Trước 2026-08-04 chỉ có MỘT cột tên "% thanh toán kỳ này" — một cái tên phủ cả dòng, nên
 * kế toán đọc ô Thưởng và ô Giảm trừ cũng tưởng đang nhìn tiến độ của chúng, hai thứ mà dial
 * phí không hề chạm tới. Nay tách:
 *   - "% TT phí kỳ này"    (`periodFeePct`)   — cạnh "Phí từng sale";
 *   - "% TT thưởng kỳ này" (`periodBonusPct`) — cạnh "Thưởng sale", vì thưởng đi theo đối
 *     chiếu CĐT nhân tỉ lệ tiền về, không theo dial phí.
 * Giảm trừ KHÔNG có cột %: nó theo tỉ lệ thu của hoá đơn thuộc từng đợt đối chiếu, khác nhau
 * từng đợt, nên một con số chung cho cả dòng là bịa.
 *
 * Màn admin "Giao dịch tiền về đợt này" KHÔNG hiển thị cả hai (prop = null).
 */

const isCommissionType = (t: string) => t === 'pct_sale_commission'

const groups: Muc6Group[] = [
  {
    code: 'MVL000002906',
    name: 'Lê Thị Uyên',
    recipient_type: 'employee',
    recipient_id: 2906,
    participationPct: 33,
    positions: [
      {
        posIdx: 0,
        posData: {
          pct_type: 'pct_sale_commission',
          percentage: '2.00',
          recipients: [
            {
              employee_id: 2906,
              recipient_name: 'Lê Thị Uyên',
              pct_of_parent: '100.00',
              amount: '35717311',
            },
          ],
          payee_holds: [],
        },
      },
    ],
  },
]

/**
 * Queries bám vào `container` chứ không phải `document.body`: một test dựng bảng HAI lần
 * (bật/tắt cột) để so trực tiếp, mà queries mặc định của RTL sẽ thấy cả hai bảng.
 */
function renderTable(periodFeePct: number | null, periodBonusPct: number | null = null) {
  const { container } = render(
    <RecipientPayoutTable
      groups={groups}
      isCommissionType={isCommissionType}
      accountOwnerByPayee={new Map()}
      canEdit={false}
      onEditGroup={vi.fn()}
      onHoldGroup={vi.fn()}
      periodFeePct={periodFeePct}
      periodBonusPct={periodBonusPct}
    />
  )
  return within(container)
}

type Rendered = ReturnType<typeof renderTable>

const headerTexts = (view: Rendered) =>
  view.getAllByRole('columnheader').map((th) => th.textContent?.trim())

/** colSpan của dòng band nhóm — phải bằng số cột dữ liệu, nếu không layout vỡ. */
const bandColSpan = (view: Rendered) =>
  Number(
    view
      .getAllByRole('cell')
      .find((cell) => cell.hasAttribute('colspan'))
      ?.getAttribute('colspan')
  )

describe('RecipientPayoutTable — hai cột % tiến độ', () => {
  it('hiển thị cột phí với đúng con số của ô "% TT phí" kỳ này', () => {
    const view = renderTable(76)

    expect(view.getByText('% TT phí kỳ này')).toBeInTheDocument()
    expect(view.getByText('76%')).toBeInTheDocument()
  })

  it('cột thưởng mang con số RIÊNG, không lặp lại dial phí', () => {
    const view = renderTable(76, 30)

    expect(view.getByText('% TT thưởng kỳ này')).toBeInTheDocument()
    expect(view.getByText('30%')).toBeInTheDocument()
    expect(view.getByText('76%')).toBeInTheDocument()
  })

  it('đặt cột thưởng ngay sau "Thưởng sale"', () => {
    const headers = headerTexts(renderTable(76, 30))

    expect(headers.indexOf('% TT thưởng kỳ này')).toBe(headers.indexOf('Thưởng sale') + 1)
  })

  it('không có cột % cho giảm trừ — mỗi đợt đối chiếu một tỉ lệ thu khác nhau', () => {
    const headers = headerTexts(renderTable(76, 30))

    expect(headers.indexOf('Giảm trừ')).toBeGreaterThan(-1)
    expect(headers.filter((h) => h?.startsWith('% TT'))).toHaveLength(2)
  })

  it('giữ phần thập phân của dial, định dạng vi-VN (dấu phẩy)', () => {
    expect(renderTable(76.5).getByText('76,5%')).toBeInTheDocument()
  })

  it('CẮT xuống 2dp, không half-up — cùng luật với Mục 2 và ô dial', () => {
    // Bug kế toán báo trên split-sheet 97: cột này hiện "35%" trong khi Mục 2 hiện
    // "34,99%" cho CÙNG một giá trị 34,9999999641 — vì chỗ này half-up còn Mục 2 floor.
    // (Sau khi BE snap kỳ thu đủ về span thì giá trị sẽ là 35 chẵn; luật cắt vẫn phải
    // đúng cho các kỳ chưa/không snap, ví dụ kỳ mới thu một phần.)
    expect(renderTable(34.9999999641).getByText('34,99%')).toBeInTheDocument()
  })

  it('đặt cột ngay giữa "% Phí từng sale" và "Phí từng sale"', () => {
    const headers = headerTexts(renderTable(76))

    expect(headers.indexOf('% TT phí kỳ này')).toBe(headers.indexOf('% Phí từng sale') + 1)
    expect(headers.indexOf('% TT phí kỳ này')).toBe(headers.indexOf('Phí từng sale') - 1)
  })

  it('ẩn cột ở màn admin (periodFeePct = null) — số cột giữ nguyên như trước CR', () => {
    const view = renderTable(null)

    expect(view.queryByText('% TT phí kỳ này')).not.toBeInTheDocument()
    expect(view.queryByText('% TT thưởng kỳ này')).not.toBeInTheDocument()
    // 14 = 13 cột cũ + "Thưởng MV" (2026-08-05). Cột tiền này hiện ở CẢ hai màn:
    // nó chi trọn ở kỳ hoa hồng đầu tiên, không đi theo dial "% TT thưởng kỳ này", nên gộp
    // vào "Thưởng sale" là để một cột % giải thích cho số tiền mà nó không chi phối.
    expect(headerTexts(view)).toHaveLength(14)
    expect(headerTexts(view)).toContain('Thưởng MV')
  })

  it('giữ colSpan dòng band khớp số cột dữ liệu khi bật cột mới', () => {
    expect(bandColSpan(renderTable(76))).toBe(bandColSpan(renderTable(null)) + 1)
    expect(bandColSpan(renderTable(76, 30))).toBe(bandColSpan(renderTable(null)) + 2)
  })
})
