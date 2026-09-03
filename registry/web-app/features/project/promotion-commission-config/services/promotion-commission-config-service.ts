import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type ProjectPromotionCommissionConfig =
  components['schemas']['ProjectPromotionCommissionConfig']
export type ProjectPromotionCommissionConfigRequest =
  components['schemas']['ProjectPromotionCommissionConfigRequest']
export type PatchedProjectPromotionCommissionConfigRequest =
  components['schemas']['PatchedProjectPromotionCommissionConfigRequest']

export type ProjectPromotionRecipient = components['schemas']['ProjectPromotionRecipient']
export type ProjectPromotionRecipientRequest =
  components['schemas']['ProjectPromotionRecipientRequest']
export type PatchedProjectPromotionRecipientRequest =
  components['schemas']['PatchedProjectPromotionRecipientRequest']
export type PaginatedProjectPromotionRecipientList =
  components['schemas']['PaginatedProjectPromotionRecipientList']
export type GetPromotionRecipientsParams =
  paths['/api/realestate/projects/{project_pk}/promotion-commission-config/recipients/']['get']['parameters']['query']

class PromotionCommissionConfigService extends BaseApiService {
  // ── Singleton config (1:1 per project) ───────────────────────────────────
  async getPromotionCommissionConfig(projectPk: number) {
    return await this.get(ApiPaths.realestate_projects_promotion_commission_config_retrieve, {
      path: { project_pk: projectPk },
    })
  }

  async createPromotionCommissionConfig(
    projectPk: number,
    data: ProjectPromotionCommissionConfigRequest
  ) {
    return await this.post(ApiPaths.realestate_projects_promotion_commission_config_create, data, {
      path: { project_pk: projectPk },
    })
  }

  async updatePromotionCommissionConfig(
    projectPk: number,
    data: ProjectPromotionCommissionConfigRequest
  ) {
    return await this.put(ApiPaths.realestate_projects_promotion_commission_config_update, data, {
      path: { project_pk: projectPk },
    })
  }

  async partialUpdatePromotionCommissionConfig(
    projectPk: number,
    data: PatchedProjectPromotionCommissionConfigRequest
  ) {
    return await this.patch(
      ApiPaths.realestate_projects_promotion_commission_config_partial_update,
      data,
      { path: { project_pk: projectPk } }
    )
  }

  async deletePromotionCommissionConfig(projectPk: number) {
    return await this.delete(ApiPaths.realestate_projects_promotion_commission_config_destroy, {
      path: { project_pk: projectPk },
    })
  }

  // ── Recipients sub-collection ─────────────────────────────────────────────
  async getPromotionRecipients(projectPk: number, params?: GetPromotionRecipientsParams) {
    return await this.getPaginated(
      ApiPaths.realestate_projects_promotion_commission_config_recipients_list,
      params,
      { project_pk: projectPk }
    )
  }

  async createPromotionRecipient(projectPk: number, data: ProjectPromotionRecipientRequest) {
    return await this.post(
      ApiPaths.realestate_projects_promotion_commission_config_recipients_create,
      data,
      { path: { project_pk: projectPk } }
    )
  }

  async getPromotionRecipient(projectPk: number, id: number) {
    return await this.get(
      ApiPaths.realestate_projects_promotion_commission_config_recipients_retrieve,
      { path: { project_pk: projectPk, id } }
    )
  }

  async updatePromotionRecipient(
    projectPk: number,
    id: number,
    data: ProjectPromotionRecipientRequest
  ) {
    return await this.put(
      ApiPaths.realestate_projects_promotion_commission_config_recipients_update,
      data,
      { path: { project_pk: projectPk, id } }
    )
  }

  async partialUpdatePromotionRecipient(
    projectPk: number,
    id: number,
    data: PatchedProjectPromotionRecipientRequest
  ) {
    return await this.patch(
      ApiPaths.realestate_projects_promotion_commission_config_recipients_partial_update,
      data,
      { path: { project_pk: projectPk, id } }
    )
  }

  async deletePromotionRecipient(projectPk: number, id: number) {
    return await this.delete(
      ApiPaths.realestate_projects_promotion_commission_config_recipients_destroy,
      { path: { project_pk: projectPk, id } }
    )
  }
}

let _service: PromotionCommissionConfigService | null = null

export function getPromotionCommissionConfigService(): PromotionCommissionConfigService {
  if (!_service) _service = new PromotionCommissionConfigService()
  return _service
}

// ── Config hooks ────────────────────────────────────────────────────────────
export function usePromotionCommissionConfig(projectPk: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROMOTION_COMMISSION_CONFIG.DETAIL(projectPk),
    () => getPromotionCommissionConfigService().getPromotionCommissionConfig(projectPk),
    { enabled: !!projectPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePromotionCommissionConfig() {
  return useApiMutation(
    (variables: { projectPk: number; data: ProjectPromotionCommissionConfigRequest }) =>
      getPromotionCommissionConfigService().createPromotionCommissionConfig(
        variables.projectPk,
        variables.data
      )
  )
}

export function useUpdatePromotionCommissionConfig() {
  return useApiMutation(
    (variables: { projectPk: number; data: ProjectPromotionCommissionConfigRequest }) =>
      getPromotionCommissionConfigService().updatePromotionCommissionConfig(
        variables.projectPk,
        variables.data
      )
  )
}

export function usePartialUpdatePromotionCommissionConfig() {
  return useApiMutation(
    (variables: { projectPk: number; data: PatchedProjectPromotionCommissionConfigRequest }) =>
      getPromotionCommissionConfigService().partialUpdatePromotionCommissionConfig(
        variables.projectPk,
        variables.data
      )
  )
}

export function useDeletePromotionCommissionConfig() {
  return useApiMutation((projectPk: number) =>
    getPromotionCommissionConfigService().deletePromotionCommissionConfig(projectPk)
  )
}

// ── Recipient hooks ───────────────────────────────────────────────────────────
export function usePromotionRecipients(
  projectPk: number,
  params?: GetPromotionRecipientsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROMOTION_COMMISSION_CONFIG.RECIPIENTS.LIST(projectPk, params || {}),
    () => getPromotionCommissionConfigService().getPromotionRecipients(projectPk, params),
    { enabled: !!projectPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function usePromotionRecipient(
  projectPk: number,
  id: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROMOTION_COMMISSION_CONFIG.RECIPIENTS.DETAIL(projectPk, id),
    () => getPromotionCommissionConfigService().getPromotionRecipient(projectPk, id),
    { enabled: !!projectPk && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePromotionRecipient() {
  return useApiMutation(
    (variables: { projectPk: number; data: ProjectPromotionRecipientRequest }) =>
      getPromotionCommissionConfigService().createPromotionRecipient(
        variables.projectPk,
        variables.data
      )
  )
}

export function useUpdatePromotionRecipient() {
  return useApiMutation(
    (variables: { projectPk: number; id: number; data: ProjectPromotionRecipientRequest }) =>
      getPromotionCommissionConfigService().updatePromotionRecipient(
        variables.projectPk,
        variables.id,
        variables.data
      )
  )
}

export function usePartialUpdatePromotionRecipient() {
  return useApiMutation(
    (variables: { projectPk: number; id: number; data: PatchedProjectPromotionRecipientRequest }) =>
      getPromotionCommissionConfigService().partialUpdatePromotionRecipient(
        variables.projectPk,
        variables.id,
        variables.data
      )
  )
}

export function useDeletePromotionRecipient() {
  return useApiMutation((variables: { projectPk: number; id: number }) =>
    getPromotionCommissionConfigService().deletePromotionRecipient(
      variables.projectPk,
      variables.id
    )
  )
}
