import ContractEvaluationEditPage from '@/features/contract/contract-evaluation/view/ContractEvaluationEditPage'
import { CONTRACT_EVALUATION_ROLE } from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'

export default function ContractEvaluationHrEditPage() {
  return (
    <ContractEvaluationEditPage role={CONTRACT_EVALUATION_ROLE.HR} title="Cập nhật phiếu (HR)" />
  )
}
