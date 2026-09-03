import { Link } from 'react-router-dom'
import { Text } from '@radix-ui/themes'
import { IconEye, IconWarningcircle } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { formatDate } from '@/utils/date-utils'
import type { components } from '@/api/schema'

type ConflictingWorkday = components['schemas']['ConflictingWorkday']

type ProposalConflictingWorkdaysProps = {
  conflictingWorkdays?: ConflictingWorkday[] | null
}

const ProposalConflictingWorkdays = ({ conflictingWorkdays }: ProposalConflictingWorkdaysProps) => {
  if (!conflictingWorkdays || conflictingWorkdays.length === 0) {
    return null
  }

  return (
    <div className="border-border-1 bg-data-yellow-disabled/40 flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center gap-2">
        <IconWarningcircle className="text-data-yellow-hover shrink-0" size={18} />
        <Text className="typo-body-base-semibold text-content-dark-1">
          Danh sách ngày công bị xung đột
        </Text>
      </div>
      <div className="flex flex-col gap-2">
        {conflictingWorkdays.map((workday) => (
          <div
            key={workday.timesheet_entry_id}
            className="bg-background-1 flex items-center justify-between rounded px-3 py-2"
          >
            <Text className="text-content-dark-1 typo-body-base">{formatDate(workday.date)}</Text>
            <Link
              to={APP_PATH.ATTENDANCE_TIMESHEET_DETAIL.replace(
                ':entryId',
                String(workday.timesheet_entry_id)
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-dark-2 hover:text-content-dark-1 flex items-center gap-1"
              title="Xem chi tiết ngày công"
            >
              <IconEye size={16} />
              <span className="typo-body-sm-medium">Xem chi tiết</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProposalConflictingWorkdays
