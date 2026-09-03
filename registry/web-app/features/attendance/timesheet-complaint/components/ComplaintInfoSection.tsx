import { Flex, Grid, Text } from '@radix-ui/themes'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import type { ProposalTimesheetEntryComplaint } from '@/features/decision-and-proposal/services/proposal-misc-service'
import TimesheetProposalStatusBadge from '@/features/attendance/timesheet/view-details/TimesheetProposalStatusBadge.tsx'
import { formatDate } from '@/utils/date-utils.ts'

type ComplaintInfoSectionProps = {
  complaint?: ProposalTimesheetEntryComplaint
}

const ComplaintInfoSection = ({ complaint }: ComplaintInfoSectionProps) => {
  const proposalDate = complaint?.timesheet_entry_complaint_complaint_date
    ? formatDate(complaint.timesheet_entry_complaint_complaint_date)
    : '-'
  const createdDate = complaint?.created_at ? formatDate(complaint.created_at) : '-'
  const lastUpdated = complaint?.updated_at ? formatDate(complaint.updated_at) : '-'

  const proposedCheckInTime = complaint?.timesheet_entry_complaint_proposed_check_in_time
    ? complaint.timesheet_entry_complaint_proposed_check_in_time.slice(0, 5)
    : '-'

  const proposedCheckOutTime = complaint?.timesheet_entry_complaint_proposed_check_out_time
    ? complaint.timesheet_entry_complaint_proposed_check_out_time.slice(0, 5)
    : '-'

  const proposedCheckInCheckoutTime = `${proposedCheckInTime} - ${proposedCheckOutTime}`
  const proposedAddress = complaint?.timesheet_entry_complaint_address || '-'

  const approvedCheckInTime = complaint?.timesheet_entry_complaint_approved_check_in_time
    ? complaint.timesheet_entry_complaint_approved_check_in_time.slice(0, 5)
    : '-'

  const approvedCheckOutTime = complaint?.timesheet_entry_complaint_approved_check_out_time
    ? complaint.timesheet_entry_complaint_approved_check_out_time.slice(0, 5)
    : '-'

  const approvedCheckInCheckOutTime = `${approvedCheckInTime} - ${approvedCheckOutTime}`

  const complaintReason = complaint?.timesheet_entry_complaint_complaint_reason || '-'
  const note = complaint?.note || '-'

  return (
    <section className="flex flex-col gap-1">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin xác nhận công</Text>
      <Grid columns={{ xs: '1', sm: '2' }} gap={'4'}>
        <Flex direction={'column'}>
          <RecordDetail label="Mã xác nhận công" content={complaint?.code || '-'} />
          <RecordDetail label="Ngày xác nhận công" content={proposalDate} />
          <RecordDetail label="Giờ vào, giờ ra đề xuất" content={proposedCheckInCheckoutTime} />
          <RecordDetail label="Vị trí" content={proposedAddress} />
          <RecordDetail label="Nội dung" content={complaintReason} isShowSeparator={false} />
        </Flex>

        <Flex direction={'column'}>
          <RecordDetail
            label="Trạng thái xác nhận công"
            content={<TimesheetProposalStatusBadge status={complaint?.colored_proposal_status} />}
          />
          <RecordDetail label="Giờ vào, giờ ra được duyệt" content={approvedCheckInCheckOutTime} />
          <RecordDetail label="Ngày tạo" content={createdDate} />
          <RecordDetail label="Ngày cập nhật cuối cùng" content={lastUpdated} />
          <RecordDetail label="Ghi chú" content={note} isShowSeparator={false} />
        </Flex>
      </Grid>
    </section>
  )
}

export default ComplaintInfoSection
