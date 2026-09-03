import { useMemo } from 'react'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'
import type { AttendanceRecord } from '@/features/attendance/services/attendance-record-service'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

type AttendanceConfirmationStatusBadgeProps = {
  status?: AttendanceRecord['colored_confirmation_status']
}

const AttendanceConfirmationStatusBadge = ({ status }: AttendanceConfirmationStatusBadgeProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_CONFIRMATION_STATUS],
  })

  const confirmationStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_CONFIRMATION_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_CONFIRMATION_STATUS) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  const statusVariant = useMemo(() => {
    if (!status?.variant) return ColoredValueVariant.GREY
    return status.variant as ColoredValueVariant
  }, [status?.variant])

  const statusLabel = useMemo(() => {
    if (!status?.value) return undefined
    return confirmationStatusMapping[status.value] || status.value
  }, [status?.value, confirmationStatusMapping])

  if (!status || !statusLabel || !statusVariant) {
    return <span className="typo-body-sm-medium text-content-dark-2">-</span>
  }

  return <Chip label={statusLabel} variant={statusVariant} type="outlined" size="small" />
}

export default AttendanceConfirmationStatusBadge
