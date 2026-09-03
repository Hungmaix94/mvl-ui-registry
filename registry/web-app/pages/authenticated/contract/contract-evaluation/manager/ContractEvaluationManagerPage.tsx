import ContractEvaluationListPage from '@/features/contract/contract-evaluation/view/ContractEvaluationListPage'
import { CONTRACT_EVALUATION_ROLE } from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'

export default function ContractEvaluationManagerPage() {
  return (
    <ContractEvaluationListPage role={CONTRACT_EVALUATION_ROLE.MANAGER} title="Phiếu cần duyệt" />
  )
}
