import {
  useContractEvaluationHr,
  useContractEvaluationsHr,
  type GetContractEvaluationsHrParams,
} from '@/features/contract/services/contract-evaluation-hr-service'
import {
  useContractEvaluationManager,
  useContractEvaluationsManager,
  type GetContractEvaluationsManagerParams,
} from '@/features/contract/services/contract-evaluation-manager-service'
import {
  CONTRACT_EVALUATION_ROLE,
  type ContractEvaluationRole,
} from '../constants/contract-evaluation-constants'

/**
 * Role-bound single-resource fetch. Picks one of `useContractEvaluation{Manager,Hr}`
 * based on `role` and disables the other so we don't fire extra network calls.
 * NV (Me) self-service do mobile xử lý — không có branch ở đây.
 */
export function useContractEvaluationByRole(role: ContractEvaluationRole, id: number) {
  const managerQuery = useContractEvaluationManager(
    role === CONTRACT_EVALUATION_ROLE.MANAGER ? id : 0
  )
  const hrQuery = useContractEvaluationHr(role === CONTRACT_EVALUATION_ROLE.HR ? id : 0)
  if (role === CONTRACT_EVALUATION_ROLE.MANAGER) return managerQuery
  return hrQuery
}

/**
 * Role-bound paginated list fetch. Non-active branch disabled via `enabled` flag.
 * `enabled` (default true) further gates the active branch — e.g. to hold off the first
 * fetch until a caller-side default filter has finished seeding the URL.
 */
export function useContractEvaluationsByRole(
  role: ContractEvaluationRole,
  params: GetContractEvaluationsHrParams | GetContractEvaluationsManagerParams,
  enabled = true
) {
  const managerQuery = useContractEvaluationsManager(params, {
    enabled: enabled && role === CONTRACT_EVALUATION_ROLE.MANAGER,
  })
  const hrQuery = useContractEvaluationsHr(params, {
    enabled: enabled && role === CONTRACT_EVALUATION_ROLE.HR,
  })
  if (role === CONTRACT_EVALUATION_ROLE.MANAGER) return managerQuery
  return hrQuery
}
