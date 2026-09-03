import { describe, expect, it } from 'vitest'

import { buildPareto } from './TopProjectsParetoBlock'

const p = (name: string, revenue: number) => ({
  project: { name },
  revenue_amount: String(revenue),
})

describe('buildPareto', () => {
  // Bẫy chính: nếu lấy mẫu số là tổng của topN thì cột cuối luôn ra 100%, và biểu đồ nói dối rằng
  // doanh thu chỉ đến từ mấy dự án được vẽ.
  it('% lũy kế tính trên TỔNG toàn kỳ, không phải tổng của topN', () => {
    const data = buildPareto(
      [p('A', 50), p('B', 30), p('C', 10), p('D', 10)],
      2 // chỉ vẽ 2 cột, nhưng C và D vẫn phải nằm trong mẫu số
    )

    expect(data).toHaveLength(2)
    expect(data[0].cumulativePct).toBeCloseTo(50, 5)
    expect(data[1].cumulativePct).toBeCloseTo(80, 5) // KHÔNG phải 100
  })

  it('sắp xếp giảm dần theo doanh thu', () => {
    const data = buildPareto([p('nhỏ', 10), p('to', 90), p('vừa', 50)])
    expect(data.map((r) => r.name)).toEqual(['to', 'vừa', 'nhỏ'])
  })

  it('bỏ dự án doanh thu 0 và không chia cho 0 khi cả kỳ rỗng', () => {
    expect(buildPareto([p('A', 0), p('B', 0)])).toEqual([])
  })

  it('dự án thiếu tên vẫn vẽ được, không thành undefined', () => {
    const data = buildPareto([{ project: null, revenue_amount: '100' }])
    expect(data[0].name).toBe('(không tên)')
  })

  // Nhãn trục X bị cắt nhưng tên đầy đủ PHẢI còn nguyên trong `name` để tooltip tra ngược được.
  it('cắt nhãn trục nhưng giữ nguyên tên đầy đủ', () => {
    const data = buildPareto([p('Central Square Thái Nguyên', 100)])
    expect(data[0].name).toBe('Central Square Thái Nguyên')
    expect(data[0].shortName).toBe('Central S…')
    expect(data[0].shortName.length).toBeLessThanOrEqual(10)
  })

  it('tên ngắn không bị thêm dấu ba chấm', () => {
    const data = buildPareto([p('The Queen', 100)])
    expect(data[0].shortName).toBe('The Queen')
  })
})
