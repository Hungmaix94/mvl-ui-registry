import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select, type SelectOption } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'

export type PartnerDebtFilterFormData = {
  partner_type?: string
}

export type PartnerDebtFilterRef = {
  getValues: () => PartnerDebtFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: PartnerDebtFilterFormData
}

const PARTNER_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tất cả loại đối tác' },
  { value: 'INVESTOR', label: 'Chủ đầu tư' },
  { value: 'EXCHANGE', label: 'Sàn liên kết' },
]

export const PartnerDebtFilter = forwardRef<PartnerDebtFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<PartnerDebtFilterFormData>({
      defaultValues: initialValues ?? {
        partner_type: '',
      },
    })
    const { control, register } = form

    useEffect(() => {
      if (initialValues) form.reset(initialValues)
    }, [initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () =>
        form.reset({
          partner_type: '',
        }),
    }))

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4">
          <FormController<PartnerDebtFilterFormData, any>
            register={register}
            control={control}
            name="partner_type"
            Field={Select}
            fieldProps={{
              label: 'Loại đối tác',
              placeholder: 'Tất cả loại đối tác',
              options: PARTNER_TYPE_OPTIONS,
              clearable: true,
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

PartnerDebtFilter.displayName = 'PartnerDebtFilter'

export default PartnerDebtFilter
