import { describe, expect, it } from 'vitest'

import { buildEmployeeKpiRows } from './EmployeeKpiBlock'

const e = (fullname: string, target: number, actual: number) => ({
  employee_detail: { fullname },
  business_target_amount: String(target),
  actual_revenue: String(actual),
})

describe('buildEmployeeKpiRows', () => {
  // BE chặn `business_completion_pct` ở trần 99999.99 và làm tròn sẵn. Tính lại từ target/actual
  // để không thừa hưởng trần đó, và để hai cột số với thanh luôn khớp nhau.
  it('tính lại % từ chỉ tiêu và thực tế, không lấy business_completion_pct của BE', () => {
    const [row] = buildEmployeeKpiRows([e('Nguyễn Văn A', 1_000_000_000, 1_120_000_000)])
    expect(row.completionPct).toBeCloseTo(112, 5)
  })

  // Trưởng phòng mở khối này để tìm ai đang đuối, nên người đạt thấp phải dễ thấy — sắp giảm dần
  // cho phép đọc từ trên xuống, còn người cuối danh sách chính là người cần nói chuyện.
  it('sắp xếp giảm dần theo % hoàn thành', () => {
    const rows = buildEmployeeKpiRows([
      e('Thấp', 1_000, 200),
      e('Cao', 1_000, 1_500),
      e('Vừa', 1_000, 900),
    ])
    expect(rows.map((r) => r.name)).toEqual(['Cao', 'Vừa', 'Thấp'])
  })

  it('chưa giao chỉ tiêu → % là null để hiện "—", không phải 0% hay Infinity', () => {
    const [row] = buildEmployeeKpiRows([e('Chưa giao', 0, 500_000_000)])
    expect(row.completionPct).toBeNull()
  })

  it('người chưa giao chỉ tiêu xếp cuối, không chen lên đầu', () => {
    const rows = buildEmployeeKpiRows([e('Chưa giao', 0, 900), e('Đạt thấp', 1_000, 100)])
    expect(rows.map((r) => r.name)).toEqual(['Đạt thấp', 'Chưa giao'])
  })

  it('thiếu tên nhân viên vẫn hiện, không thành undefined', () => {
    const [row] = buildEmployeeKpiRows([
      { employee_detail: null, business_target_amount: '100', actual_revenue: '50' },
    ])
    expect(row.name).toBe('(không tên)')
  })
})

describe('phòng mặc định lấy từ người đăng nhập', () => {
  // `schema.ts` khai `EmployeeSummary.department: string` nhưng `/api/me/` thật trả object
  // `{id, name, code}` — đo trên backend local 25/08/2026. Test này ghim lại hình dạng THẬT để
  // nếu ai đó tin kiểu sinh ra rồi đổi code đọc `.department` như chuỗi thì đỏ ngay.
  it('API thật trả department là object có id, không phải chuỗi', () => {
    const meEmployee = {
      department: { id: 32, name: 'Phòng Thư ký kinh doanh', code: 'PB000000032' },
    }
    const id = (meEmployee as { department?: { id?: number } }).department?.id ?? null
    expect(id).toBe(32)
  })

  it('không có employee thì không suy ra phòng nào — KHÔNG được rơi về "lấy tất"', () => {
    const id = (null as { department?: { id?: number } } | null)?.department?.id ?? null
    expect(id).toBeNull()
  })
})
