import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type EmployeeRelationship = components['schemas']['EmployeeRelationship']
export type EmployeeRelationshipRequest = components['schemas']['EmployeeRelationshipRequest']
export type PatchedEmployeeRelationshipRequest =
  components['schemas']['PatchedEmployeeRelationshipRequest']
export type PaginatedEmployeeRelationshipList =
  components['schemas']['PaginatedEmployeeRelationshipList']

export type GetEmployeeRelationshipsParams =
  paths['/api/hrm/employee-relationships/']['get']['parameters']['query']
export type GetEmployeeRelationshipsExportParams =
  paths['/api/hrm/employee-relationships/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class EmployeeRelationshipService extends BaseApiService {
  /**
   * Get all employee relationships
   */
  async getEmployeeRelationships(params?: GetEmployeeRelationshipsParams) {
    return await this.getPaginated(ApiPaths.hrm_employee_relationships_list, params)
  }

  /**
   * Create a new employee relationship
   */
  async createEmployeeRelationship(relationshipData: EmployeeRelationshipRequest) {
    return await this.post(ApiPaths.hrm_employee_relationships_create, relationshipData)
  }

  /**
   * Get employee relationship by ID
   */
  async getEmployeeRelationship(id: number) {
    return await this.get(ApiPaths.hrm_employee_relationships_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update employee relationship
   */
  async updateEmployeeRelationship(id: number, relationshipData: EmployeeRelationshipRequest) {
    return await this.put(ApiPaths.hrm_employee_relationships_update, relationshipData, {
      path: { id },
    })
  }

  /**
   * Partially update employee relationship
   */
  async partialUpdateEmployeeRelationship(
    id: number,
    relationshipData: PatchedEmployeeRelationshipRequest
  ) {
    return await this.patch(ApiPaths.hrm_employee_relationships_partial_update, relationshipData, {
      path: { id },
    })
  }

  /**
   * Delete employee relationship
   */
  async deleteEmployeeRelationship(id: number) {
    return await this.delete(ApiPaths.hrm_employee_relationships_destroy, { path: { id } })
  }

  /**
   * Get employee relationship histories
   */
  async getEmployeeRelationshipHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_employee_relationships_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  /**
   * Export employee relationships to XLSX
   */
  async exportEmployeeRelationships(params?: GetEmployeeRelationshipsExportParams) {
    return await this.get(ApiPaths.hrm_employee_relationships_export_retrieve, {
      query: params,
    })
  }

  /**
   * Start employee relationships import job
   */
  async startEmployeeRelationshipsImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_employee_relationships_import_create, data)
  }

  /**
   * Get employee relationships import template
   */
  async getEmployeeRelationshipsImportTemplate() {
    return await this.get(ApiPaths.hrm_employee_relationships_import_template_retrieve)
  }
}

// ===== SERVICE SINGLETON =====
let _employeeRelationshipService: EmployeeRelationshipService | null = null

export function getEmployeeRelationshipService(): EmployeeRelationshipService {
  if (!_employeeRelationshipService) {
    _employeeRelationshipService = new EmployeeRelationshipService()
  }
  return _employeeRelationshipService
}

// ===== REACT QUERY HOOKS =====
export function useEmployeeRelationships(
  params?: GetEmployeeRelationshipsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_RELATIONSHIPS.LIST(params || {}),
    () => getEmployeeRelationshipService().getEmployeeRelationships(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? !!params?.employee,
    }
  )
}

export function useEmployeeRelationship(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_RELATIONSHIPS.DETAIL(id),
    () => getEmployeeRelationshipService().getEmployeeRelationship(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateEmployeeRelationship() {
  return useApiMutation((data: EmployeeRelationshipRequest) =>
    getEmployeeRelationshipService().createEmployeeRelationship(data)
  )
}

export function useUpdateEmployeeRelationship() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeRelationshipRequest }) =>
    getEmployeeRelationshipService().updateEmployeeRelationship(id, data)
  )
}

export function usePartialUpdateEmployeeRelationship() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedEmployeeRelationshipRequest }) =>
    getEmployeeRelationshipService().partialUpdateEmployeeRelationship(id, data)
  )
}

export function useDeleteEmployeeRelationship() {
  return useApiMutation((id: number) =>
    getEmployeeRelationshipService().deleteEmployeeRelationship(id)
  )
}

export function useExportEmployeeRelationships() {
  return useApiMutation((params?: GetEmployeeRelationshipsExportParams) =>
    getEmployeeRelationshipService().exportEmployeeRelationships(params)
  )
}

export function useEmployeeRelationshipsImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_RELATIONSHIPS.IMPORT_TEMPLATE(),
    () => getEmployeeRelationshipService().getEmployeeRelationshipsImportTemplate(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartEmployeeRelationshipsImport() {
  return useApiMutation((data: ImportStartRequest) =>
    getEmployeeRelationshipService().startEmployeeRelationshipsImport(data)
  )
}
