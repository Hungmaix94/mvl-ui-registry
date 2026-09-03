import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { FormController } from '@/components/ui/form'
import Select from '@/components/ui/select/Select'

export type GroupChannelFilterFormData = {
  state?: string
  write_policy?: string
}

interface GroupChannelFilterProps {
  initialValues?: GroupChannelFilterFormData
  isOpen?: boolean
  stateOptions: { value: string; label: string }[]
  writePolicyOptions: { value: string; label: string }[]
}

export const GroupChannelFilter = forwardRef<any, GroupChannelFilterProps>(
  ({ initialValues, isOpen, stateOptions, writePolicyOptions }, ref) => {
    const form = useForm<GroupChannelFilterFormData>({
      defaultValues: initialValues ?? { state: '', write_policy: '' },
    })
    const { control, register } = form

    useEffect(() => {
      if (isOpen && initialValues) {
        form.reset(initialValues)
      }
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => form.reset({ state: '', write_policy: '' }),
    }))

    return (
      <FormProvider {...form}>
        <Grid columns="2" gap="4" className="w-full">
          <FormController<GroupChannelFilterFormData, any>
            register={register}
            control={control}
            name="state"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Tất cả trạng thái',
              options: stateOptions,
            }}
          />
          <FormController<GroupChannelFilterFormData, any>
            register={register}
            control={control}
            name="write_policy"
            Field={Select}
            fieldProps={{
              label: 'Quyền nhắn tin',
              placeholder: 'Tất cả quyền',
              options: writePolicyOptions,
            }}
          />
        </Grid>
      </FormProvider>
    )
  }
)

GroupChannelFilter.displayName = 'GroupChannelFilter'
export default GroupChannelFilter
