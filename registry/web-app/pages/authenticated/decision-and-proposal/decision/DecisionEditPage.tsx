import { useNavigate, useParams } from 'react-router-dom'
import DecisionForm from '@/features/decision-and-proposal/decision/_shares/components/DecisionForm.tsx'
import { PageTitle } from '@/components/ui'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { APP_PATH } from '@/routes'
import { useDecision } from '@/features/decision-and-proposal/services/decision-service'
import { useCallback } from 'react'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

const DecisionEditPage = () => {
  const navigate = useNavigate()
  const invalidateQueries = useInvalidateQueries()

  const { id } = useParams<{ id: string }>()

  const { data: decision, isLoading, error } = useDecision(Number(id))

  const handleSuccess = useCallback(async () => {
    await invalidateQueries.invalidateByPrefix('hrm/decisions')
    navigate(APP_PATH.DECISION_MANAGEMENT)
  }, [navigate, invalidateQueries])

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.DECISION_MANAGEMENT))
  }, [navigate])

  if (isLoading) {
    return <FullScreenLoading className="h-[unset] min-h-[unset] flex-1" />
  }

  if (error || !decision) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-content-dark-3">Không tìm thấy quyết định</span>
      </div>
    )
  }

  return (
    <>
      <PageTitle
        title={`Chỉnh sửa quyết định ${decision.decision_number}`}
        idLabel={decision.name}
        enableBackButton
        handleBackButton={handleCancel}
      />
      <div className="flex flex-col items-start gap-9 px-10">
        <DecisionForm
          mode="edit"
          initialData={decision}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </>
  )
}

export default DecisionEditPage
