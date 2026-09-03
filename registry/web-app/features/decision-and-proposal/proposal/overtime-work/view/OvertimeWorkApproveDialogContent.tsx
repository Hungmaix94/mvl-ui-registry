import { useCallback, useMemo, useState, useImperativeHandle, forwardRef } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { TextArea, TimePicker } from '@/components/ui'
import { formatDate } from '@/utils/date-utils.ts'
import { formatNumber } from '@/utils/common'
import type {
  ProposalOvertimeApproveEntryRequest,
  ProposalOvertimeWork,
} from '@/features/decision-and-proposal/services/proposal-misc-service'

type OvertimeEntry = ProposalOvertimeWork['overtime_entries'][number]

export type OvertimeWorkApproveDialogContentRef = {
  getData: () => {
    approval_note: string | null
    entries: ProposalOvertimeApproveEntryRequest[]
  } | null
}

type OvertimeWorkApproveDialogContentProps = {
  entries: OvertimeEntry[]
}

type ApprovedTime = {
  start: string
  end: string
}

const DEFAULT_START = '08:00'
const DEFAULT_END = '18:00'

/** Trim a `HH:mm:ss` server time to `HH:mm` for the TimePicker. */
const toHourMinute = (value?: string | null): string => (value ? value.slice(0, 5) : '')

/** Compute duration in hours from two `HH:mm` strings, wrapping past midnight. */
const computeDurationHours = (start: string, end: string): number | null => {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null
  let diff = eh * 60 + em - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60
  return diff / 60
}

const formatHours = (hours: number | null): string =>
  hours != null ? `${formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} giờ` : '-'

type ReadOnlyFieldProps = {
  label: string
  value: string
}

const ReadOnlyField = ({ label, value }: ReadOnlyFieldProps) => (
  <div className="flex flex-1 flex-col items-start gap-2">
    <Text className="typo-body-base-semibold text-content-dark-2">{label}</Text>
    <div className="bg-data-light-grey-disabled border-data-light-grey-disabled flex w-full items-center gap-3 rounded border px-3 py-2.5">
      <Text className="typo-body-base-regular text-content-light-4">{value}</Text>
    </div>
  </div>
)

const OvertimeWorkApproveDialogContent = forwardRef<
  OvertimeWorkApproveDialogContentRef,
  OvertimeWorkApproveDialogContentProps
>(({ entries }, ref) => {
  const [approvedTimes, setApprovedTimes] = useState<ApprovedTime[]>(() =>
    entries.map((entry) => ({
      start: toHourMinute(entry.start_time ?? entry.proposal_start_time) || DEFAULT_START,
      end: toHourMinute(entry.end_time ?? entry.proposal_end_time) || DEFAULT_END,
    }))
  )
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<number, { start?: string; end?: string }>>({})

  // TimePicker re-emits its value via an internal effect whenever the `onChange` identity
  // changes; returning the SAME array reference when nothing changed breaks that loop
  // (otherwise: new array -> re-render -> new onChange -> effect -> infinite update depth).
  const handleTimeChange = useCallback((index: number, key: keyof ApprovedTime, value: string) => {
    setApprovedTimes((prev) => {
      if (prev[index]?.[key] === value) return prev
      return prev.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    })
  }, [])

  useImperativeHandle(ref, () => ({
    getData: () => {
      const nextErrors: Record<number, { start?: string; end?: string }> = {}
      approvedTimes.forEach((time, index) => {
        const fieldError: { start?: string; end?: string } = {}
        if (!time?.start) fieldError.start = 'Vui lòng chọn giờ bắt đầu'
        if (!time?.end) fieldError.end = 'Vui lòng chọn giờ kết thúc'
        if (Object.keys(fieldError).length > 0) nextErrors[index] = fieldError
      })

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        return null
      }

      setErrors({})
      return {
        approval_note: note.trim() || null,
        entries: entries.map((entry, index) => ({
          eid: entry.id,
          start_time: `${approvedTimes[index].start}:00`,
          end_time: `${approvedTimes[index].end}:00`,
        })),
      }
    },
  }))

  return (
    <div className="flex w-full flex-col items-start gap-4 overflow-clip">
      {entries.map((entry, index) => (
        <OvertimeEntryApproveRow
          key={entry.id}
          entry={entry}
          approvedTime={approvedTimes[index]}
          error={errors[index]}
          onChange={(key, value) => handleTimeChange(index, key, value)}
        />
      ))}

      <TextArea
        label="Ghi chú"
        placeholder="Nhập ghi chú"
        value={note}
        onChange={setNote}
        className="w-full"
        rows={4}
      />
    </div>
  )
})

OvertimeWorkApproveDialogContent.displayName = 'OvertimeWorkApproveDialogContent'

export default OvertimeWorkApproveDialogContent

type OvertimeEntryApproveRowProps = {
  entry: OvertimeEntry
  approvedTime: ApprovedTime
  error?: { start?: string; end?: string }
  onChange: (key: keyof ApprovedTime, value: string) => void
}

const OvertimeEntryApproveRow = ({
  entry,
  approvedTime,
  error,
  onChange,
}: OvertimeEntryApproveRowProps) => {
  const proposedStart = toHourMinute(entry.proposal_start_time ?? entry.start_time) || '-'
  const proposedEnd = toHourMinute(entry.proposal_end_time ?? entry.end_time) || '-'
  const proposedTotal = formatHours(entry.proposal_duration_hours ?? entry.duration_hours)

  const approvedTotal = useMemo(
    () => formatHours(computeDurationHours(approvedTime.start, approvedTime.end)),
    [approvedTime.start, approvedTime.end]
  )

  return (
    <div className="flex w-full flex-col gap-4 rounded-lg">
      <p className="typo-body-base-semibold text-content-dark-1">
        Ngày đề xuất: {formatDate(entry.date)}
      </p>

      {/* Thông tin nhân sự đề xuất (read-only) */}
      <div className="flex w-full flex-col gap-2">
        <p className="typo-body-sm-semibold text-content-dark-3">Thông tin nhân sự đề xuất</p>
        <Flex gap="5" align="start" className="w-full">
          <ReadOnlyField label="Giờ bắt đầu đề xuất" value={proposedStart} />
          <ReadOnlyField label="Giờ kết thúc đề xuất" value={proposedEnd} />
          <ReadOnlyField label="Tổng giờ đề xuất" value={proposedTotal} />
        </Flex>
      </div>

      {/* Thông tin HR duyệt (editable) */}
      <div className="flex w-full flex-col gap-2">
        <p className="typo-body-sm-semibold text-content-dark-3">Thông tin HR duyệt</p>
        <Flex gap="5" align="start" className="w-full">
          <TimePicker
            label="Giờ bắt đầu"
            value={approvedTime.start}
            onChange={(value) => onChange('start', value)}
            wrapperClassName="flex-1"
            contentClassName="flex-1 self-start"
            error={error?.start}
          />
          <TimePicker
            label="Giờ kết thúc"
            value={approvedTime.end}
            onChange={(value) => onChange('end', value)}
            wrapperClassName="flex-1"
            contentClassName="flex-1 self-start"
            error={error?.end}
          />
          <ReadOnlyField label="Tổng giờ" value={approvedTotal} />
        </Flex>
      </div>
    </div>
  )
}
