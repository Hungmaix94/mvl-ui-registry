import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'

export type PayrollPeriodFilterFormRef = {
  clearForm: () => void
  getValues: () => PayrollPeriodFilterFormValues
}

type PayrollPeriodFilterFormProps = {
  initialValues?: PayrollPeriodFilterFormValues
}

export type PayrollPeriodFilterFormValues = {
  month?: Date
}

const Schema = z.object({
  month: z.date().optional(),
})

const PayrollPeriodFilterForm = forwardRef<
  PayrollPeriodFilterFormRef,
  PayrollPeriodFilterFormProps
>(({ initialValues }, ref) => {
  const { control, reset, getValues } = useForm<PayrollPeriodFilterFormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      month: initialValues?.month,
    },
  })

  // Reset form when initialValues change
  useEffect(() => {
    reset({
      month: initialValues?.month,
    })
  }, [initialValues, reset])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        month: undefined,
      })
    },
    getValues: () => {
      return getValues()
    },
  }))

  return (
    <Flex direction="column" gap="5">
      <Controller
        control={control}
        name="month"
        render={({ field }) => (
          <MonthPicker
            label="Kỳ lương"
            value={field.value}
            onChange={field.onChange}
            placeholder="Chọn tháng"
          />
        )}
      />
    </Flex>
  )
})

PayrollPeriodFilterForm.displayName = 'PayrollPeriodFilterForm'

export default PayrollPeriodFilterForm
