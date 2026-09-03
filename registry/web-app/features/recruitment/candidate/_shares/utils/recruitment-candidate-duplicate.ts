import { CheckDuplicateResponseStatus } from '@/api/schema'
import type { CheckDuplicateResponse } from '@/features/recruitment/services/recruitment-candidate-service'

export type RecruitmentCandidateDuplicateCase = CheckDuplicateResponseStatus

/** Form state derived from typed `CheckDuplicateResponse` (OpenAPI `components.schemas.CheckDuplicateResponse`). */
export type RecruitmentDuplicateCheckResult = {
  case: RecruitmentCandidateDuplicateCase
  employeeId?: number
  candidateId?: number
  message: string
  response: CheckDuplicateResponse
}

/**
 * Map API check-duplicate body to internal duplicate case + ids. Caller should only invoke
 * after a successful mutation that returned `CheckDuplicateResponse`.
 */
export function mapCheckDuplicateResponse(
  response: CheckDuplicateResponse
): RecruitmentDuplicateCheckResult {
  return {
    case: response.status,
    employeeId: response.employee?.id,
    candidateId: response.candidate?.id,
    message: response.message,
    response,
  }
}

export function isDuplicateCaseBlockingSubmit(c: RecruitmentCandidateDuplicateCase): boolean {
  return (
    c === CheckDuplicateResponseStatus.candidate_match ||
    c === CheckDuplicateResponseStatus.active_employee_match
  )
}

export function parseIsReturnCandidate(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1'
  }
  return false
}

export type ReturnFromEmployeePreview = {
  fullname?: string | null
  code?: string | null
  employeeType?: string | null
  branchName?: string | null
  blockName?: string | null
  departmentName?: string | null
  positionName?: string | null
  dateOfBirthLabel?: string | null
}

/** Map check-duplicate response (nested employee) to preview for return-from-employee dialog. */
export function buildReturnEmployeePreviewFromCheckDuplicate(
  res: CheckDuplicateResponse
): ReturnFromEmployeePreview {
  const emp = res.employee
  if (emp == null) return {}
  return {
    fullname: emp.fullname,
    code: emp.code,
    employeeType: emp.employee_type ?? null,
    branchName: emp.branch?.name,
    blockName: emp.block?.name,
    departmentName: emp.department?.name,
    positionName: emp.position?.name,
    dateOfBirthLabel: emp.date_of_birth ?? undefined,
  }
}

/** Dữ liệu hiển thị trong dialog trùng nhân viên / ứng viên (từ payload API check-duplicate). */
export type DuplicateMatchPersonFields = {
  id?: number
  code: string | null | undefined
  fullname: string | null | undefined
  phone: string | null | undefined
  email: string | null | undefined
  citizen_id: string | null | undefined
  dateOfBirth: string | null | undefined
  departmentName: string | null | undefined
  positionName: string | null | undefined
  branchName: string | null | undefined
}

export function extractDuplicateEmployeeFromCheckDuplicate(
  res: CheckDuplicateResponse
): DuplicateMatchPersonFields {
  const emp = res.employee
  if (emp == null) {
    return {
      id: undefined,
      code: undefined,
      fullname: undefined,
      phone: undefined,
      email: undefined,
      citizen_id: undefined,
      dateOfBirth: undefined,
      departmentName: undefined,
      positionName: undefined,
      branchName: undefined,
    }
  }
  return {
    id: emp.id,
    code: emp.code,
    fullname: emp.fullname,
    phone: emp.phone,
    email: emp.email,
    citizen_id: emp.citizen_id,
    dateOfBirth: emp.date_of_birth,
    departmentName: emp.department?.name,
    positionName: emp.position?.name,
    branchName: emp.branch?.name,
  }
}

export function extractDuplicateCandidateFromCheckDuplicate(
  res: CheckDuplicateResponse
): DuplicateMatchPersonFields {
  const cand = res.candidate
  if (cand == null) {
    return {
      id: undefined,
      code: undefined,
      fullname: undefined,
      phone: undefined,
      email: undefined,
      citizen_id: undefined,
      dateOfBirth: undefined,
      departmentName: undefined,
      positionName: undefined,
      branchName: undefined,
    }
  }
  return {
    id: cand.id,
    code: cand.code,
    fullname: cand.name,
    phone: cand.phone,
    email: cand.email,
    citizen_id: cand.citizen_id,
    dateOfBirth: cand.date_of_birth,
    departmentName: cand.department?.name,
    positionName: cand.recruitment_request?.name,
    branchName: cand.branch?.name,
  }
}
