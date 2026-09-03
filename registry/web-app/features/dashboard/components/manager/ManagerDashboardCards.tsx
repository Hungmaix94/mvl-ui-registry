import { ApiPaths } from '@/api/schema'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useManagerDashboardRealtime } from '@/features/dashboard/services/dashboard-service'
import ManagerDashboardCard from '@/features/dashboard/components/card/ManagerDashboardCard'
import { Grid } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes/AppRoute.constant'
import {
  ContractEvaluationDisplayStatus,
  ContractEvaluationStatus,
} from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'

// The dashboard API emits the coarse `status` filter, but the evaluation list page filters by the
// granular `display_status`. The coarse WAITING_MANAGER spans two display tiers (department leader +
// block director), so it maps to BOTH — matching the card count, which counts by coarse status.
// WAITING_HR maps 1:1. Without this remap the `status` key lands in the URL but the list ignores it,
// so the list shows every record instead of the filtered set (86eyc52e4).
const COARSE_STATUS_TO_DISPLAY_STATUS: Record<string, ContractEvaluationDisplayStatus[]> = {
  [ContractEvaluationStatus.waiting_manager]: [
    ContractEvaluationDisplayStatus.waiting_manager,
    ContractEvaluationDisplayStatus.waiting_block_director,
  ],
  [ContractEvaluationStatus.waiting_hr]: [ContractEvaluationDisplayStatus.waiting_hr],
}

// Build the evaluation-list query string from the BE `query_params`, always preserving `form_type`.
// The list page filters on `display_status`, so: if the BE ever sends `display_status` we forward it
// verbatim (contract wins); otherwise we translate the coarse `status` it sends today. This keeps the
// deep link correct whether the contract stays on `status` or later switches to `display_status`.
const buildEvaluationListSearch = (
  queryParams?: { status?: string; display_status?: string | string[]; form_type?: string } | null
): string => {
  const params = new URLSearchParams()
  if (queryParams?.form_type) params.append('form_type', queryParams.form_type)

  const displayStatuses = queryParams?.display_status
    ? [queryParams.display_status].flat()
    : queryParams?.status
      ? (COARSE_STATUS_TO_DISPLAY_STATUS[queryParams.status] ?? [])
      : []
  displayStatuses.forEach((status) => params.append('display_status', status))
  return params.toString()
}

const ManagerDashboardCards = () => {
  const { data: response, isLoading } = useManagerDashboardRealtime()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const ability = useAbility()

  const canViewProposals = ability.can('mine', 'proposal_verifier')
  const canViewKPIAssessments = ability.can('retrieve', 'kpi_assessment_period_manager')
  const canViewManagerEvaluations = ability.can('list', 'contract_evaluation_manager')
  const canViewHrEvaluations = ability.can('list', 'contract_evaluation_hr')

  const handleNavigate = (path: string, queryParams: Record<string, string>) => {
    // Bảo toàn query params hiện tại
    const currentParams = new URLSearchParams(searchParams)

    // Merge với query params mới (override nếu trùng key)
    Object.entries(queryParams).forEach(([key, value]) => {
      currentParams.set(key, value)
    })

    navigate(`${path}?${currentParams.toString()}`)
  }

  const handleProposalsViewAll = () => {
    const item = response?.proposals_to_verify
    if (!item || !item.path || !canViewProposals) return

    handleNavigate(item.path, (item.query_params as Record<string, string>) || {})
  }

  const handleKPIAssessmentsViewAll = () => {
    const item = response?.kpi_assessments_pending
    if (!item || !item.path || !canViewKPIAssessments) return

    handleNavigate(item.path, (item.query_params as Record<string, string>) || {})
  }

  // BE trả `/contract-evaluations/{manager,hr}` (convention BE) — ánh xạ về route FE
  // (`/contract/evaluation/{manager,hr}`) tại đây. `query_params` của BE dùng key `status`
  // (coarse), còn màn list lọc theo `display_status` (granular) nên phải chuyển đổi qua
  // `buildEvaluationListSearch`. Điều hướng "sạch" (không merge param dashboard hiện tại) để
  // link lọc đúng bằng con số trên thẻ.
  const handleInternPendingManagerViewAll = () => {
    const item = response?.intern_evaluations_pending_manager
    if (!item || !item.path || !canViewManagerEvaluations) return

    navigate(
      `${APP_PATH.CONTRACT_EVALUATION_MANAGER}?${buildEvaluationListSearch(item.query_params)}`
    )
  }

  const handleRecontractPendingManagerViewAll = () => {
    const item = response?.recontract_evaluations_pending_manager
    if (!item || !item.path || !canViewManagerEvaluations) return

    navigate(
      `${APP_PATH.CONTRACT_EVALUATION_MANAGER}?${buildEvaluationListSearch(item.query_params)}`
    )
  }

  const handleInternPendingHrViewAll = () => {
    const item = response?.intern_evaluations_pending_hr
    if (!item || !item.path || !canViewHrEvaluations) return

    navigate(`${APP_PATH.CONTRACT_EVALUATION_HR}?${buildEvaluationListSearch(item.query_params)}`)
  }

  const handleRecontractPendingHrViewAll = () => {
    const item = response?.recontract_evaluations_pending_hr
    if (!item || !item.path || !canViewHrEvaluations) return

    navigate(`${APP_PATH.CONTRACT_EVALUATION_HR}?${buildEvaluationListSearch(item.query_params)}`)
  }

  if (isLoading) {
    return <>{/* TODO: adding skeleton loading */}</>
  }

  const proposalsData = response?.proposals_to_verify
  const kpiData = response?.kpi_assessments_pending
  const internPendingMgrData = response?.intern_evaluations_pending_manager
  const recontractPendingMgrData = response?.recontract_evaluations_pending_manager
  const internPendingHrData = response?.intern_evaluations_pending_hr
  const recontractPendingHrData = response?.recontract_evaluations_pending_hr

  return (
    <>
      <Grid
        columns={{ initial: '1', sm: '2', lg: '3' }}
        gap={'4'}
        data-api={ApiPaths.hrm_dashboard_manager_realtime_retrieve}
      >
        {proposalsData && (
          <ManagerDashboardCard
            title={proposalsData.label}
            count={proposalsData.count ?? 0}
            label="Xác nhận công"
            countColor="purple"
            onViewAll={handleProposalsViewAll}
            disabled={!proposalsData.path || !canViewProposals}
          />
        )}

        {kpiData && (
          <ManagerDashboardCard
            title={kpiData.label}
            count={kpiData.count ?? 0}
            label="phiếu đánh giá"
            countColor="orange"
            onViewAll={handleKPIAssessmentsViewAll}
            disabled={!kpiData.path || !canViewKPIAssessments}
          />
        )}

        {internPendingMgrData && (
          <ManagerDashboardCard
            title={internPendingMgrData.label}
            count={internPendingMgrData.count ?? 0}
            label="phiếu"
            countColor="blue"
            onViewAll={handleInternPendingManagerViewAll}
            disabled={!internPendingMgrData.path || !canViewManagerEvaluations}
          />
        )}

        {recontractPendingMgrData && (
          <ManagerDashboardCard
            title={recontractPendingMgrData.label}
            count={recontractPendingMgrData.count ?? 0}
            label="phiếu"
            countColor="irish"
            onViewAll={handleRecontractPendingManagerViewAll}
            disabled={!recontractPendingMgrData.path || !canViewManagerEvaluations}
          />
        )}

        {internPendingHrData && (
          <ManagerDashboardCard
            title={internPendingHrData.label}
            count={internPendingHrData.count ?? 0}
            label="phiếu"
            countColor="yellow"
            onViewAll={handleInternPendingHrViewAll}
            disabled={!internPendingHrData.path || !canViewHrEvaluations}
          />
        )}

        {recontractPendingHrData && (
          <ManagerDashboardCard
            title={recontractPendingHrData.label}
            count={recontractPendingHrData.count ?? 0}
            label="phiếu"
            countColor="red"
            onViewAll={handleRecontractPendingHrViewAll}
            disabled={!recontractPendingHrData.path || !canViewHrEvaluations}
          />
        )}
      </Grid>
    </>
  )
}

export default ManagerDashboardCards
