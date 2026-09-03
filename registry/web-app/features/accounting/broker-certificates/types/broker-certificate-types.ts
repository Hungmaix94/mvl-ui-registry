import { z } from 'zod'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import type {
  BrokerCertificate,
  BrokerCertificateRequest,
} from '@/features/accounting/broker-certificates/services/broker-certificate-service'
import {
  BrokerCertificateStatus as CertStatus,
  BrokerCertificateType as CertType,
} from '@/constants/api-schema-aliases'

/** DatePicker emits dd/MM/yyyy strings; normalise to Date for the zod schema. */
function toDateOrNull(val: unknown): Date | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const [day, month, year] = val.split('/')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    return new Date(val)
  }
  return val as Date
}

export const BROKER_CERT_TYPE_OPTIONS = [
  { value: CertType.BROKER_LICENSE, label: 'Chứng chỉ hành nghề' },
  { value: CertType.TRAINING_CERT, label: 'Chứng nhận đào tạo' },
]

export const CERT_TYPE_LABEL: Record<string, string> = {
  [CertType.BROKER_LICENSE]: 'Chứng chỉ hành nghề',
  [CertType.TRAINING_CERT]: 'Chứng nhận đào tạo',
}

export const CERT_STATUS_META: Record<string, { label: string; variant: ColoredValueVariant }> = {
  [CertStatus.ACTIVE]: { label: 'Còn hiệu lực', variant: ColoredValueVariant.GREEN },
  [CertStatus.PENDING_ISSUANCE]: { label: 'Chờ cấp', variant: ColoredValueVariant.YELLOW },
  [CertStatus.EXPIRED]: { label: 'Hết hạn', variant: ColoredValueVariant.RED },
  [CertStatus.REVOKED]: { label: 'Đã thu hồi', variant: ColoredValueVariant.GREY },
  [CertStatus.INVALID]: { label: 'Không hợp lệ', variant: ColoredValueVariant.GREY },
}

export const CERT_STATUS_FILTER_OPTIONS = [
  { value: CertStatus.ACTIVE, label: 'Còn hiệu lực' },
  { value: CertStatus.PENDING_ISSUANCE, label: 'Chờ cấp' },
  { value: CertStatus.EXPIRED, label: 'Hết hạn' },
  { value: CertStatus.REVOKED, label: 'Đã thu hồi' },
]

/**
 * Form for a collaborator's broker certificate. Two modes:
 *   - normal: enter the certificate data directly (BrokerCertificate is self-contained), or
 *   - pending: "passed the exam, awaiting issuance" — no number/dates yet.
 */
export const brokerCertificateFormSchema = z
  .object({
    holder_collaborator: z.number().int().positive().nullable().optional(),
    is_pending: z.boolean().default(false),
    cert_type: z.enum([CertType.BROKER_LICENSE, CertType.TRAINING_CERT]).optional(),
    certificate_number: z.string().max(64).optional().or(z.literal('')),
    issuer: z.string().max(255).optional().or(z.literal('')),
    issued_date: z.preprocess(toDateOrNull, z.date().nullable()).nullable().optional(),
    effective_date: z.preprocess(toDateOrNull, z.date().nullable()).nullable().optional(),
    expiry_date: z.preprocess(toDateOrNull, z.date().nullable()).nullable().optional(),
    expected_issue_date: z.preprocess(toDateOrNull, z.date().nullable()).nullable().optional(),
    notes: z.string().max(2000).optional().or(z.literal('')),
  })
  .superRefine((v, ctx) => {
    if (!v.holder_collaborator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['holder_collaborator'],
        message: 'Vui lòng chọn cộng tác viên',
      })
    }
    if (!v.is_pending) {
      if (!v.cert_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cert_type'],
          message: 'Vui lòng chọn loại chứng chỉ',
        })
      }
      if (v.cert_type === CertType.BROKER_LICENSE) {
        if (!v.certificate_number) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['certificate_number'],
            message: 'Vui lòng nhập mã số',
          })
        }
        if (!v.issued_date) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['issued_date'],
            message: 'Vui lòng nhập ngày cấp',
          })
        }
      }
      if (v.effective_date && v.expiry_date && v.effective_date >= v.expiry_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiry_date'],
          message: 'Ngày hết hạn phải sau ngày bắt đầu hiệu lực',
        })
      }
    }
  })

export type BrokerCertificateFormValues = z.infer<typeof brokerCertificateFormSchema>

export const DEFAULT_BROKER_CERTIFICATE_FORM_VALUES: BrokerCertificateFormValues = {
  holder_collaborator: null,
  is_pending: false,
  cert_type: CertType.BROKER_LICENSE,
  certificate_number: '',
  issuer: '',
  issued_date: null,
  effective_date: null,
  expiry_date: null,
  expected_issue_date: null,
  notes: '',
}

/** Pure form→request mapping — unit-tested. */
export function buildPayload(
  values: BrokerCertificateFormValues,
  fileToken?: string
): BrokerCertificateRequest {
  // buildPayload runs after zod validation, so holder_collaborator is always present.
  const holder = values.holder_collaborator ?? 0
  if (values.is_pending) {
    // Pending records have no scan yet (BRD §2.6), so the attachment field is never sent.
    return {
      holder_collaborator: holder,
      status: CertStatus.PENDING_ISSUANCE,
      expected_issue_date: values.expected_issue_date
        ? formatDateToApi(values.expected_issue_date)
        : undefined,
      notes: values.notes || undefined,
    }
  }
  return {
    holder_collaborator: holder,
    cert_type: values.cert_type,
    certificate_number: values.certificate_number || undefined,
    issuer: values.issuer || undefined,
    issued_date: values.issued_date ? formatDateToApi(values.issued_date) : undefined,
    effective_date: values.effective_date ? formatDateToApi(values.effective_date) : undefined,
    expiry_date: values.expiry_date ? formatDateToApi(values.expiry_date) : undefined,
    notes: values.notes || undefined,
    // Only send the file field when a new scan was picked (presign/confirm token);
    // omitting it leaves any existing attachment untouched on edit.
    ...(fileToken ? { files: { attachment: fileToken } } : {}),
  }
}

export function collaboratorNameOf(record: BrokerCertificate): string {
  const c = record.holder_collaborator_detail
  return c ? [c.code, c.name].filter(Boolean).join(' — ') || '-' : '-'
}

export const brokerCertificateFilterSchema = z.object({
  status: z.string().nullable().optional(),
  cert_type: z.string().nullable().optional(),
  holder_collaborator: z.number().nullable().optional(),
})
export type BrokerCertificateFilterValues = z.infer<typeof brokerCertificateFilterSchema>
export const DEFAULT_BROKER_CERTIFICATE_FILTER_VALUES: BrokerCertificateFilterValues = {
  status: null,
  cert_type: null,
  holder_collaborator: null,
}
