// @vitest-environment jsdom
/**
 * CR STT39 — "Xem chi tiết Chia HH sale": gộp Mục ① "Căn hộ & Hóa đơn" vào Mục ⑤.
 *
 * Acceptance Criteria khoá ở đây:
 *   1. Phần số ① và số ⑤ hiển thị chung 1 dòng.
 *   2. "Giá trị căn hộ tạm tính" không còn hiển thị.
 */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WorksheetDerivationStrip } from './WorksheetDerivationStrip'

/** Số thật của bảng kê R4_18A (deal HD06-2026-000002) trên staging. */
const R4_18A = {
  basis: '7731019762.00',
  saleFeePct: '2.0000',
  pctRevenue: '4.0000',
  kpi: { canChi: 90224093, daChi: 0, giuLai: 16170200 },
}

const strip = () => screen.getByTestId('worksheet-derivation-strip')

describe('AC1 — cơ sở tính (Mục ①) và kết quả kỳ này (Mục ⑤) chung một dòng', () => {
  it('cả 6 ô nằm trong cùng một dải, không tách thành 2 khối rời', () => {
    render(<WorksheetDerivationStrip {...R4_18A} />)

    const row = strip()
    for (const label of [
      // ← từ Mục ① cũ
      'Giá trị tính phí (chưa VAT)',
      'Phí trả sale',
      '% tính doanh thu',
      // ← KPI vốn có của Mục ⑤
      'Cần chi kỳ này',
      'Đã chi lũy kế',
      'Đang giữ lại',
    ]) {
      expect(within(row).getByText(label)).toBeInTheDocument()
    }
  })

  it('hai nhóm được gắn nhãn theo đúng chuỗi suy diễn: tính trên gì → ra bao nhiêu', () => {
    render(<WorksheetDerivationStrip {...R4_18A} />)

    expect(within(strip()).getByText('Cơ sở tính')).toBeInTheDocument()
    expect(within(strip()).getByText('Kỳ này')).toBeInTheDocument()
  })

  it('bảng kê chưa có dòng chia nào → ẩn nhóm "Kỳ này", cơ sở tính vẫn hiện', () => {
    render(<WorksheetDerivationStrip {...R4_18A} kpi={null} />)

    expect(within(strip()).getByText('Giá trị tính phí (chưa VAT)')).toBeInTheDocument()
    expect(screen.queryByText('Kỳ này')).not.toBeInTheDocument()
    expect(screen.queryByText('Cần chi kỳ này')).not.toBeInTheDocument()
  })
})

describe('AC2 — "Giá trị căn hộ tạm tính" biến mất khỏi màn', () => {
  it('không render nhãn "Giá trị căn hộ tạm tính"', () => {
    render(<WorksheetDerivationStrip {...R4_18A} />)

    expect(screen.queryByText('Giá trị căn hộ tạm tính')).not.toBeInTheDocument()
  })

  it('không render list_price — chỉ còn basis là cơ sở tính duy nhất', () => {
    render(<WorksheetDerivationStrip {...R4_18A} />)

    // list_price của căn này là 9.888.513.675 — regression: dán nhầm list_price vào ô
    // "Giá trị tính phí" thì số vẫn "trông đúng" nhưng sai cơ sở tính hoa hồng.
    expect(screen.queryByText(/9\.888\.513\.675/)).not.toBeInTheDocument()
    expect(within(strip()).getByText(/7\.731\.019\.762/)).toBeInTheDocument()
  })
})

describe('định dạng số — decimal-as-string của BE', () => {
  it('% tối thiểu 2dp, dấu phẩy thập phân theo locale vi-VN', () => {
    render(<WorksheetDerivationStrip {...R4_18A} />)

    expect(within(strip()).getByText('2,00%')).toBeInTheDocument()
    expect(within(strip()).getByText('4,00%')).toBeInTheDocument()
  })

  it('giữ đủ phần thập phân của numeric(14,10) — KHÔNG cắt về 2dp', () => {
    render(
      <WorksheetDerivationStrip
        basis="7731019762.00"
        saleFeePct="3.3333333333"
        pctRevenue="4.0000"
        kpi={null}
      />
    )

    expect(within(strip()).getByText('3,3333333333%')).toBeInTheDocument()
  })

  it('thiếu dữ liệu → em dash, không phải "NaN" hay "0"', () => {
    render(
      <WorksheetDerivationStrip basis={null} saleFeePct="" pctRevenue={undefined} kpi={null} />
    )

    expect(within(strip()).getAllByText('—')).toHaveLength(3)
  })

  it('KPI bằng 0 vẫn hiện "0 đ" — 0 là số thật, không phải thiếu dữ liệu', () => {
    render(<WorksheetDerivationStrip {...R4_18A} />)

    // "Đã chi lũy kế" của bảng kê này đúng bằng 0.
    expect(within(strip()).getByText('0 đ')).toBeInTheDocument()
  })
})
