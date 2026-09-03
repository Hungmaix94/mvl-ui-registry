import { forwardRef, useImperativeHandle } from 'react'
import { Grid } from '@radix-ui/themes'
import { useForm } from 'react-hook-form'
import { type DateRange } from 'react-day-picker'

import { Select, TextField } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import FormController from '@/components/ui/form/FormController'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'

export type CTVReconciliationFilterFormData = {
  status?: string | null
  collaborator?: number | null
  project?: number | null
  tax_code?: string | null
  reconciliationDateRange?: DateRange | null
}

export type CTVReconciliationFilterRef = {
  getValues: () => CTVReconciliationFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CTVReconciliationFilterFormData
}

const CTVReconciliationFilter = forwardRef<CTVReconciliationFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<CTVReconciliationFilterFormData>({
      defaultValues: initialValues ?? {},
    })

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.STATUS_CHOICES],
    })

    const statusOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.STATUS_CHOICES) ?? []

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
    const { loadCollaboratorOptions } = useCollaboratorSelect()

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => {
        form.reset({
          status: null,
          collaborator: null,
          project: null,
          tax_code: null,
          reconciliationDateRange: null,
        })
      },
    }))

    return (
      <Grid columns="2" gap="4" className="w-full">
        <div className="col-span-2">
          <FormController
            register={form.register}
            name="reconciliationDateRange"
            control={form.control}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Khoảng ngày đối chiếu',
              className: 'w-full',
              showQuickSelect: true,
            }}
          />
        </div>
        <FormController
          register={form.register}
          name="status"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Trạng thái',
            options: statusOptions,
            placeholder: 'Chọn trạng thái',
          }}
        />
        <FormController
          register={form.register}
          name="collaborator"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Cộng tác viên',
            placeholder: 'Chọn cộng tác viên',
            loadOptions: loadCollaboratorOptions,
            enableSearch: true,
          }}
        />
        <FormController
          register={form.register}
          name="project"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Dự án',
            placeholder: 'Chọn dự án',
            loadOptions: loadProjectOptions,
            loadInitialOptions: loadInitialProjectOptions,
            enableSearch: true,
          }}
        />
        <FormController
          register={form.register}
          name="tax_code"
          control={form.control}
          Field={TextField}
          fieldProps={{
            label: 'Mã số thuế',
            placeholder: 'Nhập mã số thuế',
          }}
        />
      </Grid>
    )
  }
)

CTVReconciliationFilter.displayName = 'CTVReconciliationFilter'

export default CTVReconciliationFilter
