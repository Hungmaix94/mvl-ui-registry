import { type KPICriterion } from '@/features/kpi/services/kpi-criteria-service'
import { KPICriteriaCustomTable } from './KPICriteriaCustomTable'

export type KPICriteriaTableProps = {
  data: KPICriterion[]
  isLoading?: boolean
  refetch: () => void
}

const KPICriteriaTable = ({ data, isLoading }: KPICriteriaTableProps) => {
  return <KPICriteriaCustomTable data={data} isLoading={isLoading} />
}

export default KPICriteriaTable
