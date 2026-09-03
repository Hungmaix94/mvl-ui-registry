import { Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import {
  IconArrowcounterclockwise,
  IconArrowsclockwise,
  IconCheck,
  IconPencilsimple,
  IconProhibit,
} from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import type { ProjectDirectorCommissionPeriod } from '@/features/accounting/director-commissions/services/director-commission-service'
import {
  DIRECTOR_COMMISSION_ACTIONS as A,
  DIRECTOR_COMMISSION_SUBJECT as SUBJECT,
  DirectorCommissionStatus,
} from '@/features/accounting/director-commissions/constants/director-commission-constants'

type DirectorCommissionWorkflowActionsProps = {
  item: ProjectDirectorCommissionPeriod
  onEdit: (record: ProjectDirectorCommissionPeriod) => void
  onRecompute: (record: ProjectDirectorCommissionPeriod) => void
  onConfirm: (record: ProjectDirectorCommissionPeriod) => void
  onVoid: (record: ProjectDirectorCommissionPeriod) => void
  onReopen: (record: ProjectDirectorCommissionPeriod) => void
}

export default function DirectorCommissionWorkflowActions({
  item,
  onEdit,
  onRecompute,
  onConfirm,
  onVoid,
  onReopen,
}: DirectorCommissionWorkflowActionsProps) {
  const ability = useAbility()
  const isDraft = item.status === DirectorCommissionStatus.DRAFT
  const isConfirmed = item.status === DirectorCommissionStatus.CONFIRMED
  const isVoided = item.status === DirectorCommissionStatus.VOIDED

  return (
    <Flex align="center" gap="2">
      {isDraft && ability.can(A.PARTIAL_UPDATE, SUBJECT) && (
        <Button
          variant="secondary"
          size="medium"
          leftIcon={<IconPencilsimple size={16} />}
          onClick={() => onEdit(item)}
        >
          Sửa
        </Button>
      )}
      {(isDraft || isConfirmed) && ability.can(A.RECOMPUTE, SUBJECT) && (
        <Button
          variant="secondary"
          size="medium"
          leftIcon={<IconArrowsclockwise size={16} />}
          onClick={() => onRecompute(item)}
        >
          Tính lại
        </Button>
      )}
      {isDraft && ability.can(A.CONFIRM, SUBJECT) && (
        <Button size="medium" leftIcon={<IconCheck size={16} />} onClick={() => onConfirm(item)}>
          Duyệt
        </Button>
      )}
      {isConfirmed && ability.can(A.VOID, SUBJECT) && (
        <Button
          variant="primary"
          size="medium"
          leftIcon={<IconProhibit size={16} />}
          onClick={() => onVoid(item)}
        >
          Vô hiệu hoá
        </Button>
      )}
      {isVoided && ability.can(A.REOPEN, SUBJECT) && (
        <Button
          variant="secondary"
          size="medium"
          leftIcon={<IconArrowcounterclockwise size={16} />}
          onClick={() => onReopen(item)}
        >
          Mở lại
        </Button>
      )}
    </Flex>
  )
}
