import ContractEvaluationEditPage from '@/features/contract/contract-evaluation/view/ContractEvaluationEditPage'
import { CONTRACT_EVALUATION_ROLE } from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'

export default function ContractEvaluationManagerEditPage() {
  return (
    <ContractEvaluationEditPage
      role={CONTRACT_EVALUATION_ROLE.MANAGER}
      title="Cập nhật phiếu (Manager)"
    />
  )
}
