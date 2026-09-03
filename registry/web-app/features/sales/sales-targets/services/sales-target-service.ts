import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type TargetPolicy = components['schemas']['TargetPolicy']
export type TargetEvaluation = components['schemas']['TargetEvaluation']
export type TargetApplication = components['schemas']['TargetApplication']

export type GetSalesTargetPoliciesParams =
  paths['/api/sales/target-policies/']['get']['parameters']['query']
export type GetSalesTargetEvaluationsParams =
  paths['/api/sales/target-evaluations/']['get']['parameters']['query']
export type GetSalesTargetApplicationsParams =
  paths['/api/sales/target-applications/']['get']['parameters']['query']

export type CreateSalesTargetPolicyRequest =
  paths['/api/sales/target-policies/']['post']['requestBody']['content']['application/json']
export type UpdateSalesTargetPolicyRequest =
  paths['/api/sales/target-policies/{id}/']['put']['requestBody']['content']['application/json']
export type PartialUpdateSalesTargetPolicyRequest = NonNullable<
  paths['/api/sales/target-policies/{id}/']['patch']['requestBody']
>['content']['application/json']
export type EvaluateSalesTargetPolicyRequest = NonNullable<
  paths['/api/sales/target-policies/{id}/evaluate/']['post']['requestBody']
>['content']['application/json']

export type ApplySalesTargetEvaluationRequest =
  paths['/api/sales/target-evaluations/{id}/apply/']['post']['requestBody']['content']['application/json']
export type ApproveSalesTargetEvaluationRequest =
  paths['/api/sales/target-evaluations/{id}/approve/']['post']['requestBody']['content']['application/json']

// ----------------------------------------------------------------------

class SalesTargetService extends BaseApiService {
  // --- Target Policies ---

  async getSalesTargetPolicies(params?: GetSalesTargetPoliciesParams) {
    return await this.getPaginated(ApiPaths.sales_target_policies_list, params)
  }

  async createSalesTargetPolicy(data: CreateSalesTargetPolicyRequest) {
    return await this.post(ApiPaths.sales_target_policies_create, data)
  }

  async getSalesTargetPolicy(id: number) {
    return await this.get(ApiPaths.sales_target_policies_retrieve, { path: { id } })
  }

  async updateSalesTargetPolicy(id: number, data: UpdateSalesTargetPolicyRequest) {
    return await this.put(ApiPaths.sales_target_policies_update, data, { path: { id } })
  }

  async partialUpdateSalesTargetPolicy(id: number, data: PartialUpdateSalesTargetPolicyRequest) {
    return await this.patch(ApiPaths.sales_target_policies_partial_update, data, { path: { id } })
  }

  async deleteSalesTargetPolicy(id: number) {
    return await this.delete(ApiPaths.sales_target_policies_destroy, { path: { id } })
  }

  async evaluateSalesTargetPolicy(id: number, data: EvaluateSalesTargetPolicyRequest) {
    return await this.post(ApiPaths.sales_target_policies_evaluate_create, data, { path: { id } })
  }

  // --- Target Evaluations ---

  async getSalesTargetEvaluations(params?: GetSalesTargetEvaluationsParams) {
    return await this.getPaginated(ApiPaths.sales_target_evaluations_list, params)
  }

  async getSalesTargetEvaluation(id: number) {
    return await this.get(ApiPaths.sales_target_evaluations_retrieve, { path: { id } })
  }

  async applySalesTargetEvaluation(id: number, data: ApplySalesTargetEvaluationRequest) {
    return await this.post(ApiPaths.sales_target_evaluations_apply_create, data, { path: { id } })
  }

  async approveSalesTargetEvaluation(id: number, data: ApproveSalesTargetEvaluationRequest) {
    return await this.post(ApiPaths.sales_target_evaluations_approve_create, data, { path: { id } })
  }

  // --- Target Applications ---

  async getSalesTargetApplications(params?: GetSalesTargetApplicationsParams) {
    return await this.getPaginated(ApiPaths.sales_target_applications_list, params)
  }

  async getSalesTargetApplication(id: number) {
    return await this.get(ApiPaths.sales_target_applications_retrieve, { path: { id } })
  }

  async getSalesTargetPolicyHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.sales_target_policies_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getSalesTargetPolicyHistory(id: number, logId: string) {
    return await this.get(ApiPaths.sales_target_policies_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: SalesTargetService | null = null

export function getSalesTargetService(): SalesTargetService {
  if (!_service) _service = new SalesTargetService()
  return _service
}

// ----------------------------------------------------------------------
// Hooks — Target Policies
// ----------------------------------------------------------------------

export function useSalesTargetPolicies(
  params?: GetSalesTargetPoliciesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'target-policies', 'list', JSON.stringify(params || {})],
    () => getSalesTargetService().getSalesTargetPolicies(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateSalesTargetPolicy() {
  return useApiMutation((data: CreateSalesTargetPolicyRequest) =>
    getSalesTargetService().createSalesTargetPolicy(data)
  )
}

export function useSalesTargetPolicy(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'target-policies', 'detail', id],
    () => getSalesTargetService().getSalesTargetPolicy(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateSalesTargetPolicy() {
  return useApiMutation((variables: { id: number; data: UpdateSalesTargetPolicyRequest }) =>
    getSalesTargetService().updateSalesTargetPolicy(variables.id, variables.data)
  )
}

export function usePartialUpdateSalesTargetPolicy() {
  return useApiMutation((variables: { id: number; data: PartialUpdateSalesTargetPolicyRequest }) =>
    getSalesTargetService().partialUpdateSalesTargetPolicy(variables.id, variables.data)
  )
}

export function useDeleteSalesTargetPolicy() {
  return useApiMutation((id: number) => getSalesTargetService().deleteSalesTargetPolicy(id))
}

export function useEvaluateSalesTargetPolicy() {
  return useApiMutation((variables: { id: number; data: EvaluateSalesTargetPolicyRequest }) =>
    getSalesTargetService().evaluateSalesTargetPolicy(variables.id, variables.data)
  )
}

// ----------------------------------------------------------------------
// Hooks — Target Evaluations
// ----------------------------------------------------------------------

export function useSalesTargetEvaluations(
  params?: GetSalesTargetEvaluationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'target-evaluations', 'list', JSON.stringify(params || {})],
    () => getSalesTargetService().getSalesTargetEvaluations(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesTargetEvaluation(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'target-evaluations', 'detail', id],
    () => getSalesTargetService().getSalesTargetEvaluation(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useApplySalesTargetEvaluation() {
  return useApiMutation((variables: { id: number; data: ApplySalesTargetEvaluationRequest }) =>
    getSalesTargetService().applySalesTargetEvaluation(variables.id, variables.data)
  )
}

export function useApproveSalesTargetEvaluation() {
  return useApiMutation((variables: { id: number; data: ApproveSalesTargetEvaluationRequest }) =>
    getSalesTargetService().approveSalesTargetEvaluation(variables.id, variables.data)
  )
}

// ----------------------------------------------------------------------
// Hooks — Target Applications
// ----------------------------------------------------------------------

export function useSalesTargetApplications(
  params?: GetSalesTargetApplicationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'target-applications', 'list', JSON.stringify(params || {})],
    () => getSalesTargetService().getSalesTargetApplications(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesTargetApplication(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'target-applications', 'detail', id],
    () => getSalesTargetService().getSalesTargetApplication(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesTargetPolicyHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'target-policies', id, 'histories', JSON.stringify(params || {})],
    () => getSalesTargetService().getSalesTargetPolicyHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesTargetPolicyHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'target-policies', id, 'history-detail', logId],
    () => getSalesTargetService().getSalesTargetPolicyHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
