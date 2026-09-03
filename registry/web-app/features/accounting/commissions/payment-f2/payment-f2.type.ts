export interface BasePaginationRequest {
  page?: number
  page_size?: number
}

export type F2PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED'

export interface F2PaymentRow {
  payable_code: string
  deal_code: string
  parent_investor_reconciliation_code?: string
  project: string
  unit_code: string
  unit_number?: string
  recipient_type: 'EXCHANGE' | 'COLLABORATOR'
  recipient_name: string
  commission_period_year: number
  commission_period_month: number
  expected_amount: string | number
  actual_amount: string | number
  balance: string | number
  status: F2PaymentStatus
  last_payment_date: string | null
  paid_at: string | null
  due_date: string | null
  days_overdue: number
  is_voided: boolean
}

export interface F2PaymentSummary {
  total_expected: string | number
  total_paid: string | number
  total_balance: string | number
  count_total: number
  count_unpaid: number
  count_partial: number
  count_paid: number
  count_overdue: number
  count_voided: number
}

export interface F2PaymentListResponse {
  rows: F2PaymentRow[]
  summary: F2PaymentSummary
  pagination: {
    page: number
    page_size: number
    total: number
  }
}

export interface F2PaymentFilters extends BasePaginationRequest {
  year?: number
  month?: number
  recipient_type?: 'EXCHANGE' | 'COLLABORATOR'
  recipient_id?: number
  project_id?: number
  branch?: string
  status?: F2PaymentStatus
  is_overdue?: boolean
  include_voided?: boolean
}
