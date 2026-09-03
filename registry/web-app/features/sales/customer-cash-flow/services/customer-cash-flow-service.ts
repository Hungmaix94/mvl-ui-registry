import { BaseApiService } from '@/api/base-service'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

/**
 * Báo cáo thu-chi tiền khách (18.9).
 *
 * TODO(schema): đổi sang typed sau khi BE lên dev và chạy `yarn api:update:local`.
 * Hai endpoint chưa có trong schema.ts nên gọi raw path + khai type tại chỗ —
 * KHÔNG hand-edit schema.ts (F-QĐ1 của kế hoạch).
 */

const CASH_FLOW_PATH = '/api/sales/reports/customer-cash-flow/'
const CASH_DETAIL_PATH = '/api/sales/reports/customer-cash-detail/'

export type CustomerCashFlowParams = {
  year?: number
  month?: number
  project?: number
  investor?: number
  branch?: number
  block?: number
  department?: number
  transfer_to_account?: string
}

export type CashFlowWeek = {
  index: number
  week_start: string
  week_end: string
}

/** Một dòng của pivot: các tuần theo key "1".."N", cộng `total`. */
export type CashFlowCells = Record<string, string>

export type CashFlowUnitRows = Record<string, CashFlowCells>

export type CustomerCashFlowResponse = {
  year: number
  month: number
  weeks: CashFlowWeek[]
  /** key = tên chi nhánh, cộng khoá `summary` cho dòng tổng. */
  data: Record<string, CashFlowUnitRows>
  row_labels: Record<string, string>
  pending_payment: {
    booking_refund_count: number
    deposit_refund_count: number
    amount: string
  }
  data_quality: {
    deposits_missing_booking_credit: number
    deposits_missing_booking_credit_amount: string
  }
}

export type CustomerCashDetailRow = {
  kind: string
  code: string
  occurred_on: string
  customer: string
  project: string
  unit: string
  custody: string
  amount: string
}

export type CustomerCashDetailResponse = {
  year: number
  month: number
  results: CustomerCashDetailRow[]
}

/** Thứ tự hiển thị các dòng — BE trả `row_labels` nhưng object không có thứ tự. */
export const CASH_FLOW_ROW_ORDER = [
  'booking_in',
  'deposit_in',
  'total_in',
  'in_mv',
  'in_investor',
  'booking_refund_out',
  'deposit_refund_out',
  'total_out',
  'retained_partial',
  'retained_forfeit',
  'not_reconciled_with_investor',
] as const

/**
 * Dòng con thụt lề dưới "Tổng thu ghi nhận" — hai dòng này phải cộng bằng nó.
 *
 * Đúng hai, không phải rút gọn: BE có CheckConstraint chốt `transfer_to_account` ở
 * mv/investor, nên không còn cột "khác" hay "chưa xác định" nào để tiền rơi vào.
 */
export const CASH_FLOW_CUSTODY_ROWS = ['in_mv', 'in_investor']

/** Dòng tổng / dòng nhấn — in đậm. */
export const CASH_FLOW_EMPHASIS_ROWS = ['total_in', 'total_out', 'not_reconciled_with_investor']

class CustomerCashFlowService extends BaseApiService {
  async getPivot(params: CustomerCashFlowParams) {
    return (await this.get(CASH_FLOW_PATH as any, {
      query: params,
    } as any)) as unknown as CustomerCashFlowResponse
  }

  async getDetail(params: CustomerCashFlowParams) {
    return (await this.get(CASH_DETAIL_PATH as any, {
      query: params,
    } as any)) as unknown as CustomerCashDetailResponse
  }

  private async downloadXlsx(
    path: string,
    query: Record<string, unknown>,
    filename: string
  ): Promise<void> {
    const response = (await (this.client.GET as never as (path: string, init: unknown) => unknown)(
      path,
      { params: { query }, parseAs: 'blob' }
    )) as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const url = window.URL.createObjectURL(new Blob([response.data as Blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async exportPivot(params: CustomerCashFlowParams, filename = 'customer-cash-flow.xlsx') {
    await this.downloadXlsx(CASH_FLOW_PATH, { ...params, export: 'xlsx' }, filename)
  }

  async exportDetail(params: CustomerCashFlowParams, filename = 'customer-cash-detail.xlsx') {
    await this.downloadXlsx(CASH_DETAIL_PATH, { ...params, export: 'xlsx' }, filename)
  }
}

let _service: CustomerCashFlowService | null = null

export function getCustomerCashFlowService(): CustomerCashFlowService {
  if (!_service) _service = new CustomerCashFlowService()
  return _service
}

/** Chỉ gọi khi đã đủ year+month — BE bắt buộc cả hai. */
const isReady = (params?: CustomerCashFlowParams) => Boolean(params?.year && params?.month)

export function useCustomerCashFlow(
  params: CustomerCashFlowParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.CUSTOMER_CASH_FLOW.PIVOT(params ?? {}),
    () => getCustomerCashFlowService().getPivot(params!),
    { enabled: (options?.enabled ?? true) && isReady(params) }
  )
}

export function useCustomerCashDetail(
  params: CustomerCashFlowParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.CUSTOMER_CASH_FLOW.DETAIL(params ?? {}),
    () => getCustomerCashFlowService().getDetail(params!),
    { enabled: (options?.enabled ?? true) && isReady(params) }
  )
}
