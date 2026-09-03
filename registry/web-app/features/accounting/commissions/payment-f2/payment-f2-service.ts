import { BaseApiService } from '@/api/base-service'
import { F2PaymentFilters, F2PaymentListResponse } from './payment-f2.type'

class F2PaymentService extends BaseApiService {
  async getPaymentF2List(params: F2PaymentFilters): Promise<F2PaymentListResponse> {
    const res = await this.get('/api/accounting/reports/f2-payment-list/', {
      query: params as any,
    })
    return res as unknown as F2PaymentListResponse
  }

  async exportPaymentF2List(params: F2PaymentFilters): Promise<void> {
    const response = (await this.client.GET(
      '/api/accounting/reports/f2-payment-list/export/' as any,
      {
        params: { query: params as any },
        parseAs: 'blob',
      }
    )) as unknown as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    const month = params.month ? `_${params.month}` : ''
    const year = params.year ? `_${params.year}` : ''
    link.setAttribute('download', `f2_payment_list${month}${year}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

export const f2PaymentService = new F2PaymentService()
