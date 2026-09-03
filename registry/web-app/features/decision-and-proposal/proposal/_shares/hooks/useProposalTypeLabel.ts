import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ProposalStatus, ProposalType } from '@/constants/api-schema-aliases'

/**
 * Hook to get proposal type label from API constants
 */
export function useProposalTypeLabel(proposalType: ProposalType | ProposalStatus | null): string {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE],
  })

  const typeLabelMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE) as Record<string, string>) || {}
      : {}
  }, [keysMap])

  if (!proposalType) return '-'

  // Use API constant if available, otherwise fallback to enum value
  return typeLabelMapping[proposalType] || proposalType
}
