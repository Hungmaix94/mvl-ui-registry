import { describe, expect, it } from 'vitest'

import {
  DASHBOARD_BLOCK,
  DASHBOARD_BLOCK_ABILITY,
  DASHBOARD_BLOCK_FEATURE,
  BLOCK_SPAN,
  DASHBOARD_PRESET,
  NON_EXEC_FORBIDDEN_BLOCKS,
  SELF_GATED,
  PRESET_BLOCKS,
  type DashboardBlockKey,
} from './dashboard-blocks'

const ALL_BLOCKS = Object.values(DASHBOARD_BLOCK) as DashboardBlockKey[]

describe('dashboard-blocks — toàn vẹn bảng ánh xạ', () => {
  // Thêm khối mới mà quên khai quyền thì khối sẽ render cho mọi người. Test này bắt lúc CI,
  // không đợi tới lúc có người nhìn thấy số họ không được xem.
  it('mọi khối đều có mục trong bảng quyền — không có ngoại lệ "khối này không cần gác"', () => {
    for (const key of ALL_BLOCKS) {
      expect(Object.prototype.hasOwnProperty.call(DASHBOARD_BLOCK_ABILITY, key)).toBe(true)
      expect(DASHBOARD_BLOCK_ABILITY[key]).toBeDefined()
    }
  })

  it('mọi khối đều có mục trong bảng cụm tính năng', () => {
    for (const key of ALL_BLOCKS) {
      expect(Object.prototype.hasOwnProperty.call(DASHBOARD_BLOCK_FEATURE, key)).toBe(true)
    }
  })

  it('mọi khối đều thuộc ít nhất một preset — khối khai rồi mà không ai dùng là code chết', () => {
    const used = new Set(Object.values(PRESET_BLOCKS).flat())
    for (const key of ALL_BLOCKS) {
      expect(used.has(key)).toBe(true)
    }
  })

  it('cặp quyền phải đủ 2 phần tử (action, subject) và không rỗng', () => {
    for (const rule of Object.values(DASHBOARD_BLOCK_ABILITY)) {
      // SELF_GATED = component tự kiểm quyền bên trong. Là sentinel TƯỜNG MINH, khác hẳn với
      // `undefined` của trường hợp quên khai — test ở trên bắt trường hợp đó.
      if (rule === SELF_GATED) continue
      expect(rule).toHaveLength(2)
      expect(rule[0]).toBeTruthy()
      expect(rule[1]).toBeTruthy()
    }
  })
})

describe('dashboard-blocks — khoá chốt nghiệp vụ', () => {
  // Chốt với product owner: GĐKD/TPKD KHÔNG xem công nợ và HH phải trả. Nếu ai đó thêm 4 khối này
  // vào preset của họ, test đỏ ngay thay vì lộ số ra ngoài rồi mới biết.
  it.each([DASHBOARD_PRESET.DIRECTOR, DASHBOARD_PRESET.MANAGER])(
    'preset %s không chứa khối công nợ / HH phải trả',
    (preset) => {
      for (const forbidden of NON_EXEC_FORBIDDEN_BLOCKS) {
        expect(PRESET_BLOCKS[preset]).not.toContain(forbidden)
      }
    }
  )

  it('preset EXEC vẫn có đủ 4 khối tiền đó', () => {
    for (const key of NON_EXEC_FORBIDDEN_BLOCKS) {
      expect(PRESET_BLOCKS[DASHBOARD_PRESET.EXEC]).toContain(key)
    }
  })

  it('preset không có khối trùng lặp', () => {
    for (const blocks of Object.values(PRESET_BLOCKS)) {
      expect(new Set(blocks).size).toBe(blocks.length)
    }
  })
})

describe('BLOCK_SPAN và thứ tự khối theo preset', () => {
  it('mọi khối đều khai bề rộng — thiếu thì bố cục im lặng bỏ qua khối đó', () => {
    for (const key of ALL_BLOCKS) {
      expect(BLOCK_SPAN[key], `thiếu BLOCK_SPAN cho ${key}`).toBeDefined()
    }
  })

  // Chốt với người dùng: GĐKD/TPKD chỉ giữ hàng đợi + chấm công + KPI nhân viên. Mọi biểu đồ
  // doanh số/chỉ tiêu cấp khối đã bị bỏ khỏi hai preset này — thêm lại là sai yêu cầu.
  it.each([DASHBOARD_PRESET.DIRECTOR, DASHBOARD_PRESET.MANAGER])(
    'preset %s mở đầu bằng hàng đợi và KHÔNG chứa biểu đồ doanh số',
    (preset) => {
      const blocks = PRESET_BLOCKS[preset]
      expect(blocks[0]).toBe(DASHBOARD_BLOCK.OPERATIONS_QUEUE)
      for (const bo of [
        DASHBOARD_BLOCK.REVENUE_TREND,
        DASHBOARD_BLOCK.KPI_ACHIEVEMENT,
        DASHBOARD_BLOCK.TOP_PROJECTS_PARETO,
        DASHBOARD_BLOCK.COLLECTION_PROGRESS,
        DASHBOARD_BLOCK.SECTION_HRM_COMMON,
      ]) {
        expect(blocks, `${preset} không được chứa ${bo}`).not.toContain(bo)
      }
    }
  )

  // Preset điều hành thì ngược lại: CEO đọc số, không xử lý hàng đợi.
  it('preset điều hành KHÔNG chứa hàng đợi vận hành', () => {
    expect(PRESET_BLOCKS[DASHBOARD_PRESET.EXEC]).not.toContain(DASHBOARD_BLOCK.OPERATIONS_QUEUE)
  })
})

describe('GĐKD và TPKD phải khác nhau, không dùng chung một bộ khối', () => {
  // Chốt với người dùng: hai vai trò khác tầm quản lý. Nếu ai đó gộp lại thành một danh sách,
  // một trong hai sẽ nhìn sai đơn vị — giám đốc soi từng nhân viên, hoặc trưởng phòng soi cả khối.
  it('GĐKD có KPI theo phòng ban, TPKD thì không', () => {
    expect(PRESET_BLOCKS[DASHBOARD_PRESET.DIRECTOR]).toContain(DASHBOARD_BLOCK.DEPARTMENT_KPI)
    expect(PRESET_BLOCKS[DASHBOARD_PRESET.MANAGER]).not.toContain(DASHBOARD_BLOCK.DEPARTMENT_KPI)
  })

  it('hai preset không được trùng khít danh sách khối', () => {
    expect(PRESET_BLOCKS[DASHBOARD_PRESET.DIRECTOR]).not.toEqual(
      PRESET_BLOCKS[DASHBOARD_PRESET.MANAGER]
    )
  })
})
