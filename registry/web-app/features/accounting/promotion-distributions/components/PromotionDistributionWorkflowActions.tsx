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
import type { ProjectPromotionDistribution } from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import {
  PROMOTION_DISTRIBUTION_ACTIONS as A,
  PROMOTION_DISTRIBUTION_SUBJECT as SUBJECT,
  PromotionDistributionStatus,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

type PromotionDistributionWorkflowActionsProps = {
  item: ProjectPromotionDistribution
  onEdit: (record: ProjectPromotionDistribution) => void
  onRecompute: (record: ProjectPromotionDistribution) => void
  onConfirm: (record: ProjectPromotionDistribution) => void
  onVoid: (record: ProjectPromotionDistribution) => void
  onReopen: (record: ProjectPromotionDistribution) => void
}

export default function PromotionDistributionWorkflowActions({
  item,
  onEdit,
  onRecompute,
  onConfirm,
  onVoid,
  onReopen,
}: PromotionDistributionWorkflowActionsProps) {
  const ability = useAbility()
  const isDraft = item.status === PromotionDistributionStatus.DRAFT
  const isConfirmed = item.status === PromotionDistributionStatus.CONFIRMED
  const isVoided = item.status === PromotionDistributionStatus.VOIDED

  return (
    <Flex align="center" gap="2">
      {isDraft && ability.can(A.UPDATE, SUBJECT) && (
        <Button
          variant="secondary"
          size="medium"
          leftIcon={<IconPencilsimple size={16} />}
          onClick={() => onEdit(item)}
        >
          Sửa
        </Button>
      )}
      {isDraft && ability.can(A.RECOMPUTE, SUBJECT) && (
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
