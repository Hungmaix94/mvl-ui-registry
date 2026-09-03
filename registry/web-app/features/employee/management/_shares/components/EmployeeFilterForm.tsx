import {
  useCallback,
  useMemo,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex, Grid } from '@radix-ui/themes'
import { Checkbox, Select } from '@/components/ui'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import type { DateRange } from 'react-day-picker'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { cn } from '@/lib/utils.ts'
import { GetEmployeesParams } from '@/services'
import {
  EMPLOYEE_FILTER_HANDOVER_COMPLETED_OPTIONS,
  EMPLOYEE_FILTER_REPORT_EXCLUDED_POSITION_OPTIONS,
  EMPLOYEE_FILTER_STATUS_VALUES,
  EMPLOYEE_FILTER_TERMINATION_NOTICE_OPTIONS,
  EMPLOYEE_FILTER_UPLOAD_STATUS_OPTIONS,
  EMPLOYEE_FILTER_YES_NO_OPTIONS,
  TEmployeeFilter,
} from '@/constants/employee-filter.ts'
import {
  EmployeeDocumentSubmissionStatus,
  EmployeeType,
  EmployeeGender,
  EmployeeStatus,
} from '@/constants/api-schema-aliases'

export type EmployeeFilterFormData = {
  branch_id?: number
  block_id?: number
  department_id?: number
  position?: number
  statuses?: NonNullable<GetEmployeesParams>['statuses']
  employee_types?: NonNullable<GetEmployeesParams>['employee_types']
  gender?: NonNullable<GetEmployeesParams>['gender']
  is_leadership?: TEmployeeFilter
  send_onboarding_email?: TEmployeeFilter
  is_os_code_type?: TEmployeeFilter
  has_citizen_id_file?: TEmployeeFilter
  document_submission_status?: EmployeeDocumentSubmissionStatus
  is_termination_notice_sent?: TEmployeeFilter
  handover_completed?: TEmployeeFilter
  include_report_excluded_positions?: TEmployeeFilter
  is_returning_employee?: TEmployeeFilter
  birthday_month?: Date
  /** Align with API param names (start_date__gte, start_date__lte) */
  start_date__gte?: Date
  start_date__lte?: Date
  /** Align with API param names (resignation_start_date__gte, resignation_start_date__lte) */
  resignation_start_date__gte?: Date
  resignation_start_date__lte?: Date
}

export type EmployeeFilterFormRef = {
  clearForm: () => void
  getValues: () => EmployeeFilterFormData
}

type EmployeeFilterFormProps = {
  initialValues?: EmployeeFilterFormData
  /** When true, form will reset to initialValues (URL) on next effect run (per url-driven-filter-dialog guide) */
  isOpen?: boolean
  showReportExcludedPositionsFilter?: boolean
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position: z.number().optional(),
  statuses: z.array(z.string()).optional(),
  employee_types: z.array(z.string()).optional(),
  birthday_month: z.date().optional(),
  gender: z.string().nullable().optional(),
  is_leadership: z.string().nullable().optional(),
  send_onboarding_email: z.string().nullable().optional(),
  is_os_code_type: z.string().nullable().optional(),
  has_citizen_id_file: z.string().nullable().optional(),
  document_submission_status: z.nativeEnum(EmployeeDocumentSubmissionStatus).nullable().optional(),
  is_termination_notice_sent: z.string().nullable().optional(),
  handover_completed: z.string().nullable().optional(),
  include_report_excluded_positions: z.string().nullable().optional(),
  is_returning_employee: z.string().nullable().optional(),
  /** API param names - same as query params */
  start_date__gte: z.date().optional(),
  start_date__lte: z.date().optional(),
  resignation_start_date__gte: z.date().optional(),
  resignation_start_date__lte: z.date().optional(),
})

const EmployeeFilterForm = forwardRef<EmployeeFilterFormRef, EmployeeFilterFormProps>(
  ({ initialValues, isOpen }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const prevIsOpenRef = useRef(false)
    const [shouldClearCascade, setShouldClearCascade] = useState(false)

    const { keysMapOptions } = useAppConstant({
      module: 'hrm',
      keys: [
        APP_CONSTANT_KEY.EMPLOYEE.STATUS,
        APP_CONSTANT_KEY.EMPLOYEE.GENDER,
        APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES,
        APP_CONSTANT_KEY.HRM.DOCUMENT_SUBMISSION_STATUS_FILTER,
      ],
    })

    const statusOptions = useMemo((): Array<{
      value: EmployeeStatus
      label: string
    }> => {
      const options = keysMapOptions.has(APP_CONSTANT_KEY.EMPLOYEE.STATUS)
        ? keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.STATUS) || []
        : []
      // Ẩn trạng thái "Nghỉ không lương" khỏi bộ lọc theo yêu cầu nghiệp vụ
      return options.filter((option) => EMPLOYEE_FILTER_STATUS_VALUES.includes(option.value))
    }, [keysMapOptions])

    const genderOptions = useMemo((): Array<{
      value: EmployeeGender
      label: string
    }> => {
      return keysMapOptions.has(APP_CONSTANT_KEY.EMPLOYEE.GENDER)
        ? keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.GENDER) || []
        : []
    }, [keysMapOptions])

    const employeeTypeOptions = useMemo((): Array<{
      value: EmployeeType
      label: string
    }> => {
      return keysMapOptions.has(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES) || []
        : []
    }, [keysMapOptions])

    const documentSubmissionStatusOptions = useMemo((): Array<{
      value: EmployeeDocumentSubmissionStatus
      label: string
    }> => {
      return keysMapOptions.has(APP_CONSTANT_KEY.HRM.DOCUMENT_SUBMISSION_STATUS_FILTER)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.DOCUMENT_SUBMISSION_STATUS_FILTER) || []
        : []
    }, [keysMapOptions])

    const { control, handleSubmit, register, reset, getValues, watch, setValue } =
      useForm<EmployeeFilterFormData>({
        resolver: zodResolver(Schema) as any,
        defaultValues: {
          branch_id: initialValues?.branch_id,
          block_id: initialValues?.block_id,
          department_id: initialValues?.department_id,
          position: initialValues?.position,
          statuses: initialValues?.statuses,
          employee_types: initialValues?.employee_types,
          gender: initialValues?.gender,
          birthday_month: initialValues?.birthday_month,
          is_leadership: initialValues?.is_leadership,
          send_onboarding_email: initialValues?.send_onboarding_email,
          is_os_code_type: initialValues?.is_os_code_type,
          has_citizen_id_file: initialValues?.has_citizen_id_file,
          document_submission_status: initialValues?.document_submission_status,
          is_termination_notice_sent: initialValues?.is_termination_notice_sent,
          handover_completed: initialValues?.handover_completed,
          include_report_excluded_positions: initialValues?.include_report_excluded_positions,
          is_returning_employee: initialValues?.is_returning_employee,
          start_date__gte: initialValues?.start_date__gte,
          start_date__lte: initialValues?.start_date__lte,
          resignation_start_date__gte: initialValues?.resignation_start_date__gte,
          resignation_start_date__lte: initialValues?.resignation_start_date__lte,
        },
      })

    // Sync form from URL only when dialog *just* opened (not on every initialValues ref change)
    useEffect(() => {
      const justOpened = isOpen && !prevIsOpenRef.current
      prevIsOpenRef.current = !!isOpen
      if (justOpened && initialValues) {
        reset({
          branch_id: initialValues.branch_id,
          block_id: initialValues.block_id,
          department_id: initialValues.department_id,
          position: initialValues.position,
          statuses: initialValues.statuses,
          employee_types: initialValues.employee_types,
          gender: initialValues.gender,
          birthday_month: initialValues.birthday_month,
          is_leadership: initialValues.is_leadership,
          send_onboarding_email: initialValues.send_onboarding_email,
          is_os_code_type: initialValues.is_os_code_type,
          has_citizen_id_file: initialValues.has_citizen_id_file,
          document_submission_status: initialValues.document_submission_status,
          is_termination_notice_sent: initialValues.is_termination_notice_sent,
          handover_completed: initialValues.handover_completed,
          include_report_excluded_positions: initialValues.include_report_excluded_positions,
          is_returning_employee: initialValues.is_returning_employee,
          start_date__gte: initialValues.start_date__gte,
          start_date__lte: initialValues.start_date__lte,
          resignation_start_date__gte: initialValues.resignation_start_date__gte,
          resignation_start_date__lte: initialValues.resignation_start_date__lte,
        })
        setFormKey((prev) => prev + 1)
        setShouldClearCascade(false)
      }
    }, [isOpen, initialValues, reset])

    const watchedStatuses = watch('statuses') || []
    const watchedEmployeeTypes = watch('employee_types') || []
    const watchedStartDateGte = watch('start_date__gte')
    const watchedStartDateLte = watch('start_date__lte')
    const watchedResignationDateGte = watch('resignation_start_date__gte')
    const watchedResignationDateLte = watch('resignation_start_date__lte')

    const handleStatusChange = useCallback(
      (statusValue: EmployeeStatus, checked: boolean) => {
        const currentStatuses = watchedStatuses
        if (checked) {
          setValue('statuses', [...currentStatuses, statusValue])
        } else {
          setValue(
            'statuses',
            currentStatuses.filter((s) => s !== statusValue)
          )
        }
      },
      [setValue, watchedStatuses]
    )

    const handleEmployeeTypeChange = useCallback(
      (typeValue: EmployeeType, checked: boolean) => {
        const current = watchedEmployeeTypes
        if (checked) {
          setValue('employee_types', [...current, typeValue])
        } else {
          setValue(
            'employee_types',
            current.filter((t) => t !== typeValue)
          )
        }
      },
      [setValue, watchedEmployeeTypes]
    )

    const handleCascadeChange = useCallback(
      (data: any) => {
        setValue('branch_id', data.branch_id && data.branch_id !== 0 ? data.branch_id : undefined, {
          shouldDirty: true,
        })
        setValue('block_id', data.block_id && data.block_id !== 0 ? data.block_id : undefined, {
          shouldDirty: true,
        })
        setValue(
          'department_id',
          data.department_id && data.department_id !== 0 ? data.department_id : undefined,
          { shouldDirty: true }
        )
        if (data.position_id !== undefined) {
          const current = getValues()
          const positionChanged = data.position_id !== current.position
          if (data.position_id && data.position_id !== 0 && positionChanged) {
            setValue('position', data.position_id, { shouldDirty: true })
          } else if (!data.position_id || data.position_id === 0) {
            setValue('position', undefined, { shouldDirty: true })
          }
        }
      },
      [setValue, getValues]
    )

    // Expose clearForm and getValues via ref
    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setShouldClearCascade(true)
          setFormKey((prev) => prev + 1)
          const cleared: EmployeeFilterFormData = {
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
            position: undefined,
            statuses: undefined,
            employee_types: undefined,
            gender: undefined,
            is_leadership: undefined,
            birthday_month: undefined,
            send_onboarding_email: undefined,
            is_os_code_type: undefined,
            has_citizen_id_file: undefined,
            document_submission_status: undefined,
            is_termination_notice_sent: undefined,
            handover_completed: undefined,
            include_report_excluded_positions: undefined,
            is_returning_employee: undefined,
            start_date__gte: undefined,
            start_date__lte: undefined,
            resignation_start_date__gte: undefined,
            resignation_start_date__lte: undefined,
          }
          reset(cleared, { keepDefaultValues: false, keepValues: false })
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    // Empty submit handler - form submission is handled by parent via ref
    const onSubmit = (_data: EmployeeFilterFormData) => {}

    return (
      <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
        {/*
         * Remount the whole field tree on formKey change (bumped on dialog-open and on
         * clearForm). RHF <Controller> caches its defaultValue at mount, so a field reset
         * to `undefined` is re-populated from the STALE mount-time default on the next
         * render — clearing then applying would re-send the old value. Remounting forces
         * each controller to re-read the freshly reset defaults. (Same reason MonthPicker
         * is keyed by formKey.)
         */}
        <Flex key={formKey} direction={'column'} gap={'5'}>
          {/* Cascade Select: Branch, Block, Department */}
          <CascadeSelectGroupOrganization
            key={formKey}
            initialValues={
              shouldClearCascade
                ? undefined
                : {
                    branch: initialValues?.branch_id?.toString(),
                    block: initialValues?.block_id?.toString(),
                    department: initialValues?.department_id?.toString(),
                    position: initialValues?.position?.toString(),
                  }
            }
            onFormChange={handleCascadeChange}
            showEmployee={false}
            showPosition
            layout="grid"
            skipValidation={true}
            className="gap-5"
          />

          <Grid columns={'3'} gap={'2'}>
            {/* Gender Select */}
            <FormController
              register={register}
              name="gender"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Giới tính',
                placeholder: 'Chọn giới tính',
                options: genderOptions,
                onChange: (value: EmployeeGender) =>
                  setValue('gender', value, { shouldDirty: true }),
                clearable: true,
              }}
            />

            {/* Birthday Month MonthPicker */}
            <FormController
              key={`birthday_month_${formKey}`}
              register={register}
              name="birthday_month"
              control={control}
              Field={MonthPicker}
              fieldProps={{
                label: 'Tháng sinh nhật',
                placeholder: 'Chọn tháng',
                showYear: false,
                onChange: (date: Date | undefined) => {
                  setValue('birthday_month', date, {
                    shouldDirty: true,
                    shouldValidate: false,
                  })
                },
              }}
            />

            {/* Upload ảnh CMND/CCCD Select */}
            <FormController
              register={register}
              name="has_citizen_id_file"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Upload ảnh CMND/CCCD',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_UPLOAD_STATUS_OPTIONS,
                onChange: (value: TEmployeeFilter) =>
                  setValue('has_citizen_id_file', value, { shouldDirty: true }),
                clearable: true,
              }}
            />
          </Grid>

          <Grid columns={'3'} gap={'2'}>
            {/* Gửi mail hội nhập Select */}
            <FormController
              register={register}
              name="send_onboarding_email"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Gửi mail hội nhập',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_YES_NO_OPTIONS,
                onChange: (value: TEmployeeFilter) =>
                  setValue('send_onboarding_email', value, { shouldDirty: true }),
                clearable: true,
              }}
            />

            {/* Đã gửi thư chấm dứt HĐLĐ Select */}
            <FormController
              register={register}
              name="is_termination_notice_sent"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Đã gửi thư chấm dứt HĐLĐ',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_TERMINATION_NOTICE_OPTIONS,
                onChange: (value: TEmployeeFilter) =>
                  setValue('is_termination_notice_sent', value, { shouldDirty: true }),
                clearable: true,
              }}
            />

            {/* Đã hoàn tất bàn giao nghỉ việc Select */}
            <FormController
              register={register}
              name="handover_completed"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Đã hoàn tất bàn giao nghỉ việc',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_HANDOVER_COMPLETED_OPTIONS,
                onChange: (value: TEmployeeFilter) =>
                  setValue('handover_completed', value, { shouldDirty: true }),
                clearable: true,
              }}
            />
          </Grid>

          <Grid columns={'3'} gap={'2'}>
            {/* Loại nhân viên OS Select */}
            <FormController
              register={register}
              name="is_os_code_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại nhân viên OS',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_YES_NO_OPTIONS,
                onChange: (value?: TEmployeeFilter) =>
                  setValue('is_os_code_type', value, { shouldDirty: true }),
                clearable: true,
              }}
            />

            {/* Leadership Select */}
            <FormController
              register={register}
              name="is_leadership"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Ban lãnh đạo',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_YES_NO_OPTIONS,
                onChange: (value: TEmployeeFilter) =>
                  setValue('is_leadership', value, { shouldDirty: true }),
                clearable: true,
              }}
            />

            {/* Trạng thái nộp hồ sơ Select */}
            <FormController
              register={register}
              name="document_submission_status"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái nộp hồ sơ',
                placeholder: 'Chọn',
                options: documentSubmissionStatusOptions,
                onChange: (value?: EmployeeDocumentSubmissionStatus) =>
                  setValue('document_submission_status', value, { shouldDirty: true }),
                clearable: true,
              }}
            />
          </Grid>

          <Grid columns={'2'} gap={'2'}>
            <FormController
              register={register}
              name="include_report_excluded_positions"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Chức vụ không được tính vào báo cáo nhân sự',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_REPORT_EXCLUDED_POSITION_OPTIONS,
                onChange: (value?: TEmployeeFilter) =>
                  setValue('include_report_excluded_positions', value, { shouldDirty: true }),
                clearable: true,
              }}
            />
            {/* Nhân sự quay lại Select */}
            <FormController
              register={register}
              name="is_returning_employee"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Nhân sự quay lại',
                placeholder: 'Chọn',
                options: EMPLOYEE_FILTER_YES_NO_OPTIONS,
                onChange: (value?: TEmployeeFilter) =>
                  setValue('is_returning_employee', value, { shouldDirty: true }),
                clearable: true,
              }}
            />
          </Grid>

          <Grid columns={'2'} gap={'2'}>
            {/* Ngày bắt đầu làm việc - schema/name = API params start_date__gte, start_date__lte */}
            <FormController
              register={register}
              name="start_date__gte"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                label: 'Ngày bắt đầu làm việc',
                showQuickSelect: true,
                className: 'w-full',
                value: {
                  from: watchedStartDateGte,
                  to: watchedStartDateLte,
                } as DateRange,
                onChange: (range: DateRange | undefined | null) => {
                  setValue('start_date__gte', range?.from, { shouldDirty: true })
                  setValue('start_date__lte', range?.to, { shouldDirty: true })
                  return range?.from
                },
              }}
            />

            {/* Ngày nghỉ việc - API params resignation_start_date__gte, resignation_start_date__lte */}
            <FormController
              register={register}
              name="resignation_start_date__gte"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                label: 'Ngày nghỉ việc',
                showQuickSelect: true,
                className: 'w-full',
                value: {
                  from: watchedResignationDateGte,
                  to: watchedResignationDateLte,
                } as DateRange,
                onChange: (range: DateRange | undefined | null) => {
                  setValue('resignation_start_date__gte', range?.from, { shouldDirty: true })
                  setValue('resignation_start_date__lte', range?.to, { shouldDirty: true })
                  return range?.from
                },
              }}
            />
          </Grid>

          {/* Status Checkboxes */}
          <div className="flex flex-col gap-1 space-y-2">
            <label className={cn('typo-body-base-semibold text-neutral-90')}>Trạng thái</label>
            <div className="flex flex-wrap gap-6">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={watchedStatuses.includes(option.value)}
                    onCheckedChange={(checked: boolean) =>
                      handleStatusChange(option.value, checked)
                    }
                  />
                  <label className="typo-body-base-regular text-content-dark-1">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Type Checkboxes */}
          <div className="flex flex-col gap-1 space-y-2">
            <label className={cn('typo-body-base-semibold text-neutral-90')}>Loại nhân viên</label>
            <div className="flex flex-wrap gap-6">
              {employeeTypeOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={watchedEmployeeTypes.includes(option.value)}
                    onCheckedChange={(checked: boolean) =>
                      handleEmployeeTypeChange(option.value, checked)
                    }
                  />
                  <label className="typo-body-base-regular text-content-dark-1">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </Flex>
      </Form>
    )
  }
)

EmployeeFilterForm.displayName = 'EmployeeFilterForm'

export default EmployeeFilterForm
