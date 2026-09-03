import { Text } from '@radix-ui/themes'
import type { ProposalTimesheetEntryComplaint } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { useMemo } from 'react'

type ComplaintInfoSectionProps = {
  complaint?: ProposalTimesheetEntryComplaint
}

const ComplaintAttachmentSection = ({ complaint }: ComplaintInfoSectionProps) => {
  const complaintImages = useMemo(
    () =>
      complaint?.timesheet_entry_complaint_complaint_images
        ?.filter((item) => !!item)
        .map((item) => item?.view_url),
    [complaint?.timesheet_entry_complaint_complaint_images]
  )

  return (
    <section className="flex flex-col gap-5">
      <Text className="typo-body-xl-semibold text-content-dark-1">Tệp đính kèm</Text>
      <div className="flex flex-wrap gap-3">
        {complaintImages && complaintImages.length > 0 ? (
          complaintImages.map((i, j) => (
            <img
              key={`${j}-${i}`}
              src={i}
              alt="Complaint timesheet attachment"
              className="border-border-1 h-fit max-w-[300px] rounded border"
            />
          ))
        ) : (
          <Text className="typo-body-md-regular text-content-dark-3">Không có tệp đính kèm</Text>
        )}
      </div>
    </section>
  )
}

export default ComplaintAttachmentSection
