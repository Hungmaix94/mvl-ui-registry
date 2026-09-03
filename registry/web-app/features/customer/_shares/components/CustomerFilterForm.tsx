import { forwardRef, useImperativeHandle, useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import {
  customerFilterSchema,
  type CustomerFilterValues,
} from '@/features/customer/_shares/schemas'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

export type CustomerFilterFormRef = {
  clearForm: () => void
  getValues: () => CustomerFilterValues
}

type CustomerFilterFormProps = {
  initialValues?: Partial<CustomerFilterValues>
}

const DEFAULT_FORM_VALUES: CustomerFilterValues = {
  customer_type: null,
}

const CustomerFilterForm = forwardRef<CustomerFilterFormRef, CustomerFilterFormProps>(
  ({ initialValues }, ref) => {
    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE],
    })

    const customerTypeOptions = useMemo(() => {
      return keysMapOptions.get(APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE) || []
    }, [keysMapOptions])

    const [formKey, setFormKey] = useState(0)

    const { register, control, handleSubmit, reset, getValues } = useForm<CustomerFilterValues>({
      resolver: zodResolver(customerFilterSchema),
      defaultValues: {
        ...DEFAULT_FORM_VALUES,
        ...initialValues,
      },
    })

    useEffect(() => {
      reset({ ...DEFAULT_FORM_VALUES, ...initialValues })
      setFormKey((k) => k + 1)
    }, [initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          reset(DEFAULT_FORM_VALUES)
          setFormKey((k) => k + 1)
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = useCallback(() => {
      // Submission handled by parent via ref
    }, [])

    return (
      <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <FormController
            key={`customer-type-${formKey}`}
            register={register}
            name="customer_type"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Loại khách hàng',
              options: customerTypeOptions,
              placeholder: 'Chọn loại khách hàng',
              isClearable: true,
            }}
          />
        </Flex>
      </Form>
    )
  }
)

CustomerFilterForm.displayName = 'CustomerFilterForm'

export default CustomerFilterForm
