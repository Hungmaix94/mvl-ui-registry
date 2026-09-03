import { useMemo } from 'react'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Button, Chip, Dot } from '@/components/ui'
import {
  IconCaretdown,
  IconArrowright,
  IconMailstar,
  IconLink,
  IconBagsimple,
} from '@/assets/icons'
import { Employee } from '@/services'
import { useAbility } from '@/lib/ability.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useStartWorkingDialog } from '@/features/employee/management/_shares/hooks/useStartWorkingDialog.tsx'
import { useMaternityLeaveDialog } from '@/features/employee/management/_shares/hooks/useMaternityLeaveDialog.tsx'
import { useResignationDialog } from '@/features/employee/management/_shares/hooks/useResignationDialog.tsx'
import { useTransferEmployeeActionDialog } from '@/features/employee/management/_shares/hooks/useTransferEmployeeActionDialog.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx'
import { useWelcomeEmailDialog } from '@/features/employee/management/_shares/hooks/useWelcomeEmailDialog.tsx'
import { useTerminationEmailDialog } from '@/features/employee/management/_shares/hooks/useTerminationEmailDialog.tsx'
import { useLinkCandidateDialog } from '@/features/employee/management/_shares/hooks/useLinkCandidateDialog.tsx'
import {
  useProposalsJobTransfer,
  useProposalsBulkJobTransfer,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { EmployeeStatus, JobTransferStatus } from '@/constants/api-schema-aliases'

const EmployeeActions = ({ employee }: { employee: Employee }) => {
  const ability = useAbility()
  const { openStartWorkingDialog } = useStartWorkingDialog()
  const { openMaternityLeaveDialog } = useMaternityLeaveDialog()
  const { openResignationDialog } = useResignationDialog()
  const { openTransferEmployeeDialog } = useTransferEmployeeActionDialog()
  const { openWelcomeEmailDialog } = useWelcomeEmailDialog()
  const { openTerminationEmailDialog } = useTerminationEmailDialog()
  const { openLinkCandidateDialog } = useLinkCandidateDialog()

  const canDropdown = ability.can('dropdown', 'employee')

  const { data: singleProposals } = useProposalsJobTransfer(
    {
      created_by: employee.id,
      proposal_status__in: ['pending', 'approved'],
      transfer_status: JobTransferStatus.not_transferred,
    },
    { enabled: !!canDropdown && ability.can('transfer', 'employee') }
  )

  const { data: bulkProposals } = useProposalsBulkJobTransfer(
    {
      proposal_status__in: ['pending', 'approved'],
      transfer_status: JobTransferStatus.not_transferred,
    },
    { enabled: !!canDropdown && ability.can('transfer', 'employee') }
  )

  const hasActiveProposal = useMemo(() => {
    const hasActiveSingle = (singleProposals?.results || []).some(
      (p) =>
        p.colored_proposal_status?.value === 'pending' ||
        (p.colored_proposal_status?.value === 'approved' &&
          p.job_transfer_transfer_status === 'not_transferred')
    )
    const hasActiveBulk = (bulkProposals?.results || []).some((p) =>
      (p.job_transfer_lines || []).some((line) => line.employee?.id === employee.id)
    )
    return hasActiveSingle || hasActiveBulk
  }, [singleProposals, bulkProposals, employee.id])

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE.STATUS],
  })
  const statusLabels = useMemo(
    () => (keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.STATUS) as Record<string, string>) || {},
    [keysMap]
  )

  if (!canDropdown) return null

  const handleMail = () => {
    openWelcomeEmailDialog(employee)
  }

  const currentStatus = employee.colored_status.value
  const statusVariant = employee.colored_status.variant || ColoredValueVariant.GREY

  // Common reusable button component
  const ActionButton = ({
    label,
    onClick,
    leftIcon,
    rightDot,
    disabled = false,
  }: {
    label: string
    onClick: () => void
    leftIcon: React.ReactNode
    rightDot?: ColoredValueVariant
    disabled?: boolean
  }) => (
    <Button
      variant="text"
      className="hover:bg-background-3 flex w-full cursor-pointer items-center gap-2 px-3 py-[17.5px] text-left transition-colors"
      onClick={onClick}
      leftIcon={leftIcon}
      rightIcon={rightDot && <Dot variant={rightDot} size="small" />}
      disabled={disabled}
    >
      <span className="typo-body-base text-content-dark-1">{label}</span>
    </Button>
  )

  // Common action groups (permission-gated)
  const mailAndTransferGroup = (
    <div className="w-full">
      {ability.can('welcome_email_send', 'employee') && (
        <ActionButton
          label="Gửi mail hội nhập"
          onClick={handleMail}
          leftIcon={<IconMailstar className="text-content-dark-2 h-5 w-5" />}
        />
      )}
      {ability.can('transfer', 'employee') && (
        <ActionButton
          label="Điều chuyển công tác"
          onClick={() => openTransferEmployeeDialog(employee)}
          leftIcon={<IconBagsimple className="text-content-dark-2 h-5 w-5" />}
          disabled={hasActiveProposal}
        />
      )}
    </div>
  )

  const resignAndMaternityGroup = (
    <div className="w-full">
      {ability.can('resigned', 'employee') && (
        <ActionButton
          label="Nghỉ việc"
          onClick={() => openResignationDialog(employee)}
          leftIcon={<IconArrowright className="text-content-dark-2 h-5 w-5" />}
          rightDot={ColoredValueVariant.GREY}
        />
      )}
      {ability.can('maternity_leave', 'employee') && (
        <ActionButton
          label="Nghỉ thai sản"
          onClick={() => openMaternityLeaveDialog(employee)}
          leftIcon={<IconArrowright className="text-content-dark-2 h-5 w-5" />}
          rightDot={ColoredValueVariant.PURPLE}
        />
      )}
    </div>
  )

  // Status-based actions (permission-gated)
  const statusActions: Record<string, React.ReactNode> = {
    [EmployeeStatus.Onboarding]: (
      <>
        {ability.can('active', 'employee') && (
          <ActionButton
            label="Bắt đầu làm việc"
            onClick={() => openStartWorkingDialog(employee)}
            leftIcon={<IconArrowright className="text-content-dark-2 h-5 w-5" />}
            rightDot={ColoredValueVariant.GREEN}
          />
        )}
      </>
    ),

    [EmployeeStatus.Active]: (
      <>
        <hr className="text-border-1" />
        {mailAndTransferGroup}
        <hr className="text-border-1" />
        {resignAndMaternityGroup}
      </>
    ),

    [EmployeeStatus.Maternity_Leave]: (
      <>
        <hr className="text-border-1" />
        {mailAndTransferGroup}
        <hr className="text-border-1" />
        {ability.can('resigned', 'employee') && (
          <ActionButton
            label="Nghỉ việc"
            onClick={() => openResignationDialog(employee)}
            leftIcon={<IconArrowright className="text-content-dark-2 h-5 w-5" />}
            rightDot={ColoredValueVariant.GREY}
          />
        )}
      </>
    ),

    [EmployeeStatus.Unpaid_Leave]: (
      <>
        <hr className="text-border-1" />
        {mailAndTransferGroup}
        <hr className="text-border-1" />
        {resignAndMaternityGroup}
      </>
    ),

    [EmployeeStatus.Resigned]: (
      <>
        {ability.can('termination_email_send', 'employee') && (
          <ActionButton
            label="Gửi thư chấm dứt HĐLĐ"
            onClick={() => openTerminationEmailDialog(employee)}
            leftIcon={<IconMailstar className="text-content-dark-2 h-5 w-5" />}
          />
        )}
      </>
    ),
  }

  const renderActions = statusActions[currentStatus] || (
    <div className="text-muted-foreground px-4 py-3 text-sm">Không có thao tác khả dụng</div>
  )

  const linkCandidateSection =
    ability.can('link_candidate', 'employee') && !employee.recruitment_candidate ? (
      <ActionButton
        label="Liên kết với ứng viên"
        onClick={() => openLinkCandidateDialog(employee)}
        leftIcon={<IconLink className="text-content-dark-2 h-5 w-5" />}
      />
    ) : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="small"
          variant="secondary"
          rightIcon={<IconCaretdown className="h-3.5 w-3.5" />}
        >
          Thao tác
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="rounded-[3px] border-none bg-white p-4 shadow-lg"
      >
        <div className="flex items-center justify-between px-3 py-1 pb-3">
          <span className="text-content-dark-2 typo-body-base-semibold">Trạng thái</span>
          <Chip
            label={statusLabels[currentStatus] ?? currentStatus}
            variant={statusVariant}
            size="small"
          />
        </div>
        <div className="flex flex-col gap-2">
          {linkCandidateSection}
          {renderActions}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default EmployeeActions
