import { describe, expect, it } from 'vitest'

import {
  buildHhqlByProjectParams,
  parseProjectIds,
  serializeProjectIds,
} from './hhql-by-project-filter-params'

describe('parseProjectIds', () => {
  it('đọc danh sách id nối phẩy trên URL', () => {
    expect(parseProjectIds('12,37')).toEqual([12, 37])
  })

  it('trả mảng rỗng khi không có tham số', () => {
    expect(parseProjectIds(null)).toEqual([])
    expect(parseProjectIds('')).toEqual([])
  })

  it('bỏ phần rác thay vì để NaN rơi xuống query', () => {
    // `?project=12,abc,` từng cho ra `[12, NaN]`; `NaN` đi tiếp vào query string thành
    // `project__in=12,NaN` và BE trả 400 mà màn hình chỉ hiện bảng trống.
    expect(parseProjectIds('12,abc,,0,-3')).toEqual([12])
  })

  it('bỏ id trùng, giữ nguyên thứ tự', () => {
    expect(parseProjectIds('37,12,37')).toEqual([37, 12])
  })
})

describe('serializeProjectIds', () => {
  it('nối phẩy các id đã chọn', () => {
    expect(serializeProjectIds([12, '37'])).toBe('12,37')
  })

  it('trả null khi không chọn gì — trang sẽ xoá hẳn tham số khỏi URL', () => {
    expect(serializeProjectIds([])).toBeNull()
    expect(serializeProjectIds(undefined)).toBeNull()
  })

  it('trả null khi mọi giá trị đều không hợp lệ', () => {
    expect(serializeProjectIds(['', 'abc'])).toBeNull()
  })
})

describe('buildHhqlByProjectParams', () => {
  it('gửi project__in dạng mảng, KHÔNG phải project số ít', () => {
    // BE lọc theo `project__in`; gửi nhầm `project` thì chỉ một dự án được lọc và file Excel
    // lệch phạm vi so với bảng — xem `HhqlByProjectReportPage`.
    const params = buildHhqlByProjectParams({ year: 2026, month: 7, projectIds: [12, 37] })

    expect(params).toEqual({ year: 2026, month: 7, project__in: [12, 37] })
    expect(params).not.toHaveProperty('project')
  })

  it('bỏ hẳn project__in khi không lọc dự án nào', () => {
    const params = buildHhqlByProjectParams({ year: 2026, month: 7, projectIds: [] })

    expect(params).toEqual({ year: 2026, month: 7 })
    expect('project__in' in params).toBe(false)
  })

  it('không gửi year/month rỗng lên API', () => {
    expect(buildHhqlByProjectParams({ projectIds: [] })).toEqual({
      year: undefined,
      month: undefined,
    })
  })
})
