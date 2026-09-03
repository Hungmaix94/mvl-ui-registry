import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'

export default function useRecruitmentOptions() {
  const { keysMapOptions } = useAppConstant({
    module: 'payroll',
    keys: [
      APP_CONSTANT_KEY.PAYROLL.RECOVERY_VOUCHER_VOUCHER_TYPE,
      APP_CONSTANT_KEY.PAYROLL.RECOVERY_VOUCHER_RECOVERY_VOUCHER_STATUS,
    ],
  })

  const voucherType = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.RECOVERY_VOUCHER_VOUCHER_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.RECOVERY_VOUCHER_VOUCHER_TYPE) || []
      : []
  }, [keysMapOptions])

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.RECOVERY_VOUCHER_RECOVERY_VOUCHER_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.RECOVERY_VOUCHER_RECOVERY_VOUCHER_STATUS) || []
      : []
  }, [keysMapOptions])

  return {
    voucherType,
    statusOptions,
  }
}
