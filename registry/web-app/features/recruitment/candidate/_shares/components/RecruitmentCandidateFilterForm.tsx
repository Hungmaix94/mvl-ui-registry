import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex, Grid } from '@radix-ui/themes'
import { Checkbox, Select } from '@/components/ui'
import { PAGE_SIZE } from '@/constants/table.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useRecruitmentRequestSelect } from '@/hooks/useRecruitmentRequestSelect.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { useRecruitmentSourceSelect } from '@/hooks/useRecruitmentSourceSelect.ts'
import { useRecruitmentChannelSelect } from '@/hooks/useRecruitmentChannelSelect.ts'

export type RecruitmentCandidateFilterFormRef = {
  clearForm: () => void
  getValues?: () => RecruitmentCandidateFilterForm
}

type RecruitmentCandidateFilterFormProps = {
  initialValues?: Record<string, any>
}

type RecruitmentCandidateFilterForm = {
  dateRange?: DateRange | null
  onboardDateRange?: DateRange | null
  statuses?: string[]
  employee_types?: string[]
  is_return_candidate?: 'true' | 'false' | null
  is_employee_created?: 'true' | 'false' | null
  recruitment_request?: number | null
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
  recruitment_source?: number | null
  recruitment_channel?: number | null
}

const Schema = z.object({
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  onboardDateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  statuses: z.array(z.string()).optional(),
  employee_types: z.array(z.string()).optional(),
  is_return_candidate: z.enum(['true', 'false']).nullable().optional(),
  is_employee_created: z.enum(['true', 'false']).nullable().optional(),
  recruitment_request: z.number().nullable().optional(),
  branch: z.number().optional(),
  block: z.number().optional(),
  department: z.number().optional(),
  branchName: z.string().optional(),
  blockName: z.string().optional(),
  departmentName: z.string().optional(),
  recruitment_source: z.number().nullable().optional(),
  recruitment_channel: z.number().nullable().optional(),
})

const DEFAULT_FORM_VALUES: RecruitmentCandidateFilterForm = {
  dateRange: null,
  onboardDateRange: null,
  statuses: [],
  employee_types: [],
  is_return_candidate: null,
  is_employee_created: null,
  recruitment_request: null,
  branch: undefined,
  block: undefined,
  department: undefined,
  branchName: undefined,
  blockName: undefined,
  departmentName: undefined,
  recruitment_source: null,
  recruitment_channel: null,
}

const RecruitmentCandidateFilterForm = forwardRef<
  RecruitmentCandidateFilterFormRef,
  RecruitmentCandidateFilterFormProps
>(({ initialValues }, ref) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS,
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES,
    ],
  })
  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS) || []
      : []
  }, [keysMapOptions])
  const employeeTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES) || []
      : []
  }, [keysMapOptions])

  const [isLoading, setIsLoading] = useState(false)
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
  const [formKey, setFormKey] = useState(0)

  const { loadRecruitmentRequestOptions, loadInitialRecruitmentRequestOptions } =
    useRecruitmentRequestSelect({
      pageSize: PAGE_SIZE,
    })
  const { loadRecruitmentSourceOptions, loadInitialRecruitmentSourceOptions } =
    useRecruitmentSourceSelect()
  const { loadRecruitmentChannelOptions, loadInitialRecruitmentChannelOptions } =
    useRecruitmentChannelSelect()

  const { control, handleSubmit, register, reset, getValues, watch, setValue } =
    useForm<RecruitmentCandidateFilterForm>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        dateRange: initialValues?.dateRange || null,
        onboardDateRange: initialValues?.onboardDateRange ?? null,
        statuses: initialValues?.statuses || [],
        employee_types: initialValues?.employee_types || [],
        is_return_candidate: initialValues?.is_return_candidate ?? null,
        is_employee_created: initialValues?.is_employee_created ?? null,
        recruitment_request: initialValues?.recruitment_request || null,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
        recruitment_source: initialValues?.recruitment_source ?? null,
        recruitment_channel: initialValues?.recruitment_channel ?? null,
      },
    })
  // Watch statuses for controlled checkboxes
  const watchedStatuses = watch('statuses') || []
  const watchedEmployeeTypes = watch('employee_types') || []

  const onSubmit = async (_data: RecruitmentCandidateFilterForm) => {
    setIsLoading(true)
    try {
      // Form submission is handled by parent component
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (statusValue: string, checked: boolean) => {
    const currentStatuses = watchedStatuses
    if (checked) {
      setValue('statuses', [...currentStatuses, statusValue])
    } else {
      setValue(
        'statuses',
        currentStatuses.filter((s) => s !== statusValue)
      )
    }
  }
  const handleEmployeeTypeChange = (typeValue: string, checked: boolean) => {
    const currentTypes = watchedEmployeeTypes
    if (checked) {
      setValue('employee_types', [...currentTypes, typeValue])
    } else {
      setValue(
        'employee_types',
        currentTypes.filter((value) => value !== typeValue)
      )
    }
  }

  const handleCascadeChange = useCallback(
    (vals: {
      branch_id?: number
      block_id?: number
      department_id?: number
      branch_name?: string
      block_name?: string
      department_name?: string
    }) => {
      const nextBranch = vals.branch_id ? vals.branch_id : undefined
      const nextBlock = vals.block_id ? vals.block_id : undefined
      const nextDept = vals.department_id ? vals.department_id : undefined
      const nextBranchName = vals.branch_name ?? undefined
      const nextBlockName = vals.block_name ?? undefined
      const nextDeptName = vals.department_name ?? undefined

      const current = getValues()
      const changed =
        current.branch !== nextBranch ||
        current.block !== nextBlock ||
        current.department !== nextDept ||
        current.branchName !== nextBranchName ||
        current.blockName !== nextBlockName ||
        current.departmentName !== nextDeptName

      if (!changed) return

      setValue('branch', nextBranch, { shouldDirty: false, shouldValidate: false })
      setValue('block', nextBlock, { shouldDirty: false, shouldValidate: false })
      setValue('department', nextDept, { shouldDirty: false, shouldValidate: false })
      setValue('branchName', nextBranchName, { shouldDirty: false, shouldValidate: false })
      setValue('blockName', nextBlockName, { shouldDirty: false, shouldValidate: false })
      setValue('departmentName', nextDeptName, { shouldDirty: false, shouldValidate: false })
    },
    [getValues, setValue]
  )

  // Update form values when initialValues change
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        ...DEFAULT_FORM_VALUES,
        dateRange: initialValues?.dateRange ?? null,
        onboardDateRange: initialValues?.onboardDateRange ?? null,
        statuses: initialValues?.statuses ?? [],
        employee_types: initialValues?.employee_types ?? [],
        is_return_candidate: initialValues?.is_return_candidate ?? null,
        is_employee_created: initialValues?.is_employee_created ?? null,
        recruitment_request: initialValues?.recruitment_request ?? null,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
        recruitment_source: initialValues?.recruitment_source ?? null,
        recruitment_channel: initialValues?.recruitment_channel ?? null,
      })
      setShouldResetToInitial(false)
    }
  }, [initialValues, reset, shouldResetToInitial])

  // Set initial form values when component mounts or initialValues change
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      reset({
        ...DEFAULT_FORM_VALUES,
        dateRange: initialValues?.dateRange ?? null,
        onboardDateRange: initialValues?.onboardDateRange ?? null,
        statuses: initialValues?.statuses ?? [],
        employee_types: initialValues?.employee_types ?? [],
        is_return_candidate: initialValues?.is_return_candidate ?? null,
        is_employee_created: initialValues?.is_employee_created ?? null,
        recruitment_request: initialValues?.recruitment_request ?? null,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
        recruitment_source: initialValues?.recruitment_source ?? null,
        recruitment_channel: initialValues?.recruitment_channel ?? null,
      })
    }
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        setFormKey((prev) => prev + 1)
        reset(
          {
            ...DEFAULT_FORM_VALUES,
          },
          {
            keepDefaultValues: false,
          }
        )
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  return (
    <>
      <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
        <Flex direction={'column'} gap={'4'}>
          <Grid columns={'2'} gap={'4'}>
            {/* Date Range */}
            <FormController
              register={register}
              name="dateRange"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                label: 'Khoảng thời gian nộp đơn',
                className: 'w-full',
                showQuickSelect: true,
                onApply: (_range: DateRange | undefined) => {
                  // DateRangePicker will call onChange automatically via FormController
                },
                onCancel: () => {
                  // Handle cancel if needed
                },
              }}
            />

            <FormController
              register={register}
              name="onboardDateRange"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                label: 'Khoảng thời gian nhận việc',
                className: 'w-full',
                showQuickSelect: true,
              }}
            />
          </Grid>

          {/* Status Checkboxes */}
          <div className="flex flex-col gap-2 space-y-2">
            <span className="typo-body-base-semibold text-content-dark-2 mb-0">Trạng thái</span>
            <div className="flex flex-wrap gap-6">
              {statusOptions.map((option: { value: string; label: string }) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`recruitment-candidate-filter-status-${option.value}`}
                    checked={watchedStatuses.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(option.value, checked as boolean)
                    }
                    label={option.label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 space-y-2">
            <span className="typo-body-base-semibold text-content-dark-2 mb-0">Loại nhân viên</span>
            <div className="flex flex-wrap gap-6">
              {employeeTypeOptions.map((option: { value: string; label: string }) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`recruitment-candidate-filter-employee-type-${option.value}`}
                    checked={watchedEmployeeTypes.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleEmployeeTypeChange(option.value, checked as boolean)
                    }
                    label={option.label}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Chi nhánh - Khối - Phòng ban */}
          <CascadeSelectGroupOrganization
            key={`org-${formKey}`}
            initialValues={
              formKey === 0
                ? {
                    branch: initialValues?.branch ? String(initialValues.branch) : undefined,
                    block: initialValues?.block ? String(initialValues.block) : undefined,
                    department: initialValues?.department
                      ? String(initialValues.department)
                      : undefined,
                  }
                : undefined
            }
            showEmployee={false}
            skipValidation
            onFormChange={handleCascadeChange}
            className="w-full"
          />

          <Grid columns={'3'} gap={'5'}>
            {/* Recruitment Request Select */}
            <FormController
              register={register}
              name="recruitment_request"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Đề nghị tuyển dụng',
                placeholder: 'Chọn đề nghị',
                loadOptions: loadRecruitmentRequestOptions,
                loadInitialOptions: loadInitialRecruitmentRequestOptions,
                pageSize: PAGE_SIZE,
                searchPlaceholder: 'Tìm kiếm đề nghị tuyển dụng',
                enableSearch: true,
                className: 'w-full',
              }}
            />

            <FormController
              register={register}
              name="is_return_candidate"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Ứng viên quay lại',
                placeholder: 'Tất cả',
                options: [
                  { label: 'Có', value: 'true' },
                  { label: 'Không', value: 'false' },
                ],
                clearable: true,
                className: 'w-full',
              }}
            />

            <FormController
              register={register}
              name="is_employee_created"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Đã chuyển nhân viên',
                placeholder: 'Tất cả',
                options: [
                  { label: 'Đã được chuyển', value: 'true' },
                  { label: 'Chưa được chuyển', value: 'false' },
                ],
                clearable: true,
                className: 'w-full',
              }}
            />

            {/* Nguồn tuyển dụng */}
            <FormController
              register={register}
              name="recruitment_source"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Nguồn tuyển dụng',
                placeholder: 'Chọn nguồn',
                loadOptions: loadRecruitmentSourceOptions,
                loadInitialOptions: loadInitialRecruitmentSourceOptions,
                searchPlaceholder: 'Tìm kiếm nguồn tuyển dụng...',
                enableSearch: true,
                async: true,
                className: 'w-full',
              }}
            />

            {/* Kênh tuyển dụng */}
            <FormController
              register={register}
              name="recruitment_channel"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Kênh tuyển dụng',
                placeholder: 'Chọn kênh',
                loadOptions: loadRecruitmentChannelOptions,
                loadInitialOptions: loadInitialRecruitmentChannelOptions,
                searchPlaceholder: 'Tìm kiếm kênh tuyển dụng...',
                enableSearch: true,
                async: true,
                className: 'w-full',
              }}
            />
          </Grid>
        </Flex>
      </Form>
    </>
  )
})

RecruitmentCandidateFilterForm.displayName = 'RecruitmentCandidateFilterForm'

export default RecruitmentCandidateFilterForm
