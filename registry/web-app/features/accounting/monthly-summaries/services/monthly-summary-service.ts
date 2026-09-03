import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type MonthlyBeneficiaryCommissionSummary =
  components['schemas']['MonthlyBeneficiaryCommissionSummary']
export type MonthlyBeneficiaryCommissionSummaryDetail =
  components['schemas']['MonthlyBeneficiaryCommissionSummaryDetail']
export type PaginatedMonthlyBeneficiaryCommissionSummaryList =
  components['schemas']['PaginatedMonthlyBeneficiaryCommissionSummaryList']
export type GetMonthlySummariesParams =
  paths['/api/accounting/monthly-summaries/employees/']['get']['parameters']['query'] & {
    search?: string
    role?: string
  }
export type GetMonthlySummaryHistoriesParams =
  paths['/api/accounting/monthly-summaries/{id}/histories/']['get']['parameters']['query']
export type MonthlySummaryAuditLogSearchResponse = components['schemas']['AuditLogSearchResponse']
export type MonthlySummaryAuditLog = components['schemas']['AuditLog']
export type MonthlySummaryHoldRequest = components['schemas']['_HoldRequestRequest']
export type MonthlySummaryReleaseHoldRequest = components['schemas']['_ReleaseHoldRequestRequest']
export type MonthlySummaryRequestAdvanceRequest = components['schemas']['_RequestAdvanceRequest']
export type MonthlySummaryBatchApproveRequest = components['schemas']['_BatchApproveRequestRequest']
export type MonthlySummaryBatchApproveResult = components['schemas']['_BatchApproveResult']
export type MonthlySummaryCommissionHold = components['schemas']['CommissionHold']
export type MonthlySummaryAdvanceRequest = components['schemas']['CommissionAdvanceRequest']
export type AdvanceRecoveryBreakdownRow = components['schemas']['_AdvanceRecoveryBreakdown']
export type KpiHhqlLine = components['schemas']['_KpiMgmtSource']
export type PaginatedKpiHhqlLineList = components['schemas']['Paginated_KpiMgmtSourceList']
export type GetManagementHhqlLinesParams =
  paths['/api/accounting/monthly-summaries/management/{id}/hhql-lines/']['get']['parameters']['query']

export type AggregateMonthlySummaryRequest = {
  year: number
  month?: number
}

export type MonthlySummaryRole = 'sales' | 'management' | 'f2' | 'collaborators' | 'employees'

// Per-operation role → endpoint lookup maps. Every ApiPaths member is referenced
// literally (never built from string templates) so endpoint-coverage tooling can
// detect each implemented endpoint.
const ROLE_LIST_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_list,
  f2: ApiPaths.accounting_monthly_summaries_f2_list,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_list,
  management: ApiPaths.accounting_monthly_summaries_management_list,
  employees: ApiPaths.accounting_monthly_summaries_employees_list,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_RETRIEVE_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_retrieve,
  f2: ApiPaths.accounting_monthly_summaries_f2_retrieve,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_retrieve,
  management: ApiPaths.accounting_monthly_summaries_management_retrieve,
  employees: ApiPaths.accounting_monthly_summaries_employees_retrieve,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_CONFIRM_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_confirm_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_confirm_create,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_confirm_create,
  management: ApiPaths.accounting_monthly_summaries_management_confirm_create,
  employees: ApiPaths.accounting_monthly_summaries_employees_confirm_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_REOPEN_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_reopen_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_reopen_create,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_reopen_create,
  management: ApiPaths.accounting_monthly_summaries_management_reopen_create,
  employees: ApiPaths.accounting_monthly_summaries_employees_reopen_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_HISTORIES_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_histories_retrieve,
  f2: ApiPaths.accounting_monthly_summaries_f2_histories_retrieve,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_histories_retrieve,
  management: ApiPaths.accounting_monthly_summaries_management_histories_retrieve,
  employees: ApiPaths.accounting_monthly_summaries_employees_histories_retrieve,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_HISTORY_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_history_retrieve,
  f2: ApiPaths.accounting_monthly_summaries_f2_history_retrieve,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_history_retrieve,
  management: ApiPaths.accounting_monthly_summaries_management_history_retrieve,
  employees: ApiPaths.accounting_monthly_summaries_employees_history_retrieve,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_HOLD_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_hold_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_hold_create,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_hold_create,
  management: ApiPaths.accounting_monthly_summaries_management_hold_create,
  employees: ApiPaths.accounting_monthly_summaries_employees_hold_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_RELEASE_HOLD_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_release_hold_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_release_hold_create,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_release_hold_create,
  management: ApiPaths.accounting_monthly_summaries_management_release_hold_create,
  employees: ApiPaths.accounting_monthly_summaries_employees_release_hold_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_REQUEST_ADVANCE_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_request_advance_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_request_advance_create,
  collaborators: ApiPaths.accounting_monthly_summaries_collaborators_request_advance_create,
  management: ApiPaths.accounting_monthly_summaries_management_request_advance_create,
  employees: ApiPaths.accounting_monthly_summaries_employees_request_advance_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_EMAIL_DETAIL_PREVIEW_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_send_commission_detail_email_preview_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_send_commission_detail_email_preview_create,
  collaborators:
    ApiPaths.accounting_monthly_summaries_collaborators_send_commission_detail_email_preview_create,
  management:
    ApiPaths.accounting_monthly_summaries_management_send_commission_detail_email_preview_create,
  employees:
    ApiPaths.accounting_monthly_summaries_employees_send_commission_detail_email_preview_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_EMAIL_DETAIL_SEND_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_send_commission_detail_email_send_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_send_commission_detail_email_send_create,
  collaborators:
    ApiPaths.accounting_monthly_summaries_collaborators_send_commission_detail_email_send_create,
  management:
    ApiPaths.accounting_monthly_summaries_management_send_commission_detail_email_send_create,
  employees:
    ApiPaths.accounting_monthly_summaries_employees_send_commission_detail_email_send_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_EMAIL_AFTER_TAX_PREVIEW_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_send_commission_after_tax_email_preview_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_send_commission_after_tax_email_preview_create,
  collaborators:
    ApiPaths.accounting_monthly_summaries_collaborators_send_commission_after_tax_email_preview_create,
  management:
    ApiPaths.accounting_monthly_summaries_management_send_commission_after_tax_email_preview_create,
  employees:
    ApiPaths.accounting_monthly_summaries_employees_send_commission_after_tax_email_preview_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_EMAIL_AFTER_TAX_SEND_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_send_commission_after_tax_email_send_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_send_commission_after_tax_email_send_create,
  collaborators:
    ApiPaths.accounting_monthly_summaries_collaborators_send_commission_after_tax_email_send_create,
  management:
    ApiPaths.accounting_monthly_summaries_management_send_commission_after_tax_email_send_create,
  employees:
    ApiPaths.accounting_monthly_summaries_employees_send_commission_after_tax_email_send_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_EMAIL_DETAIL_BULK_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_bulk_send_commission_detail_email_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_bulk_send_commission_detail_email_create,
  collaborators:
    ApiPaths.accounting_monthly_summaries_collaborators_bulk_send_commission_detail_email_create,
  management:
    ApiPaths.accounting_monthly_summaries_management_bulk_send_commission_detail_email_create,
  employees:
    ApiPaths.accounting_monthly_summaries_employees_bulk_send_commission_detail_email_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

const ROLE_EMAIL_AFTER_TAX_BULK_PATHS = {
  sales: ApiPaths.accounting_monthly_summaries_sales_bulk_send_commission_after_tax_email_create,
  f2: ApiPaths.accounting_monthly_summaries_f2_bulk_send_commission_after_tax_email_create,
  collaborators:
    ApiPaths.accounting_monthly_summaries_collaborators_bulk_send_commission_after_tax_email_create,
  management:
    ApiPaths.accounting_monthly_summaries_management_bulk_send_commission_after_tax_email_create,
  employees:
    ApiPaths.accounting_monthly_summaries_employees_bulk_send_commission_after_tax_email_create,
} as const satisfies Record<MonthlySummaryRole, ApiPaths>

/** The two commission statement email types. */
export type CommissionEmailKind = 'detail' | 'after_tax'

const EMAIL_PREVIEW_PATHS = {
  detail: ROLE_EMAIL_DETAIL_PREVIEW_PATHS,
  after_tax: ROLE_EMAIL_AFTER_TAX_PREVIEW_PATHS,
} as const

const EMAIL_SEND_PATHS = {
  detail: ROLE_EMAIL_DETAIL_SEND_PATHS,
  after_tax: ROLE_EMAIL_AFTER_TAX_SEND_PATHS,
} as const

const EMAIL_BULK_PATHS = {
  detail: ROLE_EMAIL_DETAIL_BULK_PATHS,
  after_tax: ROLE_EMAIL_AFTER_TAX_BULK_PATHS,
} as const

export type CommissionEmailBulkRequest = components['schemas']['_BulkSendEmailRequestRequest']
export type CommissionEmailBulkResult = components['schemas']['_BulkSendEmailResult']
// One rendered statement.
export type CommissionEmailStatement = components['schemas']['_CommissionEmailPreviewRecipient']

// `statements` has one entry per email `send` would actually dispatch to — more than one
// when the summary's deals resolve to different commission-statement recipients (ClickUp
// 86eyhu4rp: preview must never diverge from what send actually splits into). The
// top-level fields mirror `statements[0]` for callers that only ever expect one recipient.
export type CommissionEmailPreview = components['schemas']['_CommissionEmailPreviewResponse']

// CR STT31 / ClickUp 86eyexcqr — Sale-only per-deal recipient override (backend Sale role only,
// no ROLE_*_PATHS map needed).
export type DealRecipientItem = components['schemas']['_DealRecipientItemRequest']
export type DealRecipientBulkUpdateRequest =
  components['schemas']['Patched_DealRecipientBulkUpdateRequestRequest']

// CR STT33 / ClickUp 86eyexcr3 — CTV-only per-deal mail recipient override, one deal at a time
// (distinct from STT31's Sale bulk override — separate model on the backend, separate endpoint).
export type CtvDealMailRecipientRequest =
  components['schemas']['Patched_UpdateCtvDealMailRecipientRequestRequest']
export type CtvDealMailRecipient = components['schemas']['_CtvDealMailRecipient']

class MonthlySummaryService extends BaseApiService {
  async getMonthlySummaries(
    role: MonthlySummaryRole,
    params?: GetMonthlySummariesParams
  ): Promise<PaginatedMonthlyBeneficiaryCommissionSummaryList> {
    return await this.getPaginated(ROLE_LIST_PATHS[role], params)
  }

  async getMonthlySummary(
    role: MonthlySummaryRole,
    id: number
  ): Promise<MonthlyBeneficiaryCommissionSummaryDetail> {
    return await this.get(ROLE_RETRIEVE_PATHS[role], { path: { id } })
  }

  async confirmMonthlySummary(
    role: MonthlySummaryRole,
    id: number,
    data?: unknown
  ): Promise<MonthlyBeneficiaryCommissionSummary> {
    return await this.post(ROLE_CONFIRM_PATHS[role], data, { path: { id } })
  }

  // Revert a CONFIRMED/EMAIL_SENT summary back to DRAFT so it can be re-aggregated after a late
  // change to the underlying "chia thực nhận" (worksheet re-distribution). The BE guards it and
  // returns 409 when it is unsafe (already paid, sent to bank, advance recovery applied, period
  // hard-closed) — surface that message to the caller. `reason` is optional (audit note).
  async reopenMonthlySummary(
    role: MonthlySummaryRole,
    id: number,
    data?: { reason?: string }
  ): Promise<MonthlyBeneficiaryCommissionSummary> {
    return await this.post(ROLE_REOPEN_PATHS[role], data, { path: { id } })
  }

  async holdMonthlySummary(
    role: MonthlySummaryRole,
    id: number,
    data: MonthlySummaryHoldRequest
  ): Promise<MonthlySummaryCommissionHold> {
    return await this.post(ROLE_HOLD_PATHS[role], data, { path: { id } })
  }

  async releaseHoldMonthlySummary(
    role: MonthlySummaryRole,
    id: number,
    data: MonthlySummaryReleaseHoldRequest
  ): Promise<MonthlySummaryCommissionHold> {
    return await this.post(ROLE_RELEASE_HOLD_PATHS[role], data, { path: { id } })
  }

  async batchApproveMonthlySummary(data: components['schemas']['_BatchApproveRequestRequest']) {
    return await this.post(ApiPaths.accounting_monthly_summaries_batch_approve_create, data)
  }

  async requestAdvanceMonthlySummary(
    role: MonthlySummaryRole,
    id: number,
    data: MonthlySummaryRequestAdvanceRequest
  ): Promise<MonthlySummaryAdvanceRequest> {
    return await this.post(ROLE_REQUEST_ADVANCE_PATHS[role], data, { path: { id } })
  }

  async getMonthlySummaryHistories(
    role: MonthlySummaryRole,
    id: number,
    params?: GetMonthlySummaryHistoriesParams
  ): Promise<MonthlySummaryAuditLogSearchResponse> {
    return await this.get(ROLE_HISTORIES_PATHS[role], {
      path: { id: String(id) },
      query: params,
    })
  }

  async getMonthlySummaryHistory(
    role: MonthlySummaryRole,
    id: number,
    logId: string
  ): Promise<MonthlySummaryAuditLog> {
    return await this.get(ROLE_HISTORY_PATHS[role], {
      path: { id: String(id), log_id: logId },
    })
  }

  async getMonthlySummaryBaseHistories(
    id: number,
    params?: GetMonthlySummaryHistoriesParams
  ): Promise<MonthlySummaryAuditLogSearchResponse> {
    return await this.get(ApiPaths.accounting_monthly_summaries_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getMonthlySummaryBaseHistory(id: number, logId: string): Promise<MonthlySummaryAuditLog> {
    return await this.get(ApiPaths.accounting_monthly_summaries_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async batchApproveMonthlySummaries(
    data: MonthlySummaryBatchApproveRequest
  ): Promise<MonthlySummaryBatchApproveResult> {
    return await this.post(ApiPaths.accounting_monthly_summaries_batch_approve_create, data)
  }

  async aggregateMonthlySummary(
    data: components['schemas']['MonthlySummaryYearMonthRequestRequest']
  ) {
    return await this.post(ApiPaths.accounting_monthly_summaries_aggregate_create, data)
  }

  // Per-advance breakdown explaining `recovered_advance_amount` (sales screen only for now).
  async getSalesAdvanceRecoveryBreakdown(id: number): Promise<AdvanceRecoveryBreakdownRow[]> {
    const response = await this.get(
      ApiPaths.accounting_monthly_summaries_sales_advance_recovery_breakdown_list,
      { path: { id } }
    )
    if (Array.isArray(response)) {
      return response
    }
    return response?.results ?? []
  }

  // Paginated KPI/HHQL lines for a management summary (embedded sources.hhql.kpi can be large).
  async getManagementHhqlLines(
    id: number,
    params?: GetManagementHhqlLinesParams
  ): Promise<PaginatedKpiHhqlLineList> {
    return await this.getPaginated(
      ApiPaths.accounting_monthly_summaries_management_hhql_lines_list,
      params,
      { id }
    )
  }

  // Render the commission statement(s) a `send` call would actually dispatch, without
  // sending anything. `use_real=1` makes the backend render the real summary instead of
  // the template's sample data. `dealId` (CTV `detail` kind only, same as
  // `sendCommissionEmail`) scopes the preview to a single deal instead of the whole period.
  async previewCommissionEmail(
    role: MonthlySummaryRole,
    kind: CommissionEmailKind,
    id: number,
    dealId?: number
  ): Promise<CommissionEmailPreview> {
    const body = dealId != null ? ({ deal_id: dealId } as never) : undefined
    const response = await this.post(EMAIL_PREVIEW_PATHS[kind][role], body, {
      path: { id },
      query: { use_real: '1' },
    })
    return response as unknown as CommissionEmailPreview
  }

  // `dealId` (CR STT33 / ClickUp 86eyexcr3, `detail` kind + `collaborators` role only) scopes the
  // send to a single deal instead of the whole period. The backend action already accepts an
  // optional `deal_id` body field, but its `@extend_schema` still declares `request: None` (schema
  // gap on our own already-shipped endpoint), so the body is cast here rather than typed — mirrors
  // the project's documented workaround for backend fields not yet reflected in the OpenAPI schema.
  async sendCommissionEmail(
    role: MonthlySummaryRole,
    kind: CommissionEmailKind,
    id: number,
    dealId?: number
  ): Promise<unknown> {
    const body = dealId != null ? ({ deal_id: dealId } as never) : undefined
    return await this.post(EMAIL_SEND_PATHS[kind][role], body, { path: { id } })
  }

  // Send one statement per eligible payee of a period in a single job. Payees that cannot be
  // emailed come back in `skipped` (with a reason) instead of failing the run.
  async bulkSendCommissionEmail(
    role: MonthlySummaryRole,
    kind: CommissionEmailKind,
    data: CommissionEmailBulkRequest
  ): Promise<CommissionEmailBulkResult> {
    return await this.post(EMAIL_BULK_PATHS[kind][role], data)
  }

  // Email 3 (HHQL) carries the manager statement as an ATTACHED Excel workbook, so its preview is
  // a file download — not rendered HTML like the other two emails.
  async downloadHhqlEmailPreview(id: number, filename: string): Promise<void> {
    const response = (await this.client.GET(
      ApiPaths.accounting_monthly_summaries_management_hhql_email_preview_retrieve,
      {
        params: { path: { id } },
        parseAs: 'blob',
      }
    )) as unknown as { data?: Blob; error?: unknown }

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

  // One job for the whole period — each manager (TPKD/GDKD) gets their own workbook. Managers that
  // cannot be emailed come back in `skipped` instead of failing the run. Sending a single manager
  // is the same endpoint with `ids: [id]`; there is no per-summary send path for this email.
  async bulkSendHhqlEmail(data: CommissionEmailBulkRequest): Promise<CommissionEmailBulkResult> {
    return await this.post(
      ApiPaths.accounting_monthly_summaries_management_bulk_send_hhql_email_create,
      data
    )
  }

  // CR STT31 / ClickUp 86eyexcqr — bulk edit the per-deal commission-statement recipient override
  // (Sale role only). Returns the updated summary detail so callers can refresh in place.
  async updateDealRecipients(
    id: number,
    data: DealRecipientBulkUpdateRequest
  ): Promise<MonthlyBeneficiaryCommissionSummaryDetail> {
    return await this.patch(
      ApiPaths.accounting_monthly_summaries_sales_deal_recipients_partial_update,
      data,
      { path: { id } }
    )
  }

  // CR STT33 / ClickUp 86eyexcr3 — edit the mail recipient/email override for ONE deal of a CTV
  // summary (distinct model/endpoint from STT31's Sale bulk override above). Does not send.
  async updateCtvDealMailRecipient(
    id: number,
    dealId: number,
    data: CtvDealMailRecipientRequest
  ): Promise<CtvDealMailRecipient> {
    return await this.patch(
      ApiPaths.accounting_monthly_summaries_collaborators_deals_mail_recipient_partial_update,
      data,
      { path: { id, deal_id: dealId } }
    )
  }
}

let _service: MonthlySummaryService | null = null

export function getMonthlySummaryService(): MonthlySummaryService {
  if (!_service) _service = new MonthlySummaryService()
  return _service
}

export function useMonthlySummaries(
  role: MonthlySummaryRole,
  params?: GetMonthlySummariesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_LIST(role, params || {}),
    () => getMonthlySummaryService().getMonthlySummaries(role, params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useMonthlySummary(
  role: MonthlySummaryRole,
  id: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_DETAIL(role, id),
    () => getMonthlySummaryService().getMonthlySummary(role, id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useConfirmMonthlySummary() {
  return useApiMutation((variables: { role: MonthlySummaryRole; id: number; data?: unknown }) =>
    getMonthlySummaryService().confirmMonthlySummary(variables.role, variables.id, variables.data)
  )
}

export function useReopenMonthlySummary() {
  return useApiMutation(
    (variables: { role: MonthlySummaryRole; id: number; data?: { reason?: string } }) =>
      getMonthlySummaryService().reopenMonthlySummary(variables.role, variables.id, variables.data)
  )
}

export function useHoldMonthlySummary() {
  return useApiMutation(
    (variables: { role: MonthlySummaryRole; id: number; data: MonthlySummaryHoldRequest }) =>
      getMonthlySummaryService().holdMonthlySummary(variables.role, variables.id, variables.data)
  )
}

export function useReleaseHoldMonthlySummary() {
  return useApiMutation(
    (variables: { role: MonthlySummaryRole; id: number; data: MonthlySummaryReleaseHoldRequest }) =>
      getMonthlySummaryService().releaseHoldMonthlySummary(
        variables.role,
        variables.id,
        variables.data
      )
  )
}

export function useBatchApproveMonthlySummary() {
  return useApiMutation((data: components['schemas']['_BatchApproveRequestRequest']) =>
    getMonthlySummaryService().batchApproveMonthlySummary(data)
  )
}

export function useRequestAdvanceMonthlySummary() {
  return useApiMutation(
    (variables: {
      role: MonthlySummaryRole
      id: number
      data: MonthlySummaryRequestAdvanceRequest
    }) =>
      getMonthlySummaryService().requestAdvanceMonthlySummary(
        variables.role,
        variables.id,
        variables.data
      )
  )
}

export function useBatchApproveMonthlySummaries() {
  return useApiMutation((data: MonthlySummaryBatchApproveRequest) =>
    getMonthlySummaryService().batchApproveMonthlySummaries(data)
  )
}

export function useAggregateMonthlySummary() {
  return useApiMutation((data: components['schemas']['MonthlySummaryYearMonthRequestRequest']) =>
    getMonthlySummaryService().aggregateMonthlySummary(data)
  )
}

export function usePreviewCommissionEmail() {
  return useApiMutation(
    (variables: {
      role: MonthlySummaryRole
      kind: CommissionEmailKind
      id: number
      dealId?: number
    }) =>
      getMonthlySummaryService().previewCommissionEmail(
        variables.role,
        variables.kind,
        variables.id,
        variables.dealId
      )
  )
}

export function useSendCommissionEmail() {
  return useApiMutation(
    (variables: {
      role: MonthlySummaryRole
      kind: CommissionEmailKind
      id: number
      dealId?: number
    }) =>
      getMonthlySummaryService().sendCommissionEmail(
        variables.role,
        variables.kind,
        variables.id,
        variables.dealId
      )
  )
}

export function useBulkSendCommissionEmail() {
  return useApiMutation(
    (variables: {
      role: MonthlySummaryRole
      kind: CommissionEmailKind
      data: CommissionEmailBulkRequest
    }) =>
      getMonthlySummaryService().bulkSendCommissionEmail(
        variables.role,
        variables.kind,
        variables.data
      )
  )
}

export function useDownloadHhqlEmailPreview() {
  return useApiMutation((variables: { id: number; filename: string }) =>
    getMonthlySummaryService().downloadHhqlEmailPreview(variables.id, variables.filename)
  )
}

export function useBulkSendHhqlEmail() {
  return useApiMutation((data: CommissionEmailBulkRequest) =>
    getMonthlySummaryService().bulkSendHhqlEmail(data)
  )
}

export function useUpdateDealRecipients() {
  return useApiMutation((variables: { id: number; data: DealRecipientBulkUpdateRequest }) =>
    getMonthlySummaryService().updateDealRecipients(variables.id, variables.data)
  )
}

export function useUpdateCtvDealMailRecipient() {
  return useApiMutation(
    (variables: { id: number; dealId: number; data: CtvDealMailRecipientRequest }) =>
      getMonthlySummaryService().updateCtvDealMailRecipient(
        variables.id,
        variables.dealId,
        variables.data
      )
  )
}

export function useMonthlySummaryHistories(
  role: MonthlySummaryRole,
  id: number,
  params?: GetMonthlySummaryHistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_HISTORIES(role, id, params || {}),
    () => getMonthlySummaryService().getMonthlySummaryHistories(role, id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useMonthlySummaryHistory(
  role: MonthlySummaryRole,
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_HISTORY_DETAIL(role, id, logId),
    () => getMonthlySummaryService().getMonthlySummaryHistory(role, id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useMonthlySummaryBaseHistories(
  id: number,
  params?: GetMonthlySummaryHistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.HISTORIES(id, params || {}),
    () => getMonthlySummaryService().getMonthlySummaryBaseHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useMonthlySummaryBaseHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.HISTORY_DETAIL(id, logId),
    () => getMonthlySummaryService().getMonthlySummaryBaseHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesAdvanceRecoveryBreakdown(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_ADVANCE_RECOVERY_BREAKDOWN('sales', id),
    () => getMonthlySummaryService().getSalesAdvanceRecoveryBreakdown(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useManagementHhqlLines(
  id: number,
  params?: GetManagementHhqlLinesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_HHQL_LINES('management', id, params || {}),
    () => getMonthlySummaryService().getManagementHhqlLines(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function getMonthlySummaryLines(summary: any): any[] {
  if (!summary) return []

  if (Array.isArray(summary.lines)) {
    return summary.lines
  }

  let sources = summary.sources
  if (typeof sources === 'string') {
    try {
      sources = JSON.parse(sources)
    } catch (e) {
      sources = null
    }
  }

  if (!sources || typeof sources !== 'object') {
    return []
  }

  const lines: any[] = []

  // 1. Sale
  if (sources.sale?.by_deal && typeof sources.sale.by_deal === 'object') {
    Object.values(sources.sale.by_deal).forEach((deal: any) => {
      if (Array.isArray(deal.items)) {
        deal.items.forEach((item: any) => {
          lines.push({
            id: item.line_id || `${deal.deal_id}-${item.payable_id}`,
            source_role: 'SALE',
            amount: item.amount,
            status: item.status,
            source_info: deal,
            ...item,
          })
        })
      }
    })
  }

  // 2. Mgmt
  if (sources.mgmt) {
    if (sources.mgmt.tbc_by_deal && typeof sources.mgmt.tbc_by_deal === 'object') {
      Object.values(sources.mgmt.tbc_by_deal).forEach((deal: any) => {
        if (Array.isArray(deal.items)) {
          deal.items.forEach((item: any) => {
            lines.push({
              id: item.line_id || `${deal.deal_id}-${item.payable_id}`,
              source_role: 'MGMT',
              amount: item.amount,
              status: item.status,
              source_info: deal,
              ...item,
            })
          })
        }
      })
    }
    if (Array.isArray(sources.mgmt.kpi)) {
      sources.mgmt.kpi.forEach((item: any, idx: number) => {
        lines.push({
          id: item.id || `mgmt-kpi-${idx}`,
          source_role: 'MGMT',
          amount: item.amount,
          source_info: item,
          ...item,
        })
      })
    }
  }

  // 3. F2
  if (sources.f2) {
    if (sources.f2.by_deal && typeof sources.f2.by_deal === 'object') {
      Object.values(sources.f2.by_deal).forEach((deal: any) => {
        if (Array.isArray(deal.items)) {
          deal.items.forEach((item: any) => {
            lines.push({
              id: item.line_id || `${deal.deal_id}-${item.payable_id}`,
              source_role: 'F2',
              amount: item.amount,
              status: item.status,
              source_info: deal,
              ...item,
            })
          })
        }
      })
    }
    if (Array.isArray(sources.f2.by_target)) {
      sources.f2.by_target.forEach((target: any, idx: number) => {
        lines.push({
          id: target.target_id || `f2-target-${idx}`,
          source_role: 'F2',
          amount: target.commission_amount || target.amount,
          source_info: target,
          ...target,
        })
      })
    }
  }

  // 4. Promo
  if (sources.promo && Array.isArray(sources.promo.items)) {
    sources.promo.items.forEach((item: any, idx: number) => {
      lines.push({
        id: item.id || `promo-${idx}`,
        source_role: 'PROMO',
        amount: item.amount,
        source_info: item,
        ...item,
      })
    })
  }

  // 5. Slk
  if (sources.slk) {
    if (Array.isArray(sources.slk.splits)) {
      sources.slk.splits.forEach((item: any, idx: number) => {
        lines.push({
          id: item.id || `slk-split-${idx}`,
          source_role: 'SLK',
          amount: item.amount,
          source_info: item,
          ...item,
        })
      })
    }
    if (Array.isArray(sources.slk.ceo)) {
      sources.slk.ceo.forEach((item: any, idx: number) => {
        lines.push({
          id: item.id || `slk-ceo-${idx}`,
          source_role: 'SLK',
          amount: item.amount,
          source_info: item,
          ...item,
        })
      })
    }
  }

  // 5b. Backoffice — hoa hồng khối hỗ trợ (SUPPORT_FLAT), CR 86eykq956.
  // `splits` là dòng chia từ bảng chia hoa hồng phòng, cùng shape với `slk.splits`.
  // `items` là nguồn payable rời (hiếm), BE trả shape khác nên vẫn tách riêng.
  // Thiếu nhánh này thì tab "HH Backoffice" hiện số mà không có dòng nguồn nào bên dưới.
  if (sources.backoffice) {
    if (Array.isArray(sources.backoffice.splits)) {
      sources.backoffice.splits.forEach((item: any, idx: number) => {
        lines.push({
          id: item.id || `backoffice-split-${idx}`,
          source_role: 'BACKOFFICE',
          amount: item.amount,
          source_info: item,
          ...item,
        })
      })
    }
    if (Array.isArray(sources.backoffice.items)) {
      sources.backoffice.items.forEach((item: any, idx: number) => {
        lines.push({
          id: item.id || `backoffice-item-${idx}`,
          source_role: 'BACKOFFICE',
          amount: item.amount,
          source_info: item,
          ...item,
        })
      })
    }
  }

  // 6. HHQL (Mới)
  if (sources.hhql) {
    if (Array.isArray(sources.hhql.kpi)) {
      sources.hhql.kpi.forEach((item: any, idx: number) => {
        lines.push({
          id: item.id || `hhql-kpi-${idx}`,
          source_role: 'HHQL',
          amount: item.amount,
          source_info: item,
          ...item,
        })
      })
    }
  }

  // 7. Project director (HHGD 20.8.7) — one row per confirmed period doc.
  // `amount` is signed: a retroactive rate cut recognises a negative (clawback) line.
  if (sources.project_director && Array.isArray(sources.project_director.items)) {
    sources.project_director.items.forEach((item: any, idx: number) => {
      lines.push({
        id: item.line_id || item.doc_id || `project-director-${idx}`,
        source_role: 'PROJECT_DIRECTOR',
        amount: item.amount,
        source_info: item,
        ...item,
      })
    })
  }

  // 8. Bonus (Mới)
  if (sources.bonus) {
    if (Array.isArray(sources.bonus.items)) {
      sources.bonus.items.forEach((item: any, idx: number) => {
        lines.push({
          id: item.id || `bonus-item-${idx}`,
          source_role: 'BONUS',
          amount: item.amount,
          source_info: item,
          ...item,
        })
      })
    }
  }

  return lines
}
