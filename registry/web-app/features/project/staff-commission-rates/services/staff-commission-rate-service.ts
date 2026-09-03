import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type ProjectStaffCommissionRateConfig =
  components['schemas']['ProjectStaffCommissionRateConfig']
export type ProjectStaffCommissionRateConfigRequest =
  components['schemas']['ProjectStaffCommissionRateConfigRequest']
export type PatchedProjectStaffCommissionRateConfigRequest =
  components['schemas']['PatchedProjectStaffCommissionRateConfigRequest']

class StaffCommissionRateService extends BaseApiService {
  async getRates(projectPk: number) {
    return await this.getPaginated(
      ApiPaths.realestate_projects_staff_commission_rates_list,
      { page_size: 100 },
      { project_pk: projectPk }
    )
  }

  async createRate(projectPk: number, data: ProjectStaffCommissionRateConfigRequest) {
    return await this.post(ApiPaths.realestate_projects_staff_commission_rates_create, data, {
      path: { project_pk: projectPk },
    })
  }

  async updateRate(
    projectPk: number,
    id: number,
    data: PatchedProjectStaffCommissionRateConfigRequest
  ) {
    return await this.patch(
      ApiPaths.realestate_projects_staff_commission_rates_partial_update,
      data,
      { path: { project_pk: projectPk, id } }
    )
  }

  async deleteRate(projectPk: number, id: number) {
    return await this.delete(ApiPaths.realestate_projects_staff_commission_rates_destroy, {
      path: { project_pk: projectPk, id },
    })
  }
}

let _service: StaffCommissionRateService | null = null

export function getStaffCommissionRateService(): StaffCommissionRateService {
  if (!_service) _service = new StaffCommissionRateService()
  return _service
}

export function useStaffCommissionRates(projectPk: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.STAFF_COMMISSION_RATES.LIST(projectPk),
    () => getStaffCommissionRateService().getRates(projectPk),
    { enabled: !!projectPk && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateStaffCommissionRate() {
  return useApiMutation(
    (variables: { projectPk: number; data: ProjectStaffCommissionRateConfigRequest }) =>
      getStaffCommissionRateService().createRate(variables.projectPk, variables.data)
  )
}

export function useUpdateStaffCommissionRate() {
  return useApiMutation(
    (variables: {
      projectPk: number
      id: number
      data: PatchedProjectStaffCommissionRateConfigRequest
    }) =>
      getStaffCommissionRateService().updateRate(variables.projectPk, variables.id, variables.data)
  )
}

export function useDeleteStaffCommissionRate() {
  return useApiMutation((variables: { projectPk: number; id: number }) =>
    getStaffCommissionRateService().deleteRate(variables.projectPk, variables.id)
  )
}
