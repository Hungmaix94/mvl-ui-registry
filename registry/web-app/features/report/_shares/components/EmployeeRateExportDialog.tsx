import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex, Grid } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import { formatDateToServerMonth } from '@/utils/date-utils'

const MAX_MONTH_RANGE = 12

const schema = z
  .object({
    from_month: z.date({ required_error: 'Chọn từ tháng' }),
    to_month: z.date({ required_error: 'Chọn đến tháng' }),
  })
  .refine(
    (data) => {
      if (!data.from_month || !data.to_month) return true
      return data.to_month.getTime() >= data.from_month.getTime()
    },
    { message: '"Đến tháng" phải sau hoặc bằng "Từ tháng"', path: ['to_month'] }
  )
  .refine(
    (data) => {
      if (!data.from_month || !data.to_month) return true
      const months =
        (data.to_month.getFullYear() - data.from_month.getFullYear()) * 12 +
        (data.to_month.getMonth() - data.from_month.getMonth()) +
        1
      return months <= MAX_MONTH_RANGE
    },
    { message: `Khoảng tháng không được vượt quá ${MAX_MONTH_RANGE} tháng`, path: ['to_month'] }
  )

export type EmployeeRateExportFormData = z.infer<typeof schema>

export type EmployeeRateExportPayload = {
  from_month: string
  to_month: string
}

export type EmployeeRateExportDialogRef = {
  getPayload: () => Promise<EmployeeRateExportPayload | null>
}

const EmployeeRateExportDialog = forwardRef<EmployeeRateExportDialogRef>((_, ref) => {
  // Default: từ (current month - 2) → current month (3 tháng gần nhất, khớp BE default)
  const defaultValues = useMemo<EmployeeRateExportFormData>(() => {
    const today = new Date()
    const toMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const fromMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    return { from_month: fromMonth, to_month: toMonth }
  }, [])

  const {
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues: getFormValues,
  } = useForm<EmployeeRateExportFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useImperativeHandle(
    ref,
    () => ({
      getPayload: async () => {
        const valid = await trigger()
        if (!valid) return null
        const values = getFormValues()
        return {
          from_month: formatDateToServerMonth(values.from_month),
          to_month: formatDateToServerMonth(values.to_month),
        }
      },
    }),
    [trigger, getFormValues]
  )

  return (
    <Form
      loading={false}
      onSubmit={() => {
        // Submit chính do parent điều khiển qua ref.getPayload(); form này chỉ host fields.
      }}
      handleSubmit={handleSubmit as any}
    >
      <Flex direction="column" gap="3" className="px-2 py-1">
        <p className="text-content-dark-2 typo-body-sm-regular">
          Chọn khoảng tháng cần xuất (tối đa {MAX_MONTH_RANGE} tháng). Chi nhánh / khối / phòng ban
          lấy theo filter hiện tại trên trang.
        </p>
        <Grid columns="2" gap="3">
          <FormController
            register={register}
            name="from_month"
            control={control}
            Field={MonthPicker}
            fieldProps={{
              label: 'Từ tháng',
              placeholder: 'MM/YYYY',
              required: true,
              onChange: (date: Date | undefined) => {
                setValue('from_month', date as Date, { shouldDirty: true, shouldValidate: true })
              },
            }}
          />
          <FormController
            register={register}
            name="to_month"
            control={control}
            Field={MonthPicker}
            fieldProps={{
              label: 'Đến tháng',
              placeholder: 'MM/YYYY',
              required: true,
              onChange: (date: Date | undefined) => {
                setValue('to_month', date as Date, { shouldDirty: true, shouldValidate: true })
              },
            }}
          />
        </Grid>
      </Flex>
    </Form>
  )
})

EmployeeRateExportDialog.displayName = 'EmployeeRateExportDialog'

export default EmployeeRateExportDialog
