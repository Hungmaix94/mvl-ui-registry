import { useParams, useLocation } from 'react-router-dom'
import { AssessmentDetailContainer, AssessmentAssessContainer } from '@/features/kpi/assessment'

const AssessmentDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const assessmentId = parseInt(id || '0', 10)
  const isEvaluationMode = location.pathname.endsWith('/assess')
  if (!assessmentId) {
    return <div>Invalid Assessment ID</div>
  }

  if (isEvaluationMode) {
    return <AssessmentAssessContainer />
  }

  return <AssessmentDetailContainer />
}

export default AssessmentDetailPage
