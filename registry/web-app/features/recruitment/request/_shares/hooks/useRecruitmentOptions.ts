import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'

export default function useRecruitmentOptions() {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE, APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS],
  })

  const recruitmentTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE) || []
      : []
  }, [keysMapOptions])

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS) || []
      : []
  }, [keysMapOptions])

  return {
    recruitmentTypeOptions,
    statusOptions,
  }
}
