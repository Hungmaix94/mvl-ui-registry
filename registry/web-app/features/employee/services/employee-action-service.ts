import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { useApiMutation } from '@/hooks/useApiQuery'

// ===== TYPE DEFINITIONS =====
export type EmployeeActiveActionRequest = components['schemas']['EmployeeActiveActionRequest']
export type EmployeeMaternityLeaveActionRequest =
  components['schemas']['EmployeeMaternityLeaveActionRequest']
export type LinkCandidateRequest = components['schemas']['LinkCandidateRequest']
export type EmployeeResignedActionRequest = components['schemas']['EmployeeResignedActionRequest']
export type ResignedReasonItem = components['schemas']['ResignedReasonItem']
export type EmployeeResignedReasonSummary = components['schemas']['EmployeeResignedReasonSummary']
export type EmployeeTransferActionRequest = components['schemas']['EmployeeTransferActionRequest']

// ===== SERVICE CLASS =====
export class EmployeeActionService extends BaseApiService {
  /**
   * Active an employee
   */
  async activeEmployee(id: number, data: EmployeeActiveActionRequest) {
    return await this.post(ApiPaths.hrm_employees_active_create, data, {
      path: { id },
    })
  }

  /**
   * Set employee to maternity leave
   */
  async maternityLeaveEmployee(id: number, data: EmployeeMaternityLeaveActionRequest) {
    return await this.post(ApiPaths.hrm_employees_maternity_leave_create, data, {
      path: { id },
    })
  }

  /**
   * Link an unlinked recruitment candidate to this employee
   */
  async linkCandidateToEmployee(id: number, data: LinkCandidateRequest) {
    return await this.post(ApiPaths.hrm_employees_link_candidate_create, data, {
      path: { id },
    })
  }

  /**
   * Resign an employee
   */
  async resignedEmployee(id: number, data: EmployeeResignedActionRequest) {
    return await this.post(ApiPaths.hrm_employees_resigned_create, data, {
      path: { id },
    })
  }

  /**
   * Transfer an employee immediately (manual action on Employee Detail screen).
   * Blocked by the backend (400) if the employee has any active transfer proposal.
   */
  async transferEmployee(id: number, data: EmployeeTransferActionRequest) {
    return await this.post(ApiPaths.hrm_employees_transfer_create, data, {
      path: { id },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _employeeActionService: EmployeeActionService | null = null

export function getEmployeeActionService(): EmployeeActionService {
  if (!_employeeActionService) {
    _employeeActionService = new EmployeeActionService()
  }
  return _employeeActionService
}

// ===== REACT QUERY HOOKS =====
export function useActiveEmployee() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeActiveActionRequest }) =>
    getEmployeeActionService().activeEmployee(id, data)
  )
}

export function useMaternityLeaveEmployee() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeMaternityLeaveActionRequest }) =>
    getEmployeeActionService().maternityLeaveEmployee(id, data)
  )
}

export function useLinkCandidateToEmployee() {
  return useApiMutation(({ id, data }: { id: number; data: LinkCandidateRequest }) =>
    getEmployeeActionService().linkCandidateToEmployee(id, data)
  )
}

export function useResignedEmployee() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeResignedActionRequest }) =>
    getEmployeeActionService().resignedEmployee(id, data)
  )
}

export function useTransferEmployee() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeTransferActionRequest }) =>
    getEmployeeActionService().transferEmployee(id, data)
  )
}
