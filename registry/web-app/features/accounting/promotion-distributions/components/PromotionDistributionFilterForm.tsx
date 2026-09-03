import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'

import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import type { PromotionDistributionFilterValues } from '@/features/accounting/promotion-distributions/types/promotion-distribution-types'
import { PROMOTION_DISTRIBUTION_STATUS_OPTIONS } from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

export type PromotionDistributionFilterFormRef = {
  clearForm: () => void
  getValues: () => PromotionDistributionFilterValues
}

type PromotionDistributionFilterFormProps = {
  initialValues?: Partial<PromotionDistributionFilterValues>
}

const DEFAULT_VALUES: PromotionDistributionFilterValues = {
  status: null,
}

const PromotionDistributionFilterForm = forwardRef<
  PromotionDistributionFilterFormRef,
  PromotionDistributionFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)

  const { register, control, handleSubmit, reset, getValues } =
    useForm<PromotionDistributionFilterValues>({
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
            options: PROMOTION_DISTRIBUTION_STATUS_OPTIONS,
            isClearable: true,
          }}
        />
      </Flex>
    </Form>
  )
})

PromotionDistributionFilterForm.displayName = 'PromotionDistributionFilterForm'

export default PromotionDistributionFilterForm
