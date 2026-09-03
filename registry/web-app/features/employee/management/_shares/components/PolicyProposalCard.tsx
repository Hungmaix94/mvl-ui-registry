import { Flex, Separator } from '@radix-ui/themes'
import type { components } from '@/api/schema'
import { formatCurrencyVND } from '@/utils'
import { formatDate } from '@/utils/date-utils'

type PolicyProposal = components['schemas']['PolicyProposal']

type PolicyProposalCardProps = {
  recruitmentCandidateId: number | null
  isLoading: boolean
  policyProposal: PolicyProposal | undefined
  employeeTypeLabel: string
}

type FieldColumnProps = {
  label: string
  value: string
  className?: string
}

function FieldColumn({ label, value, className }: FieldColumnProps) {
  return (
    <Flex direction="column" title={value} className={className}>
      <b className="text-content-dark-3">{label}</b>
      <span>{value}</span>
    </Flex>
  )
}

export default function PolicyProposalCard({
  recruitmentCandidateId,
  isLoading,
  policyProposal,
  employeeTypeLabel,
}: PolicyProposalCardProps) {
  if (!recruitmentCandidateId) {
    return (
      <div className="typo-body-sm-regular text-content-dark-3">Không có ứng viên liên kết</div>
    )
  }

  if (isLoading) {
    return (
      <div className="typo-body-sm-regular text-content-dark-3 dot-loader">Đang tải đề xuất...</div>
    )
  }

  if (!policyProposal) {
    return null
  }

  const hasOldOrg =
    policyProposal.old_department?.name ||
    policyProposal.old_branch?.name ||
    policyProposal.old_block?.name

  return (
    <div className="bg-data-light-grey-default border-border-1 rounded-md border border-solid p-4">
      <div className="typo-body-sm-medium text-content-dark-1 flex flex-col gap-2">
        <div className="grid w-full grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
          <FieldColumn label="Loại NV" value={employeeTypeLabel} />
          <FieldColumn label="Chức vụ" value={policyProposal.job_title || '-'} />
          <FieldColumn
            label="Giữ thâm niên"
            value={
              policyProposal.keep_seniority == null
                ? 'Không'
                : policyProposal.keep_seniority
                  ? 'Có'
                  : 'Không'
            }
          />
        </div>

        <div className="grid w-full grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
          <FieldColumn
            label="Mức lương cơ bản"
            value={policyProposal.base_salary ? formatCurrencyVND(policyProposal.base_salary) : '-'}
          />
          <FieldColumn
            label="Ngày bắt đầu trạng thái"
            value={
              policyProposal.policy_start_date ? formatDate(policyProposal.policy_start_date) : '-'
            }
          />
          <FieldColumn label="Ghi chú" value={policyProposal.note || '-'} />
        </div>

        <div className="grid w-full grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
          <FieldColumn
            label="Phầm trăm lương thực nhận trong thời gian thử việc"
            value={
              policyProposal.base_salary_percentage
                ? `${policyProposal.base_salary_percentage}%`
                : '-'
            }
          />
          <FieldColumn
            label="Ngày kết thúc trạng thái"
            value={
              policyProposal.policy_end_date ? formatDate(policyProposal.policy_end_date) : '-'
            }
          />
          <span />
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
          <FieldColumn label="Chi nhánh mới" value={policyProposal.branch?.name || '-'} />
          <FieldColumn label="Khối mới" value={policyProposal.block?.name || '-'} />
          <FieldColumn label="Phòng ban mới" value={policyProposal.department?.name || '-'} />
        </div>

        {!!hasOldOrg && (
          <>
            <Separator orientation={'horizontal'} className={'!w-full'} />
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
              <FieldColumn label="Chi nhánh cũ" value={policyProposal.old_branch?.name || '-'} />
              <FieldColumn label="Khối cũ" value={policyProposal.old_block?.name || '-'} />
              <FieldColumn
                label="Phòng ban cũ"
                value={policyProposal.old_department?.name || '-'}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
