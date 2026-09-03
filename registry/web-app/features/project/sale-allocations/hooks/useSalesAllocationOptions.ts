import { useMemo } from 'react'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

export const useSalesAllocationOptions = () => {
  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_SOURCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_PHASE_CHOICES,
    ],
  })

  const sourceTypeOptions = useMemo(
    () =>
      keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_SOURCE_TYPE_CHOICES) ?? [],
    [keysMapOptions]
  )

  const phaseOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_PHASE_CHOICES) ?? [],
    [keysMapOptions]
  )

  const getSourceTypeLabel = (sourceValue?: string) => {
    if (!sourceValue) return '-'
    const found = sourceTypeOptions.find((opt) => opt.value === sourceValue)
    return found ? found.label : sourceValue
  }

  const getPhaseLabel = (phaseValue?: string) => {
    if (!phaseValue) return '-'
    const found = phaseOptions.find((opt) => opt.value === phaseValue)
    return found ? found.label : phaseValue
  }

  return {
    sourceTypeOptions,
    phaseOptions,
    getSourceTypeLabel,
    getPhaseLabel,
  }
}
