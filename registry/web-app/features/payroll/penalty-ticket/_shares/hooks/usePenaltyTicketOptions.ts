import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'

export default function usePenaltyTicketOptions() {
  const { keysMapOptions } = useAppConstant({
    module: 'payroll',
    keys: [
      APP_CONSTANT_KEY.PAYROLL.PENALTY_TICKET_STATUS,
      APP_CONSTANT_KEY.PAYROLL.PENALTY_TICKET_VIOLATION_TYPE,
    ],
  })

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.PENALTY_TICKET_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.PENALTY_TICKET_STATUS) || []
      : []
  }, [keysMapOptions])

  const violationTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.PENALTY_TICKET_VIOLATION_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.PENALTY_TICKET_VIOLATION_TYPE) || []
      : []
  }, [keysMapOptions])

  return { statusOptions, violationTypeOptions }
}
