import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type InvestorAdvanceAccount = components['schemas']['InvestorAdvanceAccount']
export type InvestorAdvanceAccountRequest = components['schemas']['InvestorAdvanceAccountRequest']
export type InvestorAdvanceLedgerEntry = components['schemas']['InvestorAdvanceLedgerEntry']
export type AdvanceDrawdownInputRequest = components['schemas']['AdvanceDrawdownInputRequest']
export type GetInvestorAdvanceAccountsParams = NonNullable<
  paths['/api/accounting/investor-advance-accounts/']['get']['parameters']['query']
>

/** Loại đối trừ quỹ trên một dòng phiếu thu. */
export const INVESTOR_ADVANCE_APPLICATION_KIND = {
  /** Khai ở dòng đối chiếu — chỉ giảm công nợ CĐT, số dư tiền mặt KHÔNG đổi. */
  RECON_OFFSET: 'RECON_OFFSET',
  /** Trích quỹ trả thẳng hoá đơn — giảm CẢ HAI trục. */
  DIRECT_DRAWDOWN: 'DIRECT_DRAWDOWN',
} as const

export type InvestorAdvanceApplicationKind =
  (typeof INVESTOR_ADVANCE_APPLICATION_KIND)[keyof typeof INVESTOR_ADVANCE_APPLICATION_KIND]

/** Một lần phiếu thu tiêu quỹ — nguồn của tab "Đã đối trừ" ở màn chi tiết quỹ. */
export type InvestorAdvanceApplication = {
  id: number
  kind: InvestorAdvanceApplicationKind
  amount: string
  receipt_voucher_id: number | null
  receipt_voucher_code: string | null
  receipt_date: string | null
  sales_invoice_id: number | null
  sales_invoice_code: string | null
  deal_id: number | null
  deal_code: string | null
  investor_reconciliation_code: string | null
  reversed_at: string | null
  note: string
  created_at: string
}

export type GetInvestorAdvanceApplicationsParams = {
  kind?: InvestorAdvanceApplicationKind
  deal?: number
  sales_invoice?: number
  receipt_voucher?: number
  page?: number
  page_size?: number
}

class InvestorAdvanceService extends BaseApiService {
  async getAccounts(params?: GetInvestorAdvanceAccountsParams) {
    return await this.getPaginated(ApiPaths.accounting_investor_advance_accounts_list, params)
  }

  async createAccount(data: InvestorAdvanceAccountRequest) {
    return await this.post(ApiPaths.accounting_investor_advance_accounts_create, data)
  }

  async getAccount(id: number) {
    return await this.get(ApiPaths.accounting_investor_advance_accounts_retrieve, { path: { id } })
  }

  async deposit(id: number, data: { amount: string; note?: string }) {
    return await this.post(
      ApiPaths.accounting_investor_advance_accounts_deposit_create,
      {
        amount: data.amount,
        note: data.note || '',
      },
      {
        path: { id },
      }
    )
  }

  async drawdown(id: number, data: AdvanceDrawdownInputRequest) {
    return await this.post(ApiPaths.accounting_investor_advance_accounts_drawdown_create, data, {
      path: { id },
    })
  }

  /** Danh sách phiếu thu đã đối trừ quỹ. Raw path: endpoint chưa có trong schema generated. */
  async getApplications(id: number, params?: GetInvestorAdvanceApplicationsParams) {
    return (await this.getPaginated(
      '/api/accounting/investor-advance-accounts/{id}/applications/' as never,
      params as never,
      { id }
    )) as unknown as { results: InvestorAdvanceApplication[]; count: number }
  }
}

let _service: InvestorAdvanceService | null = null

export function getInvestorAdvanceService(): InvestorAdvanceService {
  if (!_service) _service = new InvestorAdvanceService()
  return _service
}

export function useInvestorAdvanceAccounts(
  params?: GetInvestorAdvanceAccountsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INVESTOR_ADVANCE_ACCOUNTS.LIST(params || {}),
    () => getInvestorAdvanceService().getAccounts(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useInvestorAdvanceAccount(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INVESTOR_ADVANCE_ACCOUNTS.DETAIL(id),
    () => getInvestorAdvanceService().getAccount(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateInvestorAdvanceAccount() {
  return useApiMutation((data: InvestorAdvanceAccountRequest) =>
    getInvestorAdvanceService().createAccount(data)
  )
}

export function useDepositInvestorAdvance() {
  return useApiMutation((variables: { id: number; data: { amount: string; note?: string } }) =>
    getInvestorAdvanceService().deposit(variables.id, variables.data)
  )
}

export function useDrawdownInvestorAdvance() {
  return useApiMutation((variables: { id: number; data: AdvanceDrawdownInputRequest }) =>
    getInvestorAdvanceService().drawdown(variables.id, variables.data)
  )
}

export function useInvestorAdvanceApplications(
  accountId: number,
  params?: GetInvestorAdvanceApplicationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INVESTOR_ADVANCE_APPLICATIONS.LIST(accountId, params || {}),
    () => getInvestorAdvanceService().getApplications(accountId, params),
    { enabled: !!accountId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
