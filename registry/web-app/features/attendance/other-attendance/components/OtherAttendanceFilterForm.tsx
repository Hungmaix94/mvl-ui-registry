import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DateRange } from 'react-day-picker'
import { endOfDay, startOfDay } from 'date-fns'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { Checkbox } from '@/components/ui/checkbox'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { AttendanceApproveStatus } from '@/constants/api-schema-aliases'

export type OtherAttendanceFilterValues = {
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  employee_id?: number
  date_range?: DateRange
  approve_status?: AttendanceApproveStatus[]
}

export type OtherAttendanceFilterFormRef = {
  clearForm: () => void
  getValues: () => Record<string, any>
  getRawValues: () => OtherAttendanceFilterValues
  trigger: () => Promise<boolean>
  isValid?: () => boolean
}

type OtherAttendanceFilterFormProps = {
  initialValues?: OtherAttendanceFilterValues
  onValidationChange?: (isValid: boolean) => void
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
  employee_id: z.number().optional(),
  date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
  approve_status: z.array(z.nativeEnum(AttendanceApproveStatus)).optional(),
})

const OtherAttendanceFilterForm = forwardRef<
  OtherAttendanceFilterFormRef,
  OtherAttendanceFilterFormProps
>(({ initialValues, onValidationChange }, ref) => {
  const [formKey, setFormKey] = useState(0)

  // Fetch status options from constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_APPROVE_STATUS],
  })

  const { control, register, reset, getValues, handleSubmit, watch, setValue, trigger, formState } =
    useForm<OtherAttendanceFilterValues>({
      resolver: zodResolver(Schema) as any,
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        position_id: initialValues?.position_id,
        employee_id: initialValues?.employee_id,
        date_range: initialValues?.date_range,
        approve_status: initialValues?.approve_status || [],
      },
    })

  const watchedValues = watch()

  useEffect(() => {
    onValidationChange?.(true)
  }, [onValidationChange])

  useEffect(() => {
    if (initialValues) {
      reset({
        branch_id: initialValues.branch_id,
        block_id: initialValues.block_id,
        department_id: initialValues.department_id,
        position_id: initialValues.position_id,
        employee_id: initialValues.employee_id,
        date_range: initialValues.date_range,
        approve_status: initialValues.approve_status || [],
      })
    }
  }, [initialValues, reset])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        branch_id: undefined,
        block_id: undefined,
        department_id: undefined,
        position_id: undefined,
        employee_id: undefined,
        date_range: undefined,
        approve_status: [],
      })
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => {
      return getValues()
    },
    getValues: () => {
      const values = getValues()
      const apiParams: Record<string, any> = {}

      if (values.branch_id) apiParams.branch = values.branch_id
      if (values.block_id) apiParams.block = values.block_id
      if (values.department_id) apiParams.department = values.department_id
      if (values.position_id) apiParams.position = values.position_id
      if (values.employee_id) apiParams.employee = values.employee_id

      if (values.date_range?.from) {
        apiParams.timestamp_after = startOfDay(values.date_range.from).toISOString()
      }

      if (values.date_range?.to) {
        apiParams.timestamp_before = endOfDay(values.date_range.to).toISOString()
      }

      if (values.approve_status && values.approve_status.length > 0) {
        apiParams.approve_status = values.approve_status
      }

      return apiParams
    },
    trigger: async () => {
      return await trigger()
    },
    isValid: () => {
      return formState.isValid
    },
  }))

  const handleCascadeChange = useCallback(
    (data: any) => {
      const current = getValues()

      if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
        setValue('branch_id', data.branch_id, { shouldDirty: false })
        setValue('block_id', undefined, { shouldDirty: false })
        setValue('department_id', undefined, { shouldDirty: false })
      }

      if (data.block_id !== undefined && data.block_id !== current.block_id) {
        setValue('block_id', data.block_id, { shouldDirty: false })
        setValue('department_id', undefined, { shouldDirty: false })
      }

      if (data.department_id !== undefined && data.department_id !== current.department_id) {
        setValue('department_id', data.department_id, { shouldDirty: false })
      }

      if (data.position_id !== undefined && data.position_id !== current.position_id) {
        setValue('position_id', data.position_id, { shouldDirty: false })
      }

      if (data.employee_id !== undefined && data.employee_id !== current.employee_id) {
        setValue('employee_id', data.employee_id, { shouldDirty: false })
      }
    },
    [getValues, setValue]
  )

  const onSubmit = async (_data: OtherAttendanceFilterValues) => {
    // Handled by parent via ref
  }

  const cascadeValues = useMemo(() => {
    return {
      branch: watchedValues.branch_id ? String(watchedValues.branch_id) : undefined,
      block: watchedValues.block_id ? String(watchedValues.block_id) : undefined,
      department: watchedValues.department_id ? String(watchedValues.department_id) : undefined,
      position: watchedValues.position_id ? String(watchedValues.position_id) : undefined,
      employee: watchedValues.employee_id ? String(watchedValues.employee_id) : undefined,
    }
  }, [
    watchedValues.branch_id,
    watchedValues.block_id,
    watchedValues.department_id,
    watchedValues.position_id,
    watchedValues.employee_id,
  ])

  const dateRangeValue = useMemo(() => watchedValues.date_range, [watchedValues.date_range])
  const selectedStatuses = useMemo(
    () => watchedValues.approve_status || [],
    [watchedValues.approve_status]
  )

  const statusOptions = useMemo(() => {
    const allOptions = keysMapOptions.has(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_APPROVE_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_APPROVE_STATUS) || []
      : []

    // Filter to only include valid enum values
    const validEnumValues = Object.values(AttendanceApproveStatus)
    return allOptions.filter((option) =>
      validEnumValues.includes(option.value as AttendanceApproveStatus)
    )
  }, [keysMapOptions])

  const handleStatusChange = useCallback(
    (value: AttendanceApproveStatus, checked: boolean) => {
      const current = selectedStatuses || []
      if (checked) {
        setValue('approve_status', [...current, value], { shouldDirty: false })
      } else {
        setValue(
          'approve_status',
          current.filter((v) => v !== value),
          { shouldDirty: false }
        )
      }
    },
    [selectedStatuses, setValue]
  )

  return (
    <Form key={formKey} loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
      <Flex direction="column" gap="5">
        <CascadeSelectGroupOrganization
          initialValues={cascadeValues}
          onFormChange={(data) => {
            handleCascadeChange({
              branch_id: data.branch_id,
              block_id: data.block_id,
              department_id: data.department_id,
              position_id: data.position_id,
              employee_id: data.employee_id,
            })
          }}
          showEmployee
          showPosition
          employeeLabel="Nhân viên"
          positionLabel="Chức vụ"
          skipValidation
          className="gap-5"
        />

        <div className="flex flex-col gap-2">
          <label className="typo-body-base-semibold text-content-dark-2">Thời gian</label>
          <FormController
            register={register}
            name="date_range"
            control={control}
            Field={DateRangePicker}
            fieldProps={{
              value: dateRangeValue,
              onChange: (range: DateRange | undefined | null) => {
                setValue('date_range', range ?? undefined, { shouldDirty: false })
              },
              placeholder: 'Chọn khoảng thời gian',
              showQuickSelect: true,
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Trạng thái</label>
          <div className="flex flex-wrap gap-[26px]">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={selectedStatuses.includes(option.value)}
                  onCheckedChange={(checked) => handleStatusChange(option.value, Boolean(checked))}
                />
                <span className="text-content-dark-1 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Flex>
    </Form>
  )
})

OtherAttendanceFilterForm.displayName = 'OtherAttendanceFilterForm'

export default OtherAttendanceFilterForm
