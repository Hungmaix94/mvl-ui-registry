import { Flex, Separator } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability.ts'
import TimesheetStatisticCard from '@/features/dashboard/components/timesheet/TimesheetStatisticCard.tsx'
import ManagerDashboardCards from '@/features/dashboard/components/manager/ManagerDashboardCards.tsx'
import AttendanceRateByBranchChart from '@/features/dashboard/components/chart/AttendanceRateByBranchChart.tsx'
import ProposalsOverduePieChart from '@/features/dashboard/components/chart/ProposalsOverduePieChart.tsx'
import OverdueProposalsByBranchChart from '@/features/dashboard/components/chart/OverdueProposalsByBranchChart.tsx'
import OverdueProposalsByBranchMonthlyChart from '@/features/dashboard/components/chart/OverdueProposalsByBranchMonthlyChart.tsx'
import { cn } from '@/utils'
import { useMemo } from 'react'

const TimesheetDashboard = () => {
  const ability = useAbility()

  const isShowRecruitmentReports = useMemo(
    () => ability.can('attendance_statistics', 'hrm.dashboard.common'),
    [ability]
  )
  const isShowAttendanceByBranchRate = useMemo(
    () => ability.can('by_branch_rate', 'recruitment_reports'),
    [ability]
  )
  const isShowManagerCards = useMemo(
    () => ability.can('realtime', 'hrm.dashboard.manager'),
    [ability]
  )
  const isShowProposalsOverdueChart = useMemo(
    () => ability.can('overdue_proposals_statistics', 'hrm.dashboard.common'),
    [ability]
  )
  const isShowOverdueProposalsByBranch = useMemo(
    () => ability.can('overdue_proposals_by_branch', 'hrm.dashboard.common'),
    [ability]
  )
  const isShowOverdueProposalsByBranchMonthly = useMemo(
    () => ability.can('overdue_proposals_by_branch_monthly', 'hrm.dashboard.common'),
    [ability]
  )
  // Only split into two columns when BOTH funnel charts render; with a single
  // chart, a 2-col grid would leave it half-width with an empty right column.
  const showBothOverdueCharts =
    isShowOverdueProposalsByBranch && isShowOverdueProposalsByBranchMonthly

  if (
    !isShowRecruitmentReports &&
    !isShowAttendanceByBranchRate &&
    !isShowManagerCards &&
    !isShowProposalsOverdueChart &&
    !isShowOverdueProposalsByBranch &&
    !isShowOverdueProposalsByBranchMonthly
  )
    return null

  return (
    <>
      <Flex direction={'column'} justify={'between'} className={'gap-7 p-10 pt-6 pb-0'}>
        <Flex direction={'column'} align={'start'} gap={'2'}>
          <h1 className="text-2xl font-bold">Chấm công</h1>
        </Flex>
        {isShowRecruitmentReports && <TimesheetStatisticCard />}
        {isShowAttendanceByBranchRate && <AttendanceRateByBranchChart />}
        {isShowManagerCards && <ManagerDashboardCards />}
        {isShowProposalsOverdueChart && <ProposalsOverduePieChart />}
        {(isShowOverdueProposalsByBranch || isShowOverdueProposalsByBranchMonthly) && (
          <div
            className={cn(
              'grid w-full grid-cols-1 gap-7',
              showBothOverdueCharts && 'xl:grid-cols-2'
            )}
          >
            {isShowOverdueProposalsByBranch && <OverdueProposalsByBranchChart />}
            {isShowOverdueProposalsByBranchMonthly && <OverdueProposalsByBranchMonthlyChart />}
          </div>
        )}
        <Separator orientation={'horizontal'} className={'!w-full'} />
      </Flex>
    </>
  )
}

export default TimesheetDashboard
