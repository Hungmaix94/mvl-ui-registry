import { useState, useImperativeHandle, forwardRef } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { TextArea, TimePicker } from '@/components/ui'
import { type ProposalTimesheetEntryComplaint } from '@/features/decision-and-proposal/services/proposal-misc-service'

export type ApproveComplaintDialogContentRef = {
  getData: () => {
    approved_check_in_time: string
    approved_check_out_time: string
    approval_note?: string | null
  } | null
}

type ApproveComplaintDialogContentProps = {
  complaint: ProposalTimesheetEntryComplaint
}

const ApproveComplaintDialogContent = forwardRef<
  ApproveComplaintDialogContentRef,
  ApproveComplaintDialogContentProps
>(({ complaint }, ref) => {
  const [approvedCheckInTime, setApprovedCheckInTime] = useState(
    complaint.timesheet_entry_complaint_approved_check_in_time ||
      complaint.timesheet_entry_complaint_proposed_check_in_time?.slice(0, 5) ||
      '08:00'
  )
  const [approvedCheckOutTime, setApprovedCheckOutTime] = useState(
    complaint.timesheet_entry_complaint_approved_check_out_time ||
      complaint.timesheet_entry_complaint_proposed_check_out_time?.slice(0, 5) ||
      '18:00'
  )
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ checkIn?: string; checkOut?: string }>({})

  const proposedCheckInTime =
    complaint.timesheet_entry_complaint_proposed_check_in_time?.slice(0, 5) || '-'
  const proposedCheckOutTime =
    complaint.timesheet_entry_complaint_proposed_check_out_time?.slice(0, 5) || '-'

  useImperativeHandle(ref, () => ({
    getData: () => {
      const newErrors: { checkIn?: string; checkOut?: string } = {}

      if (!approvedCheckInTime) {
        newErrors.checkIn = 'Vui lòng chọn giờ vào được duyệt'
      }

      if (!approvedCheckOutTime) {
        newErrors.checkOut = 'Vui lòng chọn giờ ra được duyệt'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return null
      }

      setErrors({})
      return {
        approved_check_in_time: `${approvedCheckInTime}:00`,
        approved_check_out_time: `${approvedCheckOutTime}:00`,
        approval_note: note.trim() || null,
      }
    },
  }))

  return (
    <div className="flex w-full flex-col items-start justify-center gap-5 overflow-clip">
      <Flex gap="5" align="start" className="w-full">
        <div className="flex flex-1 flex-col items-start gap-2">
          <div className="flex w-full flex-col items-start gap-1">
            <div className="flex items-center justify-center gap-0.5">
              <Text className="typo-body-base-semibold text-content-dark-2">Giờ vào đề xuất</Text>
            </div>
          </div>
          <div className="bg-data-light-grey-disabled border-data-light-grey-disabled flex w-full items-center gap-3 rounded border px-3 py-2.5">
            <div className="flex-1">
              <Text className="typo-body-base-regular text-content-light-4">
                {proposedCheckInTime}
              </Text>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-start gap-2">
          <div className="flex w-full flex-col items-start gap-1">
            <div className="flex items-center justify-center gap-0.5">
              <Text className="typo-body-base-semibold text-content-dark-2">Giờ ra đề xuất</Text>
            </div>
          </div>
          <div className="bg-data-light-grey-disabled border-data-light-grey-disabled flex w-full items-center gap-3 rounded border px-3 py-2.5">
            <div className="flex-1">
              <Text className="typo-body-base-regular text-content-light-4">
                {proposedCheckOutTime}
              </Text>
            </div>
          </div>
        </div>
      </Flex>

      <Flex gap="5" align="start" className="w-full">
        <TimePicker
          label="Giờ vào được duyệt"
          value={approvedCheckInTime}
          onChange={setApprovedCheckInTime}
          wrapperClassName="flex-1"
          contentClassName="flex-1 self-start"
          error={errors.checkIn}
        />
        <TimePicker
          label="Giờ ra được duyệt"
          value={approvedCheckOutTime}
          onChange={setApprovedCheckOutTime}
          wrapperClassName="flex-1"
          contentClassName="flex-1 self-start"
          error={errors.checkOut}
        />
      </Flex>

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

ApproveComplaintDialogContent.displayName = 'ApproveComplaintDialogContent'

export default ApproveComplaintDialogContent
