import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import {
  ContractStatus,
} from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

const STATUS_VARIANT_MAP: Record<string, ColoredValueVariant> = {
  [ContractStatus.draft]: ColoredValueVariant.GREY,
  [ContractStatus.signed]: ColoredValueVariant.GREEN,
  [ContractStatus.cancelled]: ColoredValueVariant.RED,
}

type ContractStatusChipProps = {
  status?: string | null
  size?: 'small' | 'large'
}

const ContractStatusChip = ({ status, size = 'small' }: ContractStatusChipProps) => {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.STATUS_CHOICES],
  })
  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.STATUS_CHOICES
  ) as Record<string, string> | undefined

  const safeStatus = status ?? ContractStatus.draft
  const label = statusLabels?.[safeStatus] ?? safeStatus

  return (
    <Chip
      variant={STATUS_VARIANT_MAP[safeStatus] ?? ColoredValueVariant.GREY}
      label={label}
      size={size}
    />
  )
}

export default ContractStatusChip
