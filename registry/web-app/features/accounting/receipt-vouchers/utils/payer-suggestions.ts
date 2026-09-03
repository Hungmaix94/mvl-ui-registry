import { getRealEstateService } from '@/services/realestate-service'

export type PayerSuggestionParams = {
  payerType?: string | null
  query?: string
  page?: number
  pageSize?: number
}

export type PayerSuggestionItem = {
  label: string
  value: string
}

export type PayerSuggestionResult = {
  items: PayerSuggestionItem[]
  hasNextPage: boolean
}

const EMPTY_RESULT: PayerSuggestionResult = { items: [], hasNextPage: false }

/**
 * Nạp gợi ý cho ô "Tìm kiếm đối tượng" của phiếu thu.
 *
 * ⚠️ Nhánh `EXCHANGE` phải đọc **nguồn sàn (F0)** qua
 * `/api/realestate/source-exchanges/dropdown/`. Trước đây màn này gọi
 * `/api/realestate/exchanges/?search=` — đó là lát cắt F2 "Sàn liên kết" của cùng bảng
 * `Exchange` (BE chỉ có MỘT model, phân biệt bằng cờ `is_source` / `is_sale_exchange`,
 * xem `docs/ai/domain/project.md`), nên danh sách gợi ý trả về sai tập sàn.
 *
 * `ExchangeDropdown` chỉ có `id/code/name/is_source/is_sale_exchange` — **không có
 * `tax_code`** — nên `tax_code` để rỗng ở đây và được nạp bổ sung từ detail API lúc chọn.
 */
export async function loadPayerSuggestions({
  payerType,
  query,
  page = 1,
  pageSize = 10,
}: PayerSuggestionParams): Promise<PayerSuggestionResult> {
  const search = query || ''

  try {
    if (payerType === 'INVESTOR') {
      const res = await getRealEstateService().getInvestors({ search, page, page_size: pageSize })
      return {
        items: (res.results || []).map((inv) => ({
          label: `[Chủ đầu tư] ${inv.code ? `${inv.code} - ` : ''}${inv.name}`,
          value: JSON.stringify({
            type: 'INVESTOR',
            id: inv.id,
            name: inv.name,
            tax_code: inv.tax_code || '',
          }),
        })),
        hasNextPage: !!res.next,
      }
    }

    if (payerType === 'EXCHANGE') {
      const res = await getRealEstateService().getSourceExchangeDropdown({
        search,
        page,
        page_size: pageSize,
      })
      return {
        items: (res.results || []).map((exc) => ({
          label: `[Sàn] ${exc.code ? `${exc.code} - ` : ''}${exc.name}`,
          value: JSON.stringify({
            type: 'EXCHANGE',
            id: exc.id,
            name: exc.name,
            tax_code: '',
          }),
        })),
        hasNextPage: !!res.next,
      }
    }

    return EMPTY_RESULT
  } catch (err) {
    console.error('Failed to load payer suggestions:', err)
    return EMPTY_RESULT
  }
}
