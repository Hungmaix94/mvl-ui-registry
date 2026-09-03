import { describe, expect, it } from 'vitest'
import { BANK_ACCOUNT_NUMBER_MAX_LENGTH, isValidBankAccountNumber } from './bank-account-number'

/**
 * Luật này sinh ra từ ClickUp 86eyqjbtb: QA gõ sai khuôn dạng vào ô số tài khoản của hộp thoại
 * Hoàn tiền mà hệ thống vẫn trả 200. Các ca dưới đây là đúng những gì QA gõ được trên thực tế.
 */
describe('isValidBankAccountNumber', () => {
  it('nhận số tài khoản toàn chữ số', () => {
    expect(isValidBankAccountNumber('9999888877')).toBe(true)
  })

  it('nhận số tài khoản dài, vẫn toàn chữ số', () => {
    expect(isValidBankAccountNumber('0011000123456')).toBe(true)
  })

  it('từ chối chữ cái — số tài khoản ngân hàng VN là chữ số', () => {
    expect(isValidBankAccountNumber('VCB0123456789')).toBe(false)
  })

  it('từ chối dấu cách giữa các cụm, kiểu chép từ mặt thẻ', () => {
    expect(isValidBankAccountNumber('0123 4567 89')).toBe(false)
  })

  /** Dấu `'` đầu chuỗi là dấu vết Excel ép ô về text — đi vào form qua copy-paste. */
  it('từ chối dấu nháy đầu chuỗi do Excel để lại', () => {
    expect(isValidBankAccountNumber("'9999888877")).toBe(false)
  })

  it('từ chối ký tự đặc biệt và chữ có dấu', () => {
    expect(isValidBankAccountNumber('0123-4567')).toBe(false)
    expect(isValidBankAccountNumber('abc!!!###')).toBe(false)
    expect(isValidBankAccountNumber('số tài khoản')).toBe(false)
  })

  it('từ chối chuỗi rỗng — nhưng luật "chưa nhập" của form phải chạy trước', () => {
    expect(isValidBankAccountNumber('')).toBe(false)
  })

  /**
   * Chốt vào đúng bề rộng cột DB: `CharField(max_length=50)`. Quá 50 mà lọt xuống BE thì
   * serializer hoàn cọc không chặn (không khai `max_length`) và lỗi nổ ở tầng DB.
   */
  it('chặn đúng ở mốc 50 ký tự của cột DB', () => {
    expect(isValidBankAccountNumber('9'.repeat(BANK_ACCOUNT_NUMBER_MAX_LENGTH))).toBe(true)
    expect(isValidBankAccountNumber('9'.repeat(BANK_ACCOUNT_NUMBER_MAX_LENGTH + 1))).toBe(false)
  })

  /** Regex không mang cờ `g`: có `g` thì `lastIndex` còn lưu lại, gọi lần hai ra kết quả khác. */
  it('cho cùng kết quả khi gọi lặp lại trên cùng một giá trị', () => {
    expect(isValidBankAccountNumber('9999888877')).toBe(true)
    expect(isValidBankAccountNumber('9999888877')).toBe(true)
  })
})
