import { Chip } from '@/components/ui'
import type { InterviewSchedule } from '@/features/recruitment/services/interview-service'
import { useMemo } from 'react'
import { cn } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'

interface InterviewScheduleDetailProps {
  schedule: InterviewSchedule
}

const keyInterviewType = 'InterviewSchedule_InterviewType'

export default function InterviewScheduleDetail({ schedule }: InterviewScheduleDetailProps) {
  const { keysMap } = useAppConstant({ module: 'hrm', keys: [keyInterviewType] })

  const interviewTypeMapping = useMemo(() => keysMap.get(keyInterviewType) || {}, [keysMap])

  // Format interview type display
  const formatInterviewType = () => {
    if (!schedule.interview_type) return '-'
    const typeLabel = interviewTypeMapping[schedule.interview_type] || schedule.interview_type
    return <Chip label={typeLabel} variant={ColoredValueVariant.GREY} size="small" />
  }

  // Format recruitment request display
  const formatRecruitmentRequest = () => {
    return schedule.recruitment_request?.name || '-'
  }

  // Format position display
  const formatPosition = () => {
    return schedule.recruitment_request?.position_title || '-'
  }

  const infoRows = [
    { label: 'Lịch phỏng vấn', value: schedule.title || '-' },
    { label: 'Đề nghị tuyển dụng', value: formatRecruitmentRequest() },
    { label: 'Vị trí phỏng vấn', value: formatPosition() },
    { label: 'Loại phỏng vấn', value: formatInterviewType() },
    { label: 'Địa điểm', value: schedule.location || '-' },
    { label: 'Thời gian', value: formatDate(schedule.time) },
    { label: 'Ghi chú', value: schedule.note || 'N/A' },
    // Note: created_at and updated_at are not available in the current API response
    // These would need to be added to the API or fetched separately
  ]

  return (
    <div className="flex w-full flex-col gap-5 pt-6">
      <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin lịch phỏng vấn</h2>
      <div className="flex w-full flex-col">
        {infoRows.map((row, index, arr) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-start gap-5',
              'border-border-1 border-b py-4',
              index === arr.length - 1 && 'border-b-0'
            )}
          >
            <p className="typo-body-base-medium text-content-dark-3 w-[168px]">{row.label}</p>
            <div className="typo-body-lg-regular text-content-dark-1">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
