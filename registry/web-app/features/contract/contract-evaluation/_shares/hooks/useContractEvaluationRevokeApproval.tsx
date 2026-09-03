import { useCallback } from 'react'

import {
  type ContractEvaluation,
  useRevokeApprovalContractEvaluationHr,
} from '@/features/contract/services/contract-evaluation-hr-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'

import ContractEvaluationRevokeForm from '../components/ContractEvaluationRevokeForm'

type RevocableEvaluation = Pick<ContractEvaluation, 'id' | 'code'>

/**
 * HR-only: revoke the latest approval and send the evaluation back to the HR step.
 * Maps to `HrRevokeRequest` { reject_reason } (reason is required by BE).
 */
export function useContractEvaluationRevokeApproval(onSuccessfullyRevoke?: () => void) {
  const { displayFormContent, displayClose, setLoading } = useDialog()
  const mutation = useRevokeApprovalContractEvaluationHr()
  const invalidateQueries = useInvalidateQueries()

  const openRevokeDialog = useCallback(
    (evaluation: RevocableEvaluation, onSuccess?: () => void) => {
      displayFormContent({
        title: `Thu hồi phê duyệt ${evaluation.code || `#${evaluation.id}`}`,
        size: 'md',
        hideFooter: true,
        content: (
          <ContractEvaluationRevokeForm
            onCancel={displayClose}
            onSubmit={async (values) => {
              try {
                setLoading(true)
                await mutation.mutateAsync({
                  id: evaluation.id,
                  data: { reject_reason: values.reject_reason },
                })
                await invalidateQueries.invalidateByPrefix('hrm')
                toastService.success('Thu hồi phê duyệt thành công')
                displayClose()
                if (typeof onSuccess === 'function') onSuccess()
                else if (typeof onSuccessfullyRevoke === 'function') onSuccessfullyRevoke()
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
      mutation,
      invalidateQueries,
      onSuccessfullyRevoke,
      setLoading,
    ]
  )

  return {
    openRevokeDialog,
    isRevoking: mutation.isPending,
  }
}
