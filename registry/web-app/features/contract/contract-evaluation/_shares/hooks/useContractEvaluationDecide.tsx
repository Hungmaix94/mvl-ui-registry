import { useCallback } from 'react'

import {
  type ContractEvaluation,
  type HrDecisionRequest,
  type ManagerDecisionRequest,
  useDecideContractEvaluationHr,
} from '@/features/contract/services/contract-evaluation-hr-service'
import { useDecideContractEvaluationManager } from '@/features/contract/services/contract-evaluation-manager-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'

import { HrDecideForm, ManagerDecideForm } from '../components/ContractEvaluationDecideForm'
import {
  CONTRACT_EVALUATION_ROLE,
  ContractEvaluationFormType,
  type ContractEvaluationRole,
} from '../constants/contract-evaluation-constants'

type DecidableEvaluation = Pick<
  ContractEvaluation,
  'id' | 'code' | 'form_type' | 'status' | 'items'
>

/**
 * Approve an evaluation at the current step:
 *  - Manager → `ManagerDecisionRequest` (general_assessment + recommendation + ratings)
 *    via `/contract-evaluations/manager/{id}/decision/`.
 *  - HR (final) → `HrDecisionRequest` (Part V/VI: contract term / probation / salary for
 *    INTERN + approved note) via `/contract-evaluations/hr/{id}/decision/`.
 *
 * Rejection is handled separately by `useContractEvaluationReject` (same endpoint, the
 * `{ decision: 'reject' }` branch).
 */
export function useContractEvaluationDecide(
  role: ContractEvaluationRole,
  onSuccessfullyDecide?: () => void
) {
  const { displayFormContent, displayClose, setLoading } = useDialog()
  const hrMutation = useDecideContractEvaluationHr()
  const managerMutation = useDecideContractEvaluationManager()
  const invalidateQueries = useInvalidateQueries()

  const isHr = role === CONTRACT_EVALUATION_ROLE.HR

  const finishSuccess = useCallback(
    async (onSuccess?: () => void) => {
      await invalidateQueries.invalidateByPrefix('hrm')
      toastService.success('Phê duyệt phiếu đánh giá thành công')
      displayClose()
      if (typeof onSuccess === 'function') onSuccess()
      else if (typeof onSuccessfullyDecide === 'function') onSuccessfullyDecide()
    },
    [invalidateQueries, displayClose, onSuccessfullyDecide]
  )

  const openDecideDialog = useCallback(
    (evaluation: DecidableEvaluation, onSuccess?: () => void) => {
      displayFormContent({
        title: 'Phê duyệt phiếu đánh giá',
        size: 'lg',
        hideFooter: true,
        content: isHr ? (
          <HrDecideForm
            formType={evaluation.form_type}
            onCancel={displayClose}
            onSubmit={async (values) => {
              try {
                setLoading(true)
                const isIntern = evaluation.form_type === ContractEvaluationFormType.intern
                const data: HrDecisionRequest = {
                  decision: values.decision,
                  hr_approved_note: values.hr_approved_note,
                  // `hr_accepted` (chấp nhận lên chính thức) + Phần V chỉ áp dụng cho phiếu
                  // Thực tập sinh. Phiếu Tái ký (recontract) không gửi các field này (BE yêu cầu).
                  ...(isIntern
                    ? {
                        hr_accepted: values.hr_accepted ?? undefined,
                        hr_contract_term: values.hr_contract_term ?? undefined,
                        hr_probation: values.hr_probation ?? undefined,
                        // CurrencyInput → number in form state; API expects a decimal string.
                        hr_proposed_salary:
                          values.hr_proposed_salary != null
                            ? String(values.hr_proposed_salary)
                            : undefined,
                      }
                    : {}),
                }
                await hrMutation.mutateAsync({ id: evaluation.id, data })
                await finishSuccess(onSuccess)
              } finally {
                setLoading(false)
              }
            }}
          />
        ) : (
          <ManagerDecideForm
            items={evaluation.items ?? []}
            onCancel={displayClose}
            onSubmit={async (values) => {
              try {
                setLoading(true)
                const data: ManagerDecisionRequest = {
                  decision: values.decision,
                  general_assessment: values.general_assessment,
                  recommendation: values.recommendation ?? undefined,
                  manager_ratings: (values.manager_ratings ?? []).filter((r) => r.rating != null),
                }
                await managerMutation.mutateAsync({ id: evaluation.id, data })
                await finishSuccess(onSuccess)
              } finally {
                setLoading(false)
              }
            }}
          />
        ),
      })
    },
    [displayFormContent, displayClose, isHr, hrMutation, managerMutation, setLoading, finishSuccess]
  )

  return {
    openDecideDialog,
    isDeciding: isHr ? hrMutation.isPending : managerMutation.isPending,
  }
}
