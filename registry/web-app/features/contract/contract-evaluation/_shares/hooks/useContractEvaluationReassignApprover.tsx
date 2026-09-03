import { useCallback } from 'react'

import {
  type ContractEvaluation,
  useReassignApproverContractEvaluationHr,
} from '@/features/contract/services/contract-evaluation-hr-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'

import ContractEvaluationReassignForm from '../components/ContractEvaluationReassignForm'

type ReassignableEvaluation = Pick<ContractEvaluation, 'id' | 'code' | 'approvers'>

/**
 * HR-only: reassign the current pending approver. Maps to `ReassignApproverRequest`
 * { order, new_approver_id, reason }. `order` is selected by the user from PENDING
 * and SKIPPED approvers in the chain.
 */
export function useContractEvaluationReassignApprover(onSuccessfullyReassign?: () => void) {
  const { displayFormContent, displayClose, setLoading } = useDialog()
  const mutation = useReassignApproverContractEvaluationHr()
  const invalidateQueries = useInvalidateQueries()

  const openReassignDialog = useCallback(
    (evaluation: ReassignableEvaluation, onSuccess?: () => void) => {
      displayFormContent({
        title: 'Chuyển người duyệt',
        size: 'md',
        hideFooter: true,
        content: (
          <ContractEvaluationReassignForm
            approvers={evaluation.approvers ?? []}
            onCancel={displayClose}
            onSubmit={async (values) => {
              try {
                setLoading(true)
                await mutation.mutateAsync({
                  id: evaluation.id,
                  data: {
                    order: values.order,
                    new_approver_id: values.approver,
                    reason: values.reassign_reason,
                  },
                })
                await invalidateQueries.invalidateByPrefix('hrm')
                toastService.success('Chuyển người duyệt thành công')
                displayClose()
                if (typeof onSuccess === 'function') onSuccess()
                else if (typeof onSuccessfullyReassign === 'function') onSuccessfullyReassign()
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
      onSuccessfullyReassign,
      setLoading,
    ]
  )

  return {
    openReassignDialog,
    isReassigning: mutation.isPending,
  }
}
