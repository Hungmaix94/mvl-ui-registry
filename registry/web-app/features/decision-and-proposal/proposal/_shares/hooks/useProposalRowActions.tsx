import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TableAction } from '@/components/ui'
import { useAbility } from '@/lib/ability'
import {
  getProposalResourceName,
  getProposalDetailPathBuilder,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils'
import { useProposalApproveRejectWithInvalidation } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalApproveRejectWithInvalidation'
import { buildProposalApproveContent } from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-approve-content'
import { IconCheck, IconEye, IconX } from '@/assets/icons'
import { ProposalStatus, ProposalType } from '@/constants/api-schema-aliases'

type UseProposalRowActionsOptions<TProposal> = {
  proposalType: ProposalType
  /** Fires after a successful approve with the approved row (e.g. show a follow-up info dialog). */
  onApproveSuccess?: (record: TProposal) => void
}

export function useProposalRowActions<
  TProposal extends { id: number; colored_proposal_status?: { value?: string } },
>({
  proposalType,
  onApproveSuccess,
}: UseProposalRowActionsOptions<TProposal>): TableAction<TProposal>[] {
  const navigate = useNavigate()
  const ability = useAbility()
  const resourceName = getProposalResourceName(proposalType)
  const detailPathBuilder = getProposalDetailPathBuilder(proposalType)

  // Track the row currently being approved so onApproveSuccess can report it — the invalidation
  // hook below only knows the proposal id, not the full row record.
  const approvingRecordRef = useRef<TProposal | null>(null)

  const { handleApprove, handleReject } = useProposalApproveRejectWithInvalidation({
    proposalType,
    onApproveSuccess: () => {
      if (approvingRecordRef.current) {
        onApproveSuccess?.(approvingRecordRef.current)
      }
    },
  })

  const actions = useMemo<TableAction<TProposal>[]>(() => {
    const baseActions: TableAction<TProposal>[] = [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          navigate(detailPathBuilder(record.id), {
            state: { from: window.location.pathname + window.location.search },
          })
        },
        show: () => ability.can('retrieve', resourceName),
      },
    ]

    const canApprove = ability.can('approve', resourceName)
    const canReject = ability.can('reject', resourceName)

    if (canApprove || canReject) {
      baseActions.push(
        {
          label: 'Từ chối đề xuất',
          icon: <IconX size={16} />,
          onClick: (record) => handleReject(record.id),
          variant: 'danger',
          show: (record) => {
            const isPending = record.colored_proposal_status?.value === ProposalStatus.pending
            return canReject && isPending
          },
        },
        {
          label: 'Duyệt đề xuất',
          icon: <IconCheck size={16} />,
          // Reuse the same dedicated approve dialog the detail page uses (asset editing / OT hours),
          // built from this row's proposal so the list and detail surfaces never diverge.
          onClick: (record) => {
            approvingRecordRef.current = record
            handleApprove(record.id, buildProposalApproveContent(proposalType, record))
          },
          variant: 'success',
          show: (record) => {
            const isPending = record.colored_proposal_status?.value === ProposalStatus.pending
            return canApprove && isPending
          },
        }
      )
    }

    return baseActions
  }, [
    ability,
    detailPathBuilder,
    handleApprove,
    handleReject,
    navigate,
    proposalType,
    resourceName,
  ])

  return actions
}
