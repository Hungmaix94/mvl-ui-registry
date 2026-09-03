import { BaseApiService } from '@/api/base-service'
import { extractApiData } from '@/api/response-handler'
import { ApiPaths, components, operations } from '@/api/schema'
import type {
  GetHhqlByProjectParams,
  GetIncomeBySalespersonParams,
  GetInvestorInvoiceReconciliationReportParams,
  GetPartnerDebtReportParams,
  GetProjectMoneyInParams,
  GetProjectSummaryParams,
  GetRevenueByBranchParams,
  GetRevenueByBranchYearlyParams,
  GetSalesCommissionPayoutParams,
  GetUnitsNotFullyPaidParams,
  HhqlByProjectResponse,
  IncomeBySalespersonResponse,
  InvestorInvoiceReportResponse,
  PartnerDebtResponse,
  ProjectMoneyInResponse,
  ProjectSummaryResponse,
  RevenueByBranchResponse,
  RevenueByBranchYearlyResponse,
  SalesCommissionPayoutResponse,
  UnitsNotFullyPaidResponse,
} from '@/api/schema-accounting-reports-compat'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { toSummaryParams } from '@/utils/table/summary'

/** Column totals over the WHOLE filtered set for the investor-invoice reconciliation report. */
export type InvestorInvoiceReportSummary = components['schemas']['InvestorInvoiceReportSummary']

/** Xem `schema-accounting-reports-compat.ts` — type tạm cho nhóm report bị mất annotation. */
export type * from '@/api/schema-accounting-reports-compat'

export type F2DebtResponse = components['schemas']['F2DebtResponse']
export type F2DebtRow = components['schemas']['F2DebtRow']
export type InvoicePaymentTrackingResponse = components['schemas']['InvoicePaymentTrackingResponse']
export type AdvanceSettlementResponse = components['schemas']['AdvanceSettlementResponse']
export type AdvanceSettlementRow = components['schemas']['AdvanceSettlementRow']
export type AdvanceSettlementSummary = components['schemas']['AdvanceSettlementSummary']
export type AdvanceOutstandingReportResponse = components['schemas']['AdvanceOutstandingResponse']
export type GetAdvanceOutstandingReportParams =
  operations['accounting_reports_advance_outstanding_retrieve']['parameters']['query']
export type F2PaymentListResponse = components['schemas']['F2PaymentListResponse']
export type F2PaymentRow = components['schemas']['F2PaymentRow']
// Filters and pagination are part of the generated contract since the BE side of CR 21.3 —
// the hand-written overlay that used to sit here is gone with it.
export type GetAdvanceSettlementParams = NonNullable<
  operations['accounting_reports_advance_settlement_retrieve']['parameters']['query']
>
export type IncomeByRecipientResponse = components['schemas']['IncomeByRecipientResponse']
export type IncomeByRecipientRow = components['schemas']['IncomeByRecipientRow']
export type BeneficiaryCommissionAllocationResponse =
  components['schemas']['BeneficiaryCommissionAllocationResponse']
export type BeneficiaryCommissionAllocationRow =
  components['schemas']['BeneficiaryCommissionAllocationRow']
export type ProjectReceivableImportResult = components['schemas']['ProjectReceivableImportResponse']
export type ProjectReceivableImportPayload = { year: number; month: number; file: File }

// 20.16 (báo cáo 2b): BE đã trả lại `@extend_schema` cho view này (task 86eyddd4y) — decorator
// trước đó gắn nhầm lên helper `_build_results` thay vì method `get`, drf-spectacular im lặng
// bỏ qua nên endpoint publish 0 query param. Nay `schema.ts` có đủ 6 param (`project`,
// `has_debt`, …) lẫn response, nên overlay tay trong `schema-accounting-reports-compat.ts`
// đã gỡ theo.
export type GetProjectReceivableReportParams = NonNullable<
  operations['accounting_reports_project_receivable_retrieve']['parameters']['query']
>
export type ProjectReceivableResponse = components['schemas']['ProjectReceivableResponse']
export type ProjectReceivableRow = components['schemas']['ProjectReceivableRow']

export type GetIncomeByRecipientParams =
  operations['accounting_reports_income_by_recipient_retrieve']['parameters']['query']

export type CommissionPayableReportRow = components['schemas']['CommissionPayableReportRow']
export type CommissionPayableReportResponseData =
  components['schemas']['CommissionPayableReportResponse']
export type GetCommissionPayableReportParams =
  operations['accounting_reports_commission_payable_retrieve']['parameters']['query']
export type CommissionPayableStatusGroup = 'pending' | 'paid'

// 21.5 — Công nợ CĐT theo Lô áp dụng. `view` switches the response shape: `deal` returns
// `LadDebtResponse` (rows + summary), `project` returns `LadDebtProjectResponse` (rows only,
// no summary) — discriminate at the call site with `'summary' in data`.
export type GetInvestorDebtByLadReportParams = NonNullable<
  operations['accounting_reports_investor_debt_by_lad_retrieve']['parameters']['query']
>
export type LadDebtReportResponse = components['schemas']['LadDebtResponse']
export type LadDebtReportRow = components['schemas']['LadDebtRow']
export type LadDebtProjectReportResponse = components['schemas']['LadDebtProjectResponse']
export type LadDebtProjectReportRow = components['schemas']['LadDebtProjectRow']

class ReportService extends BaseApiService {
  async getDebtReport(params?: any) {
    return await this.get(ApiPaths.accounting_reports_debt_retrieve, { query: params })
  }

  async getF2DebtReport(params?: any) {
    return await this.get(ApiPaths.accounting_reports_f2_debt_retrieve, { query: params })
  }

  async getCommissionReport(params?: any) {
    return await this.get(ApiPaths.accounting_reports_commission_retrieve, { query: params })
  }

  async getCommissionBreakdownReport(params?: any) {
    return await this.get(ApiPaths.accounting_reports_commission_breakdown_retrieve, {
      query: params,
    })
  }

  async getF2PaymentListReport(params?: any) {
    return await this.get(ApiPaths.accounting_reports_f2_payment_list_retrieve, { query: params })
  }

  async getTotalReceivablesReport(params?: any) {
    return await this.get(ApiPaths.accounting_reports_total_receivables_retrieve, { query: params })
  }

  async getAdvanceSettlementReport(params?: GetAdvanceSettlementParams) {
    return await this.get(ApiPaths.accounting_reports_advance_settlement_retrieve, {
      query: params,
    })
  }

  async exportAdvanceSettlementReport(params?: GetAdvanceSettlementParams): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.accounting_reports_advance_settlement_retrieve,
      params,
      'advance-settlement-report.xlsx'
    )
  }

  async getAdvanceOutstandingReport(params?: GetAdvanceOutstandingReportParams) {
    return await this.get(ApiPaths.accounting_reports_advance_outstanding_retrieve, {
      query: params,
    })
  }

  async exportAdvanceOutstandingReport(params?: GetAdvanceOutstandingReportParams): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.accounting_reports_advance_outstanding_retrieve,
      params,
      'advance-outstanding-report.xlsx'
    )
  }

  async getBeneficiaryCommissionAllocationReport(params?: any) {
    return await this.get(ApiPaths.accounting_reports_beneficiary_commission_allocation_retrieve, {
      query: params,
    })
  }

  async getProjectReceivableReport(
    params?: GetProjectReceivableReportParams
  ): Promise<ProjectReceivableResponse> {
    return await this.get(ApiPaths.accounting_reports_project_receivable_retrieve, {
      query: params,
    })
  }

  async getInvestorInvoiceReconciliationReport(
    params?: GetInvestorInvoiceReconciliationReportParams
  ): Promise<InvestorInvoiceReportResponse> {
    // One boundary cast: the deployed `schema.ts` still describes the pre-backend#2872
    // contract, so the inferred row type lacks the pre-VAT reconciliation fields
    // (`bonus_amount`, `invoiced_*`, `remaining_*`, `total_invoiced_amount_with_vat`).
    // `InvestorInvoiceReportResponse` already declares that delta on top of the generated
    // schema — drop this cast and run `yarn api:update` once backend#2872 reaches staging.
    const res = await this.get(
      ApiPaths.accounting_reports_investor_invoice_reconciliation_retrieve,
      { query: params }
    )
    return res as unknown as InvestorInvoiceReportResponse
  }

  /**
   * Totals for the report's sticky summary row. A sibling endpoint on purpose: computing it
   * means building every row of the filtered set, which would slow the first page down if it
   * were bundled into the list response. Takes the same filters; ignores page/page_size.
   */
  async getInvestorInvoiceReconciliationSummary(
    params?: Record<string, unknown>
  ): Promise<InvestorInvoiceReportSummary> {
    return await this.get(
      ApiPaths.accounting_reports_investor_invoice_reconciliation_summary_retrieve,
      { query: params as any }
    )
  }

  async getPartnerDebtReport(params?: GetPartnerDebtReportParams): Promise<PartnerDebtResponse> {
    return await this.get(ApiPaths.accounting_reports_partner_debt_retrieve, { query: params })
  }

  async getInvoicePaymentTrackingReport() {
    return await this.get(ApiPaths.accounting_reports_invoice_payment_tracking_retrieve, {})
  }

  /** openapi-fetch cannot infer binary-only (xlsx) responses — narrow cast, same as other export services */
  private async downloadXlsx(
    path: ApiPaths,
    query: Record<string, unknown> | undefined,
    filename: string
  ): Promise<void> {
    const response = (await (this.client.GET as never as (path: string, init: unknown) => unknown)(
      path as any,
      {
        params: {
          query: { ...query, export: 'xlsx' },
        },
        parseAs: 'blob',
      }
    )) as { data?: Blob; error?: unknown }

    if (response.error) throw this.withStatus(response)

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Endpoint chỉ nhận multipart/form-data (file Excel binary). Schema sinh type
   * `file: string` nên body chỉ mang metadata đúng kiểu; bodySerializer gửi FormData
   * thật (openapi-fetch giữ nguyên FormData, browser tự set Content-Type + boundary).
   */
  async importProjectReceivableProjections(payload: ProjectReceivableImportPayload) {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('year', String(payload.year))
    formData.append('month', String(payload.month))
    const response = await this.client.POST(
      ApiPaths.accounting_reports_project_receivable_projections_import_create,
      {
        body: { year: payload.year, month: payload.month, file: payload.file.name },
        bodySerializer: () => formData,
      }
    )
    const { error } = response
    if (error) throw error
    return extractApiData<ProjectReceivableImportResult>(response)
  }

  async getProjectMoneyInReport(params?: GetProjectMoneyInParams): Promise<ProjectMoneyInResponse> {
    return await this.get(ApiPaths.accounting_reports_project_money_in_retrieve, { query: params })
  }

  async getSalesCommissionPayoutReport(
    params?: GetSalesCommissionPayoutParams
  ): Promise<SalesCommissionPayoutResponse> {
    return await this.get(ApiPaths.accounting_reports_sales_commission_payout_retrieve, {
      query: params,
    })
  }

  async getRevenueByBranchReport(
    params?: GetRevenueByBranchParams
  ): Promise<RevenueByBranchResponse> {
    return await this.get(ApiPaths.accounting_reports_revenue_by_branch_retrieve, { query: params })
  }

  /**
   * Endpoint hoàn toàn mới, chưa có trong `schema.ts` (xem comment ở
   * `GetRevenueByBranchYearlyParams` trong `schema-accounting-reports-compat.ts`) — gọi thẳng
   * qua `client.GET` với path string thay vì `ApiPaths.xxx`. Đổi sang
   * `this.get(ApiPaths.accounting_reports_revenue_by_branch_yearly_retrieve, ...)` khi backend
   * PR merge `dev` và `yarn api:update` lấy được endpoint.
   */
  async getRevenueByBranchYearlyReport(
    params?: GetRevenueByBranchYearlyParams
  ): Promise<RevenueByBranchYearlyResponse> {
    const response = (await (this.client.GET as never as (path: string, init: unknown) => unknown)(
      '/api/accounting/reports/revenue-by-branch-yearly/',
      { params: { query: params } }
    )) as { data?: unknown; error?: unknown }

    if (response.error) throw this.withStatus(response)

    return extractApiData<RevenueByBranchYearlyResponse>(response)
  }

  async getUnitsNotFullyPaidReport(
    params?: GetUnitsNotFullyPaidParams
  ): Promise<UnitsNotFullyPaidResponse> {
    return await this.get(ApiPaths.accounting_reports_units_not_fully_paid_retrieve, {
      query: params,
    })
  }

  async getIncomeByRecipientReport(params?: GetIncomeByRecipientParams) {
    return await this.get(ApiPaths.accounting_reports_income_by_recipient_retrieve, {
      query: params,
    })
  }

  async getIncomeBySalespersonReport(
    params?: GetIncomeBySalespersonParams
  ): Promise<IncomeBySalespersonResponse> {
    return await this.get(ApiPaths.accounting_reports_income_by_salesperson_retrieve, {
      query: params,
    })
  }

  async getHhqlByProjectReport(params?: GetHhqlByProjectParams): Promise<HhqlByProjectResponse> {
    return await this.get(ApiPaths.accounting_reports_hhql_by_project_retrieve, { query: params })
  }

  async getProjectSummaryReport(params?: GetProjectSummaryParams): Promise<ProjectSummaryResponse> {
    return await this.get(ApiPaths.accounting_reports_project_summary_retrieve, { query: params })
  }

  async exportIncomeByRecipientReport(params?: GetIncomeByRecipientParams): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.accounting_reports_income_by_recipient_retrieve,
      params,
      'income-by-recipient-report.xlsx'
    )
  }

  async getCommissionPayableReport(
    params?: GetCommissionPayableReportParams
  ): Promise<CommissionPayableReportResponseData> {
    return this.get(ApiPaths.accounting_reports_commission_payable_retrieve, {
      query: params,
    }) as Promise<CommissionPayableReportResponseData>
  }

  async exportCommissionPayableReport(params?: GetCommissionPayableReportParams): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.accounting_reports_commission_payable_retrieve,
      params,
      `commission-payable-${params?.status_group ?? 'pending'}.xlsx`
    )
  }

  async getInvestorDebtByLadReport(
    params?: GetInvestorDebtByLadReportParams
  ): Promise<LadDebtReportResponse | LadDebtProjectReportResponse> {
    return await this.get(ApiPaths.accounting_reports_investor_debt_by_lad_retrieve, {
      query: params,
    })
  }
}

let _service: ReportService | null = null

export function getReportService(): ReportService {
  if (!_service) _service = new ReportService()
  return _service
}

export function useDebtReport(params?: any, options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.DEBT(), params],
    () => getReportService().getDebtReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionReport(params?: any, options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.COMMISSION(), params],
    () => getReportService().getCommissionReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionBreakdownReport(params?: any, options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.COMMISSION_BREAKDOWN(), params],
    () => getReportService().getCommissionBreakdownReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useF2PaymentListReport(params?: any, options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.F2_PAYMENT_LIST(), params],
    () => getReportService().getF2PaymentListReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useTotalReceivablesReport(params?: any, options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.TOTAL_RECEIVABLES(), params],
    () => getReportService().getTotalReceivablesReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAdvanceSettlementReport(
  params?: GetAdvanceSettlementParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.ADVANCE_SETTLEMENT(), JSON.stringify(params ?? {})],
    () => getReportService().getAdvanceSettlementReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAdvanceOutstandingReport(
  params?: GetAdvanceOutstandingReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.ADVANCE_OUTSTANDING(), JSON.stringify(params ?? {})],
    () => getReportService().getAdvanceOutstandingReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useBeneficiaryCommissionAllocationReport(
  params?: any,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.BENEFICIARY_COMMISSION_ALLOCATION(), params],
    () => getReportService().getBeneficiaryCommissionAllocationReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useF2DebtReport(params?: any, options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.F2_DEBT(), params],
    () => getReportService().getF2DebtReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useProjectReceivableReport(
  params?: GetProjectReceivableReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.PROJECT_RECEIVABLE(), JSON.stringify(params ?? {})],
    () => getReportService().getProjectReceivableReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function usePartnerDebtReport(
  params?: GetPartnerDebtReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.PARTNER_DEBT(), JSON.stringify(params ?? {})],
    () => getReportService().getPartnerDebtReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useInvestorInvoiceReconciliationReport(
  params?: GetInvestorInvoiceReconciliationReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [
      ...QUERY_KEYS.ACCOUNTING.REPORTS.INVESTOR_INVOICE_RECONCILIATION(),
      JSON.stringify(params ?? {}),
    ],
    () => getReportService().getInvestorInvoiceReconciliationReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Sticky summary-row totals for the report. Keyed on filters only, so paging never refetches
 * it — this endpoint is deliberately the heavy one.
 */
export function useInvestorInvoiceReconciliationSummary(
  params?: GetInvestorInvoiceReconciliationReportParams,
  options?: { enabled?: boolean }
) {
  const summaryParams = toSummaryParams(params)
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.REPORTS.INVESTOR_INVOICE_RECONCILIATION_SUMMARY(summaryParams),
    () => getReportService().getInvestorInvoiceReconciliationSummary(summaryParams),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useInvoicePaymentTrackingReport(options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.INVOICE_PAYMENT_TRACKING()],
    () => getReportService().getInvoicePaymentTrackingReport(),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useImportProjectReceivableProjections() {
  return useApiMutation(
    (payload: ProjectReceivableImportPayload) =>
      getReportService().importProjectReceivableProjections(payload),
    { showErrorToast: true }
  )
}

export function useProjectMoneyInReport(
  params?: GetProjectMoneyInParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.PROJECT_MONEY_IN(), JSON.stringify(params ?? {})],
    () => getReportService().getProjectMoneyInReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesCommissionPayoutReport(
  params?: GetSalesCommissionPayoutParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.SALES_COMMISSION_PAYOUT(), JSON.stringify(params ?? {})],
    () => getReportService().getSalesCommissionPayoutReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useRevenueByBranchReport(
  params?: GetRevenueByBranchParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.REVENUE_BY_BRANCH(), JSON.stringify(params ?? {})],
    () => getReportService().getRevenueByBranchReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useRevenueByBranchYearlyReport(
  params?: GetRevenueByBranchYearlyParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.REVENUE_BY_BRANCH_YEARLY(), JSON.stringify(params ?? {})],
    () => getReportService().getRevenueByBranchYearlyReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useUnitsNotFullyPaidReport(
  params?: GetUnitsNotFullyPaidParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.UNITS_NOT_FULLY_PAID(), JSON.stringify(params ?? {})],
    () => getReportService().getUnitsNotFullyPaidReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useIncomeByRecipientReport(
  params?: GetIncomeByRecipientParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.INCOME_BY_RECIPIENT(), JSON.stringify(params ?? {})],
    () => getReportService().getIncomeByRecipientReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useIncomeBySalespersonReport(
  params?: GetIncomeBySalespersonParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.INCOME_BY_SALESPERSON(), JSON.stringify(params ?? {})],
    () => getReportService().getIncomeBySalespersonReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useHhqlByProjectReport(
  params?: GetHhqlByProjectParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.HHQL_BY_PROJECT(), JSON.stringify(params ?? {})],
    () => getReportService().getHhqlByProjectReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useProjectSummaryReport(
  params?: GetProjectSummaryParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.PROJECT_SUMMARY(), JSON.stringify(params ?? {})],
    () => getReportService().getProjectSummaryReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useExportIncomeByRecipientReport() {
  const mutation = useApiMutation((params: GetIncomeByRecipientParams) =>
    getReportService().exportIncomeByRecipientReport(params)
  )
  return {
    openExportDialog: mutation.mutate,
    isExporting: mutation.isPending,
  }
}

export function useExportAdvanceSettlementReport() {
  const mutation = useApiMutation((params: GetAdvanceSettlementParams) =>
    getReportService().exportAdvanceSettlementReport(params)
  )
  return {
    openExportDialog: mutation.mutate,
    isExporting: mutation.isPending,
  }
}

export function useExportAdvanceOutstandingReport() {
  const mutation = useApiMutation((params: GetAdvanceOutstandingReportParams) =>
    getReportService().exportAdvanceOutstandingReport(params)
  )
  return {
    openExportDialog: mutation.mutate,
    isExporting: mutation.isPending,
  }
}

export function useCommissionPayableReport(
  params?: GetCommissionPayableReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery<CommissionPayableReportResponseData>(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.COMMISSION_PAYABLE(), JSON.stringify(params ?? {})],
    () => getReportService().getCommissionPayableReport(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useExportCommissionPayableReport() {
  const mutation = useApiMutation((params: GetCommissionPayableReportParams) =>
    getReportService().exportCommissionPayableReport(params)
  )
  return {
    openExportDialog: mutation.mutate,
    isExporting: mutation.isPending,
  }
}

// `view` decides the actual response shape at runtime (deal vs project grain) — the schema
// documents both via `LadDebtPolymorphicResponse` (oneOf), which TS can't narrow from a query
// param value. Callers pick the shape they expect via the type param, mirroring how each tab
// only ever renders one grain at a time.
export function useInvestorDebtByLadReport<
  TResponse extends LadDebtReportResponse | LadDebtProjectReportResponse =
    | LadDebtReportResponse
    | LadDebtProjectReportResponse,
>(params?: GetInvestorDebtByLadReportParams, options?: { enabled?: boolean }) {
  return useApiQuery<TResponse>(
    [...QUERY_KEYS.ACCOUNTING.REPORTS.INVESTOR_DEBT_BY_LAD(), JSON.stringify(params ?? {})],
    () => getReportService().getInvestorDebtByLadReport(params) as Promise<TResponse>,
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}
