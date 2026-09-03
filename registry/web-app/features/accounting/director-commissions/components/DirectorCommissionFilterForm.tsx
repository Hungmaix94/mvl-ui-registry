import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'

import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import type { DirectorCommissionFilterValues } from '@/features/accounting/director-commissions/types/director-commission-types'
import { useDirectorCommissionConstants } from '@/features/accounting/director-commissions/hooks/useDirectorCommissionConstants'

export type DirectorCommissionFilterFormRef = {
  clearForm: () => void
  getValues: () => DirectorCommissionFilterValues
}

type DirectorCommissionFilterFormProps = {
  initialValues?: Partial<DirectorCommissionFilterValues>
}

const DEFAULT_VALUES: DirectorCommissionFilterValues = {
  status: null,
}

const DirectorCommissionFilterForm = forwardRef<
  DirectorCommissionFilterFormRef,
  DirectorCommissionFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const { statusOptions } = useDirectorCommissionConstants()

  const { register, control, handleSubmit, reset, getValues } =
    useForm<DirectorCommissionFilterValues>({
      defaultValues: { ...DEFAULT_VALUES, ...initialValues },
    })

  useEffect(() => {
    reset({ ...DEFAULT_VALUES, ...initialValues })
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_VALUES)
        setFormKey((k) => k + 1)
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  const onSubmit = useCallback(() => {}, [])

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
            placeholder: 'Chọn trạng thái',
            options: statusOptions,
            multiple: true,
            isClearable: true,
          }}
        />
      </Flex>
    </Form>
  )
})

DirectorCommissionFilterForm.displayName = 'DirectorCommissionFilterForm'

export default DirectorCommissionFilterForm
