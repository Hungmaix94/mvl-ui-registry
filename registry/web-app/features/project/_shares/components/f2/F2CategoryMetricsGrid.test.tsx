import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { F2CategoryMetricsGrid } from './F2CategoryMetricsGrid'
import { F2_CATEGORIES, type F2Record } from './f2-constants'

// A record carrying a value for every F2 category, including the now-hidden mv_bonus_to_f2 —
// the tile must still not render even when the BE returns a value for it.
const record = {
  pct_f2_commission: '2',
  is_f2_commission_include_vat: true,
  pct_f2_bonus: '2',
  is_f2_bonus_include_vat: true,
  pct_f2_inventory_hold: '2',
  pct_mv_bonus_to_f2: '5',
} as unknown as F2Record

describe('F2CategoryMetricsGrid', () => {
  it('hiển thị 3 nhóm cấu hình F2 còn lại', () => {
    render(<F2CategoryMetricsGrid record={record} />)
    expect(screen.getByText('Hoa hồng sàn liên kết')).toBeInTheDocument()
    expect(screen.getByText('Thưởng từ CĐT')).toBeInTheDocument()
    expect(screen.getByText('Tỷ lệ giữ giỏ hàng')).toBeInTheDocument()
  })

  it('ẩn ô "Thưởng cho sàn LK từ MV" (mv_bonus_to_f2) — ClickUp 86eycwqq1', () => {
    render(<F2CategoryMetricsGrid record={record} />)
    expect(screen.queryByText(/Thưởng cho sàn LK từ MV/i)).not.toBeInTheDocument()
  })

  it('F2_CATEGORIES không còn category "Thưởng cho sàn LK từ MV"', () => {
    expect(F2_CATEGORIES.map((c) => c.label)).not.toContain('Thưởng cho sàn LK từ MV')
  })

  // Phân số phải hiện KÈM số quy đổi. "2 / 3 của 4%" trần không cho người đọc biết đó là 2,667%,
  // và đây chính là lỗi đã để 5/13 màn hiện thiếu (sửa 26/08/2026).
  it('hoa hồng dạng phân số base % → hiện phân số kèm "≈ %" quy đổi', () => {
    const fractionRecord = {
      ...record,
      pct_f2_commission: '0',
      f2_commission_spec: {
        mode: 'fraction',
        num: 2,
        den: 3,
        base_value: '4',
        base_unit: 'pct',
        display_pct: '2.6667',
      },
    } as unknown as F2Record

    render(<F2CategoryMetricsGrid record={fractionRecord} />)
    expect(screen.getByText('2 / 3 của 4%')).toBeInTheDocument()
    expect(screen.getByText('≈ 2,667%')).toBeInTheDocument()
  })

  // BE để display_pct null cho base vnd ⇒ quy đổi là TIỀN. Ghép cứng '%' sẽ ra "≈ 33.333.333%".
  it('hoa hồng dạng phân số base ₫ → quy đổi ra TIỀN, không phải %', () => {
    const vndRecord = {
      ...record,
      pct_f2_commission: '0',
      f2_commission_spec: {
        mode: 'fraction',
        num: 1,
        den: 3,
        base_value: '100000000.0000',
        base_unit: 'vnd',
        display_pct: null,
      },
    } as unknown as F2Record

    render(<F2CategoryMetricsGrid record={vndRecord} />)
    expect(screen.getByText('1 / 3 của 100.000.000 đ')).toBeInTheDocument()
    expect(screen.getByText('≈ 33.333.333 đ')).toBeInTheDocument()
  })
})
