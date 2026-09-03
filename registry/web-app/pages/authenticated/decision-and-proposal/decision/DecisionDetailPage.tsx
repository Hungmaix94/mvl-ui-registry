import { useNavigate, useParams } from 'react-router-dom'
import { useDecision } from '@/features/decision-and-proposal/services/decision-service'
import { APP_PATH } from '@/routes'
import { PageTitle } from '@/components/ui'
import DecisionDetailContent from '@/features/decision-and-proposal/decision/view/DecisionDetailContent.tsx'
import { useCallback, useMemo } from 'react'
import { useAbility } from '@/lib/ability.ts'
import { useDecisionDelete } from '@/features/decision-and-proposal/decision/_shares/hooks/useDecisionDelete.tsx'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

const DecisionDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { id } = useParams<{ id: string }>()

  const { data: decision, isLoading, error } = useDecision(Number(id))

  const { openDeleteDialog } = useDecisionDelete()

  // Determine if decision was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !decision
  }, [isLoading, error, decision])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleBack = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.DECISION_MANAGEMENT))
  }, [navigate])

  const handleEdit = useCallback(() => {
    if (decision) {
      navigate(`${APP_PATH.DECISION_MANAGEMENT_EDIT.replace(':id', String(decision.id))}`)
    }
  }, [navigate, decision])

  const handleDelete = useCallback(() => {
    if (decision) {
      openDeleteDialog(decision)
    }
  }, [decision, openDeleteDialog])

  const handleShowHistory = useCallback(() => {
    if (decision) {
      navigate(`${APP_PATH.DECISION_MANAGEMENT_HISTORY.replace(':id', String(decision.id))}`)
    }
  }, [navigate, decision])

  return (
    <>
      <PageTitle
        title={decision ? `Quyết định ${decision.decision_number}` : undefined}
        idLabel={decision?.name}
        enableBackButton
        handleBackButton={handleBack}
        handleDelete={ability.can('destroy', 'decision') ? handleDelete : undefined}
        handleEdit={ability.can('update', 'decision') ? handleEdit : undefined}
        handleShowHistory={ability.can('histories', 'decision') ? handleShowHistory : undefined}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'decision')}
      >
        {decision && (
          <div className="flex flex-col items-start gap-9 px-10">
            <DecisionDetailContent decision={decision} />
          </div>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default DecisionDetailPage
