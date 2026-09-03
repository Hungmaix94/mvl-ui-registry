import { FormProvider, useForm } from 'react-hook-form'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { Grid } from '@radix-ui/themes'
import { FormController } from '@/components/ui/form'
import { Select, TextField } from '@/components/ui'

export type CommKPIFilterFormData = {
  target_role?: string
  status?: string
  effective_from?: string
}

type Props = {
  initialValues?: Partial<CommKPIFilterFormData>
  isOpen?: boolean
}

export const CommKPIFilter = forwardRef<any, Props>(({ initialValues, isOpen }, ref) => {
  const form = useForm<CommKPIFilterFormData>({ defaultValues: initialValues ?? {} })
  const { control, register } = form

  useEffect(() => {
    if (isOpen && initialValues) form.reset(initialValues)
  }, [isOpen, initialValues, form])

  useImperativeHandle(ref, () => ({
    getValues: () => form.getValues(),
    clearForm: () => form.reset({}),
  }))

  return (
    <FormProvider {...form}>
      <Grid columns={{ initial: '1', md: '3' }} gap="4" className="w-full">
        <FormController<CommKPIFilterFormData, any>
          control={control}
          register={register}
          name="target_role"
          Field={Select}
          fieldProps={{
            label: 'Chức danh',
            placeholder: 'Tất cả',
            options: [
              { value: 'TPKD', label: 'Trưởng phòng KD' },
              { value: 'GDDA', label: 'Giám đốc dự án' },
              { value: 'SALE_DIRECT', label: 'Sale direct' },
              { value: 'OTHER', label: 'Khác' },
            ],
            allowClear: true,
          }}
        />
        <FormController<CommKPIFilterFormData, any>
          control={control}
          register={register}
          name="status"
          Field={Select}
          fieldProps={{
            label: 'Trạng thái',
            placeholder: 'Tất cả',
            options: [
              { value: 'DRAFT', label: 'Bản nháp' },
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'EXPIRED', label: 'Hết hạn' },
            ],
            allowClear: true,
          }}
        />
        <FormController<CommKPIFilterFormData, any>
          control={control}
          register={register}
          name="effective_from"
          Field={TextField}
          fieldProps={{
            label: 'Ngày hiệu lực từ',
            placeholder: 'Chọn ngày',
            type: 'date',
          }}
        />
      </Grid>
    </FormProvider>
  )
})

CommKPIFilter.displayName = 'CommKPIFilter'
