import { describe, expect, it } from 'vitest'
import { normalizeBankRef, resolveBankRefUpdate } from './bank-ref-utils'

describe('normalizeBankRef', () => {
  it('quy null/undefined về chuỗi rỗng', () => {
    expect(normalizeBankRef(null)).toBe('')
    expect(normalizeBankRef(undefined)).toBe('')
  })

  it('cắt khoảng trắng thừa', () => {
    expect(normalizeBankRef('  FT123  ')).toBe('FT123')
    expect(normalizeBankRef('   ')).toBe('')
  })
})

// CR 86eycj1de: mã tham chiếu được phép rỗng → không được bắn PATCH thừa khi Ghi sổ.
describe('resolveBankRefUpdate', () => {
  it('không PATCH khi phiếu chưa có mã và người dùng cũng không nhập', () => {
    expect(resolveBankRefUpdate(null, '')).toBeUndefined()
    expect(resolveBankRefUpdate(undefined, '')).toBeUndefined()
  })

  it('không PATCH khi người dùng chỉ gõ toàn khoảng trắng', () => {
    expect(resolveBankRefUpdate(null, '   ')).toBeUndefined()
  })

  it('không PATCH khi giá trị không đổi', () => {
    expect(resolveBankRefUpdate('FT123', 'FT123')).toBeUndefined()
    expect(resolveBankRefUpdate('FT123', '  FT123  ')).toBeUndefined()
  })

  it('PATCH mã đã cắt khoảng trắng khi người dùng bổ sung mã mới', () => {
    expect(resolveBankRefUpdate(null, '  FT999 ')).toBe('FT999')
  })

  it('PATCH khi người dùng sửa mã cũ', () => {
    expect(resolveBankRefUpdate('FT123', 'FT456')).toBe('FT456')
  })

  it('PATCH chuỗi rỗng khi người dùng chủ động xoá mã đã có', () => {
    expect(resolveBankRefUpdate('FT123', '')).toBe('')
  })
})
