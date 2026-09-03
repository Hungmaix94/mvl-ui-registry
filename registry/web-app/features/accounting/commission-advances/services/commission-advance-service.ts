import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

// `funding_investor_advance_account*` là nguồn tiền kế toán đã chọn lúc duyệt (đọc lại để
// hiển thị) — BE mới bổ sung (MVL-ERP-3/backend#3269), chưa có trong schema generated.
export type CommissionAdvance = components['schemas']['CommissionAdvanceRequest'] & {
  funding_investor_advance_account?: number | null
  funding_investor_advance_account_detail?: {
    id: number
    investor: number
    project: number
    balance: string
  } | null
}
export type CommissionAdvanceRequestRequest =
  components['schemas']['CommissionAdvanceRequestRequest']
export type PatchedCommissionAdvanceRequestRequest =
  components['schemas']['PatchedCommissionAdvanceRequestRequest']
// TKKD-lead / accountant approval body: optional note + per-recipient approved amounts.
// `funding_investor_advance_account_id` là quyết định NGUỒN TIỀN của kế toán (quỹ CĐT hay
// tiền MV); BE mới bổ sung nên chưa có trong schema generated → nối thêm tại đây.
export type ApproveCommissionAdvanceRequest =
  components['schemas']['_ApproveWithAmountsRequestRequest'] & {
    funding_investor_advance_account_id?: number | null
  }

/** Một dòng của lệnh tạo tạm ứng hàng loạt từ danh sách CommissionShare thưởng. */
// Plain single-actor ladder body (note only) — shared by admin-approve and resubmit.
export type ResubmitCommissionAdvanceRequest =
  components['schemas']['CommissionAdvanceLadderApproveRequestRequest']
export type GetCommissionAdvancesParams =
  paths['/api/accounting/commission-advances/']['get']['parameters']['query']

/**
 * Shape of the list-page filter form. Lives here (types layer) so both the filter
 * component and the URL/param utils can share it without a circular import.
 * `recipient_employee` is multi-select (maps to the array query param); the rest are single.
 */
export type CommissionAdvanceFilterFormData = {
  requester_employee?: string | null
  recipient_employee?: (string | number)[] | null
  status?: string | null
  deal?: string | null
}

class CommissionAdvanceService extends BaseApiService {
  async getCommissionAdvances(params?: GetCommissionAdvancesParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_advances_list, params)
  }

  async createCommissionAdvance(data: CommissionAdvanceRequestRequest) {
    return await this.post(ApiPaths.accounting_commission_advances_create, data)
  }

  async getCommissionAdvance(id: number) {
    const res = await this.get(ApiPaths.accounting_commission_advances_retrieve, { path: { id } })
    return res as CommissionAdvance
  }

  async updateCommissionAdvance(id: number, data: CommissionAdvanceRequestRequest) {
    return await this.put(ApiPaths.accounting_commission_advances_update, data, { path: { id } })
  }

  async partialUpdateCommissionAdvance(id: number, data: PatchedCommissionAdvanceRequestRequest) {
    return await this.patch(ApiPaths.accounting_commission_advances_partial_update, data, {
      path: { id },
    })
  }

  async deleteCommissionAdvance(id: number) {
    return await this.delete(ApiPaths.accounting_commission_advances_destroy, { path: { id } })
  }

  /**
   * TKKD step: PENDING_ADMIN -> PENDING_ADMIN_LEAD.
   *
   * Only a mobile-initiated advance reaches this tier — a web-created one already enters the
   * ladder one step higher, at PENDING_ADMIN_LEAD. Note-only body, same as `resubmit`.
   */
  async adminApproveCommissionAdvance(id: number, data?: ResubmitCommissionAdvanceRequest) {
    return await this.post(
      ApiPaths.accounting_commission_advances_admin_approve_create,
      data ?? {},
      { path: { id } }
    )
  }

  /**
   * TKKD-lead step: PENDING_ADMIN_LEAD -> PENDING_ACCOUNTANT.
   *
   * Mandatory for every web-created advance — the accountant's `approve` rejects an advance
   * that has not cleared this tier, so the creator can never wave their own request through.
   */
  async adminLeadApproveCommissionAdvance(id: number, data?: ApproveCommissionAdvanceRequest) {
    return await this.post(
      ApiPaths.accounting_commission_advances_admin_lead_approve_create,
      data ?? {},
      { path: { id } }
    )
  }

  async approveCommissionAdvance(id: number, data?: ApproveCommissionAdvanceRequest) {
    return await this.post(
      ApiPaths.accounting_commission_advances_approve_create,
      (data ?? {}) as never,
      {
        path: { id },
      }
    )
  }

  /**
   * Tạo một tạm ứng cho mỗi CommissionShare thưởng — thay cho phiếu tạm ứng (batch) đã bỏ.
   * Raw path: endpoint chưa có trong schema generated.
   */

  /** REJECTED -> PENDING_ADMIN_LEAD, after the creator has edited the returned advance. */
  async resubmitCommissionAdvance(id: number, data?: ResubmitCommissionAdvanceRequest) {
    return await this.post(ApiPaths.accounting_commission_advances_resubmit_create, data ?? {}, {
      path: { id },
    })
  }

  async rejectCommissionAdvance(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_commission_advances_reject_create, data, {
      path: { id },
    })
  }

  async markPaidCommissionAdvance(
    id: number,
    data: components['schemas']['_MarkPaidRequestRequest']
  ) {
    return await this.post(ApiPaths.accounting_commission_advances_mark_paid_create, data, {
      path: { id },
    })
  }

  async getCommissionAdvanceHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_commission_advances_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getCommissionAdvanceHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_commission_advances_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: CommissionAdvanceService | null = null

export function getCommissionAdvanceService(): CommissionAdvanceService {
  if (!_service) _service = new CommissionAdvanceService()
  return _service
}

export function useCommissionAdvances(
  params?: GetCommissionAdvancesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.LIST(params || {}),
    () => getCommissionAdvanceService().getCommissionAdvances(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionAdvance(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.DETAIL(id),
    () => getCommissionAdvanceService().getCommissionAdvance(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCommissionAdvance() {
  return useApiMutation((data: CommissionAdvanceRequestRequest) =>
    getCommissionAdvanceService().createCommissionAdvance(data)
  )
}

export function useUpdateCommissionAdvance() {
  return useApiMutation((variables: { id: number; data: CommissionAdvanceRequestRequest }) =>
    getCommissionAdvanceService().updateCommissionAdvance(variables.id, variables.data)
  )
}

export function usePartialUpdateCommissionAdvance() {
  return useApiMutation((variables: { id: number; data: PatchedCommissionAdvanceRequestRequest }) =>
    getCommissionAdvanceService().partialUpdateCommissionAdvance(variables.id, variables.data)
  )
}

export function useDeleteCommissionAdvance() {
  return useApiMutation((id: number) => getCommissionAdvanceService().deleteCommissionAdvance(id))
}

export function useAdminApproveCommissionAdvance() {
  return useApiMutation((variables: { id: number; data?: ResubmitCommissionAdvanceRequest }) =>
    getCommissionAdvanceService().adminApproveCommissionAdvance(variables.id, variables.data)
  )
}

export function useAdminLeadApproveCommissionAdvance() {
  return useApiMutation((variables: { id: number; data?: ApproveCommissionAdvanceRequest }) =>
    getCommissionAdvanceService().adminLeadApproveCommissionAdvance(variables.id, variables.data)
  )
}

export function useApproveCommissionAdvance() {
  return useApiMutation((variables: { id: number; data?: ApproveCommissionAdvanceRequest }) =>
    getCommissionAdvanceService().approveCommissionAdvance(variables.id, variables.data)
  )
}

export function useResubmitCommissionAdvance() {
  return useApiMutation((variables: { id: number; data?: ResubmitCommissionAdvanceRequest }) =>
    getCommissionAdvanceService().resubmitCommissionAdvance(variables.id, variables.data)
  )
}

export function useRejectCommissionAdvance() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getCommissionAdvanceService().rejectCommissionAdvance(variables.id, variables.data)
  )
}

export function useMarkPaidCommissionAdvance() {
  return useApiMutation(
    (variables: { id: number; data: components['schemas']['_MarkPaidRequestRequest'] }) =>
      getCommissionAdvanceService().markPaidCommissionAdvance(variables.id, variables.data)
  )
}

export function useCommissionAdvanceHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.HISTORIES(id, params || {}),
    () => getCommissionAdvanceService().getCommissionAdvanceHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionAdvanceHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.HISTORY_DETAIL(id, logId),
    () => getCommissionAdvanceService().getCommissionAdvanceHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
