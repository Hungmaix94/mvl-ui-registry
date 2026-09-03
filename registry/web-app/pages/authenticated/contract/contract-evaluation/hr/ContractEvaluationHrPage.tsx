import ContractEvaluationListPage from '@/features/contract/contract-evaluation/view/ContractEvaluationListPage'
import { CONTRACT_EVALUATION_ROLE } from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'

export default function ContractEvaluationHrPage() {
  return (
    <ContractEvaluationListPage
      role={CONTRACT_EVALUATION_ROLE.HR}
      title="Quản lý phiếu đánh giá (HR)"
    />
  )
}
