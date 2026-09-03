import { useMemo } from 'react'
import { Text } from '@radix-ui/themes'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import { format, parseISO } from 'date-fns'
import { DATE_FORMAT, TIME_FORMAT } from '@/constants/date-format.ts'
import { cn, formatNumber } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { IconPencil } from '@/assets/icons'
import { TimesheetEntryEditDialogContent } from './TimesheetEntryEditDialog'
import { useDialogStore } from '@/store/dialog-store'
import {
  type TimeSheetEntryDetail,
  useUpdateTimesheetEntry,
  type TimeSheetEntryUpdateRequest,
} from '@/features/attendance/services/timesheet-service'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'
import { useQueryClient } from '@tanstack/react-query'
import { DailyTimesheetStatus } from '@/constants/api-schema-aliases'

type TimesheetEntryInfoSectionProps = {
  entry?: TimeSheetEntryDetail
}

const STATUS_CLASSNAME_CONFIG: Record<DailyTimesheetStatus, string> = {
  on_time: 'bg-green-10 text-data-green-default',
  not_on_time: 'bg-data-yellow-disabled text-data-yellow-hover',
  absent: 'bg-red-10 text-data-red-default',
  single_punch: 'bg-data-yellow-disabled text-data-yellow-hover',
  not_checked_in: 'bg-neutral-20 text-neutral-70',
}

const TimesheetEntryInfoSection = ({ entry }: TimesheetEntryInfoSectionProps) => {
  const { openDialog, closeDialog, setLoading } = useDialogStore()
  const updateTimesheetEntry = useUpdateTimesheetEntry()
  const ability = useAbility()
  const canUpdate = ability.can('update', 'timesheet')
  const queryClient = useQueryClient()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.TIMESHEET_STATUS, APP_CONSTANT_KEY.HRM.TIMESHEET_DAY_TYPE],
  })

  const timesheetStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.TIMESHEET_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.TIMESHEET_STATUS) as Record<string, string> | null) || {}
      : {}
  }, [keysMap])
  const timesheetDayTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.TIMESHEET_DAY_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.TIMESHEET_DAY_TYPE) as Record<string, string> | null) ||
          {}
      : {}
  }, [keysMap])

  const payrollStatus = entry?.payroll_status || '-'
  const formattedCheckInStart = formatDateTime(entry?.check_in_time)
  const formattedCheckInEnd = formatDateTime(entry?.check_out_time)
  const formattedStartAccepted = formatDateTime(entry?.start_time)
  const formattedEndAccepted = formatDateTime(entry?.end_time)
  const workDate = formatDateOnly(entry?.date)
  const workedDays = formatDecimal(entry?.working_days || '')
  const overtimeHours = formatDecimal(entry?.overtime_hours || '')
  const dayType = timesheetDayTypeMapping[entry?.day_type || ''] || '-'
  const note = entry?.note || '-'
  const hasConflict = !!entry?.has_leave_attendance_conflict

  const statusLabel = useMemo(() => {
    if (!entry?.status) return undefined
    return timesheetStatusMapping[entry.status] || undefined
  }, [entry?.status, timesheetStatusMapping])

  const statusClassName = useMemo(() => {
    if (!entry?.status) return undefined
    return STATUS_CLASSNAME_CONFIG[entry.status] || undefined
  }, [entry?.status])

  const handleOpenEditDialog = () => {
    if (!entry) return

    const handleSubmit = async (data: TimeSheetEntryUpdateRequest) => {
      if (!entry.id) return

      try {
        setLoading(true)

        // Wait for mutation to complete and queries to be invalidated
        await updateTimesheetEntry.mutateAsync({
          id: entry.id,
          data: data,
        })

        // Wait for invalidated queries to refetch
        await queryClient.refetchQueries({
          queryKey: ['hrm', 'timesheet-entries', 'detail', entry.id],
        })

        toastService.success('Cập nhật giờ ra - vào ghi nhận thành công')
        closeDialog()
      } catch (error: any) {
        handleApiError(error)
        throw error
      } finally {
        setLoading(false)
      }
    }

    openDialog({
      title: 'Chỉnh sửa giờ ra - vào ghi nhận',
      content: <TimesheetEntryEditDialogContent entry={entry} onSubmit={handleSubmit} />,
      size: 'md',
      confirmText: 'Lưu thay đổi',
      cancelText: 'Hủy',
      onConfirm: async () => {
        // Call the submit handler stored in window
        if ((window as any).__timesheetEditDialogSubmit) {
          await (window as any).__timesheetEditDialogSubmit()
        }
      },
      onCancel: () => {
        // Clean up
        delete (window as any).__timesheetEditDialogSubmit
      },
      onClose: () => {
        // Clean up on close
        delete (window as any).__timesheetEditDialogSubmit
      },
    })
  }

  return (
    <section className="flex flex-col gap-1">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chấm công</Text>
      <div className="bg-background-1 flex flex-col py-0">
        <RecordDetail
          label="Trạng thái"
          content={
            statusLabel && statusClassName ? (
              <span
                className={cn(
                  'typo-body-sm-medium inline-flex items-center rounded-full px-2 py-1',
                  statusClassName
                )}
              >
                {statusLabel}
              </span>
            ) : (
              '-'
            )
          }
        />
        <RecordDetail label="Trạng thái tính lương" content={payrollStatus} />
        <RecordDetail
          label="Trạng thái xung đột"
          content={
            <span
              className={cn(
                'typo-body-sm-medium inline-flex items-center rounded-full px-2 py-1',
                hasConflict
                  ? 'bg-data-red-disabled text-data-red-default'
                  : 'bg-background-2 text-content-dark-2'
              )}
            >
              {hasConflict ? 'Có xung đột' : 'Không xung đột'}
            </span>
          }
        />
        <RecordDetail
          label="Giờ vào - ra ca"
          content={`${formattedCheckInStart} - ${formattedCheckInEnd}`}
        />
        <RecordDetail
          label="Giờ ra - vào ghi nhận"
          content={
            <div className="flex flex-1 items-center justify-between">
              <span>{`${formattedStartAccepted} - ${formattedEndAccepted}`}</span>
              {canUpdate && (
                <button
                  onClick={handleOpenEditDialog}
                  className="hover:bg-background-2 flex items-center justify-center rounded-md p-2 transition-colors"
                  title="Chỉnh sửa giờ ra - vào"
                >
                  <IconPencil className="text-content-dark-2 h-4 w-4" />
                </button>
              )}
            </div>
          }
        />
        <RecordDetail label="Ghi chú" isRichText content={note} />
        <RecordDetail label="Ngày công" content={workDate} />
        <RecordDetail label="Loại ngày công" content={dayType} />
        <RecordDetail label="Giá trị ngày công" content={workedDays} />
        <RecordDetail label="Giờ OT được tính" content={overtimeHours} isShowSeparator={false} />
      </div>
    </section>
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  try {
    return format(new Date(value), TIME_FORMAT)
  } catch {
    return '-'
  }
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-'
  try {
    return format(parseISO(value), DATE_FORMAT)
  } catch {
    return '-'
  }
}

function formatDecimal(value?: string | null) {
  if (!value) return '-'
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return '-'
  }
  return Number.isInteger(numericValue)
    ? formatNumber(numericValue)
    : formatNumber(numericValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default TimesheetEntryInfoSection
