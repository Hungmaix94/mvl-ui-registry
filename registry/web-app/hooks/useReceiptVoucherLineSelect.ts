import { useCallback } from 'react'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select'
import { getReceiptVoucherService } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { formatCurrencyVND } from '@/utils/common'

import type { components } from '@/api/schema'

type ExtendedReceiptVoucherList = components['schemas']['ReceiptVoucherList'] & {
  invoices?: components['schemas']['ReceiptVoucher']['invoices']
}

export function useReceiptVoucherLineSelect() {
  const loadReceiptVoucherLineOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      try {
        // Query the receipt vouchers list endpoint
        const paginatedData = await getReceiptVoucherService().getReceiptVouchers({
          page: params.page,
          page_size: params.pageSize || 20,
          search: params.query || undefined,
        })

        if (!paginatedData?.results) {
          return { items: [], nextPage: null, hasNextPage: false }
        }

        const items: SelectOption[] = []
        const results = paginatedData.results as ExtendedReceiptVoucherList[]
        results.forEach((voucher) => {
          if (voucher.invoices && voucher.invoices.length > 0) {
            voucher.invoices.forEach((inv: components['schemas']['ReceiptVoucherInvoiceWrite']) => {
              if (inv.lines && inv.lines.length > 0) {
                inv.lines.forEach((line: components['schemas']['ReceiptVoucherLine']) => {
                  items.push({
                    value: String(line.id),
                    label: `${voucher.code} - Dòng #${line.id} (${formatCurrencyVND(Number(line.allocated_amount))} đ)`,
                  })
                })
              }
            })
          }
        })

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

  const loadInitialReceiptVoucherLineOptions = useCallback(async (values: (string | number)[]) => {
    if (!values?.length) return []
    try {
      return values.map((val) => ({
        value: String(val),
        label: `Dòng Phiếu Thu #${val}`,
      }))
    } catch {
      return values.map((v) => ({ value: v, label: String(v) }))
    }
  }, [])

  return { loadReceiptVoucherLineOptions, loadInitialReceiptVoucherLineOptions }
}
