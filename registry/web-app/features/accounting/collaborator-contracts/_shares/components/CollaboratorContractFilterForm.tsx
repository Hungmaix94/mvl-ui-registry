import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'

import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  collaboratorContractFilterSchema,
  type CollaboratorContractFilterValues,
  DEFAULT_CONTRACT_FILTER_VALUES,
  ContractStatus,
} from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'

export type CollaboratorContractFilterFormRef = {
  clearForm: () => void
  getValues: () => CollaboratorContractFilterValues
}

type CollaboratorContractFilterFormProps = {
  initialValues?: Partial<CollaboratorContractFilterValues>
}

const toDate = (value: Date | string | null | undefined): Date | undefined => {
  if (!value) return undefined
  if (value instanceof Date) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

const CollaboratorContractFilterForm = forwardRef<
  CollaboratorContractFilterFormRef,
  CollaboratorContractFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.STATUS_CHOICES],
  })
  const statusLabels = keysMap.get(APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.STATUS_CHOICES) as
    | Record<string, string>
    | undefined

  const statusOptions = [
    { value: ContractStatus.draft, label: statusLabels?.[ContractStatus.draft] ?? 'Bản nháp' },
    { value: ContractStatus.signed, label: statusLabels?.[ContractStatus.signed] ?? 'Đã ký' },
    {
      value: ContractStatus.cancelled,
      label: statusLabels?.[ContractStatus.cancelled] ?? 'Đã hủy',
    },
  ]

  const { register, control, handleSubmit, reset, getValues, watch, setValue } =
    useForm<CollaboratorContractFilterValues>({
      resolver: zodResolver(collaboratorContractFilterSchema) as any,
      defaultValues: {
        ...DEFAULT_CONTRACT_FILTER_VALUES,
        ...initialValues,
      },
    })

  useEffect(() => {
    reset({ ...DEFAULT_CONTRACT_FILTER_VALUES, ...initialValues })
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_CONTRACT_FILTER_VALUES)
        setFormKey((k) => k + 1)
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  const onSubmit = useCallback(() => {
    // submission handled by parent dialog via ref
  }, [])

  const signedDateFrom = watch('signed_date_from')
  const signedDateTo = watch('signed_date_to')

  const dateRangeValue: DateRange | undefined = (() => {
    const from = toDate(signedDateFrom as Date | string | null | undefined)
    const to = toDate(signedDateTo as Date | string | null | undefined)
    if (!from && !to) return undefined
    return { from, to }
  })()

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined | null) => {
      setValue('signed_date_from', range?.from ?? null)
      setValue('signed_date_to', range?.to ?? null)
    },
    [setValue]
  )

  return (
    <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <FormController
          key={`status-${formKey}`}
          register={register}
          name="status"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Trạng thái',
            options: statusOptions,
            placeholder: 'Chọn trạng thái',
            isClearable: true,
          }}
        />

        <FormController
          key={`collaborator-${formKey}`}
          register={register}
          name="collaborator"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Cộng tác viên',
            placeholder: 'Chọn cộng tác viên',
            loadOptions: loadCollaboratorOptions,
            loadInitialOptions: loadInitialCollaboratorOptions,
            enableSearch: true,
            isClearable: true,
          }}
        />

        <DateRangePicker
          key={`signed-date-${formKey}`}
          label="Ngày ký"
          value={dateRangeValue}
          onChange={handleDateRangeChange}
        />
      </Flex>
    </Form>
  )
})

CollaboratorContractFilterForm.displayName = 'CollaboratorContractFilterForm'

export default CollaboratorContractFilterForm
