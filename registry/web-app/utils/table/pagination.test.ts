import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { resolvePageSize } from './pagination'

describe('resolvePageSize', () => {
  it('giữ nguyên mọi mức có trong PAGE_SIZES', () => {
    PAGE_SIZES.forEach((size) => {
      expect(resolvePageSize(String(size))).toBe(size)
    })
  })

  it('rơi về PAGE_SIZE khi URL không có page_size', () => {
    expect(resolvePageSize(null)).toBe(PAGE_SIZE)
    expect(resolvePageSize(undefined)).toBe(PAGE_SIZE)
    expect(resolvePageSize('')).toBe(PAGE_SIZE)
  })

  it('rơi về PAGE_SIZE với giá trị rác trên URL thay vì gửi NaN xuống API', () => {
    expect(resolvePageSize('abc')).toBe(PAGE_SIZE)
    expect(resolvePageSize('25.5')).toBe(PAGE_SIZE)
    expect(resolvePageSize('-25')).toBe(PAGE_SIZE)
  })

  it('từ chối mức không có trong dropdown phân trang', () => {
    expect(PAGE_SIZES).not.toContain(99999)
    expect(resolvePageSize('99999')).toBe(PAGE_SIZE)
    expect(resolvePageSize('7')).toBe(PAGE_SIZE)
  })

  it('nhận cả number để callback phân trang không phải ép sang string', () => {
    PAGE_SIZES.forEach((size) => {
      expect(resolvePageSize(size)).toBe(size)
    })
    expect(resolvePageSize(7)).toBe(PAGE_SIZE)
  })

  it('không coi 0 là hợp lệ (Number("") === 0 nên phải chặn riêng)', () => {
    expect(PAGE_SIZES).not.toContain(0)
    expect(resolvePageSize(0)).toBe(PAGE_SIZE)
    expect(resolvePageSize('0')).toBe(PAGE_SIZE)
  })
})
