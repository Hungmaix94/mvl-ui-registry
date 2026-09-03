import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useQueryClient, keepPreviousData } from '@tanstack/react-query'

export type CommissionSplitListRow = components['schemas']['DealPeriodWorksheetListRow']

export interface ExtendedCommissionSplitRecipient
  extends Omit<
    components['schemas']['CommissionSplitRecipient'],
    'hold_amount' | 'reason' | 'note' | 'hold_reason'
  > {
  recipient_name?: string
  recipient_type_label?: string
  hold_amount?: string | number | null
  reason?: string | null
  note?: string | null
  hold_reason?: string | null
  base_amount?: string | number | null
  bonus_amount?: string | number | null
  tax_base?: string | null
  is_held?: boolean
  recipient_employee_detail?: components['schemas']['EmployeeWithDepartmentNested'] | null
  recipient_collaborator_detail?: components['schemas']['CollaboratorNested'] | null
  recipient_exchange_detail?: components['schemas']['ExchangeNested'] | null
}

export interface ReceiptVoucherNested {
  id: number
  code: string
  receipt_date: string
  total_amount: string | number
  commission_period_month: number
  commission_period_year: number
}

export interface ExtendedPreviousPeriod
  extends Omit<components['schemas']['PreviousPeriod'], 'positions'> {
  positions?: ExtendedCommissionSplitPosition[]
  receipt_vouchers?: ReceiptVoucherNested[]
}

export interface ExtendedCommissionSplitPosition
  extends Omit<components['schemas']['CommissionSplitPosition'], 'recipients'> {
  owner_name?: string
  owner_code?: string
  type?: string
  pct?: number | string
  recipients?: ExtendedCommissionSplitRecipient[]
}

// Pooled split header (chia gop) emitted by the worksheet detail once the BE ships —
// docs/plans/plan_pooled_payout_split_20260723.md. One row per outside payee; the
// per-RAL splits it generated are hidden from the stand-person bands and rendered as
// ONE band from this record instead.
// Three channels (BE plan 2026-07-31). `pooled_allocations` is declared as an opaque bag
// in the generated schema (ListField(child=DictField())), so this interface IS the contract
// — keep it in step with `pooled_payout_service.pooled_allocations_payload`.
export interface PooledAllocationRecord {
  id: number
  employee_id?: number | null
  collaborator_id?: number | null
  exchange_id?: number | null
  payee_name?: string
  // Entered inputs, echoed verbatim. null = that channel is off.
  fee_pct?: string | number | null
  bonus_pool_pct?: string | number | null
  bonus_amount_input?: string | number | null
  // This worksheet's money per channel.
  fee_amount?: string | number | null
  bonus_amount?: string | number | null
  /** NEGATIVE — the deduction the payee bears at the ratio of fee they took. */
  deduction_amount?: string | number | null
  /** fee + bonus + deduction — the band's "Tổng trả". */
  total_amount?: string | number | null
  /** Display-only: fee_amount / worksheet fee allocated. Explains deduction_amount. */
  deduction_ratio_pct?: string | number | null
  note?: string | null
}

export interface PooledSplitPayload {
  employee_id?: number | null
  collaborator_id?: number | null
  exchange_id?: number | null
  /** FEE channel. Omit to switch it off (the previous cut folds back to the stand people). */
  fee_pct?: string | null
  /** BONUS channel, % of this period's allocated bonus pool. Mutually exclusive with bonus_amount. */
  bonus_pool_pct?: string | null
  /** BONUS channel, absolute VND. Mutually exclusive with bonus_pool_pct. */
  bonus_amount?: string | null
  note?: string
}

export type CommissionSplitDetail = Omit<
  components['schemas']['CommissionSplitDetail'],
  'positions' | 'previous_periods'
> & {
  has_commission_payable?: boolean
  positions?: ExtendedCommissionSplitPosition[]
  previous_periods?: ExtendedPreviousPeriod[]
  receipt_vouchers?: ReceiptVoucherNested[]
  // "Tiền về chưa phân bổ" (treo) — cash collected but not yet allocated to a recipient.
  // TODO(schema): fold into generated schema via `yarn api:update:local` after BE deploy.
  unallocated_net?: string | number | null
  period_collected_net?: string | number | null
  period_allocated?: string | number | null
  period_unallocated?: string | number | null
  // TODO(schema): pending BE (plan_pooled_payout_split_20260723) — fold into regen.
  pooled_allocations?: PooledAllocationRecord[]
  // Dial auto-default (BE plan_dial_auto_default_recognition_20260727 — nhánh
  // feature/dial-auto-default-recognition). TODO(schema): fold into regen after BE deploy.
  // fee_default_pct = min(Σ distribution_pct, trần thu còn lại) — FE prefill dial phí từ
  // đây, KHÔNG tự suy fallback nữa (một nguồn duy nhất, BE auto-pin đúng số này lúc duyệt).
  fee_default_pct?: string | null
  // Giải trình đã lưu — bắt buộc khi dial phí/F2 lệch default (BE 400 nếu thiếu).
  dial_note?: string | null
  // BE so dial vs default-snapshot ở 2dp; true = kế toán duyệt lệch tiền về.
  dial_deviates?: boolean
  fee_collected_pct_snapshot?: string | null
  bonus_collected_pct_snapshot?: string | null
  f2_collected_pct_snapshot?: string | null
  bonus_f2_collected_pct_snapshot?: string | null
  fee_default_pct_snapshot?: string | null
  f2_default_pct_snapshot?: string | null
  bonus_pending_uncollected_amount?: string | number | null
  bonus_pending_withheld_amount?: string | number | null
}

export type CommissionSplitSummary = components['schemas']['CommissionSplitSummary']
export type DealPaymentProgress = components['schemas']['DealPaymentProgressResponse']
export type GetCommissionSplitsParams =
  paths['/api/accounting/deal-period-worksheets/']['get']['parameters']['query']
export type PatchedCommissionSplitRecipientsUpdateRequest =
  components['schemas']['PatchedCommissionSplitRecipientsUpdateRequest']
export type PatchedWorksheetSplitByRecipientRequestRequest =
  components['schemas']['PatchedWorksheetSplitByRecipientRequestRequest']
export type SetPeriodProgressPayload =
  components['schemas']['PatchedSetPeriodProgressRequestRequest'] & {
    // TODO(schema): note giải trình khi dial lệch default — fold into regen after BE deploy.
    note?: string | null
  }
export type WorksheetKpiCommissionRow = components['schemas']['WorksheetKpiCommissionRow']
export type PaginatedWorksheetKpiCommissionRowList =
  components['schemas']['PaginatedWorksheetKpiCommissionRowList']
export type PaginatedCommissionSplitPositionList =
  components['schemas']['PaginatedCommissionSplitPositionList']

export type PaginatedCommissionSplitListRows = Omit<
  components['schemas']['PaginatedDealPeriodWorksheetListRowList'],
  'results'
> & {
  results?: CommissionSplitListRow[]
}

class CommissionSplitsService extends BaseApiService {
  async getSplits(params: GetCommissionSplitsParams): Promise<PaginatedCommissionSplitListRows> {
    const payload = await this.get(ApiPaths.accounting_deal_period_worksheets_list, {
      query: params as any,
    })

    if (Array.isArray(payload)) {
      return {
        count: payload.length,
        results: payload,
      } as any
    }
    return payload
  }

  async getSplitSummary(params: GetCommissionSplitsParams): Promise<CommissionSplitSummary> {
    return await this.get(ApiPaths.accounting_commission_splits_summary_retrieve, {
      query: params as any,
    })
  }

  async getSplitDetail(id: number | string): Promise<CommissionSplitDetail> {
    const res = await this.get(ApiPaths.accounting_deal_period_worksheets_retrieve, {
      path: { id: Number(id) },
    })
    return res as unknown as CommissionSplitDetail
  }

  // Admin/"Giao dịch tiền về" read-only view: same CommissionSplitDetail shape but served by
  // the admin-preview endpoint (proxy "nhận hộ" payees are hidden on the FE for this view).
  async getSplitAdminPreview(id: number | string): Promise<CommissionSplitDetail> {
    const res = await this.get(ApiPaths.accounting_deal_period_worksheets_admin_preview_retrieve, {
      path: { id: Number(id) },
    })
    return res as unknown as CommissionSplitDetail
  }

  async getManagementBonuses(
    id: number | string
  ): Promise<components['schemas']['PaginatedCommissionSplitPositionList']> {
    return await this.get(ApiPaths.accounting_deal_period_worksheets_management_bonuses_list, {
      path: { id: Number(id) },
    })
  }

  async getManagementKpi(
    id: number | string
  ): Promise<components['schemas']['PaginatedWorksheetKpiCommissionRowList']> {
    return await this.get(ApiPaths.accounting_deal_period_worksheets_management_kpi_list, {
      path: { id: Number(id) },
    })
  }

  // Investor cash-payment progress of the deal (THU side) — per IR reconciliation
  // period: committed fee/bonus (due) vs cash actually collected (received). Neo by deal_id.
  async getDealPaymentProgress(dealId: number | string): Promise<DealPaymentProgress> {
    const res = await this.get(ApiPaths.sales_deals_payment_progress_retrieve, {
      path: { id: Number(dealId) },
    })
    return res as unknown as DealPaymentProgress
  }

  async updateRecipients(
    id: number | string,
    payload: PatchedWorksheetSplitByRecipientRequestRequest
  ): Promise<CommissionSplitDetail> {
    const res = await this.patch(
      ApiPaths.accounting_deal_period_worksheets_split_by_recipient_partial_update,
      payload as any,
      {
        path: { id: Number(id) },
      }
    )
    return res as unknown as CommissionSplitDetail
  }

  // Pooled split (chia gop cho doi tuong khac) — one outside payee takes fee_pct x basis,
  // every stand person's cut follows the participation ratio. BE endpoint per
  // docs/plans/plan_pooled_payout_split_20260723.md.
  async applyPooledSplit(
    id: number | string,
    payload: PooledSplitPayload
  ): Promise<CommissionSplitDetail> {
    const res = await this.post(
      ApiPaths.accounting_deal_period_worksheets_pooled_allocation_create,
      payload as any,
      {
        path: { id: Number(id) },
      }
    )
    return res as unknown as CommissionSplitDetail
  }

  async cancelPooledSplit(
    id: number | string,
    payload: { allocation_id: number; note?: string }
  ): Promise<CommissionSplitDetail> {
    const res = await this.post(
      ApiPaths.accounting_deal_period_worksheets_pooled_allocation_cancel_create,
      payload as any,
      {
        path: { id: Number(id) },
      }
    )
    return res as unknown as CommissionSplitDetail
  }

  async setPeriodProgress(
    id: number | string,
    payload: SetPeriodProgressPayload
  ): Promise<CommissionSplitDetail> {
    const res = await this.patch(
      ApiPaths.accounting_deal_period_worksheets_set_period_progress_partial_update,
      payload as any,
      {
        path: { id: Number(id) },
      }
    )
    return res as unknown as CommissionSplitDetail
  }

  async holdShare(
    id: number | string,
    data: {
      commission_share_ids: number[]
      hold_reason?: string
      tax_base?: 'PRE_TAX' | 'POST_TAX'
    }
  ): Promise<any> {
    return await this.patch(
      ApiPaths.accounting_commission_splits_hold_share_partial_update,
      // NOTE: the generated op type for this endpoint is stale (declares the
      // recipients-update body); the runtime view validates HoldShareInputSerializer
      // (commission_share_ids / hold_reason). Double-cast to satisfy TS.
      data as unknown as components['schemas']['PatchedCommissionSplitRecipientsUpdateRequest'],
      {
        path: { id: Number(id) },
      }
    )
  }

  async releaseShareHold(
    id: number | string,
    data: { commission_share_ids: number[]; reason: string }
  ): Promise<any> {
    return await this.patch(
      ApiPaths.accounting_commission_splits_release_share_hold_partial_update,
      data as unknown as components['schemas']['PatchedReleaseShareHoldInputRequest'],
      {
        path: { id: Number(id) },
      }
    )
  }

  async approveWorksheet(
    id: number | string,
    data: components['schemas']['PatchedWorksheetApproveRequestRequest']
  ): Promise<any> {
    return await this.patch(
      ApiPaths.accounting_deal_period_worksheets_approve_partial_update,
      data,
      {
        path: { id: Number(id) },
      }
    )
  }

  async adminApproveWorksheet(
    id: number | string,
    data: components['schemas']['PatchedWorksheetAdminApproveInputRequest']
  ): Promise<any> {
    return await this.patch(
      ApiPaths.accounting_deal_period_worksheets_admin_approve_partial_update,
      data,
      {
        path: { id: Number(id) },
      }
    )
  }

  // "Mở lại bảng kê để sửa thực nhận": APPROVED -> ADMIN_APPROVED, void các split/payable
  // chưa chi để kế toán chia lại rồi duyệt chi thực nhận lần nữa. Endpoint mới chưa có
  // trong schema generate — dùng path literal (đồng bộ lại khi chạy api:generate).
  async reopenWorksheet(id: number | string, data: { reason?: string }): Promise<any> {
    return await this.patch(
      ApiPaths.accounting_deal_period_worksheets_reopen_partial_update,
      data as never,
      {
        path: { id: Number(id) },
      }
    )
  }
}

let _service: CommissionSplitsService | null = null

export function getCommissionSplitsService(): CommissionSplitsService {
  if (!_service) _service = new CommissionSplitsService()
  return _service
}

export function useCommissionSplits(
  params: GetCommissionSplitsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.LIST(params as Record<string, unknown>),
    () => getCommissionSplitsService().getSplits(params),
    {
      enabled: options?.enabled ?? true,
      // The detail screen derives `activeWorksheet` (and therefore the dials) from this
      // list. Without keepPreviousData a refetch blanks it for one render, which flips
      // `effectivePositions` between the server figures and the client-rescaled preview —
      // the visible "numbers jumping" during approve.
      placeholderData: keepPreviousData,
    }
  )
}

export function useCommissionSplitSummary(
  params: GetCommissionSplitsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(`summary-${JSON.stringify(params)}`),
    () => getCommissionSplitsService().getSplitSummary(params),
    { enabled: options?.enabled ?? true }
  )
}

export function useCommissionSplitDetail(id: number | string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(id),
    () => getCommissionSplitsService().getSplitDetail(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      placeholderData: keepPreviousData,
    }
  )
}

export function useCommissionSplitAdminPreview(
  id: number | string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(`admin-preview-${id}`),
    () => getCommissionSplitsService().getSplitAdminPreview(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      placeholderData: keepPreviousData,
    }
  )
}

export function useManagementBonuses(id: number | string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(`management-bonuses-${id}`),
    () => getCommissionSplitsService().getManagementBonuses(id),
    { enabled: !!id && (options?.enabled ?? true) }
  )
}

export function useManagementKpi(id: number | string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(`management-kpi-${id}`),
    () => getCommissionSplitsService().getManagementKpi(id),
    { enabled: !!id && (options?.enabled ?? true) }
  )
}

export function useDealPaymentProgress(
  dealId: number | string | null | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(`payment-progress-${dealId}`),
    () => getCommissionSplitsService().getDealPaymentProgress(dealId as number),
    { enabled: !!dealId && (options?.enabled ?? true) }
  )
}

/**
 * The four query keys every worksheet mutation invalidates. One helper instead of the same
 * four calls copy-pasted into nine hooks.
 */
export const WORKSHEET_QUERY_KEYS = (id: number | string) => [
  QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(id),
  QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(`management-bonuses-${id}`),
  QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(`management-kpi-${id}`),
  ['accounting', 'commission-splits', 'list'],
]

/**
 * Refetch the worksheet's queries and RESOLVE once they have all landed. Callers that
 * orchestrate several mutations use this at the very end so the screen's figures change
 * exactly once, when everything is settled — `invalidateQueries` returns immediately and
 * leaves the refetches racing in the background, which is what made the numbers churn.
 */
export async function refetchWorksheetQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number | string
) {
  await Promise.all(
    WORKSHEET_QUERY_KEYS(id).map((queryKey) => queryClient.refetchQueries({ queryKey }))
  )
}

function invalidateWorksheetQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number | string
) {
  WORKSHEET_QUERY_KEYS(id).forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
}

/**
 * `silent: true` suppresses this mutation's own cache invalidation. Use it when the caller
 * chains several mutations and will refetch ONCE at the end (see `refetchWorksheetQueries`):
 * otherwise each mutation fans out its own wave of GETs and the screen re-renders on every
 * partial response.
 */
export type WorksheetMutationOptions = { silent?: boolean }

export function useUpdateRecipients(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { id: number | string; data: PatchedWorksheetSplitByRecipientRequestRequest }) =>
      getCommissionSplitsService().updateRecipients(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useApplyPooledSplit(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { id: number | string; data: PooledSplitPayload }) =>
      getCommissionSplitsService().applyPooledSplit(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useCancelPooledSplit(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { id: number | string; data: { allocation_id: number; note?: string } }) =>
      getCommissionSplitsService().cancelPooledSplit(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useSetPeriodProgress(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { id: number | string; data: SetPeriodProgressPayload }) =>
      getCommissionSplitsService().setPeriodProgress(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useHoldShare(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: {
      id: number | string
      data: {
        commission_share_ids: number[]
        hold_reason?: string
        tax_base?: 'PRE_TAX' | 'POST_TAX'
      }
    }) => getCommissionSplitsService().holdShare(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useReleaseShareHold(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: {
      id: number | string
      data: { commission_share_ids: number[]; reason: string }
    }) => getCommissionSplitsService().releaseShareHold(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useApproveWorksheet(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: {
      id: number | string
      data: components['schemas']['PatchedWorksheetApproveRequestRequest']
    }) => getCommissionSplitsService().approveWorksheet(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useAdminApproveWorksheet(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: {
      id: number | string
      data: components['schemas']['PatchedWorksheetAdminApproveInputRequest']
    }) => getCommissionSplitsService().adminApproveWorksheet(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}

export function useReopenWorksheet(options?: WorksheetMutationOptions) {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { id: number | string; data: { reason?: string } }) =>
      getCommissionSplitsService().reopenWorksheet(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        if (!options?.silent) invalidateWorksheetQueries(queryClient, variables.id)
      },
    }
  )
}
