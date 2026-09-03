import { Grid } from '@radix-ui/themes'
import { type ProposalMaternityLeave } from '@/features/decision-and-proposal/services/proposal-leave-service'
// import ProposalInfoRowStatus from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRowStatus.tsx'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import { formatDate, formatDateRangeText } from '@/utils/date-utils.ts'

type MaternityLeaveProposalInfoProps = {
  proposal: ProposalMaternityLeave
}

const MaternityLeaveProposalInfo = ({ proposal }: MaternityLeaveProposalInfoProps) => {
  const formatDateRange = () => {
    return formatDateRangeText(
      proposal.maternity_leave_start_date || undefined,
      proposal.maternity_leave_end_date || undefined
    )
  }

  const formatReplacementEmployee = () => {
    const employee = proposal.maternity_leave_replacement_employee
    if (!employee) return '-'
    const code = employee.code || ''
    const fullname = employee.fullname || ''
    return code && fullname ? `${code} - ${fullname}` : code || fullname || '-'
  }

  const formatReplacementEmployeeBranch = () => {
    const employee = proposal.maternity_leave_replacement_employee
    return employee?.branch?.name || '-'
  }

  const formatReplacementEmployeeBlock = () => {
    const employee = proposal.maternity_leave_replacement_employee
    return employee?.block?.name || '-'
  }

  const formatReplacementEmployeeDepartment = () => {
    const employee = proposal.maternity_leave_replacement_employee
    return employee?.department?.name || '-'
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
          <ProposalInfoRow
            label="Nhân viên được bàn giao công việc"
            value={formatReplacementEmployee()}
          />
          <ProposalInfoRow label="Chi nhánh" value={formatReplacementEmployeeBranch()} />
          <ProposalInfoRow label="Khối" value={formatReplacementEmployeeBlock()} />
          <ProposalInfoRow label="Phòng ban" value={formatReplacementEmployeeDepartment()} />
          <ProposalInfoRow label="Ghi chú" value={proposal.note} isLast />
        </div>
        <div className="flex flex-col pl-6">
          <ProposalInfoRow label="Ngày bắt đầu - kết thúc" value={formatDateRange()} />
          <ProposalInfoRow
            label="Ngày sinh dự kiến"
            value={formatDate(proposal.maternity_leave_estimated_due_date)}
          />
          <ProposalInfoRow label="Ngày tạo đề xuất" value={formatDate(proposal.created_at)} />
          <ProposalInfoRow
            label="Ngày cập nhật cuối cùng"
            value={formatDate(proposal.updated_at)}
            isLast
          />
        </div>
      </Grid>
    </div>
  )
}

export default MaternityLeaveProposalInfo
