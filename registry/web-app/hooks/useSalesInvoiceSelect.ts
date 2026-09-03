import { useCallback } from 'react'
import { getSalesInvoiceService } from '@/features/accounting/sales-invoices/services/sales-invoice-service'

export const useSalesInvoiceSelect = () => {
  const loadInvoiceOptions = useCallback(
    async (search: string, _loadedOptions: any[], { page }: any) => {
      try {
        const response = await getSalesInvoiceService().getSalesInvoices({
          search,
          page,
          page_size: 20,
          status: 'ISSUED', // Only issued invoices
        } as any)
        const options = response.results.map((item: any) => ({
          value: item.id,
          label: `${item.code} - ${item.customer?.name || 'Khách hàng'}`,
          item,
        }))
        return {
          options,
          hasMore: response.next !== null,
          additional: { page: page + 1 },
        }
      } catch (error) {
        return { options: [], hasMore: false }
      }
    },
    []
  )

  const loadInitialInvoiceOptions = useCallback(async (id: number) => {
    try {
      const response = (await getSalesInvoiceService().getSalesInvoice(id)) as any
      return {
        value: response.id,
        label: `${response.code} - ${response.customer?.name || 'Khách hàng'}`,
        item: response,
      }
    } catch (error) {
      return null
    }
  }, [])

  return { loadInvoiceOptions, loadInitialInvoiceOptions }
}
