import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Select, TextField } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  accountingPeriodFilterSchema,
  type AccountingPeriodFilterValues,
  DEFAULT_ACCOUNTING_PERIOD_FILTER_VALUES,
} from '@/features/accounting/accounting-periods/types/accounting-period-types'
import useAppConstant from '@/hooks/useAppConstant'

export type AccountingPeriodFilterFormRef = {
  clearForm: () => void
  getValues: () => AccountingPeriodFilterValues
}

type AccountingPeriodFilterFormProps = {
  initialValues?: Partial<AccountingPeriodFilterValues>
}

const AccountingPeriodFilterForm = forwardRef<
  AccountingPeriodFilterFormRef,
  AccountingPeriodFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)

  const { keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.ACCOUNTING_PERIOD_STATUS],
  })

  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.ACCOUNTING_PERIOD_STATUS) || [],
    [keysMapOptions]
  )

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: `Tháng ${i + 1}`,
      })),
    []
  )

  const { register, control, handleSubmit, reset, getValues } =
    useForm<AccountingPeriodFilterValues>({
      resolver: zodResolver(accountingPeriodFilterSchema),
      defaultValues: {
        ...DEFAULT_ACCOUNTING_PERIOD_FILTER_VALUES,
        ...initialValues,
      },
    })

  useEffect(() => {
    reset({ ...DEFAULT_ACCOUNTING_PERIOD_FILTER_VALUES, ...initialValues })
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_ACCOUNTING_PERIOD_FILTER_VALUES)
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
          key={`year-${formKey}`}
          register={register}
          name="year"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Năm',
            type: 'number',
            placeholder: 'VD: 2026',
          }}
        />
        <FormController
          key={`month-${formKey}`}
          register={register}
          name="month"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Tháng',
            options: monthOptions,
            placeholder: 'Tất cả tháng',
            clearable: true,
          }}
        />
        <FormController
          key={`status-${formKey}`}
          register={register}
          name="status"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Trạng thái',
            options: statusOptions,
            placeholder: 'Tất cả trạng thái',
            clearable: true,
          }}
        />
      </Flex>
    </Form>
  )
})

AccountingPeriodFilterForm.displayName = 'AccountingPeriodFilterForm'

export default AccountingPeriodFilterForm
