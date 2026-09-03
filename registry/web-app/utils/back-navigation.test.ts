import { describe, expect, it } from 'vitest'

import { resolveBackTarget } from './back-navigation'

const LIST_PATH = '/sales/deposit-contracts'
const FILTERED_SEARCH = '?page=1&page_size=25&approval_status=pending_admin'

describe('resolveBackTarget', () => {
  describe('thứ tự ưu tiên', () => {
    it('`state.from` thắng mọi thứ — giữ nguyên hành vi của các màn đã truyền from', () => {
      const target = resolveBackTarget({
        from: `${LIST_PATH}${FILTERED_SEARCH}`,
        canGoBack: true,
        fallbackPath: LIST_PATH,
        rememberedSearch: '?page=9',
      })

      expect(target).toEqual({
        type: 'push',
        to: `${LIST_PATH}${FILTERED_SEARCH}`,
        from: undefined,
      })
    })

    it('chuyển `parentFrom` thành `from` mới để chuỗi 3 cấp đi tiếp được', () => {
      const target = resolveBackTarget({
        from: '/sales/deposit-contracts/123',
        parentFrom: `${LIST_PATH}${FILTERED_SEARCH}`,
        canGoBack: true,
        fallbackPath: '/sales/deposit-contracts/123',
      })

      expect(target).toEqual({
        type: 'push',
        to: '/sales/deposit-contracts/123',
        from: `${LIST_PATH}${FILTERED_SEARCH}`,
      })
    })
  })

  describe('không có state.from — đây là 105 điểm gọi không truyền state', () => {
    it('có entry trong app để lùi ⇒ LÙI THẬT, không đẩy sang đường dẫn cha', () => {
      // Đây là ca của bug gốc: bản cũ đoán bằng `document.referrer`, referrer rỗng ở tab mới nên
      // rơi vào nhánh fallback và đẩy về `/sales/deposit-contracts` trần ⇒ mất bộ lọc.
      const target = resolveBackTarget({
        canGoBack: true,
        fallbackPath: LIST_PATH,
        rememberedSearch: FILTERED_SEARCH,
      })

      expect(target).toEqual({ type: 'pop' })
    })

    it('vào thẳng từ ngoài + tab từng ghé màn danh sách ⇒ ghép lại bộ lọc đã nhớ', () => {
      const target = resolveBackTarget({
        canGoBack: false,
        fallbackPath: LIST_PATH,
        rememberedSearch: FILTERED_SEARCH,
      })

      expect(target).toEqual({ type: 'push', to: `${LIST_PATH}${FILTERED_SEARCH}` })
    })

    it('vào thẳng từ ngoài + chưa từng ghé danh sách ⇒ về đường dẫn cha trần, KHÔNG 404', () => {
      const target = resolveBackTarget({
        canGoBack: false,
        fallbackPath: LIST_PATH,
      })

      expect(target).toEqual({ type: 'push', to: LIST_PATH })
    })
  })

  describe('luồng đầy đủ của bug đã báo: A(lọc) → B(chi tiết) → C(lịch sử)', () => {
    it('C → B → A giữ nguyên bộ lọc khi điều hướng trong app', () => {
      // Tại C (lịch sử): idx = 3 ⇒ lùi về B
      expect(
        resolveBackTarget({
          canGoBack: true,
          fallbackPath: '/sales/deposit-contracts/123',
        })
      ).toEqual({ type: 'pop' })

      // Tại B (chi tiết): idx = 2 ⇒ lùi về A' — entry A' vốn đã mang đủ query string
      expect(
        resolveBackTarget({
          canGoBack: true,
          fallbackPath: LIST_PATH,
        })
      ).toEqual({ type: 'pop' })
    })
  })
})
