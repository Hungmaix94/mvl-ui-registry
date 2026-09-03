import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

/**
 * Maps a proposal verify-status value (pending / verified / not_verified) to its
 * server-provided Vietnamese label. Shares the same constant source as the
 * "Trạng thái xác nhận" filter so column labels and filter options stay in sync.
 */
export function useProposalVerifyStatusMapping(): Record<string, string> {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES],
  })

  const verifyStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  return verifyStatusMapping
}
