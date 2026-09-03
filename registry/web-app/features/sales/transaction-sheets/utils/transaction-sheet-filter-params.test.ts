import { describe, expect, it } from 'vitest'
import {
  buildFilterValuesFromUrl,
  buildUrlParamsFromFilterValues,
  countActiveFilters,
} from './transaction-sheet-filter-params'

const urlOf = (params: URLSearchParams) => Object.fromEntries(params.entries())

describe('buildFilterValuesFromUrl', () => {
  it('dựng khoảng ngày tạo phiếu từ created_at_from/created_at_to', () => {
    // Arrange
    const searchParams = new URLSearchParams({
      created_at_from: '2026-08-01',
      created_at_to: '2026-08-09',
    })

    // Act
    const values = buildFilterValuesFromUrl(searchParams)

    // Assert
    expect(values.createdDateRange?.from).toEqual(new Date(2026, 7, 1))
    expect(values.createdDateRange?.to).toEqual(new Date(2026, 7, 9))
  })

  it('dựng riêng biệt khoảng ngày cọc và khoảng ngày tạo phiếu', () => {
    // Arrange
    const searchParams = new URLSearchParams({
      deposit_date_from: '2026-07-01',
      created_at_from: '2026-08-01',
    })

    // Act
    const values = buildFilterValuesFromUrl(searchParams)

    // Assert
    expect(values.dateRange?.from).toEqual(new Date(2026, 6, 1))
    expect(values.dateRange?.to).toBeUndefined()
    expect(values.createdDateRange?.from).toEqual(new Date(2026, 7, 1))
  })

  it('không tạo khoảng ngày khi URL không có param tương ứng', () => {
    // Arrange
    const searchParams = new URLSearchParams({ project: '12' })

    // Act
    const values = buildFilterValuesFromUrl(searchParams)

    // Assert
    expect(values.createdDateRange).toBeUndefined()
    expect(values.dateRange).toBeUndefined()
    expect(values.project).toBe(12)
  })

  it('bỏ qua các key phân trang và sắp xếp', () => {
    // Arrange
    const searchParams = new URLSearchParams({
      page: '3',
      page_size: '50',
      ordering: '-created_at',
      code: 'BH0001',
    })

    // Act
    const values = buildFilterValuesFromUrl(searchParams)

    // Assert
    expect(values).toEqual({ code: 'BH0001' })
  })
})

describe('buildUrlParamsFromFilterValues', () => {
  it('chuyển khoảng ngày tạo phiếu thành created_at_from/created_at_to', () => {
    // Arrange
    const formData = {
      createdDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 9) },
    }

    // Act
    const params = buildUrlParamsFromFilterValues(formData)

    // Assert
    expect(urlOf(params)).toEqual({
      created_at_from: '2026-08-01',
      created_at_to: '2026-08-09',
      page: '1',
    })
  })

  it('xoá created_at_from/created_at_to khỏi URL khi người dùng xoá khoảng ngày tạo phiếu', () => {
    // Arrange — giá trị cũ lọt vào form qua initialValues, DateRangePicker trả undefined sau khi bấm X
    const formData = {
      created_at_from: '2026-08-01',
      created_at_to: '2026-08-09',
      createdDateRange: undefined,
      code: 'BH0001',
    }

    // Act
    const params = buildUrlParamsFromFilterValues(formData)

    // Assert
    expect(params.get('created_at_from')).toBeNull()
    expect(params.get('created_at_to')).toBeNull()
    expect(params.get('code')).toBe('BH0001')
  })

  it('xoá deposit_date_from/deposit_date_to khỏi URL khi người dùng xoá khoảng ngày cọc', () => {
    // Arrange
    const formData = {
      deposit_date_from: '2026-07-01',
      deposit_date_to: '2026-07-31',
      dateRange: undefined,
    }

    // Act
    const params = buildUrlParamsFromFilterValues(formData)

    // Assert
    expect(params.get('deposit_date_from')).toBeNull()
    expect(params.get('deposit_date_to')).toBeNull()
  })

  it('ghi đè giá trị ngày cũ bằng khoảng ngày vừa chọn', () => {
    // Arrange
    const formData = {
      created_at_from: '2026-01-01',
      created_at_to: '2026-01-31',
      createdDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 9) },
    }

    // Act
    const params = buildUrlParamsFromFilterValues(formData)

    // Assert
    expect(params.get('created_at_from')).toBe('2026-08-01')
    expect(params.get('created_at_to')).toBe('2026-08-09')
  })

  it('giữ hai bộ lọc ngày độc lập với nhau', () => {
    // Arrange
    const formData = {
      dateRange: { from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) },
      createdDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 9) },
    }

    // Act
    const params = buildUrlParamsFromFilterValues(formData)

    // Assert
    expect(urlOf(params)).toEqual({
      deposit_date_from: '2026-07-01',
      deposit_date_to: '2026-07-31',
      created_at_from: '2026-08-01',
      created_at_to: '2026-08-09',
      page: '1',
    })
  })

  it('giữ lại từ khoá tìm kiếm và luôn đưa về trang 1', () => {
    // Arrange
    const formData = { project: 12 }

    // Act
    const params = buildUrlParamsFromFilterValues(formData, 'BH0002')

    // Assert
    expect(urlOf(params)).toEqual({ search: 'BH0002', project: '12', page: '1' })
  })

  it('bỏ qua các trường rỗng', () => {
    // Arrange
    const formData = { code: '', customer_name: undefined, status: null, investor: 5 }

    // Act
    const params = buildUrlParamsFromFilterValues(formData)

    // Assert
    expect(urlOf(params)).toEqual({ investor: '5', page: '1' })
  })
})

describe('countActiveFilters', () => {
  it('đếm khoảng ngày tạo phiếu như một bộ lọc đang bật', () => {
    // Arrange
    const filters = { createdDateRange: { from: new Date(2026, 7, 1), to: undefined } }

    // Act
    const count = countActiveFilters(filters)

    // Assert
    expect(count).toBe(1)
  })

  it('đếm tách bạch hai bộ lọc ngày', () => {
    // Arrange
    const filters = {
      dateRange: { from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) },
      createdDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 9) },
      project: 12,
    }

    // Act
    const count = countActiveFilters(filters)

    // Assert
    expect(count).toBe(3)
  })

  it('trả về 0 khi không có bộ lọc nào bật', () => {
    // Arrange
    const filters = {}

    // Act
    const count = countActiveFilters(filters)

    // Assert
    expect(count).toBe(0)
  })
})
