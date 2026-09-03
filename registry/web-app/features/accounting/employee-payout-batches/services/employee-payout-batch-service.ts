import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type EmployeeCommissionPayoutBatch = components['schemas']['EmployeeCommissionPayoutBatch']
export type EmployeeCommissionPayoutBatchRequest =
  components['schemas']['EmployeeCommissionPayoutBatchRequest']
export type PatchedEmployeeCommissionPayoutBatchRequest =
  components['schemas']['PatchedEmployeeCommissionPayoutBatchRequest']
export type GetEmployeePayoutBatchesParams =
  paths['/api/accounting/employee-payout-batches/']['get']['parameters']['query']

/** Editable fields on a payout batch line — the BE `_PayoutBatchLineEditRequestSerializer`. */
export type PayoutBatchLinePatch =
  components['schemas']['Patched_PayoutBatchLineEditRequestRequest']

class EmployeePayoutBatchService extends BaseApiService {
  async getEmployeePayoutBatches(params?: GetEmployeePayoutBatchesParams) {
    return await this.getPaginated(ApiPaths.accounting_employee_payout_batches_list, params)
  }

  async createEmployeePayoutBatch(data: EmployeeCommissionPayoutBatchRequest) {
    return await this.post(ApiPaths.accounting_employee_payout_batches_create, data)
  }

  async getEmployeePayoutBatch(id: number) {
    return await this.get(ApiPaths.accounting_employee_payout_batches_retrieve, { path: { id } })
  }

  async updateEmployeePayoutBatch(id: number, data: EmployeeCommissionPayoutBatchRequest) {
    return await this.put(ApiPaths.accounting_employee_payout_batches_update, data, {
      path: { id },
    })
  }

  async partialUpdateEmployeePayoutBatch(
    id: number,
    data: PatchedEmployeeCommissionPayoutBatchRequest
  ) {
    return await this.patch(ApiPaths.accounting_employee_payout_batches_partial_update, data, {
      path: { id },
    })
  }

  async deleteEmployeePayoutBatch(id: number) {
    return await this.delete(ApiPaths.accounting_employee_payout_batches_destroy, { path: { id } })
  }

  async confirmEmployeePayoutBatch(id: number, data: EmployeeCommissionPayoutBatchRequest) {
    return await this.post(ApiPaths.accounting_employee_payout_batches_confirm_create, data, {
      path: { id },
    })
  }

  async createEmployeePayoutBatchForMonth(data: EmployeeCommissionPayoutBatchRequest) {
    return await this.post(
      ApiPaths.accounting_employee_payout_batches_create_for_month_create,
      data
    )
  }

  /**
   * Recompute a DRAFT batch's lines from the current payables. Takes no request body.
   * Hand-entered STK / bank on an unposted line survives this (86eykeg1c) — the BE carries the
   * snapshot onto the rebuilt line instead of re-deriving it from the payee profile.
   */
  async recalculateEmployeePayoutBatch(id: number) {
    return await this.post(
      ApiPaths.accounting_employee_payout_batches_recalculate_create,
      undefined as never,
      { path: { id } }
    )
  }

  /**
   * Patch one payout batch line. Two independent edits share this endpoint:
   * - `amount`: partial/installment pay — DRAFT batch only.
   * - `payee_account_snapshot` / `payee_bank_name_snapshot`: fix a wrong account/bank — allowed
   *   until the batch is closed (PAID / CANCELLED). Since 86eykeg1c this is **not** a per-batch
   *   edit: the BE also writes the value back to the payee's own profile and onto their lines in
   *   every batch that is not closed, so a later `recalculate` no longer wipes it.
   *
   * Only the keys present in `patch` are sent, so a bank-only edit never touches the amount.
   * Responds 409 when the line is no longer editable (posted voucher / closed batch).
   */
  async updatePayoutBatchLine(id: number, patch: PayoutBatchLinePatch) {
    return await this.patch(ApiPaths.accounting_employee_payout_batch_lines_partial_update, patch, {
      path: { id },
    })
  }

  async getEmployeePayoutBatchHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_employee_payout_batches_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getEmployeePayoutBatchHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_employee_payout_batches_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async exportBankFile(id: number): Promise<void> {
    const response = (await this.client.POST(
      ApiPaths.accounting_employee_payout_batches_export_bank_file_create,
      {
        params: { path: { id } },
        parseAs: 'blob',
      }
    )) as unknown as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `EPB_${id}_unc.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async postEmployeePayoutBatch(
    id: number,
    data?: components['schemas']['PayoutBatchPostRequestRequest']
  ) {
    return await this.post(ApiPaths.accounting_employee_payout_batches_post_create, data ?? {}, {
      path: { id },
    })
  }
}

let _service: EmployeePayoutBatchService | null = null

export function getEmployeePayoutBatchService(): EmployeePayoutBatchService {
  if (!_service) _service = new EmployeePayoutBatchService()
  return _service
}

export function useEmployeePayoutBatches(
  params?: GetEmployeePayoutBatchesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.LIST(params || {}),
    () => getEmployeePayoutBatchService().getEmployeePayoutBatches(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useEmployeePayoutBatch(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.DETAIL(id),
    () => getEmployeePayoutBatchService().getEmployeePayoutBatch(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateEmployeePayoutBatch() {
  return useApiMutation((data: EmployeeCommissionPayoutBatchRequest) =>
    getEmployeePayoutBatchService().createEmployeePayoutBatch(data)
  )
}

export function useUpdateEmployeePayoutBatch() {
  return useApiMutation((variables: { id: number; data: EmployeeCommissionPayoutBatchRequest }) =>
    getEmployeePayoutBatchService().updateEmployeePayoutBatch(variables.id, variables.data)
  )
}

export function usePartialUpdateEmployeePayoutBatch() {
  return useApiMutation(
    (variables: { id: number; data: PatchedEmployeeCommissionPayoutBatchRequest }) =>
      getEmployeePayoutBatchService().partialUpdateEmployeePayoutBatch(variables.id, variables.data)
  )
}

export function useDeleteEmployeePayoutBatch() {
  return useApiMutation((id: number) =>
    getEmployeePayoutBatchService().deleteEmployeePayoutBatch(id)
  )
}

export function useConfirmEmployeePayoutBatch() {
  return useApiMutation((variables: { id: number; data: EmployeeCommissionPayoutBatchRequest }) =>
    getEmployeePayoutBatchService().confirmEmployeePayoutBatch(variables.id, variables.data)
  )
}

export function useCreateEmployeePayoutBatchForMonth() {
  return useApiMutation((data: EmployeeCommissionPayoutBatchRequest) =>
    getEmployeePayoutBatchService().createEmployeePayoutBatchForMonth(data)
  )
}

export function useRecalculateEmployeePayoutBatch() {
  return useApiMutation((id: number) =>
    getEmployeePayoutBatchService().recalculateEmployeePayoutBatch(id)
  )
}

export function useUpdatePayoutBatchLine() {
  return useApiMutation((variables: { id: number; patch: PayoutBatchLinePatch }) =>
    getEmployeePayoutBatchService().updatePayoutBatchLine(variables.id, variables.patch)
  )
}

export function useEmployeePayoutBatchHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.HISTORIES(id, params || {}),
    () => getEmployeePayoutBatchService().getEmployeePayoutBatchHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useEmployeePayoutBatchHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.HISTORY_DETAIL(id, logId),
    () => getEmployeePayoutBatchService().getEmployeePayoutBatchHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useExportEmployeePayoutBatch() {
  return useApiMutation((id: number) => getEmployeePayoutBatchService().exportBankFile(id))
}

export function usePostEmployeePayoutBatch() {
  return useApiMutation(
    (variables: { id: number; data?: components['schemas']['PayoutBatchPostRequestRequest'] }) =>
      getEmployeePayoutBatchService().postEmployeePayoutBatch(variables.id, variables.data)
  )
}
