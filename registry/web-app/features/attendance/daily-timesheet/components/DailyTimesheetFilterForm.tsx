import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Flex, Grid } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { Checkbox, Select } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import type { DailyTimesheetFilterFormValues } from '@/features/attendance/daily-timesheet/hooks/useDailyTimesheetFilter'
import type { LoadOptionsParams, SelectOption } from '@/components/ui/select'
import { getRealEstateService } from '@/services'
import { QUERY_KEYS } from '@/constants/query-keys'
import { type GetProjectsParams } from '@/services/realestate-service'
import {
  getAttendanceDeviceService,
  type GetAttendanceDevicesParams,
} from '@/features/attendance/services/attendance-device-service'
import {
  DailyTimesheetStatus,
  TimesheetLogMethod as FirstLogMethod,
} from '@/constants/api-schema-aliases'

export type DailyTimesheetFilterFormRef = {
  clearForm: () => void
  getValues: () => Record<string, unknown>
  getRawValues: () => DailyTimesheetFilterFormValues
  trigger: () => Promise<boolean>
  isValid?: () => boolean
}

type DailyTimesheetFilterFormProps = {
  initialValues?: DailyTimesheetFilterFormValues
  onValidationChange?: (isValid: boolean) => void
}

// Fallback labels for statuses present in the schema enum but not yet returned by the BE
// app-constant `TimeSheetEntry_STATUS_CHOICES` — currently only `not_checked_in` (a derived
// "no check-in" state). Remove an entry here once BE adds its label to the constant.
const STATUS_FALLBACK_LABELS: Partial<Record<DailyTimesheetStatus, string>> = {
  [DailyTimesheetStatus.not_checked_in]: 'Chưa chấm công',
}

// Nhãn phương thức log đầu tiên (giá trị filter phải khớp enum first_log_method)
const FIRST_LOG_METHOD_LABELS: Record<FirstLogMethod, string> = {
  [FirstLogMethod.biometric_device]: 'Chấm công vân tay',
  [FirstLogMethod.geolocation]: 'Chấm công GPS',
  [FirstLogMethod.wifi]: 'Chấm công WiFi',
  [FirstLogMethod.other]: 'Khác',
}

const FIRST_LOG_METHOD_OPTIONS = Object.values(FirstLogMethod).map((value) => ({
  value,
  label: FIRST_LOG_METHOD_LABELS[value],
}))

// Cache 5 phút cho options/chi tiết dự án (đồng bộ với các màn lọc khác)
const PROJECT_OPTIONS_STALE_TIME = 1000 * 60 * 5

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
  date: z
    .union([z.date(), z.string().min(1, { message: 'Vui lòng chọn ngày chấm công' })])
    .optional(),
  statuses: z.array(z.nativeEnum(DailyTimesheetStatus)).optional(),
  // Clearable Selects emit `null` when cleared — allow null (not just undefined),
  // otherwise leaving the field empty fails validation and blocks "Áp dụng".
  first_log_method: z.nativeEnum(FirstLogMethod).nullish(),
  first_log_project: z.number().nullish(),
  first_log_biometric_device: z.number().nullish(),
})

const DailyTimesheetFilterForm = forwardRef<
  DailyTimesheetFilterFormRef,
  DailyTimesheetFilterFormProps
>(({ initialValues, onValidationChange }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const queryClient = useQueryClient()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES],
  })

  const statusOptions = useMemo(() => {
    const serverOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES) ?? []
    const providedValues = new Set(serverOptions.map((option) => String(option.value)))
    // Drive the list from the schema enum: any status the BE app-constant doesn't return yet is
    // appended (keeping the BE order/labels first), with its label coming from STATUS_FALLBACK_LABELS.
    const missingOptions = Object.values(DailyTimesheetStatus)
      .filter((value) => !providedValues.has(value))
      .map((value) => ({ value, label: STATUS_FALLBACK_LABELS[value] ?? value }))
    return [...serverOptions, ...missingOptions]
  }, [keysMapOptions])

  const { control, reset, getValues, handleSubmit, watch, setValue, register, formState, trigger } =
    useForm<DailyTimesheetFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        position_id: initialValues?.position_id,
        date: initialValues?.date || new Date(),
        statuses: initialValues?.statuses || [],
        first_log_method: initialValues?.first_log_method,
        first_log_project: initialValues?.first_log_project,
        first_log_biometric_device: initialValues?.first_log_biometric_device,
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
        date: initialValues.date || new Date(),
        statuses: initialValues.statuses || [],
        first_log_method: initialValues.first_log_method,
        first_log_project: initialValues.first_log_project,
        first_log_biometric_device: initialValues.first_log_biometric_device,
      })
      setFormKey((prev) => prev + 1)
    }
  }, [initialValues, reset])

  const selectedFirstLogMethod = watchedValues.first_log_method

  // Xóa giá trị của controller phụ thuộc khi phương thức đổi sang loại không tương ứng,
  // để giá trị đã ẩn không bị giữ lại trong form state.
  useEffect(() => {
    if (
      selectedFirstLogMethod !== FirstLogMethod.geolocation &&
      getValues('first_log_project') != null
    ) {
      setValue('first_log_project', undefined, { shouldDirty: true, shouldValidate: true })
    }
    if (
      selectedFirstLogMethod !== FirstLogMethod.biometric_device &&
      getValues('first_log_biometric_device') != null
    ) {
      setValue('first_log_biometric_device', undefined, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [selectedFirstLogMethod, getValues, setValue])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        branch_id: undefined,
        block_id: undefined,
        department_id: undefined,
        position_id: undefined,
        date: new Date(),
        statuses: [],
        first_log_method: undefined,
        first_log_project: undefined,
        first_log_biometric_device: undefined,
      })
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => {
      return getValues()
    },
    getValues: () => {
      const values = getValues()
      const apiParams: Record<string, unknown> = {}

      if (values.branch_id) apiParams.branch = values.branch_id
      if (values.block_id) apiParams.block = values.block_id
      if (values.department_id) apiParams.department = values.department_id
      if (values.position_id) apiParams.position = values.position_id

      if (values.date instanceof Date) {
        apiParams.date = values.date
      }

      if (values.statuses && values.statuses.length > 0) {
        apiParams.status__in = values.statuses
      }

      if (values.first_log_method) apiParams.first_log_method = values.first_log_method
      // Chỉ gửi field phụ thuộc khớp với phương thức đang chọn (tránh gửi field đã ẩn)
      if (values.first_log_method === FirstLogMethod.geolocation && values.first_log_project) {
        apiParams.first_log_project = values.first_log_project
      }
      if (
        values.first_log_method === FirstLogMethod.biometric_device &&
        values.first_log_biometric_device
      ) {
        apiParams.first_log_biometric_device = values.first_log_biometric_device
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
    (data: CascadeSelectFormData) => {
      const current = getValues()

      if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
        setValue('branch_id', data.branch_id > 0 ? data.branch_id : undefined, {
          shouldDirty: false,
        })
        setValue('block_id', undefined, { shouldDirty: false })
        setValue('department_id', undefined, { shouldDirty: false })
      }

      if (data.block_id !== undefined && data.block_id !== current.block_id) {
        setValue('block_id', data.block_id > 0 ? data.block_id : undefined, {
          shouldDirty: false,
        })
        setValue('department_id', undefined, { shouldDirty: false })
      }

      if (data.department_id !== undefined && data.department_id !== current.department_id) {
        setValue('department_id', data.department_id > 0 ? data.department_id : undefined, {
          shouldDirty: false,
        })
      }

      if (data.position_id !== undefined && data.position_id !== current.position_id) {
        setValue('position_id', data.position_id > 0 ? data.position_id : undefined, {
          shouldDirty: false,
        })
      }
    },
    [getValues, setValue]
  )

  const loadProjectOptions = useCallback(
    async (params: LoadOptionsParams) => {
      const requestParams: GetProjectsParams = {
        page: params.page,
        page_size: params.pageSize,
        search: params.query || undefined,
      }
      const response = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.REALESTATE.PROJECTS.LIST(requestParams),
        queryFn: () => getRealEstateService().getProjects(requestParams),
        staleTime: PROJECT_OPTIONS_STALE_TIME,
      })
      const items =
        response.results?.map((project) => ({
          value: project.id,
          label: project.name,
        })) || []
      return {
        items,
        nextCursor: response.next,
        hasNextPage: !!response.next,
      }
    },
    [queryClient]
  )

  // Resolve nhãn cho dự án được prefill từ URL (điều hướng từ báo cáo chấm công theo dự án).
  // Select async chỉ nạp options qua loadOptions khi mở dropdown, nên cần loadInitialOptions
  // để hiển thị tên dự án của giá trị đã chọn sẵn.
  const loadInitialProjectOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values.length) return []
      const projectId = Number(values[0])
      if (!projectId) return []

      try {
        const project = await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.REALESTATE.PROJECTS.DETAIL(projectId),
          queryFn: () => getRealEstateService().getProject(projectId),
          staleTime: PROJECT_OPTIONS_STALE_TIME,
        })
        if (project) {
          return [{ value: project.id, label: project.name || '' }]
        }
      } catch {
        // Bỏ qua — nếu không lấy được, Select giữ giá trị id đã chọn
      }
      return []
    },
    [queryClient]
  )

  const loadBiometricDeviceOptions = useCallback(async (params: LoadOptionsParams) => {
    const requestParams: GetAttendanceDevicesParams = {
      page: params.page,
      page_size: params.pageSize,
      search: params.query,
    }
    const response = await getAttendanceDeviceService().getAttendanceDevices(requestParams)
    const items =
      response.results?.map((device) => ({
        value: device.id,
        label: device.name,
      })) || []
    return {
      items,
      nextCursor: response.next,
      hasNextPage: !!response.next,
    }
  }, [])

  const onSubmit = async () => {
    // Handled by parent via ref
  }

  const handleStatusChange = useCallback(
    (statusValue: string, checked: boolean) => {
      const currentStatuses = watchedValues.statuses || []
      if (checked) {
        setValue('statuses', [...currentStatuses, statusValue] as DailyTimesheetStatus[], {
          shouldDirty: true,
          shouldValidate: true,
        })
        return
      }

      setValue(
        'statuses',
        currentStatuses.filter((value) => value !== statusValue),
        { shouldDirty: true, shouldValidate: true }
      )
    },
    [setValue, watchedValues.statuses]
  )

  const cascadeValues = useMemo(() => {
    return {
      branch: watchedValues.branch_id ? String(watchedValues.branch_id) : undefined,
      block: watchedValues.block_id ? String(watchedValues.block_id) : undefined,
      department: watchedValues.department_id ? String(watchedValues.department_id) : undefined,
      position: watchedValues.position_id ? String(watchedValues.position_id) : undefined,
    }
  }, [
    watchedValues.branch_id,
    watchedValues.block_id,
    watchedValues.department_id,
    watchedValues.position_id,
  ])

  const statusesValue = watchedValues.statuses || []

  return (
    <Form key={formKey} loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
      <Flex direction="column" gap="5">
        <div className="flex flex-col gap-2">
          <FormController
            register={register}
            name="date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày chấm công',
              required: true,
              placeholder: 'DD/MM/YYYY',
              allowManualInput: true,
              clearable: false,
            }}
          />
        </div>

        <CascadeSelectGroupOrganization
          initialValues={cascadeValues}
          onFormChange={handleCascadeChange}
          showEmployee={false}
          showPosition
          skipValidation
          className="gap-5"
        />

        <Grid columns="2" gap="5">
          <FormController
            register={register}
            name="first_log_method"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Phương thức chấm công (Giờ vào)',
              placeholder: 'Chọn phương thức',
              options: FIRST_LOG_METHOD_OPTIONS,
              isClearable: true,
            }}
          />
          {selectedFirstLogMethod === FirstLogMethod.biometric_device && (
            <FormController
              register={register}
              name="first_log_biometric_device"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Máy chấm công',
                placeholder: 'Chọn máy chấm công',
                loadOptions: loadBiometricDeviceOptions,
                enableSearch: true,
                isClearable: true,
                searchPlaceholder: 'Tìm kiếm máy chấm công...',
              }}
            />
          )}
          {selectedFirstLogMethod === FirstLogMethod.geolocation && (
            <FormController
              register={register}
              name="first_log_project"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Dự án chấm công',
                placeholder: 'Chọn dự án',
                loadOptions: loadProjectOptions,
                loadInitialOptions: loadInitialProjectOptions,
                enableSearch: true,
                isClearable: true,
                searchPlaceholder: 'Tìm kiếm dự án...',
              }}
            />
          )}
        </Grid>

        <div className="flex flex-col gap-2 space-y-2">
          <span className="typo-body-base-semibold text-content-dark-2 mb-0">Trạng thái</span>
          <div className="flex flex-wrap gap-6">
            {statusOptions.map((option: { value: string; label: string }) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  checked={statusesValue.map(String).includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleStatusChange(option.value, checked as boolean)
                  }
                />
                <span className="typo-body-base-regular text-content-dark-1">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Flex>
    </Form>
  )
})

DailyTimesheetFilterForm.displayName = 'DailyTimesheetFilterForm'

export default DailyTimesheetFilterForm
