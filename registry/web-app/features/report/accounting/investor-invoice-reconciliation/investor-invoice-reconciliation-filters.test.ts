import { describe, expect, it } from 'vitest'

import { HAS_REMAINING_ON, parseHasRemaining } from './investor-invoice-reconciliation-filters'

const at = (query: string) => new URLSearchParams(query)

describe('parseHasRemaining', () => {
  it('vắng param nghĩa là TẮT — mặc định của màn là liệt kê mọi căn', () => {
    expect(parseHasRemaining(at(''))).toBe(false)
    expect(parseHasRemaining(at('project=196&page=1'))).toBe(false)
  })

  it.each(['true', '1', 'TRUE', ' true '])('hiểu %s là BẬT', (raw) => {
    expect(parseHasRemaining(at(`has_remaining=${encodeURIComponent(raw)}`))).toBe(true)
  })

  it.each(['false', '0', '', 'yes', 'co', 'null'])('coi %s là TẮT', (raw) => {
    expect(parseHasRemaining(at(`has_remaining=${encodeURIComponent(raw)}`))).toBe(false)
  })

  it('khớp đúng bộ giá trị BE coi là bật, không rộng hơn', () => {
    // BE `_wants_only_with_remaining` chỉ nhận "1"/"true" sau `.strip().lower()`. FE nhận
    // rộng hơn sẽ tick ô lọc lên trong khi API vẫn trả về đủ dòng — màn hình nói dối.
    expect(parseHasRemaining(at(`has_remaining=${HAS_REMAINING_ON}`))).toBe(true)
    expect(parseHasRemaining(at('has_remaining=2'))).toBe(false)
  })
})
