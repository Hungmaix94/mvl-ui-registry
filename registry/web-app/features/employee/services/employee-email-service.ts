import { BaseApiService } from '@/api/base-service'
import { ApiPaths, paths } from '@/api/schema'
import { useApiMutation } from '@/hooks/useApiQuery'
import { TerminationEmailUseReal } from '@/constants/api-schema-aliases'

// ===== TYPE DEFINITIONS =====
export type WelcomeEmailPreviewRequest =
  paths['/api/hrm/employees/{id}/welcome_email/preview/']['post']['requestBody'] extends {
    content: { 'application/json': infer T }
  }
    ? T
    : never

export type WelcomeEmailSendRequest =
  paths['/api/hrm/employees/{id}/welcome_email/send/']['post']['requestBody'] extends {
    content: { 'application/json': infer T }
  }
    ? T
    : never

export type WelcomeEmailPreviewResponse =
  paths['/api/hrm/employees/{id}/welcome_email/preview/']['post']['responses']['200']['content']['application/json']['data']

export type WelcomeEmailSendResponse =
  paths['/api/hrm/employees/{id}/welcome_email/send/']['post']['responses']['202']['content']['application/json']['data']

export type TerminationEmailPreviewRequest =
  paths['/api/hrm/employees/{id}/termination_email/preview/']['post']['requestBody'] extends {
    content: { 'application/json': infer T }
  }
    ? T
    : never

export type TerminationEmailSendRequest =
  paths['/api/hrm/employees/{id}/termination_email/send/']['post']['requestBody'] extends {
    content: { 'application/json': infer T }
  }
    ? T
    : never

export type TerminationEmailPreviewResponse =
  paths['/api/hrm/employees/{id}/termination_email/preview/']['post']['responses']['200']['content']['application/json']['data']

export type TerminationEmailSendResponse =
  paths['/api/hrm/employees/{id}/termination_email/send/']['post']['responses']['202']['content']['application/json']['data']

// ===== SERVICE CLASS =====
export class EmployeeEmailService extends BaseApiService {
  /**
   * Preview welcome email for employee
   */
  async previewWelcomeEmail(id: number) {
    return await this.post(
      ApiPaths.hrm_employees_welcome_email_preview_create,
      {},
      {
        path: { id },
        query: {
          use_real: TerminationEmailUseReal.Value1,
        },
      }
    )
  }

  /**
   * Send welcome email to employee
   */
  async sendWelcomeEmail(id: number, data?: WelcomeEmailSendRequest) {
    return await this.post(ApiPaths.hrm_employees_welcome_email_send_create, data || {}, {
      path: { id },
    })
  }

  /**
   * Preview termination email for employee (resigned status only).
   * Server ignores body; schema requires EmployeeRequest as auto-gen artifact.
   */
  async previewTerminationEmail(id: number, data?: TerminationEmailPreviewRequest) {
    return await this.post(
      ApiPaths.hrm_employees_termination_email_preview_create,
      (data || {}) as TerminationEmailPreviewRequest,
      {
        path: { id },
        query: {
          use_real: TerminationEmailUseReal.Value1,
        },
      }
    )
  }

  /**
   * Send termination email to employee. Allows resending; updates termination_notice_sent_at.
   * Server ignores body; schema requires EmployeeRequest as auto-gen artifact.
   */
  async sendTerminationEmail(id: number, data?: TerminationEmailSendRequest) {
    return await this.post(
      ApiPaths.hrm_employees_termination_email_send_create,
      (data || {}) as TerminationEmailSendRequest,
      { path: { id } }
    )
  }
}

// ===== SERVICE SINGLETON =====
let _employeeEmailService: EmployeeEmailService | null = null

export function getEmployeeEmailService(): EmployeeEmailService {
  if (!_employeeEmailService) {
    _employeeEmailService = new EmployeeEmailService()
  }
  return _employeeEmailService
}

// ===== REACT QUERY HOOKS =====
export function usePreviewWelcomeEmail() {
  return useApiMutation(({ id }: { id: number }) =>
    getEmployeeEmailService().previewWelcomeEmail(id)
  )
}

export function useSendWelcomeEmail() {
  return useApiMutation(({ id, data }: { id: number; data?: WelcomeEmailSendRequest }) =>
    getEmployeeEmailService().sendWelcomeEmail(id, data)
  )
}

export function usePreviewTerminationEmail() {
  return useApiMutation(({ id, data }: { id: number; data?: TerminationEmailPreviewRequest }) =>
    getEmployeeEmailService().previewTerminationEmail(id, data)
  )
}

export function useSendTerminationEmail() {
  return useApiMutation(({ id, data }: { id: number; data?: TerminationEmailSendRequest }) =>
    getEmployeeEmailService().sendTerminationEmail(id, data)
  )
}
