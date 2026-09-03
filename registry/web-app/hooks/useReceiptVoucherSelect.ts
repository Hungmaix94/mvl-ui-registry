import { useCallback } from 'react'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select'
import { getReceiptVoucherService } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'

export function useReceiptVoucherSelect() {
  const loadReceiptVoucherOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      try {
        const paginatedData = await getReceiptVoucherService().getReceiptVouchers({
          page: params.page,
          page_size: params.pageSize || 20,
          search: params.query || undefined,
        } as any)

        if (!paginatedData?.results) {
          return { items: [], nextPage: null, hasNextPage: false }
        }

        const items: SelectOption[] = paginatedData.results.map((voucher) => ({
          value: String(voucher.id),
          label: voucher.code || `Phiếu thu #${voucher.id}`,
        }))

        let nextPage: number | null = null
        const hasNext = !!paginatedData.next
        if (hasNext && paginatedData.next) {
          try {
            const nextUrl = paginatedData.next.startsWith('http')
              ? new URL(paginatedData.next)
              : new URL(paginatedData.next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) nextPage = Number(nextPageParam)
          } catch {
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              nextPage = params.page + 1
            }
          }
        }

        return { items, nextPage, hasNextPage: hasNext }
      } catch {
        return { items: [], nextPage: null, hasNextPage: false }
      }
    },
    []
  )

  const loadInitialReceiptVoucherOptions = useCallback(async (values: (string | number)[]) => {
    if (!values?.length) return []
    try {
      const promises = values.map(async (val) => {
        const voucher = await getReceiptVoucherService().getReceiptVoucher(Number(val))
        return {
          value: String(val),
          label: voucher.code || `Phiếu thu #${val}`,
        }
      })
      return await Promise.all(promises)
    } catch {
      return values.map((v) => ({ value: String(v), label: `Phiếu thu #${v}` }))
    }
  }, [])

  return { loadReceiptVoucherOptions, loadInitialReceiptVoucherOptions }
}
