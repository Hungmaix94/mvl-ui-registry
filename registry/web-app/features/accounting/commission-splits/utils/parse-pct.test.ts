import { describe, expect, it } from 'vitest'

import { parsePct } from './parse-pct'

/**
 * `parsePct` không được để `NaN` lọt vào state dial.
 *
 * Vì sao đáng một test riêng: `NaN` lọt vào là KẸT CẢ MÀN, không phải hiển thị sai một ô.
 * Cờ `isDialSyncing` tắt khi bản debounce bằng bản local; một `NaN` làm phép so đó không bao
 * giờ đúng, nên `BusyOverlay` phủ Mục ③④⑤⑥ vĩnh viễn — kế toán không chỉnh dial, không duyệt
 * chi, không đọc được số. Kích hoạt chỉ cần BE trả chuỗi RỖNG cho `fee_progress_pct`, mà
 * chuỗi rỗng lọt qua phép chặn `!= null` cũ.
 */
describe('parsePct — chặn NaN từ gốc', () => {
  it('chuỗi rỗng → fallback, KHÔNG phải NaN', () => {
    expect(parsePct('', 0)).toBe(0)
    expect(parsePct('', null)).toBeNull()
  })

  it('null / undefined → fallback', () => {
    expect(parsePct(null, 0)).toBe(0)
    expect(parsePct(undefined, null)).toBeNull()
  })

  it('chuỗi không parse được → fallback', () => {
    expect(parsePct('abc', 0)).toBe(0)
    expect(parsePct('--', null)).toBeNull()
  })

  it('giữ nguyên độ chính xác 10 chữ số thập phân của BE', () => {
    // Dial lưu numeric(14,10); tròn ở đây là lệch tiền — chỉ được tròn lúc render.
    expect(parsePct('21.8181818000', 0)).toBe(21.8181818)
    expect(parsePct('0', null)).toBe(0)
  })

  it('không bao giờ trả NaN, kể cả với đầu vào rác', () => {
    for (const raw of ['', ' ', 'abc', '%', null, undefined]) {
      expect(Number.isNaN(parsePct(raw, 0))).toBe(false)
    }
  })
})
