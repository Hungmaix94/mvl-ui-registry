import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import KpiAchievementBlock, { aggregateByBlock } from './KpiAchievementBlock'

/**
 * Backend local chỉ có KPI cho kỳ 08/2026 và toàn bộ `actual_amount` = 0, nên nhánh "đã có doanh
 * số" KHÔNG kiểm được bằng mắt trên dữ liệu thật — test này là chỗ duy nhất khoá nó.
 */

const mockQuery = vi.fn()
vi.mock('./useAllDepartmentMonthlyKpis', () => ({
  useAllDepartmentMonthlyKpis: () => mockQuery(),
}))
vi.mock('@/components', () => ({
  LoadingWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/ui/select', () => ({
  Select: () => null,
}))

const row = (block: string, target: number, actual: number) => ({
  department_detail: { block: { name: block } },
  business_target_amount: String(target),
  actual_amount: String(actual),
})

function setData(rows: unknown[], extra: Record<string, unknown> = {}) {
  mockQuery.mockReturnValue({
    data: { rows, count: rows.length, isPartial: false, ...extra },
    isLoading: false,
  })
}

describe('KpiAchievementBlock', () => {
  beforeEach(() => vi.clearAllMocks())

  // Trạng thái thật của kỳ 08/2026 trên máy: 169 phòng có chỉ tiêu, thực tế toàn 0.
  // Thanh tiến độ vẫn phải hiện đủ tên khối + chỉ tiêu đang treo — khác hẳn bản BarChart trước đó
  // phải ẩn hẳn vì tường "0%" nhìn như hỏng.
  it('thực tế = 0 vẫn hiện đủ khối, kèm câu nói rõ chưa có doanh số', () => {
    setData([
      row('Khối Kinh doanh 1', 1_000_000_000, 0),
      row('Khối Kinh doanh 2', 2_000_000_000, 0),
    ])
    render(<KpiAchievementBlock />)

    expect(screen.getByText('Khối Kinh doanh 1')).toBeInTheDocument()
    expect(screen.getByText('Khối Kinh doanh 2')).toBeInTheDocument()
    // Thanh 0% vẫn phải hiện chỉ tiêu đang treo — đó là lý do đổi từ BarChart sang thanh tiến độ.
    expect(screen.getAllByText('0%')).toHaveLength(2)
  })

  // Bỏ recharts ở khối này nên % đọc thẳng được trên DOM — thứ bản BarChart không test được.
  it('in % hoàn thành của từng khối ra DOM', () => {
    setData([row('Khối vượt', 1_000_000_000, 1_120_000_000)])
    render(<KpiAchievementBlock />)

    expect(screen.getByText('112%')).toBeInTheDocument()
  })

  it('chỉ tiêu = 0 hiện "—", KHÔNG phải 0%', () => {
    setData([row('Khối chưa giao chỉ tiêu', 0, 500_000_000)])
    render(<KpiAchievementBlock />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  // Vẽ 10 khối nhưng PHẢI nói ra là đang cắt bớt — nếu không, người xem tưởng công ty chỉ có 10
  // khối. Bỏ dòng kết luận rồi thì lời thú nhận đó chuyển lên dòng mô tả.
  it('vẽ tối đa 10 khối và nói rõ đang cắt bớt', () => {
    setData(
      Array.from({ length: 16 }, (_, i) =>
        row(`Khối ${i}`, 1_000_000_000, i < 12 ? 1_500_000_000 : 100_000_000)
      )
    )
    render(<KpiAchievementBlock />)

    expect(screen.getByText(/hiện 10\/16 khối đạt cao nhất/)).toBeInTheDocument()
    expect(screen.queryByText('Khối 15')).not.toBeInTheDocument()
  })

  it('không cắt bớt thì không nói gì thêm ở dòng mô tả', () => {
    setData([row('Khối A', 1_000_000_000, 500_000_000)])
    render(<KpiAchievementBlock />)

    expect(screen.queryByText(/khối đạt cao nhất/)).not.toBeInTheDocument()
  })

  it('gom thiếu trang thì tự thú nhận, không im lặng', () => {
    setData([row('Khối A', 1_000_000_000, 500_000_000)], { count: 169, isPartial: true })
    render(<KpiAchievementBlock />)

    expect(screen.getByText(/số chưa đủ, đừng dùng để đối chiếu/i)).toBeInTheDocument()
  })
})

describe('aggregateByBlock — phép gộp phòng → khối', () => {
  // Bẫy chính: cộng `completion_pct` từng phòng rồi chia trung bình là SAI — phòng chỉ tiêu nhỏ
  // đạt 200% không bù được phòng chỉ tiêu lớn đạt 20%. Phải tính lại trên TỔNG của khối.
  it('% hoàn thành tính trên tổng khối, không phải trung bình các phòng', () => {
    const [khoiA] = aggregateByBlock([
      row('Khối A', 100_000_000, 200_000_000), // phòng nhỏ, đạt 200%
      row('Khối A', 10_000_000_000, 2_000_000_000), // phòng lớn, đạt 20%
    ])

    // (200tr + 2.000tr) / (100tr + 10.000tr) ≈ 21,78%. Trung bình cộng sẽ ra 110% — lệch 5 lần.
    expect(khoiA.completionPct).toBeCloseTo(21.78, 1)
    expect(khoiA.target).toBe(10_100_000_000)
    expect(khoiA.actual).toBe(2_200_000_000)
  })

  it('phòng chưa gán khối gom vào một nhóm rõ tên, không bị bỏ rơi', () => {
    const out = aggregateByBlock([
      { department_detail: { block: null }, business_target_amount: '5', actual_amount: '1' },
      { business_target_amount: '5', actual_amount: '1' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Chưa gán khối')
    expect(out[0].actual).toBe(2)
  })

  it('chỉ tiêu = 0 → % là null (để hiện "-"), KHÔNG phải 0% hay Infinity', () => {
    const [only] = aggregateByBlock([row('Khối B', 0, 900_000_000)])
    expect(only.completionPct).toBeNull()
  })

  // Sắp theo % hoàn thành chứ không theo tiền: CEO cần thấy khối nào đang đuối, mà khối doanh số
  // lớn vẫn có thể đang dưới chỉ tiêu.
  it('sắp xếp giảm dần theo % hoàn thành', () => {
    const out = aggregateByBlock([
      row('Đuối nhưng to', 10_000_000_000, 5_000_000_000), // 50%, tiền lớn nhất
      row('Nhỏ mà vượt', 100_000_000, 150_000_000), // 150%
    ])
    expect(out.map((r) => r.name)).toEqual(['Nhỏ mà vượt', 'Đuối nhưng to'])
  })
})
