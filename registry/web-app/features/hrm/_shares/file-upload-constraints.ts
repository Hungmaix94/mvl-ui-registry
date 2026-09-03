/** MIME lists aligned with `FileUpload` ACCEPTED_FILE_TYPES — CMND/CCCD: images only (no WebP). */
export const CMND_IMAGE_ACCEPT = ['image/jpeg', 'image/jpg', 'image/png'] as const

/**
 * Đính kèm hồ sơ: .pdf, .doc, .docx, .csv, .xls, .xlsx, .jpg, .jpeg, .png (no WebP).
 */
export const PROFILE_ATTACHMENTS_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const

export const MAX_PROFILE_ATTACHMENTS = 3

/** Presign purpose — align with backend whitelist. */
export const PRESIGN_PURPOSE_EMPLOYEE_PROFILE_ATTACHMENTS = 'employee_profile_attachments'
export const PRESIGN_PURPOSE_RECRUITMENT_CANDIDATE_ATTACHMENTS = 'recruitment_candidate_attachments'
