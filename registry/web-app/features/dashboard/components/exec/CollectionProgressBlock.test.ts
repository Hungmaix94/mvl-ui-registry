import { describe, expect, it } from 'vitest'

import { buildCollectionProgress } from './CollectionProgressBlock'

const p = (name: string, receivable: number, collected: number) => ({
  project: { name },
  receivable_amount: String(receivable),
  collected_amount: String(collected),
})

describe('buildCollectionProgress', () => {
  // Sắp theo SỐ TIỀN còn lại, không theo %: dự án còn 20 tỷ ở mức 60% đáng lo hơn hẳn dự án còn
  // 50 triệu ở mức 10%. Sắp theo % là đẩy đúng khoản tiền lớn xuống cuối danh sách.
  it('sắp xếp theo số tiền còn lại giảm dần, không theo %', () => {
    const { data } = buildCollectionProgress([
      p('Nợ ít nhưng % thấp', 100, 10), // còn 90, thu 10%
      p('Nợ nhiều', 10_000, 6_000), // còn 4.000, thu 60%
    ])
    expect(data.map((r) => r.name)).toEqual(['Nợ nhiều', 'Nợ ít nhưng % thấp'])
  })

  it('bỏ dự án đã thu đủ hoặc thu vượt', () => {
    const { data, projectCount } = buildCollectionProgress([
      p('Đã thu đủ', 100, 100),
      p('Thu vượt', 100, 120),
      p('Còn nợ', 100, 40),
    ])
    expect(data.map((r) => r.name)).toEqual(['Còn nợ'])
    expect(projectCount).toBe(1)
  })

  // Tổng phải tính trên TOÀN BỘ dự án còn nợ, không chỉ topN đang vẽ — nếu không thì câu kết luận
  // báo thiếu tiền mà nhìn vẫn như tổng.
  it('tổng còn nợ tính trên mọi dự án, không chỉ topN', () => {
    const rows = Array.from({ length: 5 }, (_, i) => p(`DA ${i}`, 1000, 0))
    const { data, totalOutstanding, projectCount } = buildCollectionProgress(rows, 2)

    expect(data).toHaveLength(2)
    expect(projectCount).toBe(5)
    expect(totalOutstanding).toBe(5000)
  })

  it('phải thu = 0 thì % là null để hiện "—", không chia cho 0', () => {
    // receivable 0 mà collected âm sẽ ra outstanding > 0 — trường hợp biên, không được vỡ.
    const { data } = buildCollectionProgress([
      { project: { name: 'Lạ' }, receivable_amount: '0', collected_amount: '-5' },
    ])
    expect(data[0]?.collectedPct).toBeNull()
  })

  it('dự án thiếu tên vẫn hiện, không thành undefined', () => {
    const { data } = buildCollectionProgress([
      { project: null, receivable_amount: '100', collected_amount: '10' },
    ])
    expect(data[0].name).toBe('(không tên)')
  })
})
