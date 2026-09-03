import { EmployeeDocumentSubmissionItemRequestDocument_type } from '@/api/schema.ts'

/**
 * Permission codes for employee onboarding document submission (CR240).
 * Source of truth: `**Require permission:** employee.documents` on
 * PATCH /api/hrm/employees/{id}/documents/ in src/api/schema.ts.
 */
export const EMPLOYEE_DOCUMENT_PERMISSIONS = {
  UPDATE: 'documents',
} as const

/**
 * The seven tracked onboarding document types, in the display order defined by the SRS.
 * Vietnamese labels are NOT hardcoded here — they come from the backend via
 * `useAppConstant` (APP_CONSTANT_KEY.HRM.EMPLOYEE_DOCUMENT_SUBMISSION_DOCUMENT_TYPE_CHOICES).
 */
export const DOCUMENT_TYPE_ORDER: EmployeeDocumentSubmissionItemRequestDocument_type[] = [
  EmployeeDocumentSubmissionItemRequestDocument_type.resume,
  EmployeeDocumentSubmissionItemRequestDocument_type.birth_certificate,
  EmployeeDocumentSubmissionItemRequestDocument_type.residence_confirmation,
  EmployeeDocumentSubmissionItemRequestDocument_type.health_check,
  EmployeeDocumentSubmissionItemRequestDocument_type.citizen_id_copy,
  EmployeeDocumentSubmissionItemRequestDocument_type.diploma,
  EmployeeDocumentSubmissionItemRequestDocument_type.photo_4x6,
]
