import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadPayerSuggestions } from './payer-suggestions'

const getInvestors = vi.fn()
const getSourceExchangeDropdown = vi.fn()
const getExchanges = vi.fn()

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({
    getInvestors,
    getSourceExchangeDropdown,
    getExchanges,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  getInvestors.mockResolvedValue({ results: [], next: null })
  getSourceExchangeDropdown.mockResolvedValue({ results: [], next: null })
  getExchanges.mockResolvedValue({ results: [], next: null })
})

describe('loadPayerSuggestions — loại đối tượng "Sàn giao dịch"', () => {
  // Guard cho bug ClickUp 86eyphba2: "[BUG] [Phiếu thu] - Lỗi tìm kiếm nguồn sàn khi chọn
  // Loại đối tượng là Sàn giao dịch" — trước đây gọi /api/realestate/exchanges/?search=
  // (lát cắt F2 "Sàn liên kết") nên tìm mã nguồn sàn "EX000000010" không ra.
  it('gọi dropdown NGUỒN SÀN (F0), tuyệt đối không gọi endpoint sàn liên kết (F2)', async () => {
    await loadPayerSuggestions({
      payerType: 'EXCHANGE',
      query: 'EX000000010',
      page: 2,
      pageSize: 20,
    })

    expect(getSourceExchangeDropdown).toHaveBeenCalledTimes(1)
    expect(getSourceExchangeDropdown).toHaveBeenCalledWith({
      search: 'EX000000010',
      page: 2,
      page_size: 20,
    })
    expect(getExchanges).not.toHaveBeenCalled()
  })

  it('dựng nhãn "[Sàn] mã - tên" và value JSON mang đúng id sàn', async () => {
    getSourceExchangeDropdown.mockResolvedValue({
      results: [{ id: 10, code: 'EX000000010', name: 'Sàn Alpha' }],
      next: 'http://x/?page=2',
    })

    const res = await loadPayerSuggestions({ payerType: 'EXCHANGE', query: 'alpha' })

    expect(res.hasNextPage).toBe(true)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].label).toBe('[Sàn] EX000000010 - Sàn Alpha')
    expect(JSON.parse(res.items[0].value)).toEqual({
      type: 'EXCHANGE',
      id: 10,
      name: 'Sàn Alpha',
      // ExchangeDropdown không có tax_code → để rỗng, nạp sau bằng detail API.
      tax_code: '',
    })
  })

  it('bỏ mã khỏi nhãn khi sàn chưa có code', async () => {
    getSourceExchangeDropdown.mockResolvedValue({
      results: [{ id: 11, code: '', name: 'Sàn Beta' }],
      next: null,
    })

    const res = await loadPayerSuggestions({ payerType: 'EXCHANGE' })

    expect(res.items[0].label).toBe('[Sàn] Sàn Beta')
    expect(res.hasNextPage).toBe(false)
  })
})

describe('loadPayerSuggestions — các nhánh còn lại', () => {
  it('loại "Chủ đầu tư" vẫn đọc danh sách investor kèm tax_code', async () => {
    getInvestors.mockResolvedValue({
      results: [{ id: 5, code: 'INV01', name: 'CĐT An Khang', tax_code: '0101234567' }],
      next: null,
    })

    const res = await loadPayerSuggestions({ payerType: 'INVESTOR', query: 'an' })

    expect(getInvestors).toHaveBeenCalledWith({ search: 'an', page: 1, page_size: 10 })
    expect(getSourceExchangeDropdown).not.toHaveBeenCalled()
    expect(res.items[0].label).toBe('[Chủ đầu tư] INV01 - CĐT An Khang')
    expect(JSON.parse(res.items[0].value).tax_code).toBe('0101234567')
  })

  it('chưa chọn loại đối tượng thì không gọi API nào', async () => {
    const res = await loadPayerSuggestions({ payerType: null, query: 'abc' })

    expect(getInvestors).not.toHaveBeenCalled()
    expect(getSourceExchangeDropdown).not.toHaveBeenCalled()
    expect(res).toEqual({ items: [], hasNextPage: false })
  })

  it('API lỗi thì trả danh sách rỗng thay vì ném ra ngoài', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getSourceExchangeDropdown.mockRejectedValue(new Error('500'))

    const res = await loadPayerSuggestions({ payerType: 'EXCHANGE', query: 'x' })

    expect(res).toEqual({ items: [], hasNextPage: false })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
