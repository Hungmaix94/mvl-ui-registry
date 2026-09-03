import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardSummaryCard from '@/features/dashboard/components/card/DashboardSummaryCard.tsx'
import {
  IconCheckcircle,
  IconIdentificationcard,
  IconMappin,
  IconUsercircleplus,
  IconUsersfour,
  IconWifihigh,
  IconXcircle,
} from '@/assets/icons'
import { getDefaultDateString } from '@/features/attendance/attendance-log/hooks/useAttendanceLogFilter'
import { ApiPaths } from '@/api/schema'
import { Separator } from '@/components/ui/separator.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { cn } from '@/lib/utils.ts'
import { useHrmCommonAttendanceStatistics } from '@/features/dashboard/services/dashboard-service'
import { PAGE_SIZE } from '@/constants/table.ts'
import { APP_PATH } from '@/routes'
import { TimesheetLogMethod as AttendanceType } from '@/constants/api-schema-aliases'

const TimesheetStatisticCard = () => {
  const navigate = useNavigate()
  const { data: response, isLoading } = useHrmCommonAttendanceStatistics()

  const handleCardClick = useCallback(
    (attendanceType: AttendanceType) => {
      const params = new URLSearchParams()
      params.set('date', getDefaultDateString())
      params.set('attendance_type', attendanceType)
      params.set('page', '1')
      params.set('page_size', String(PAGE_SIZE))
      navigate(`${APP_PATH.ATTENDANCE_LOG}?${params.toString()}`)
    },
    [navigate]
  )

  const reportData = useMemo(() => {
    const data = response
    if (!data) return null

    const totalEmployee = Math.round(data.total_employee.count ?? 0)
    const hasAttendance = Math.round(data.has_attendance.count ?? 0)
    const notOnTime = Math.round(data.not_on_time.count ?? 0)

    const methodItems = data.method_breakdown.items ?? []

    const getMethodCount = (key: AttendanceType) => {
      const item = methodItems.find((methodItem) => methodItem.key === key)
      return item ? Math.round(item.count ?? 0) : 0
    }

    const device = getMethodCount(AttendanceType.biometric_device)
    const wifi = getMethodCount(AttendanceType.wifi)
    const geolocation = getMethodCount(AttendanceType.geolocation)
    const other = getMethodCount(AttendanceType.other)

    return {
      totalEmployee,
      hasAttendance,
      device,
      wifi,
      geolocation,
      other,
      notOnTime,
      totalCheckedIn: device + wifi + geolocation + other,
      hasAttendanceItem: data.has_attendance,
      notOnTimeItem: data.not_on_time,
    }
  }, [response])

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 gap-5 md:grid-cols-12"
        data-api={ApiPaths.hrm_dashboard_hrm_common_attendance_statistics_retrieve}
      >
        <div
          className={cn(
            'flex flex-col justify-between gap-6',
            'bg-background-3 p-4',
            'md:col-start-1 md:col-end-5',
            'col-start-1 col-end-12'
          )}
        >
          <div className="flex flex-1 items-start justify-between gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex items-end gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-5 w-14" />
              </div>
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
          <Separator orientation="horizontal" className="w-full" />
          <div className="flex flex-1 flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-9 w-20" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
        <div
          className={cn(
            'grid grid-cols-2 gap-5',
            'md:col-start-5 md:col-end-13',
            'col-start-1 col-end-12'
          )}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                'flex min-h-[140px] flex-col justify-between gap-[10px] rounded p-5',
                'bg-background-3'
              )}
            >
              <Skeleton className="h-5 w-32" />
              <div className="flex items-end gap-1">
                <Skeleton className="h-9 w-12" />
                <Skeleton className="h-5 w-14" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 gap-5 md:grid-cols-12"
      data-api={ApiPaths.hrm_dashboard_hrm_common_attendance_statistics_retrieve}
    >
      <div
        className={cn(
          'flex flex-col justify-between gap-6',
          'bg-background-3 p-4',
          'md:col-start-1 md:col-end-5',
          'col-start-1 col-end-12'
        )}
        title={`Số lượng nhân sự hiện tại: ${reportData?.totalEmployee ?? 0}`}
      >
        <div className="flex flex-1 items-start justify-between gap-4">
          <div className="flex h-full flex-1 flex-col justify-between gap-2">
            <p className="typo-body-base-semibold text-content-dark-1">Số lượng nhân sự hiện tại</p>
            <div className="flex items-end gap-1">
              <p className="text-3xl font-medium text-blue-600">{reportData?.totalEmployee ?? 0}</p>
              <p className="text-content-dark-3 typo-body-lg-semibold text-sm">nhân sự</p>
            </div>
          </div>

          <div className="text-action-primary-red-default flex size-8 items-center justify-center">
            <IconUsersfour size={24} />
          </div>
        </div>

        <Separator orientation={'horizontal'} className={'w-full'} />

        <div className="flex flex-1 flex-col justify-center gap-5">
          <div
            className="flex cursor-pointer items-center justify-between gap-3"
            title={`Tổng nhân sự đã chấm công: ${reportData?.hasAttendance ?? 0} nhân sự`}
            onClick={() => {
              const item = reportData?.hasAttendanceItem
              if (!item?.path) return
              const params = new URLSearchParams(
                Object.entries(item.query_params ?? {}).reduce<Record<string, string>>(
                  (acc, [key, value]) => {
                    if (value !== undefined && value !== null) {
                      acc[key] = String(value)
                    }
                    return acc
                  },
                  {}
                )
              )
              navigate(`${item.path}?${params.toString()}`)
            }}
          >
            <div className="flex items-center gap-2">
              <IconCheckcircle className="text-[var(--color-data-green-default)]" size={20} />
              <span className="typo-body-lg-medium text-content-dark-1">Chấm công</span>
            </div>
            <span className="typo-body-lg-semibold text-content-dark-3">
              <span
                className={cn(
                  'text-3xl font-medium',
                  // "typo-body-3xl-semibold",
                  'text-[var(--color-data-green-default)]'
                )}
              >
                {reportData?.hasAttendance ?? 0}
              </span>{' '}
              <span className={'text-nowrap'}>nhân sự</span>
            </span>
          </div>

          <div
            title={`Tổng nhân sự đã chấm công sai giờ: ${reportData?.notOnTime ?? 0} nhân sự\nKhông bao gồm chấm công khác chưa duyệt`}
            className="flex cursor-pointer items-center justify-between gap-3"
            onClick={() => {
              const item = reportData?.notOnTimeItem
              if (!item?.path) return
              const params = new URLSearchParams(
                Object.entries(item.query_params ?? {}).reduce<Record<string, string>>(
                  (acc, [key, value]) => {
                    if (value !== undefined && value !== null) {
                      acc[key] = String(value)
                    }
                    return acc
                  },
                  {}
                )
              )
              navigate(`${item.path}?${params.toString()}`)
            }}
          >
            <div className="flex items-center gap-2">
              <IconXcircle className="text-action-primary-red-default" size={20} />
              <span className="typo-body-lg-medium text-content-dark-1">Chấm công sai giờ</span>
            </div>
            <span className="typo-body-lg-semibold text-content-dark-3">
              <span
                className={cn(
                  'text-3xl font-medium',
                  // "typo-body-3xl-semibold",
                  'text-action-primary-red-default'
                )}
              >
                {reportData?.notOnTime ?? 0}
              </span>{' '}
              <span className={'text-nowrap'}>nhân sự</span>
            </span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-2 gap-5',
          'md:col-start-5 md:col-end-13',
          'col-start-1 col-end-12'
        )}
      >
        <DashboardSummaryCard
          title="Nhân sự chấm công vân tay"
          tooltip={`Nhân sự chấm công vân tay ${reportData?.device ?? 0} nhân sự`}
          value={reportData?.device ?? 0}
          unit="nhân sự"
          icon={<IconIdentificationcard size={24} />}
          onClick={() => handleCardClick(AttendanceType.biometric_device)}
        />
        <DashboardSummaryCard
          title="Chấm công bằng Wifi"
          tooltip={`Chấm công bằng Wifi ${reportData?.wifi ?? 0} nhân sự`}
          value={reportData?.wifi ?? 0}
          unit="nhân sự"
          icon={<IconWifihigh size={24} />}
          onClick={() => handleCardClick(AttendanceType.wifi)}
        />
        <DashboardSummaryCard
          title="Chấm công bằng GPS"
          tooltip={`Chấm công bằng GPS ${reportData?.geolocation ?? 0} nhân sự`}
          value={reportData?.geolocation ?? 0}
          unit="nhân sự"
          icon={<IconMappin size={24} />}
          onClick={() => handleCardClick(AttendanceType.geolocation)}
        />
        <DashboardSummaryCard
          title="Chấm công bằng phương thức khác"
          tooltip={`Chấm công bằng phương thức khác ${reportData?.other ?? 0} nhân sự`}
          value={reportData?.other ?? 0}
          unit="nhân sự"
          icon={<IconUsercircleplus size={24} />}
          onClick={() => handleCardClick(AttendanceType.other)}
        />
      </div>
    </div>
  )
}

export default TimesheetStatisticCard
