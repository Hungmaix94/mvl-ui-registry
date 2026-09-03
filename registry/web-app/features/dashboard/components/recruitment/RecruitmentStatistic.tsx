import { ApiPaths } from '@/api/schema'
import DashboardSummaryCard from '@/features/dashboard/components/card/DashboardSummaryCard.tsx'
import { IconHourglass, IconNotebook, IconUsercircleplus, IconUsersfour } from '@/assets/icons'
import { useDashboardRealtime } from '@/services'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant.ts'
import { useDashboardRealtimePermission } from '../../hooks/useDashboardRealtimePermission'

const RecruitmentStatistic = () => {
  const navigate = useNavigate()

  const canViewStatistic = useDashboardRealtimePermission('recruitment_dashboard.realtime')

  const { data, isLoading: isRealtimeLoading } = useDashboardRealtime()

  if (!canViewStatistic) {
    return null
  }

  if (isRealtimeLoading) {
    return <>{/* TODO: adding skeleton loading */}</>
  }

  return (
    <>
      <div
        className="my-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        data-api={ApiPaths.hrm_dashboard_realtime_retrieve}
      >
        <DashboardSummaryCard
          title="Số lượng nhân sự hiện tại"
          tooltip="Số lượng Nhân sự hiện tại"
          value={data?.employees_today ?? 0}
          unit="nhân sự"
          icon={<IconNotebook size={32} />}
        />
        <DashboardSummaryCard
          title="Số lượng nhân sự cần tuyển"
          tooltip="Số lượng Nhân sự cần tuyển"
          value={data?.open_positions ?? 0}
          unit="nhân sự"
          icon={<IconNotebook size={32} />}
        />
        <DashboardSummaryCard
          title="Số lượng ứng tuyển"
          tooltip="Số lượng Ứng tuyển"
          value={data?.applicants_today ?? 0}
          unit="ứng viên"
          icon={<IconUsersfour size={32} />}
        />
        <DashboardSummaryCard
          title="Số lượng trúng tuyển"
          tooltip="Số lượng trúng tuyển"
          value={data?.hires_today ?? 0}
          unit="ứng viên"
          icon={<IconUsercircleplus size={32} />}
        />
        <DashboardSummaryCard
          title="Số lượng phỏng vấn trong ngày"
          tooltip="Số lượng phỏng vấn trong ngày"
          value={data?.interviews_today ?? 0}
          unit="ứng viên"
          icon={<IconHourglass size={32} />}
          onClick={() => navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE)}
        />
      </div>
    </>
  )
}

export default RecruitmentStatistic
