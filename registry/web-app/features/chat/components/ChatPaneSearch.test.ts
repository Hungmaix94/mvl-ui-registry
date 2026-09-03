import { describe, it, expect } from 'vitest'
import { removeVietnameseDiacritics } from '@/utils/string-utils'

describe('ChatPane Search Logic', () => {
  const sampleMessages = [
    { id: '1', content: 'Xin chào mọi người tại Quảng Ninh' },
    { id: '2', content: 'Cập nhật bảng hàng mới dự án' },
    { id: '3', content: 'CHÀO BẠN VÀ TẤT CẢ' },
    { id: '4', content: 'Thanh toán đợt 1 hợp đồng đặt cọc' },
  ]

  const searchLocalMessages = (query: string, messages: typeof sampleMessages) => {
    const rawTrimmed = query.trim()
    const normalizedQuery = removeVietnameseDiacritics(rawTrimmed.toLowerCase())
    if (!normalizedQuery) return []

    return messages.filter((msg) => {
      const content = msg.content || ''
      const normalizedContent = removeVietnameseDiacritics(content.toLowerCase())
      return normalizedContent.includes(normalizedQuery)
    })
  }

  it('filters messages with trimmed whitespace', () => {
    const results = searchLocalMessages('  Quảng Ninh   ', sampleMessages)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })

  it('filters messages case-insensitively', () => {
    const results = searchLocalMessages('chào', sampleMessages)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['1', '3'])
  })

  it('filters messages diacritic-insensitively (unaccented Vietnamese)', () => {
    const results = searchLocalMessages('quang ninh', sampleMessages)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })

  it('returns empty array when query is empty or whitespace only', () => {
    const results = searchLocalMessages('     ', sampleMessages)
    expect(results).toHaveLength(0)
  })
})
