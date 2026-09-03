import { afterEach, describe, expect, it, vi } from 'vitest'

// Nhập thẳng file hằng, KHÔNG qua barrel `@/routes`: barrel kéo `AppRoute.tsx` → `BreadcrumbWrapper`
// → ngược lại `@/routes`, và vòng lặp đó làm `APP_PATH` là `undefined` lúc module khởi tạo trong test.
import { APP_PATH } from '@/routes/AppRoute.constant'
import { canGoBackInApp, getParentRoute } from './route-utils'

function stubHistoryState(state: unknown) {
  vi.spyOn(window.history, 'state', 'get').mockReturnValue(state)
}

describe('getParentRoute', () => {
  it('cắt segment cuối của pathname', () => {
    expect(getParentRoute('/sales/deposit-contracts/123')).toBe('/sales/deposit-contracts')
  })

  it('bỏ dấu / thừa ở cuối', () => {
    expect(getParentRoute('/sales/deposit-contracts/123/')).toBe('/sales/deposit-contracts')
  })

  it('về dashboard khi chỉ còn một segment', () => {
    expect(getParentRoute('/dashboard')).toBe(APP_PATH.DASHBOARD)
  })

  it('KHÔNG mang theo query string — đây là lý do phải ghép lại bộ lọc đã nhớ', () => {
    // Ghi nhận hành vi thật: `getParentRoute` chỉ nhận pathname, nên nơi gọi phải tự lo query.
    expect(getParentRoute('/sales/deposit-contracts/123')).not.toContain('?')
  })
})

describe('canGoBackInApp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('idx > 0 ⇒ có entry trong app để lùi', () => {
    stubHistoryState({ idx: 2, key: 'abc' })

    expect(canGoBackInApp()).toBe(true)
  })

  it('idx = 0 ⇒ đang ở entry đầu tiên của phiên, không lùi được', () => {
    stubHistoryState({ idx: 0, key: 'abc' })

    expect(canGoBackInApp()).toBe(false)
  })

  it('history.state null (vào thẳng bằng URL, router chưa kịp gắn idx) ⇒ false', () => {
    stubHistoryState(null)

    expect(canGoBackInApp()).toBe(false)
  })

  it('idx không phải number ⇒ false, không tin dữ liệu lạ', () => {
    stubHistoryState({ idx: '3' })

    expect(canGoBackInApp()).toBe(false)
  })
})
