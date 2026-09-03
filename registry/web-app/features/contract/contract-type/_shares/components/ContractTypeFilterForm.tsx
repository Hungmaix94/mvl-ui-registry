import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import type { DateRange } from 'react-day-picker'
import { Flex } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select/Select'

export interface ContractTypeFilterFormValues {
  dateRange?: DateRange | null
  is_active?: string
}

const IS_ACTIVE_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export interface ContractTypeFilterFormHandle {
  clearForm: () => void
  getValues: () => ContractTypeFilterFormValues
}

export interface ContractTypeFilterFormProps {
  initialValues?: ContractTypeFilterFormValues
}

const ContractTypeFilterForm = forwardRef<
  ContractTypeFilterFormHandle,
  ContractTypeFilterFormProps
>((props, ref) => {
  const { watch, setValue, reset } = useForm<ContractTypeFilterFormValues>({
    defaultValues: props.initialValues || {
      dateRange: null,
      is_active: undefined,
    },
  })

  const dateRange = watch('dateRange')
  const isActive = watch('is_active')

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        dateRange: null,
        is_active: undefined,
      })
    },
    getValues: () => ({
      dateRange: watch('dateRange'),
      is_active: watch('is_active'),
    }),
  }))

  return (
    <Flex direction="column" gap="4">
      <Select
        label="Đang hoạt động"
        placeholder="Tất cả"
        options={IS_ACTIVE_OPTIONS}
        value={isActive ?? null}
        onChange={(value) => setValue('is_active', value == null ? undefined : String(value))}
        clearable
      />
      <DateRangePicker
        label="Ngày tạo"
        value={dateRange || undefined}
        onChange={(value: DateRange | undefined | null) => setValue('dateRange', value)}
      />
    </Flex>
  )
})

ContractTypeFilterForm.displayName = 'ContractTypeFilterForm'

export default ContractTypeFilterForm
