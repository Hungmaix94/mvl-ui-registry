import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export function useProposalStatusMapping(): Record<string, string> {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES],
  })

  const statusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  return statusMapping
}
