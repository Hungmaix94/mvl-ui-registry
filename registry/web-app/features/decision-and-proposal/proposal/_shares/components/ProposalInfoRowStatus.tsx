import { Chip } from '@/components/ui'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import { useMemo } from 'react'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import type { Proposal } from '@/services'

const ProposalInfoRowStatus = ({ status }: { status: Proposal['colored_proposal_status'] }) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS,
    ],
  })

  const statusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS) as Record<string, string>) || {}
      : {}
  }, [keysMap])

  return (
    <>
      <ProposalInfoRow
        label="Trạng thái"
        value={
          !status ? (
            <span className="typo-body-base-regular text-content-dark-1">-</span>
          ) : (
            <Chip
              label={statusMapping[status.value] || status.value}
              variant={status.variant}
              size="small"
            />
          )
        }
      />
    </>
  )
}
export default ProposalInfoRowStatus
