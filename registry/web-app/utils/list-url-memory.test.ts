import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SESSION_STORAGE_KEYS } from '@/constants'
import {
  clearListUrlMemory,
  getRememberedSearch,
  rememberListUrl,
  withRememberedSearch,
} from './list-url-memory'

const LIST_PATH = '/sales/deposit-contracts'
const FILTERED_SEARCH = '?page=1&approval_status=pending_admin'

describe('list-url-memory', () => {
  beforeEach(() => {
    clearListUrlMemory()
    vi.restoreAllMocks()
  })

  describe('rememberListUrl', () => {
    it('nhớ query string theo pathname', () => {
      rememberListUrl(LIST_PATH, FILTERED_SEARCH)

      expect(getRememberedSearch(LIST_PATH)).toBe(FILTERED_SEARCH)
    })

    it('giữ riêng bộ nhớ cho từng màn', () => {
      rememberListUrl(LIST_PATH, FILTERED_SEARCH)
      rememberListUrl('/sales/bookings', '?page=2')

      expect(getRememberedSearch(LIST_PATH)).toBe(FILTERED_SEARCH)
      expect(getRememberedSearch('/sales/bookings')).toBe('?page=2')
    })

    it('XOÁ entry khi search rỗng — user xoá bộ lọc thì không được hồi sinh bộ lọc cũ', () => {
      rememberListUrl(LIST_PATH, FILTERED_SEARCH)
      rememberListUrl(LIST_PATH, '')

      expect(getRememberedSearch(LIST_PATH)).toBe('')
    })

    it('coi "?" trơ là rỗng', () => {
      rememberListUrl(LIST_PATH, FILTERED_SEARCH)
      rememberListUrl(LIST_PATH, '?')

      expect(getRememberedSearch(LIST_PATH)).toBe('')
    })

    it('bỏ entry cũ nhất khi vượt trần 50, giữ lại entry vừa dùng', () => {
      rememberListUrl('/man-dau-tien', '?a=1')
      for (let i = 0; i < 50; i++) {
        rememberListUrl(`/man-${i}`, `?page=${i}`)
      }

      expect(getRememberedSearch('/man-dau-tien')).toBe('')
      expect(getRememberedSearch('/man-49')).toBe('?page=49')
    })

    it('ghi lại một pathname đã có thì đẩy nó về cuối hàng đợi loại bỏ', () => {
      rememberListUrl(LIST_PATH, '?page=1')
      for (let i = 0; i < 49; i++) {
        rememberListUrl(`/man-${i}`, `?page=${i}`)
      }
      // Chạm lại màn cũ rồi thêm 1 màn nữa: màn bị loại phải là `/man-0`, không phải LIST_PATH.
      rememberListUrl(LIST_PATH, FILTERED_SEARCH)
      rememberListUrl('/man-moi', '?page=99')

      expect(getRememberedSearch(LIST_PATH)).toBe(FILTERED_SEARCH)
      expect(getRememberedSearch('/man-0')).toBe('')
    })
  })

  describe('withRememberedSearch', () => {
    it('ghép query string đã nhớ vào đường dẫn trần', () => {
      rememberListUrl(LIST_PATH, FILTERED_SEARCH)

      expect(withRememberedSearch(LIST_PATH)).toBe(`${LIST_PATH}${FILTERED_SEARCH}`)
    })

    it('trả nguyên trạng khi chưa nhớ gì', () => {
      expect(withRememberedSearch(LIST_PATH)).toBe(LIST_PATH)
    })

    it('KHÔNG ghi đè đường dẫn đã tự mang query string — nơi gọi đã nói rõ ý định', () => {
      rememberListUrl(LIST_PATH, FILTERED_SEARCH)

      expect(withRememberedSearch(`${LIST_PATH}?page=7`)).toBe(`${LIST_PATH}?page=7`)
    })

    it('chịu được đường dẫn rỗng', () => {
      expect(withRememberedSearch('')).toBe('')
    })
  })

  describe('storage hỏng thì im lặng bỏ qua, không được làm sập điều hướng', () => {
    it('JSON hỏng ⇒ coi như chưa nhớ gì', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.LIST_URL_MEMORY, '{khong-phai-json')

      expect(getRememberedSearch(LIST_PATH)).toBe('')
      expect(() => rememberListUrl(LIST_PATH, FILTERED_SEARCH)).not.toThrow()
    })

    it('JSON hợp lệ nhưng không phải object ⇒ coi như chưa nhớ gì', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.LIST_URL_MEMORY, '["a","b"]')

      expect(getRememberedSearch(LIST_PATH)).toBe('')
    })

    it('setItem ném lỗi (private mode / hết quota) ⇒ nuốt lỗi', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => rememberListUrl(LIST_PATH, FILTERED_SEARCH)).not.toThrow()
    })

    it('getItem ném lỗi ⇒ trả rỗng thay vì vỡ', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      expect(getRememberedSearch(LIST_PATH)).toBe('')
    })
  })
})
