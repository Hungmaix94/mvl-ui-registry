import ContractEvaluationDetailPage from '@/features/contract/contract-evaluation/view/ContractEvaluationDetailPage'
import { CONTRACT_EVALUATION_ROLE } from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'

export default function ContractEvaluationHrDetailPage() {
  return (
    <ContractEvaluationDetailPage role={CONTRACT_EVALUATION_ROLE.HR} title="Chi tiết phiếu (HR)" />
  )
}
