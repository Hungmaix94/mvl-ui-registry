import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type EmployeeCertificate = components['schemas']['EmployeeCertificate']
export type EmployeeCertificateRequest = components['schemas']['EmployeeCertificateRequest']
export type PatchedEmployeeCertificateRequest =
  components['schemas']['PatchedEmployeeCertificateRequest']
export type PaginatedEmployeeCertificateList =
  components['schemas']['PaginatedEmployeeCertificateList']

export type GetEmployeeCertificatesParams =
  paths['/api/hrm/employee-certificates/']['get']['parameters']['query']
export type GetEmployeeCertificatesExportParams =
  paths['/api/hrm/employee-certificates/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class EmployeeCertificateService extends BaseApiService {
  /**
   * Get all employee certificates
   */
  async getEmployeeCertificates(params?: GetEmployeeCertificatesParams) {
    return await this.getPaginated(ApiPaths.hrm_employee_certificates_list, params)
  }

  /**
   * Create a new employee certificate
   */
  async createEmployeeCertificate(certificateData: EmployeeCertificateRequest) {
    return await this.post(ApiPaths.hrm_employee_certificates_create, certificateData)
  }

  /**
   * Get employee certificate by ID
   */
  async getEmployeeCertificate(id: number) {
    return await this.get(ApiPaths.hrm_employee_certificates_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update employee certificate
   */
  async updateEmployeeCertificate(id: number, certificateData: EmployeeCertificateRequest) {
    return await this.put(ApiPaths.hrm_employee_certificates_update, certificateData, {
      path: { id },
    })
  }

  /**
   * Partially update employee certificate
   */
  async partialUpdateEmployeeCertificate(
    id: number,
    certificateData: PatchedEmployeeCertificateRequest
  ) {
    return await this.patch(ApiPaths.hrm_employee_certificates_partial_update, certificateData, {
      path: { id },
    })
  }

  /**
   * Delete employee certificate
   */
  async deleteEmployeeCertificate(id: number) {
    return await this.delete(ApiPaths.hrm_employee_certificates_destroy, { path: { id } })
  }

  /**
   * Get employee certificate histories
   */
  async getEmployeeCertificateHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_employee_certificates_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  /**
   * Export employee certificates to XLSX
   */
  async exportEmployeeCertificates(params?: GetEmployeeCertificatesExportParams) {
    return await this.get(ApiPaths.hrm_employee_certificates_export_retrieve, {
      query: params,
    })
  }

  /**
   * Start employee certificates import job
   */
  async startEmployeeCertificatesImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_employee_certificates_import_create, data)
  }

  /**
   * Get employee certificates import template
   */
  async getEmployeeCertificatesImportTemplate() {
    return await this.get(ApiPaths.hrm_employee_certificates_import_template_retrieve)
  }
}

// ===== SERVICE SINGLETON =====
let _employeeCertificateService: EmployeeCertificateService | null = null

export function getEmployeeCertificateService(): EmployeeCertificateService {
  if (!_employeeCertificateService) {
    _employeeCertificateService = new EmployeeCertificateService()
  }
  return _employeeCertificateService
}

// ===== REACT QUERY HOOKS =====
export function useEmployeeCertificates(
  params?: GetEmployeeCertificatesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_CERTIFICATES.LIST(params || {}),
    () => getEmployeeCertificateService().getEmployeeCertificates(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? !!params?.employee,
    }
  )
}

export function useEmployeeCertificate(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_CERTIFICATES.DETAIL(id),
    () => getEmployeeCertificateService().getEmployeeCertificate(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateEmployeeCertificate() {
  return useApiMutation((data: EmployeeCertificateRequest) =>
    getEmployeeCertificateService().createEmployeeCertificate(data)
  )
}

export function useUpdateEmployeeCertificate() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeCertificateRequest }) =>
    getEmployeeCertificateService().updateEmployeeCertificate(id, data)
  )
}

export function usePartialUpdateEmployeeCertificate() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedEmployeeCertificateRequest }) =>
    getEmployeeCertificateService().partialUpdateEmployeeCertificate(id, data)
  )
}

export function useDeleteEmployeeCertificate() {
  return useApiMutation((id: number) =>
    getEmployeeCertificateService().deleteEmployeeCertificate(id)
  )
}

export function useExportEmployeeCertificates() {
  return useApiMutation((params?: GetEmployeeCertificatesExportParams) =>
    getEmployeeCertificateService().exportEmployeeCertificates(params)
  )
}

export function useEmployeeCertificatesImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_CERTIFICATES.IMPORT_TEMPLATE(),
    () => getEmployeeCertificateService().getEmployeeCertificatesImportTemplate(),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartEmployeeCertificatesImport() {
  return useApiMutation((data: ImportStartRequest) =>
    getEmployeeCertificateService().startEmployeeCertificatesImport(data)
  )
}
