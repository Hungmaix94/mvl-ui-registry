import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'

export type CommSaleMonthlyFilterFormData = {
  status?: string
  beneficiary_employee?: string
}

export type CommSaleMonthlyFilterRef = {
  getValues: () => CommSaleMonthlyFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CommSaleMonthlyFilterFormData
  isOpen: boolean
}

export const CommSaleMonthlyFilter = forwardRef<CommSaleMonthlyFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<CommSaleMonthlyFilterFormData>({
      defaultValues: initialValues ?? {},
    })
    const { control, register, reset, getValues } = form

    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES],
    })
    const statusOptions = keysMapOptions.get(
      APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES
    )

    const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
      valueType: 'id',
    })

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () =>
        reset({
          status: undefined,
          beneficiary_employee: undefined,
        }),
    }))

    return (
      <FormProvider {...form}>
        <Grid columns="1" gap="4" className="w-full">
          <FormController<
            CommSaleMonthlyFilterFormData,
            SelectProps<{ label: string; value: string | number }>
          >
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Tất cả trạng thái',
              options: statusOptions || [],
            }}
          />

          <FormController<CommSaleMonthlyFilterFormData, any>
            register={register}
            control={control}
            name="beneficiary_employee"
            Field={Select}
            fieldProps={{
              label: 'Nhân viên thụ hưởng',
              placeholder: 'Chọn nhân viên',
              loadOptions: loadEmployeeOptions,
              loadInitialOptions: loadInitialEmployeeOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
        </Grid>
      </FormProvider>
    )
  }
)

CommSaleMonthlyFilter.displayName = 'CommSaleMonthlyFilter'

export default CommSaleMonthlyFilter
