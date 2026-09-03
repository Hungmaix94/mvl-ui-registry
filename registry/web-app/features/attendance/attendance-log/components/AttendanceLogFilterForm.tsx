import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parse } from 'date-fns'
import { Flex, Text } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { Checkbox } from '@/components/ui'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { DATE_FORMAT } from '@/constants/date-format'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import type { AttendanceLogFilterValues } from '@/features/attendance/attendance-log/hooks/useAttendanceLogFilter'
import type { GetFirstAttendanceParams } from '@/features/attendance/services/attendance-record-service'
import { formatDateToApi } from '@/utils/date-utils'
import { AttendanceApproveStatus } from '@/constants/api-schema-aliases'

export type AttendanceLogFilterFormRef = {
  clearForm: () => void
  getValues: () => GetFirstAttendanceParams
  getRawValues: () => AttendanceLogFilterValues
  trigger: () => Promise<boolean>
  isValid?: () => boolean
}

type AttendanceLogFilterFormProps = {
  initialValues?: AttendanceLogFilterValues
  onValidationChange?: (isValid: boolean) => void
  /** When true, form syncs from initialValues only when dialog just opened (avoids overwriting user clear). */
  isDialogOpen?: boolean
}

type AttendanceTypeSelectOption = { value: string; label: string }
type ApproveStatusSelectOption = {
  value: AttendanceApproveStatus
  label: string
}

const Schema = z.object({
  date: z.date().nullable().optional(),
  attendance_type: z.array(z.string()).optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
  employee_id: z.number().optional(),
  approve_status: z.array(z.nativeEnum(AttendanceApproveStatus)).optional(),
})

const AttendanceLogFilterForm = forwardRef<
  AttendanceLogFilterFormRef,
  AttendanceLogFilterFormProps
>(({ initialValues, onValidationChange, isDialogOpen }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const prevDialogOpenRef = useRef(false)

  const { control, register, reset, getValues, handleSubmit, watch, setValue, trigger, formState } =
    useForm<AttendanceLogFilterValues>({
      resolver: zodResolver(Schema) as any,
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        date: initialValues?.date ?? null,
        attendance_type: initialValues?.attendance_type ?? [],
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        position_id: initialValues?.position_id,
        employee_id: initialValues?.employee_id,
        approve_status: initialValues?.approve_status ?? [],
      },
    })

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_ATTENDANCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_APPROVE_STATUS,
    ],
  })

  const attendanceTypeOptions: AttendanceTypeSelectOption[] = useMemo(
    () =>
      (keysMapOptions.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_ATTENDANCE_TYPE_CHOICES) ??
        []) as AttendanceTypeSelectOption[],
    [keysMapOptions]
  )

  const approveStatusOptions: ApproveStatusSelectOption[] = useMemo(() => {
    const allOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_APPROVE_STATUS) ?? []

    const validValues = Object.values(AttendanceApproveStatus)

    return (allOptions as Array<{ value: string; label: string }>).filter((option) =>
      validValues.includes(option.value as AttendanceApproveStatus)
    ) as ApproveStatusSelectOption[]
  }, [keysMapOptions])

  const watchedValues = watch()
  const watchedAttendanceType = watchedValues.attendance_type ?? []
  const watchedApproveStatus = watchedValues.approve_status ?? []

  useEffect(() => {
    onValidationChange?.(true)
  }, [onValidationChange])

  useEffect(() => {
    const justOpened = isDialogOpen === true && prevDialogOpenRef.current === false
    if (isDialogOpen === false) prevDialogOpenRef.current = false
    if (justOpened && initialValues) {
      prevDialogOpenRef.current = true
      reset({
        date: initialValues.date ?? null,
        attendance_type: Array.isArray(initialValues.attendance_type)
          ? initialValues.attendance_type
          : initialValues.attendance_type
            ? [initialValues.attendance_type]
            : [],
        branch_id: initialValues.branch_id,
        block_id: initialValues.block_id,
        department_id: initialValues.department_id,
        position_id: initialValues.position_id,
        employee_id: initialValues.employee_id,
        approve_status: initialValues.approve_status ?? [],
      })
    }
  }, [isDialogOpen, initialValues, reset])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        date: null,
        attendance_type: [],
        branch_id: undefined,
        block_id: undefined,
        department_id: undefined,
        position_id: undefined,
        employee_id: undefined,
        approve_status: [],
      })
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => getValues(),
    getValues: () => {
      const values = getValues()
      const apiParams: GetFirstAttendanceParams = {}
      if (values.date != null && values.date !== undefined) {
        ;(apiParams as any).date = formatDateToApi(values.date)
      }
      if (values.attendance_type?.length)
        apiParams.attendance_type__in = values.attendance_type.join(',')
      if (values.branch_id) apiParams.branch = values.branch_id
      if (values.block_id) apiParams.block = values.block_id
      if (values.department_id) apiParams.department = values.department_id
      if (values.position_id) apiParams.position = values.position_id
      if (values.employee_id) apiParams.employee = values.employee_id
      if (values.approve_status?.length) {
        ;(apiParams as any).approve_status__in = values.approve_status.join(',')
      }
      return apiParams
    },
    trigger: async () => trigger(),
    isValid: () => formState.isValid,
  }))

  const handleCheckboxChange = useCallback(
    (field: 'attendance_type', value: string, checked: boolean) => {
      const current = getValues(field) || []
      if (checked) {
        setValue(field, [...current, value], { shouldDirty: true, shouldValidate: true })
      } else {
        setValue(
          field,
          current.filter((v) => v !== value),
          {
            shouldDirty: true,
            shouldValidate: true,
          }
        )
      }
    },
    [getValues, setValue]
  )

  const handleApproveStatusChange = useCallback(
    (value: AttendanceApproveStatus, checked: boolean) => {
      const current = getValues('approve_status') || []
      if (checked) {
        setValue('approve_status', [...current, value], {
          shouldDirty: true,
          shouldValidate: true,
        })
      } else {
        setValue(
          'approve_status',
          current.filter((v) => v !== value),
          {
            shouldDirty: true,
            shouldValidate: true,
          }
        )
      }
    },
    [getValues, setValue]
  )

  const handleCascadeChange = useCallback(
    (data: {
      branch_id?: number
      block_id?: number
      department_id?: number
      position_id?: number
      employee_id?: number
    }) => {
      const current = getValues()
      if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
        setValue('branch_id', data.branch_id, { shouldDirty: false })
        setValue('block_id', undefined, { shouldDirty: false })
        setValue('department_id', undefined, { shouldDirty: false })
      }
      if (data.block_id !== undefined && data.block_id !== current.block_id) {
        setValue('block_id', data.block_id, { shouldDirty: false })
        setValue('department_id', undefined, { shouldDirty: false })
        setValue('position_id', undefined, { shouldDirty: false })
      }
      if (data.department_id !== undefined && data.department_id !== current.department_id) {
        setValue('department_id', data.department_id, { shouldDirty: false })
        setValue('position_id', undefined, { shouldDirty: false })
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

  const onSubmit = async (_data: AttendanceLogFilterValues) => {
    // Handled by parent via ref
  }

  const cascadeValues = useMemo(
    () => ({
      branch: watchedValues.branch_id ? String(watchedValues.branch_id) : undefined,
      block: watchedValues.block_id ? String(watchedValues.block_id) : undefined,
      department: watchedValues.department_id ? String(watchedValues.department_id) : undefined,
      position: watchedValues.position_id ? String(watchedValues.position_id) : undefined,
      employee: watchedValues.employee_id ? String(watchedValues.employee_id) : undefined,
    }),
    [
      watchedValues.branch_id,
      watchedValues.block_id,
      watchedValues.department_id,
      watchedValues.position_id,
      watchedValues.employee_id,
    ]
  )

  const DateField = useMemo(
    () =>
      forwardRef<
        HTMLDivElement,
        { value?: Date | null; onChange: (v: Date | null | undefined) => void }
      >(({ value, onChange }, ref) => (
        <div ref={ref} className="flex flex-col gap-2">
          <DatePicker
            label={'Ngày'}
            value={value ?? undefined}
            onChange={(str) => {
              if (!str) {
                onChange(null)
                return
              }
              try {
                const parsed = parse(str, DATE_FORMAT, new Date())
                onChange(parsed)
              } catch {
                onChange(null)
              }
            }}
            placeholder="Chọn ngày"
            clearable
            caption={'Nếu không có ngày nào được chọn thì mặc định luôn là ngày hôm nay'}
          />
        </div>
      )),
    []
  )
  DateField.displayName = 'DateField'

  return (
    <Form key={formKey} loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
      <Flex direction="column" gap="5">
        <FormController
          name="date"
          control={control}
          register={register}
          Field={DateField}
          fieldProps={{}}
        />

        <Flex direction="column" gap="3">
          <Text className="text-content-dark-2 typo-body-base-semibold">Phương thức chấm công</Text>
          <Flex gap="5" wrap="wrap">
            {attendanceTypeOptions.map((option) => (
              <Flex key={option.value} align="center" gap="2">
                <Checkbox
                  checked={watchedAttendanceType.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('attendance_type', option.value, checked === true)
                  }
                  id={`attendance-type-${option.value}`}
                />
                <label
                  htmlFor={`attendance-type-${option.value}`}
                  className="text-content-dark-1 typo-body-base-regular cursor-pointer"
                >
                  {option.label}
                </label>
              </Flex>
            ))}
          </Flex>
        </Flex>

        <Flex direction="column" gap="3">
          <Text className="text-content-dark-2 typo-body-base-semibold">Trạng thái duyệt</Text>
          <Flex gap="5" wrap="wrap">
            {approveStatusOptions.map((option) => (
              <Flex key={option.value} align="center" gap="2">
                <Checkbox
                  checked={watchedApproveStatus.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleApproveStatusChange(option.value, checked === true)
                  }
                  id={`approve-status-${option.value}`}
                />
                <label
                  htmlFor={`approve-status-${option.value}`}
                  className="text-content-dark-1 typo-body-base-regular cursor-pointer"
                >
                  {option.label}
                </label>
              </Flex>
            ))}
          </Flex>
        </Flex>

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
          skipValidation
          className="gap-5"
        />
      </Flex>
    </Form>
  )
})

AttendanceLogFilterForm.displayName = 'AttendanceLogFilterForm'

export default AttendanceLogFilterForm
