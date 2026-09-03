import { describe, expect, it } from 'vitest'

import {
  activeHhqlChips,
  buildHhqlOrgOptions,
  countHhqlFilters,
  hasSomethingToFilter,
  readHhqlFilterFromParams,
  toHhqlApiParams,
  writeHhqlFilterToParams,
  type HhqlLineForOptions,
} from './hhql-org-filter'

/**
 * Bộ lọc org của mục ③ (HHQL) — CR ClickUp 86ey9mytk.
 *
 * Ba thứ đáng canh ở đây, đều là chỗ sai âm thầm chứ không nổ:
 *  1. Lựa chọn phải rút từ CHÍNH các dòng của phiếu (không phải danh mục toàn công ty).
 *  2. Tham số gửi API phải mang tiền tố `kpi_` — tên `department` bị filterset màn danh sách bắt
 *     trước và làm API trả 404 (xem `MonthlyHhqlLineFilterSet` bên backend).
 *  3. Tham số trên URL phải mang tiền tố `hhql_` để section khác không giẫm chân.
 */

const dong = (
  branch: [number, string] | null,
  block: [number, string] | null,
  dept: [number, string] | null
): HhqlLineForOptions => ({
  kpi_branch: branch ? { id: branch[0], name: branch[1] } : null,
  kpi_block: block ? { id: block[0], name: block[1] } : null,
  kpi_department: dept ? { id: dept[0], name: dept[1] } : null,
})

const DA_NANG = dong([1, 'Đà Nẵng'], [10, 'Khối KD Đà Nẵng'], [100, 'Phòng KD 1_DN'])
const DA_NANG_2 = dong([1, 'Đà Nẵng'], [10, 'Khối KD Đà Nẵng'], [101, 'Phòng KD 2_DN'])
const HA_NOI = dong([2, 'Hà Nội'], [20, 'Khối KD Hà Nội'], [200, 'Phòng KD 1_HN'])

describe('buildHhqlOrgOptions', () => {
  it('rút đúng giá trị có thật, không trùng lặp', () => {
    const options = buildHhqlOrgOptions([DA_NANG, DA_NANG_2, HA_NOI])

    expect(options.branches.map((o) => o.value).sort()).toEqual([1, 2])
    expect(options.blocks.map((o) => o.value).sort()).toEqual([10, 20])
    expect(options.departments.map((o) => o.value).sort()).toEqual([100, 101, 200])
  })

  it('gắn org cha vào từng lựa chọn để 3 ô thu hẹp được lẫn nhau', () => {
    const options = buildHhqlOrgOptions([DA_NANG, HA_NOI])
    const phongDN = options.departments.find((o) => o.value === 100)

    expect(phongDN).toMatchObject({ branchId: 1, blockId: 10 })
  })

  it('bỏ qua org khuyết thay vì tạo lựa chọn rác', () => {
    const options = buildHhqlOrgOptions([dong(null, null, [100, 'Phòng KD 1_DN'])])

    expect(options.branches).toEqual([])
    expect(options.departments).toHaveLength(1)
  })

  it('phiếu chỉ có 1 org ở mọi cấp thì không có gì để lọc', () => {
    // Đúng phiếu trong ảnh Khoa gửi: 1 khoản, 1 phòng. Bày nút Lọc ra chỉ thêm nhiễu.
    expect(hasSomethingToFilter(buildHhqlOrgOptions([DA_NANG]))).toBe(false)
    expect(hasSomethingToFilter(buildHhqlOrgOptions([DA_NANG, HA_NOI]))).toBe(true)
  })
})

describe('tham số URL', () => {
  it('đọc được danh sách id ngăn bởi dấu phẩy', () => {
    const params = new URLSearchParams('hhql_branch=1,2&hhql_department=100')

    expect(readHhqlFilterFromParams(params)).toEqual({
      branch: [1, 2],
      block: [],
      department: [100],
    })
  })

  it('bỏ qua giá trị rác thay vì đẩy chuỗi hỏng lên API', () => {
    const params = new URLSearchParams('hhql_branch=abc,2,,-5,0')

    expect(readHhqlFilterFromParams(params).branch).toEqual([2])
  })

  it('ghi vào URL và xoá hẳn khoá khi bỏ chọn hết', () => {
    const base = new URLSearchParams('tab=chi-tiet&hhql_branch=1')
    const next = writeHhqlFilterToParams(base, { branch: [], block: [7], department: [] })

    expect(next.get('hhql_branch')).toBeNull()
    expect(next.get('hhql_block')).toBe('7')
    // Tham số của người khác trên cùng URL không được đụng tới.
    expect(next.get('tab')).toBe('chi-tiet')
  })
})

describe('toHhqlApiParams', () => {
  it('gửi tên có tiền tố kpi_, KHÔNG phải branch/block/department', () => {
    // Đây là ca canh lỗi 404 đã vấp thật: `get_object()` bên DRF chạy filterset của màn danh
    // sách trước, nên tham số tên `department` lọc theo phòng của NGƯỜI HƯỞNG và làm chính bảng
    // kê đang mở biến mất.
    const params = toHhqlApiParams({ branch: [1], block: [10], department: [100, 101] })

    expect(params).toEqual({ kpi_branch: '1', kpi_block: '10', kpi_department: '100,101' })
    expect(Object.keys(params)).not.toContain('department')
    expect(Object.keys(params)).not.toContain('branch')
  })

  it('không gửi khoá rỗng — tránh `?kpi_branch=` lọc ra tập rỗng', () => {
    expect(toHhqlApiParams({ branch: [], block: [], department: [] })).toEqual({})
  })
})

describe('chip trạng thái', () => {
  it('hiện tên org, không hiện id trần', () => {
    const options = buildHhqlOrgOptions([DA_NANG, HA_NOI])
    const chips = activeHhqlChips({ branch: [1], block: [], department: [200] }, options)

    expect(chips.map((c) => c.label)).toEqual(['Đà Nẵng', 'Phòng KD 1_HN'])
  })

  it('id không còn trong phiếu vẫn hiện được để người dùng bấm gỡ', () => {
    // URL chia sẻ từ kỳ khác có thể mang id lạ. Ẩn chip đi là người dùng thấy bảng rỗng mà
    // không có cách nào bỏ bộ lọc.
    const chips = activeHhqlChips(
      { branch: [999], block: [], department: [] },
      buildHhqlOrgOptions([DA_NANG])
    )

    expect(chips).toEqual([{ key: 'branch', id: 999, label: '#999' }])
  })

  it('đếm bộ lọc cộng cả 3 cấp', () => {
    expect(countHhqlFilters({ branch: [1, 2], block: [10], department: [] })).toBe(3)
  })
})
