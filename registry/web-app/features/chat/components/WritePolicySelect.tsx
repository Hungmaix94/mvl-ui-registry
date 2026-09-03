import React, { useMemo } from 'react'
import Select, { type SelectProps, type SelectOption } from '@/components/ui/select/Select'
import useAppConstant from '@/hooks/useAppConstant'
import { WRITE_POLICY_OPTIONS_KEY } from '@/features/chat/constants'

export type WritePolicySelectProps = Omit<SelectProps<SelectOption>, 'options'>

export const WritePolicySelect: React.FC<WritePolicySelectProps> = (props) => {
  const { keysMapOptions } = useAppConstant({
    module: 'chat',
    keys: [WRITE_POLICY_OPTIONS_KEY],
  })

  const options = useMemo(() => {
    return keysMapOptions.get(WRITE_POLICY_OPTIONS_KEY) || []
  }, [keysMapOptions])

  return <Select {...props} options={options} />
}
