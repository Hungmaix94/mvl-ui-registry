import { useCallback } from 'react'

import {
  type ContractEvaluation,
  useDecideContractEvaluationHr,
} from '@/features/contract/services/contract-evaluation-hr-service'
import { useDecideContractEvaluationManager } from '@/features/contract/services/contract-evaluation-manager-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'

import ContractEvaluationRejectForm from '../components/ContractEvaluationRejectForm'
import {
  CONTRACT_EVALUATION_ROLE,
  ContractEvaluationDecision,
  type ContractEvaluationRole,
} from '../constants/contract-evaluation-constants'

type RejectableEvaluation = Pick<ContractEvaluation, 'id' | 'code'>

/**
 * Reject = the shared `/decision/` endpoint with `{ decision: 'reject', reject_reason }`.
 * The form moves the evaluation to REJECTED. Routes to the manager or HR decision
 * endpoint based on the current view role.
 */
export function useContractEvaluationReject(
  role: ContractEvaluationRole,
  onSuccessfullyReject?: () => void
) {
  const { displayFormContent, displayClose, setLoading } = useDialog()
  const hrMutation = useDecideContractEvaluationHr()
  const managerMutation = useDecideContractEvaluationManager()
  const invalidateQueries = useInvalidateQueries()

  const isHr = role === CONTRACT_EVALUATION_ROLE.HR

  const openRejectDialog = useCallback(
    (evaluation: RejectableEvaluation, onSuccess?: () => void) => {
      displayFormContent({
        title: 'Từ chối phiếu đánh giá',
        size: 'md',
        hideFooter: true,
        content: (
          <ContractEvaluationRejectForm
            onCancel={displayClose}
            onSubmit={async (values) => {
              try {
                setLoading(true)
                const payload = {
                  decision: ContractEvaluationDecision.reject,
                  reject_reason: values.reject_reason,
                }
                if (isHr) {
                  await hrMutation.mutateAsync({ id: evaluation.id, data: payload })
                } else {
                  await managerMutation.mutateAsync({ id: evaluation.id, data: payload })
                }
                await invalidateQueries.invalidateByPrefix('hrm')
                toastService.success('Từ chối phiếu đánh giá thành công')
                displayClose()
                if (typeof onSuccess === 'function') onSuccess()
                else if (typeof onSuccessfullyReject === 'function') onSuccessfullyReject()
              } finally {
                setLoading(false)
              }
            }}
          />
        ),
      })
    },
    [
      displayFormContent,
      displayClose,
      isHr,
      hrMutation,
      managerMutation,
      invalidateQueries,
      onSuccessfullyReject,
      setLoading,
    ]
  )

  return {
    openRejectDialog,
    isRejecting: isHr ? hrMutation.isPending : managerMutation.isPending,
  }
}
