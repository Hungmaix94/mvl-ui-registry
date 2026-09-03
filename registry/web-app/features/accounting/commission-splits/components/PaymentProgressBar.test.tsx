// @vitest-environment jsdom
/**
 * Thanh "Tiến độ thanh toán luỹ kế của căn" — dựng lại theo pattern Đối chiếu CĐT v2.0.
 *
 * Ba lớp bug bản cũ mắc phải và test này khoá lại:
 *   1. Phần LŨY KẾ TRƯỚC KỲ bị làm mờ (opacity .55) nên chìm vào nền — thanh đọc thành
 *      "một dải trôi nổi giữa chừng" chứ không phải luỹ kế. Đậm/nhạt phải đúng chiều:
 *      đã đạt = đậm, kỳ này (chưa chốt) = nhạt.
 *   2. flex + `width: %` ⇒ tổng vượt 100% thì mọi đoạn bị flex-shrink bóp đều, im lặng.
 *      Giờ cắt cứng ở mốc 100 để dữ liệu sai lộ ra thay vì được làm cho trông hợp lý.
 *   3. Sắc thứ ba tô theo `alloc.status` (vòng đời duyệt chi cho nhân sự) trong khi thanh
 *      đo tiền CĐT đã về — kỳ đã thu thật bị tô xám như chưa thu. Giờ chỉ còn hai sắc.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  clampPct,
  layoutSegments,
  PaymentProgressBar,
  type PaymentProgressSegment,
} from './PaymentProgressBar'

/** Căn VH100011 trên staging: kỳ 07 đã thu 29,2929%, kỳ 08 đang xem 43,4319%. */
const VH100011: PaymentProgressSegment[] = [
  { key: 'p7', label: 'Kỳ 07/2026', pct: 29.2929, kind: 'settled' },
  { key: 'p8', label: 'Kỳ 08/2026', pct: 43.4319, kind: 'current' },
]

describe('clampPct — % ngoài [0,100] không được bẻ layout', () => {
  it('kẹp về biên', () => {
    expect(clampPct(-5)).toBe(0)
    expect(clampPct(140)).toBe(100)
    expect(clampPct(43.43)).toBe(43.43)
  })

  it('null / NaN / Infinity → 0, không phải NaN% hay thanh đầy giả', () => {
    expect(clampPct(null)).toBe(0)
    expect(clampPct(undefined)).toBe(0)
    expect(clampPct(NaN)).toBe(0)
    // Infinity là dữ liệu rác, KHÔNG phải "đạt trần": kẹp lên 100 sẽ vẽ thanh đầy
    // và nuốt mọi kỳ sau. Giống clampPct của Đối chiếu CĐT v2.0 — không hữu hạn thì về 0.
    expect(clampPct(Infinity)).toBe(0)
  })
})

describe('layoutSegments — các kỳ nối tiếp từ mốc 0', () => {
  it('mốc bắt đầu của kỳ sau = luỹ kế của các kỳ trước', () => {
    const placed = layoutSegments(VH100011)

    expect(placed).toHaveLength(2)
    expect(placed[0]).toMatchObject({ left: 0, width: 29.2929 })
    expect(placed[1]).toMatchObject({ left: 29.2929, width: 43.4319 })
  })

  it('tổng vượt 100% → cắt cứng ở mép, KHÔNG bóp đều các kỳ', () => {
    const placed = layoutSegments([
      { key: 'a', label: 'Kỳ A', pct: 70, kind: 'settled' },
      { key: 'b', label: 'Kỳ B', pct: 50, kind: 'current' },
    ])

    // Kỳ A giữ nguyên 70 — nó là số đã chốt, không được teo lại vì kỳ sau tràn.
    expect(placed[0]).toMatchObject({ left: 0, width: 70 })
    expect(placed[1]).toMatchObject({ left: 70, width: 30 })
    expect(placed[0].width + placed[1].width).toBe(100)
    // Bề rộng bị cắt còn 30, nhưng % thật vẫn là 50 — tooltip phải đọc ra con số gây tràn.
    expect(placed[1].actualPct).toBe(50)
  })

  it('tooltip của đoạn bị cắt hiện % THẬT, không hiện bề rộng đã cắt', () => {
    render(
      <PaymentProgressBar
        segments={[
          { key: 'a', label: 'Kỳ A', pct: 70, kind: 'settled' },
          { key: 'b', label: 'Kỳ B', pct: 50, kind: 'current' },
        ]}
        cumulativePct={120}
      />
    )

    const fills = screen.getAllByTestId('payment-progress-segment')
    expect(fills[1].getAttribute('title')).toBe('Kỳ B: 50%')
  })

  it('kỳ tràn hoàn toàn ngoài mốc 100 thì không vẽ, không đẻ đoạn width âm', () => {
    const placed = layoutSegments([
      { key: 'a', label: 'Kỳ A', pct: 100, kind: 'settled' },
      { key: 'b', label: 'Kỳ B', pct: 20, kind: 'settled' },
    ])

    expect(placed).toHaveLength(1)
    expect(placed[0].width).toBe(100)
  })

  it('kỳ 0% bị bỏ qua — đoạn rộng 0 chỉ tạo vạch trắng ma', () => {
    const placed = layoutSegments([
      { key: 'a', label: 'Kỳ A', pct: 0, kind: 'settled' },
      { key: 'b', label: 'Kỳ B', pct: 43.43, kind: 'current' },
    ])

    expect(placed).toHaveLength(1)
    expect(placed[0]).toMatchObject({ key: 'b', left: 0 })
  })

  it('pct rác từ BE không làm lệch mốc của các kỳ sau', () => {
    const placed = layoutSegments([
      { key: 'a', label: 'Kỳ A', pct: NaN, kind: 'settled' },
      { key: 'b', label: 'Kỳ B', pct: 30, kind: 'current' },
    ])

    expect(placed).toHaveLength(1)
    expect(placed[0]).toMatchObject({ key: 'b', left: 0, width: 30 })
  })
})

describe('render — đọc được tiến độ mà không cần nhìn màu', () => {
  it('aria-label kể đủ 3 phần của thanh', () => {
    render(<PaymentProgressBar segments={VH100011} cumulativePct={72.7248} />)

    const bar = screen.getByRole('img')
    // FLOOR 2dp, dấu phẩy thập phân — cùng quy tắc với trần dial và lũy kế Mục 2.
    // formatPctFloor bỏ phần thập phân khi tròn, nên 0 ra "0%" chứ không phải "0,00%".
    expect(bar.getAttribute('aria-label')).toBe(
      'Lũy kế trước kỳ 29,29%, kỳ này 43,43%, còn lại 27,27%'
    )
  })

  it('chú giải nêu đúng số của từng phần', () => {
    render(<PaymentProgressBar segments={VH100011} cumulativePct={72.7248} />)

    expect(screen.getByText('Lũy kế trước kỳ')).toBeInTheDocument()
    expect(screen.getByText('29,29%')).toBeInTheDocument()
    expect(screen.getByText('Kỳ này (tạm tính)')).toBeInTheDocument()
    expect(screen.getByText('43,43%')).toBeInTheDocument()
    expect(screen.getByText('Còn lại')).toBeInTheDocument()
    expect(screen.getByText('27,27%')).toBeInTheDocument()
  })

  it('phần lũy kế trước kỳ tô ĐẬM, kỳ này tô NHẠT — không phải chiều ngược lại', () => {
    render(<PaymentProgressBar segments={VH100011} cumulativePct={72.7248} />)

    const fills = screen.getAllByTestId('payment-progress-segment')
    expect(fills[0].className).toContain('bg-action-primary-red-default')
    expect(fills[1].className).toContain('bg-red-30')
    // Regression bản cũ: phần đã thu bị opacity .55 nên nhìn như thanh rỗng.
    expect(fills[0].style.opacity).toBe('')
  })

  it('vạch ngăn lót vào trong, không dùng border ăn mất bề rộng của kỳ', () => {
    render(<PaymentProgressBar segments={VH100011} cumulativePct={72.7248} />)

    const fills = screen.getAllByTestId('payment-progress-segment')
    expect(fills[0].className).not.toContain('shadow-[inset')
    expect(fills[1].className).toContain('shadow-[inset')
    expect(fills.every((f) => !f.className.includes('border-r-2'))).toBe(true)
  })

  it('luỹ kế hiện đúng số caller truyền, cắt xuống 2dp', () => {
    render(<PaymentProgressBar segments={VH100011} cumulativePct={72.7248} />)

    expect(screen.getByText('72,72%')).toBeInTheDocument()
  })
})
