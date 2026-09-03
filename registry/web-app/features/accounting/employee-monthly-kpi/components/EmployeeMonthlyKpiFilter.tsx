import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { usePositionSelect } from '@/hooks/usePositionSelect'
import useAppConstant from '@/hooks/useAppConstant'

export type EmployeeMonthlyKpiFilterFormData = {
  employee?: string | null
  position?: string | null
  employee_type_snapshot?: string | null
}

export type EmployeeMonthlyKpiFilterRef = {
  getValues: () => EmployeeMonthlyKpiFilterFormData
  clearForm: () => void
}

type EmployeeMonthlyKpiFilterProps = {
  initialValues?: EmployeeMonthlyKpiFilterFormData
  isOpen: boolean
  /** Scope the employee dropdown to the department the KPI row belongs to. */
  department?: number | null
}

/** Every filter this form owns — the one list `clearForm` and the parent's badge both read. */
export const EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS = [
  'employee',
  'position',
  'employee_type_snapshot',
] as const

const EMPTY_FORM: EmployeeMonthlyKpiFilterFormData = {
  employee: null,
  position: null,
  employee_type_snapshot: null,
}

export const EmployeeMonthlyKpiFilter = forwardRef<
  EmployeeMonthlyKpiFilterRef,
  EmployeeMonthlyKpiFilterProps
>(({ initialValues, isOpen, department }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const form = useForm<EmployeeMonthlyKpiFilterFormData>({ defaultValues: initialValues ?? {} })
  const { control, register, reset, getValues, handleSubmit } = form

  const employeeParams = useCallback(() => (department ? { department } : {}), [department])
  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
    additionalParams: employeeParams,
  })
  const { loadPositionOptions, loadInitialPositionOptions } = usePositionSelect()

  // Snapshot enum của chính bảng KPI, không phải `hrm.EmployeeType`: hai enum lệch nhau một
  // giá trị (`UNPAID_PROBATION_OFFICIAL`), và chọn phải giá trị thừa đó thì API trả rỗng —
  // trông y như "phòng này không có ai loại đó" chứ không phải một bộ lọc sai.
  const { keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.EMPLOYEE_MONTHLY_KPI_EMPLOYEE_TYPE_SNAPSHOT_CHOICES],
  })
  const employeeTypeOptions = useMemo(
    () =>
      keysMapOptions.get(
        APP_CONSTANT_KEY.ACCOUNTING.EMPLOYEE_MONTHLY_KPI_EMPLOYEE_TYPE_SNAPSHOT_CHOICES
      ) || [],
    [keysMapOptions]
  )

  useEffect(() => {
    if (isOpen && initialValues) {
      reset(initialValues)
      setFormKey((k) => k + 1)
    }
  }, [isOpen, initialValues, reset])

  useImperativeHandle(ref, () => ({
    getValues: () => getValues(),
    clearForm: () => {
      reset(EMPTY_FORM)
      setFormKey((k) => k + 1)
    },
  }))

  return (
    <Form loading={false} onSubmit={() => {}} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <FormController
          key={`employee-${formKey}`}
          register={register}
          control={control}
          name="employee"
          Field={Select}
          fieldProps={{
            label: 'Nhân viên',
            placeholder: 'Chọn nhân viên',
            loadOptions: loadEmployeeOptions,
            loadInitialOptions: loadInitialEmployeeOptions,
            enableSearch: true,
            clearable: true,
          }}
        />

        <FormController
          key={`position-${formKey}`}
          register={register}
          control={control}
          name="position"
          Field={Select}
          fieldProps={{
            label: 'Chức vụ',
            placeholder: 'Chọn chức vụ',
            loadOptions: loadPositionOptions,
            loadInitialOptions: loadInitialPositionOptions,
            enableSearch: true,
            clearable: true,
          }}
        />

        <FormController
          key={`employee-type-${formKey}`}
          register={register}
          control={control}
          name="employee_type_snapshot"
          Field={Select}
          fieldProps={{
            label: 'Loại nhân viên',
            placeholder: 'Chọn loại nhân viên',
            options: employeeTypeOptions,
            clearable: true,
          }}
        />
      </Flex>
    </Form>
  )
})
EmployeeMonthlyKpiFilter.displayName = 'EmployeeMonthlyKpiFilter'
