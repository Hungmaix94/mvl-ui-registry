import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { PageTitle } from '@/components/ui'
import { parsePermissionCode, useAbility } from '@/lib/ability'
import { isNotFoundError } from '@/utils/error-utils'

import ContractEvaluationActions from '../_shares/components/ContractEvaluationActions'
import {
  CONTRACT_EVALUATION_PERMISSIONS,
  CONTRACT_EVALUATION_ROLE,
  ContractEvaluationDisplayStatus,
  type ContractEvaluationRole,
} from '../_shares/constants/contract-evaluation-constants'
import { useContractEvaluationByRole } from '../_shares/hooks/useContractEvaluationByRole'
import { useContractEvaluationDecide } from '../_shares/hooks/useContractEvaluationDecide'
import { useContractEvaluationReassignApprover } from '../_shares/hooks/useContractEvaluationReassignApprover'
import { useContractEvaluationReject } from '../_shares/hooks/useContractEvaluationReject'
import { useContractEvaluationRevokeApproval } from '../_shares/hooks/useContractEvaluationRevokeApproval'
import { getEvaluationRoutePaths } from '../_shares/utils/contract-evaluation-route-utils'
import ContractEvaluationDetail from '../view-details/ContractEvaluationDetail'

type ContractEvaluationDetailPageProps = {
  role: ContractEvaluationRole
  title: string
}

const PERMISSIONS_BY_ROLE = {
  [CONTRACT_EVALUATION_ROLE.MANAGER]: CONTRACT_EVALUATION_PERMISSIONS.MANAGER,
  [CONTRACT_EVALUATION_ROLE.HR]: CONTRACT_EVALUATION_PERMISSIONS.HR,
} as const

/**
 * display_status at which each role's OWN Phê duyệt/Từ chối step is live. The BE's
 * `allow_actions.decide` can be true outside these steps (the viewer may also sit
 * elsewhere in the approver chain), so each role screen must additionally gate the
 * decide/reject affordance on its own step:
 *  - HR decides only at "Chờ HR duyệt" (waiting_hr)
 *  - Manager decides at the manager steps (waiting_manager / waiting_block_director)
 * Reassign/revoke stay purely server-driven via `allow_actions`.
 */
const DECIDE_DISPLAY_STATUS_BY_ROLE: Record<
  ContractEvaluationRole,
  ContractEvaluationDisplayStatus[]
> = {
  [CONTRACT_EVALUATION_ROLE.HR]: [ContractEvaluationDisplayStatus.waiting_hr],
  [CONTRACT_EVALUATION_ROLE.MANAGER]: [
    ContractEvaluationDisplayStatus.waiting_manager,
    ContractEvaluationDisplayStatus.waiting_block_director,
  ],
}

const ContractEvaluationDetailPage = ({ role, title }: ContractEvaluationDetailPageProps) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const evaluationId = Number(id)
  const ability = useAbility()

  const can = useCallback(
    (code: string) => {
      const parsed = parsePermissionCode(code)
      return parsed ? ability.can(parsed.action, parsed.subject) : false
    },
    [ability]
  )

  const permissions = PERMISSIONS_BY_ROLE[role]

  const query = useContractEvaluationByRole(role, evaluationId)
  const evaluation = query.data

  // Phê duyệt/Từ chối must appear only at this role's own decision step (see
  // DECIDE_DISPLAY_STATUS_BY_ROLE), even when the BE's allow_actions.decide is true elsewhere.
  const canDecideAtStatus =
    !!evaluation?.display_status &&
    DECIDE_DISPLAY_STATUS_BY_ROLE[role].includes(evaluation.display_status)

  const isNotFound = useMemo(() => {
    if (query.isLoading) return false
    if (query.error && isNotFoundError(query.error)) return true
    return !evaluation
  }, [query.isLoading, query.error, evaluation])

  const isError = useMemo(() => {
    if (query.isLoading || !query.error) return false
    return !isNotFoundError(query.error)
  }, [query.isLoading, query.error])

  const routePaths = useMemo(() => getEvaluationRoutePaths(role), [role])

  const { openDecideDialog } = useContractEvaluationDecide(role)
  const { openRejectDialog } = useContractEvaluationReject(role)
  const { openReassignDialog } = useContractEvaluationReassignApprover()
  const { openRevokeDialog } = useContractEvaluationRevokeApproval()

  // Edit is server-driven: `allow_actions.edit` already encodes permission + status +
  // the viewer's relationship to the form. History stays a plain permission check.
  const canEdit = !!evaluation && !!evaluation.allow_actions?.edit
  const canViewHistory = !!evaluation && can(permissions.HISTORIES)

  const handleEdit = useCallback(() => {
    if (!evaluation) return
    navigate(routePaths.edit.replace(':id', String(evaluation.id)))
  }, [evaluation, navigate, routePaths.edit])

  const handleShowHistory = useCallback(() => {
    if (!evaluation) return
    navigate(routePaths.history.replace(':id', String(evaluation.id)))
  }, [evaluation, navigate, routePaths.history])

  return (
    <>
      <PageTitle
        title={title}
        idLabel={evaluation?.code || ''}
        enableBackButton
        handleEdit={canEdit ? handleEdit : undefined}
        handleShowHistory={canViewHistory ? handleShowHistory : undefined}
        customActions={
          evaluation ? (
            <ContractEvaluationActions
              evaluation={evaluation}
              onDecide={canDecideAtStatus ? () => openDecideDialog(evaluation) : undefined}
              onReject={canDecideAtStatus ? () => openRejectDialog(evaluation) : undefined}
              onReassign={() => openReassignDialog(evaluation)}
              onRevoke={() => openRevokeDialog(evaluation)}
            />
          ) : undefined
        }
      />

      <DetailPageWrapper
        isLoading={query.isLoading}
        isError={isError}
        isNotFound={isNotFound}
        hasPermission={can(permissions.RETRIEVE)}
      >
        {evaluation && (
          <div className="flex flex-col items-stretch gap-4 px-10 py-6">
            <ContractEvaluationDetail evaluation={evaluation} mode={role} />
          </div>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default ContractEvaluationDetailPage
