import { useNavigate } from 'react-router-dom'
import DecisionForm from '@/features/decision-and-proposal/decision/_shares/components/DecisionForm.tsx'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { useCallback } from 'react'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

const DecisionCreatePage = () => {
  const navigate = useNavigate()
  const invalidateQueries = useInvalidateQueries()

  const handleSuccess = useCallback(async () => {
    await invalidateQueries.invalidateByPrefix('hrm/decisions')
    navigate(APP_PATH.DECISION_MANAGEMENT)
  }, [navigate, invalidateQueries])

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.DECISION_MANAGEMENT))
  }, [navigate])

  return (
    <>
      <PageTitle title="Tạo mới quyết định" enableBackButton handleBackButton={handleCancel} />
      <div className="flex flex-col items-start gap-9 px-10">
        <DecisionForm mode="create" onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </>
  )
}

export default DecisionCreatePage
