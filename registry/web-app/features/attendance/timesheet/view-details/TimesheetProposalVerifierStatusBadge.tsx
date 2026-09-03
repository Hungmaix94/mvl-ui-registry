import { useMemo } from 'react'
import Chip from '@/components/ui/chip/Chip.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ProposalVerifier } from '@/services'

type TimesheetProposalStatusBadgeProps = {
  status?: ProposalVerifier['colored_status']
}

const TimesheetProposalVerifierStatusBadge = ({ status }: TimesheetProposalStatusBadgeProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS],
  })

  const proposalStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  const statusLabel = useMemo(() => {
    if (!status) return undefined
    return proposalStatusMapping[status.value] || undefined
  }, [status, proposalStatusMapping])

  const statusVariant = useMemo(() => status?.variant, [status?.variant])

  if (!status || !statusLabel || !statusVariant) {
    return <span className="typo-body-sm-medium text-content-dark-2">-</span>
  }

  return <Chip label={statusLabel} variant={statusVariant} type="outlined" size="small" />
}

export default TimesheetProposalVerifierStatusBadge
