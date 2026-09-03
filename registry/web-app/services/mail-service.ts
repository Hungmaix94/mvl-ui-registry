import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery, useApiMutation } from '@/hooks/useApiQuery'

// Type definitions from generated schema
export type TemplateMetadataResponse = components['schemas']['TemplateMetadataResponse']
export type PaginatedTemplateMetadataResponseList =
  components['schemas']['PaginatedTemplateMetadataResponseList']
export type TemplateSaveRequestRequest = components['schemas']['TemplateSaveRequestRequest']
export type TemplateSaveResponse = components['schemas']['TemplateSaveResponse']
export type TemplatePreviewRequestRequest = components['schemas']['TemplatePreviewRequestRequest']
export type TemplatePreviewResponse = components['schemas']['TemplatePreviewResponse']
export type BulkSendRequestRequest = components['schemas']['BulkSendRequestRequest']
export type BulkSendResponse = components['schemas']['BulkSendResponse']
export type RecipientInputRequest = components['schemas']['RecipientInputRequest']

// Request parameter types
export type GetMailTemplatesParams = paths['/api/mailtemplates/']['get']['parameters']['query']

export type SaveMailTemplateParams = {
  id: string | number
  data: TemplateSaveRequestRequest
}

export type PreviewMailTemplateParams = {
  id: string | number
  data?: TemplatePreviewRequestRequest
}

export type SendMailTemplateParams = {
  id: string | number
  data: BulkSendRequestRequest
}

export type GetSendJobStatusParams = {
  jobId: string
}

/**
 * Mail service extending the base API service
 * Provides mail template-related API operations
 */
export class MailService extends BaseApiService {
  /**
   * List all mail templates
   */
  async getMailTemplates(params?: GetMailTemplatesParams) {
    return await this.getPaginated(ApiPaths.mailtemplates_list, params)
  }

  /**
   * Get mail template by id
   */
  async getMailTemplate(id: string | number) {
    return await this.get(ApiPaths.mailtemplates_retrieve, {
      path: { id: String(id) },
    })
  }

  /**
   * Save mail template content
   */
  async saveMailTemplate(id: string | number, data: TemplateSaveRequestRequest) {
    return await this.put(ApiPaths.mailtemplates_update, data, {
      path: { id: String(id) },
    })
  }

  /**
   * Preview mail template
   */
  async previewMailTemplate(id: string | number, data?: TemplatePreviewRequestRequest) {
    return await this.post(ApiPaths.mailtemplates_preview_create, data || {}, {
      path: { id: String(id) },
    })
  }

  /**
   * Send bulk emails using a template
   */
  async sendBulkEmails(id: string | number, data: BulkSendRequestRequest) {
    return await this.post(ApiPaths.mailtemplates_send_create, data, {
      path: { id: String(id) },
    })
  }

  /**
   * Get send job status
   */
  async getSendJobStatus(jobId: string) {
    return await this.get(ApiPaths.mailtemplates_job_status_retrieve, {
      path: { job_id: jobId },
    })
  }
}

// Create service instance via factory (lazy construction)
let _mailService: MailService | null = null

export function getMailService(): MailService {
  if (!_mailService) {
    _mailService = new MailService()
  }
  return _mailService
}

// For backward compatibility, export a getter
export const mailService = {
  get instance() {
    return getMailService()
  },
}

// React Query hooks for Mail Template operations
// ===== MAIL TEMPLATES =====
export function useMailTemplates(params?: GetMailTemplatesParams) {
  return useApiQuery(
    QUERY_KEYS.MAIL_TEMPLATES.LIST(params || {}),
    () => getMailService().getMailTemplates(params),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  )
}

export function useMailTemplate(id: string | number) {
  return useApiQuery(
    QUERY_KEYS.MAIL_TEMPLATES.DETAIL(String(id)),
    () => getMailService().getMailTemplate(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  )
}

export function useSaveMailTemplate() {
  return useApiMutation(({ id, data }: SaveMailTemplateParams) =>
    getMailService().saveMailTemplate(id, data)
  )
}

export function usePreviewMailTemplate() {
  return useApiMutation(({ id, data }: PreviewMailTemplateParams) =>
    getMailService().previewMailTemplate(id, data)
  )
}

export function useSendBulkEmails() {
  return useApiMutation(({ id, data }: SendMailTemplateParams) =>
    getMailService().sendBulkEmails(id, data)
  )
}

export function useSendJobStatus(jobId: string, enabled?: boolean) {
  return useApiQuery(
    QUERY_KEYS.MAIL_TEMPLATES.SEND_JOB_STATUS(jobId),
    () => getMailService().getSendJobStatus(jobId),
    {
      enabled: enabled !== false && !!jobId,
      staleTime: 1000 * 30, // 30 seconds (job status changes frequently)
      refetchInterval: enabled !== false ? 3000 : false, // Poll every 3 seconds when enabled
    }
  )
}
