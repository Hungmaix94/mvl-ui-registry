import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  FormProvider,
  Controller,
  type Resolver,
  SubmitHandler,
  useForm,
  useWatch,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex, Grid, Text } from '@radix-ui/themes'

import { Button, CurrencyInput, RichText, Select, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController.tsx'
import InvestorSelectWithCreate from '@/features/investor/_shares/components/InvestorSelectWithCreate.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { ProjectStaffAssignmentsTable } from './ProjectStaffAssignmentsTable'
import type {
  Project,
  ProjectRequest,
  PatchedProjectRequest,
} from '@/services/realestate-service.ts'
import {
  projectFormSchema,
  ProjectFormValues,
} from '@/features/project/_shares/types/project-form-types.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { handleApiError } from '@/utils/error-utils.ts'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils.ts'
import { PatchedProductInventoryRequestProduct_type } from '@/api/schema.ts'
import {
  ProjectPhase,
  ProjectStatus,
  ReconciliationSourceType,
} from '@/constants/api-schema-aliases'

import { useScrollToError } from '@/hooks/useScrollToError.ts'

const DATE_API_REGEX = /^\d{4}-\d{2}-\d{2}$/

function toApiDate(val: string | Date | undefined | null): string | null {
  if (val == null || val === '') return null
  if (val instanceof Date) {
    const formatted = formatDateToApi(val)
    return formatted || null
  }
  if (DATE_API_REGEX.test(val)) return val
  const formatted = formatDateToApi(val)
  return formatted || null
}

/** Chuẩn hóa input "Tổng số căn": không cho số âm, rỗng → null. */
function sanitizeTotalUnitsInput(value: string, onChange: (v: number | null) => void): void {
  const trimmed = value.trim()
  if (trimmed === '') {
    onChange(null)
    return
  }
  const n = Number(trimmed)
  if (Number.isNaN(n) || n < 0) {
    onChange(0)
    return
  }
  onChange(n)
}

type ProjectFormProps = {
  initialData?: Project
  onSubmit: (
    payload: ProjectRequest | PatchedProjectRequest,
    values: ProjectFormValues
  ) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
}

function mapProjectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    project_type: project.project_type ?? null,
    phase: project.phase ?? null,
    source_type:
      project.source_type != null && String(project.source_type).trim() !== ''
        ? project.source_type
        : null,
    status: project.status ?? ProjectStatus.active,
    is_active: project.is_active ?? true,
    investor_id: project.investor?.id ?? null,
    address: project.address ?? '',
    description: project.description ?? '',
    planned_start_date: project.planned_start_date ?? undefined,
    planned_end_date: project.planned_end_date ?? undefined,
    sale_open_date: project.sale_open_date ?? undefined,
    total_units: project.total_units ?? null,
    avg_price_estimate: project.avg_price_estimate ?? '',
    staff_assignments:
      (project as any).staff_assignments?.map((sa: any) => ({
        employee_id: sa.employee?.id || sa.employee_id,
        role: sa.role,
        effective_from: parseDateFromApi(sa.effective_from) || new Date(),
        effective_to: parseDateFromApi(sa.effective_to) || null,
        employee_detail: sa.employee,
        attachments: sa.attachments,
      })) ?? [],
  }
}

function getDefaultValues(initialData?: Project): ProjectFormValues {
  if (initialData) return mapProjectToFormValues(initialData)
  return {
    name: '',
    project_type: null,
    phase: null,
    source_type: null,
    status: ProjectStatus.active,
    is_active: true,
    investor_id: null as unknown as number,
    address: '',
    description: '',
    planned_start_date: undefined,
    planned_end_date: undefined,
    sale_open_date: undefined,
    total_units: null,
    avg_price_estimate: '',
    project_director_id: null,
    project_secretary_id: null,
    staff_assignments: [],
  }
}

export const ProjectForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit = false,
}: ProjectFormProps) => {
  const defaultValues = useMemo(() => getDefaultValues(initialData), [initialData])

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema) as Resolver<ProjectFormValues>,
    defaultValues,
    shouldFocusError: false,
  })

  const {
    register,
    control,
    reset,
    trigger,
    formState: { errors },
  } = form

  useEffect(() => {
    reset(getDefaultValues(initialData))
  }, [initialData, reset])

  useScrollToError(errors)

  const plannedStartValue = useWatch({
    name: 'planned_start_date',
    control,
  })
  const plannedEndValue = useWatch({
    name: 'planned_end_date',
    control,
  })

  const prevPlannedStartRef = useRef(plannedStartValue)
  const prevPlannedEndRef = useRef(plannedEndValue)

  useEffect(() => {
    const hasDateError = !!errors.planned_start_date || !!errors.planned_end_date
    if (!hasDateError) {
      prevPlannedStartRef.current = plannedStartValue
      prevPlannedEndRef.current = plannedEndValue
      return
    }

    const prevStart = prevPlannedStartRef.current
    const prevEnd = prevPlannedEndRef.current

    // Chỉ re-validate khi giá trị thực sự thay đổi so với lần trước có lỗi
    const changed = prevStart !== plannedStartValue || prevEnd !== plannedEndValue
    if (!changed) return

    prevPlannedStartRef.current = plannedStartValue
    prevPlannedEndRef.current = plannedEndValue

    // Khi user thay đổi một trong hai ngày sau khi đã có lỗi, re-validate cả cặp để cập nhật lỗi/hết lỗi đồng bộ
    trigger(['planned_start_date', 'planned_end_date'])
  }, [
    plannedStartValue,
    plannedEndValue,
    errors.planned_start_date,
    errors.planned_end_date,
    trigger,
  ])

  const { keysMapOptions } = useAppConstant({
    keys: [
      APP_CONSTANT_KEY.REALESTATE.PROJECT_STATUS,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_PHASE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES,
    ],
    module: 'realestate',
  })

  const statusOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.REALESTATE.PROJECT_STATUS)
        ? keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_STATUS) || []
        : [],
    [keysMapOptions]
  )
  const projectTypeOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES) || []
        : [],
    [keysMapOptions]
  )
  const phaseOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.REALESTATE.PROJECT_PHASE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PHASE_CHOICES) || []
        : [],
    [keysMapOptions]
  )
  const sourceTypeOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES) || []
        : [],
    [keysMapOptions]
  )

  const submitButtonText = useMemo(() => (initialData ? 'Lưu' : 'Tạo mới'), [initialData])

  const buildPayload = useCallback(
    (values: ProjectFormValues): ProjectRequest | PatchedProjectRequest => {
      const base = {
        name: values.name as string,
        project_type: (values.project_type ?? undefined) as
          | PatchedProductInventoryRequestProduct_type
          | undefined,
        phase: (values.phase ?? undefined) as ProjectPhase | undefined,
        source_type: (values.source_type ?? undefined) as ReconciliationSourceType | undefined,
        status: values.status as ProjectStatus,
        is_active: values.is_active,
        investor_id: values.investor_id ?? null,
        address: values.address as string,
        description: values.description ?? '',
        planned_start_date: toApiDate(
          (values.planned_start_date as string | Date | null | undefined) ?? undefined
        ),
        planned_end_date: toApiDate(
          (values.planned_end_date as string | Date | null | undefined) ?? undefined
        ),
        sale_open_date: toApiDate(
          (values.sale_open_date as string | Date | null | undefined) ?? undefined
        ),
        total_units: values.total_units ?? null,
        avg_price_estimate: values.avg_price_estimate || null,
      }

      if (isEdit) {
        const payload: PatchedProjectRequest = {
          ...base,
        }
        return payload
      }
      const payload = { ...base } as unknown as ProjectRequest
      return payload
    },
    [isEdit]
  )

  const handleSubmit: SubmitHandler<ProjectFormValues> = useCallback(
    async (values) => {
      try {
        const payload = buildPayload(values)
        await onSubmit(payload, values)
      } catch (error) {
        handleApiError(error, form.setError)
      }
    },
    [buildPayload, form.setError, onSubmit]
  )

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="my-[20px] space-y-8 px-10">
        <Flex direction="column" gap="5" className="w-full py-4">
          {/* Panel 1: Thông tin chung */}
          <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</Text>
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            <Flex direction="column" gap="4">
              {isEdit && initialData?.code && (
                <TextField
                  label="Mã dự án"
                  value={initialData.code}
                  placeholder="Mã dự án"
                  name="code"
                  type="text"
                  disabled
                />
              )}

              <FormController
                register={register}
                name="name"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Tên dự án',
                  required: true,
                  placeholder: 'Nhập tên dự án',
                  autoFocus: true,
                  disabled: isSubmitting,
                  className: 'flex-1',
                  maxLength: 150,
                  showCharacterCount: true,
                }}
              />

              <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                <FormController
                  register={register}
                  name="project_type"
                  control={control}
                  Field={Select}
                  fieldProps={{
                    label: 'Loại dự án',
                    required: true,
                    placeholder: 'Chọn loại dự án',
                    options: projectTypeOptions,
                    disabled: isSubmitting,
                    clearable: true,
                  }}
                />

                <FormController
                  register={register}
                  name="source_type"
                  control={control}
                  Field={Select}
                  fieldProps={{
                    label: 'Loại nguồn sản phẩm',
                    required: true,
                    placeholder: 'Chọn loại nguồn',
                    options: sourceTypeOptions,
                    disabled: isSubmitting,
                    clearable: true,
                  }}
                />
              </Grid>

              <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                <FormController
                  register={register}
                  name="phase"
                  control={control}
                  Field={Select}
                  fieldProps={{
                    label: 'Giai đoạn hiện tại',
                    required: true,
                    placeholder: 'Chọn giai đoạn',
                    options: phaseOptions,
                    disabled: isSubmitting,
                    clearable: true,
                  }}
                />
                <FormController
                  register={register}
                  name="status"
                  control={control}
                  Field={Select}
                  fieldProps={{
                    label: 'Trạng thái',
                    required: true,
                    options: statusOptions,
                    disabled: isSubmitting,
                  }}
                />
              </Grid>

              <FormController
                register={register}
                name="investor_id"
                control={control}
                Field={InvestorSelectWithCreate}
                fieldProps={{
                  label: 'Chủ đầu tư',
                  required: true,
                  placeholder: 'Tìm/chọn chủ đầu tư',
                  searchPlaceholder: 'Tìm kiếm chủ đầu tư...',
                  disabled: isSubmitting,
                  clearable: true,
                  initialInvestor: initialData?.investor ?? null,
                }}
              />
            </Flex>
          </div>

          {/* Panel 2: Đầu mối dự án */}
          <ProjectStaffAssignmentsTable isEdit={isEdit} />

          {/* Panel 3: Địa chỉ & Quy mô */}
          <Text className="typo-body-xl-semibold text-content-dark-1 mt-4">Địa chỉ & Quy mô</Text>
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            <Flex direction="column" gap="4">
              <FormController
                register={register}
                name="address"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Địa chỉ',
                  required: true,
                  placeholder: 'Nhập địa chỉ',
                  disabled: isSubmitting,
                  rows: 2,
                  maxCharacters: 255,
                }}
              />
              <FormController
                register={register}
                name="description"
                control={control}
                Field={RichText}
                fieldProps={{
                  label: 'Mô tả',
                  disabled: isSubmitting,
                  rows: 4,
                  maxCharacters: 500,
                }}
              />

              <Grid columns={{ initial: '1', sm: '3' }} gap="4">
                <FormController
                  register={register}
                  name="planned_start_date"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày bắt đầu dự kiến',
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                    clearable: true,
                  }}
                />
                <FormController
                  register={register}
                  name="planned_end_date"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày kết thúc dự kiến',
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                    clearable: true,
                  }}
                />
                <FormController
                  register={register}
                  name="sale_open_date"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày mở bán',
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                    clearable: true,
                  }}
                />
              </Grid>

              <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                <div data-field-name="total_units">
                  <Controller
                    name="total_units"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        value={field.value != null ? String(field.value) : ''}
                        onChange={(v: string) => sanitizeTotalUnitsInput(v, field.onChange)}
                        label="Tổng số căn"
                        placeholder="Nhập số căn"
                        disabled={isSubmitting}
                        type="number"
                        error={error?.message}
                      />
                    )}
                  />
                </div>
                <div data-field-name="avg_price_estimate">
                  <Controller
                    name="avg_price_estimate"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <CurrencyInput
                        value={field.value ? Number(field.value) : undefined}
                        onChange={(n) => field.onChange(n != null ? String(n) : '')}
                        label="Giá bán ước tính bình quân (VND)"
                        placeholder="0"
                        disabled={isSubmitting}
                        error={error?.message}
                      />
                    )}
                  />
                </div>
              </Grid>
            </Flex>
          </div>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Button variant="secondary" type="button" onClick={onCancel} className="w-[150px]">
            Huỷ
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting} className="w-[150px]">
            {submitButtonText}
          </Button>
        </Flex>
      </form>
    </FormProvider>
  )
}
