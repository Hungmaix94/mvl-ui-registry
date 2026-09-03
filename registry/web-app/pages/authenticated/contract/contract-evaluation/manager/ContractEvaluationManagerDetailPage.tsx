import ContractEvaluationDetailPage from '@/features/contract/contract-evaluation/view/ContractEvaluationDetailPage'
import { CONTRACT_EVALUATION_ROLE } from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'

export default function ContractEvaluationManagerDetailPage() {
  return (
    <ContractEvaluationDetailPage
      role={CONTRACT_EVALUATION_ROLE.MANAGER}
      title="Chi tiết phiếu (Manager)"
    />
  )
}
