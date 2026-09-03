import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Button, Grid, Select, TextField } from '@/components/ui'
import { RadioGroup } from '@/components/ui/radio-group.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import {
  type RecruitmentRequest,
  useCreateRecruitmentRequest,
  useUpdateRecruitmentRequest,
} from '@/features/recruitment/services/recruitment-request-service'
import { getJobDescriptionService } from '@/features/recruitment/services/job-description-service'
import {
  RecruitmentRequestCreateFormData,
  recruitmentRequestCreateSchema,
} from '@/features/recruitment/request/_shares/schema/recruitment-request-create-schema.ts'
import useRecruitmentOptions from '@/features/recruitment/request/_shares/hooks/useRecruitmentOptions.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import { useJobDescriptionSelect } from '@/hooks/useJobDescriptionSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import { useAuth } from '@/hooks/useAuth.ts'
import { RecruitmentRequestType, RecruitmentRequestStatus } from '@/constants/api-schema-aliases'
type RecruitmentRequestFormProps = {
  mode: 'create' | 'edit'
  initialValues?: RecruitmentRequest
  onSuccess?: () => void
  onCancel?: () => void
}

const RecruitmentRequestForm = ({
  mode,
  initialValues,
  onSuccess,
  onCancel,
}: RecruitmentRequestFormProps) => {
  const isEditMode = mode === 'edit'

  // Mutations
  const createRequestMutation = useCreateRecruitmentRequest()
  const updateRequestMutation = useUpdateRecruitmentRequest()
  const isPending = isEditMode ? updateRequestMutation.isPending : createRequestMutation.isPending

  // Auth for default proposer (create mode only)
  const { user } = useAuth()
  const [defaultProposerId, setDefaultProposerId] = useState<number | undefined>(undefined)
  const [positionDisplay, setPositionDisplay] = useState<string>('')

  const { recruitmentTypeOptions, statusOptions } = useRecruitmentOptions()

  // Use job description select hook for load on scrolling
  const { loadJobDescriptionOptions, loadInitialJobDescriptionOptions } = useJobDescriptionSelect({
    pageSize: PAGE_SIZE,
  })

  // Use employee select hook for load on scrolling
  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
    pageSize: PAGE_SIZE,
    fields: ['code', 'id', 'fullname', 'username'],
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
    setError,
  } = useForm<RecruitmentRequestCreateFormData>({
    resolver: zodResolver(recruitmentRequestCreateSchema),
    mode: isEditMode ? 'onSubmit' : 'onChange',
    defaultValues: {
      name: '',
      job_description_id: undefined,
      branch_id: undefined,
      block_id: undefined,
      department_id: undefined,
      proposer_id: undefined,
      recruitment_type: RecruitmentRequestType.NEW_HIRE,
      status: RecruitmentRequestStatus.DRAFT,
      proposed_salary: '',
      number_of_positions: isEditMode ? 1 : undefined,
      requirements: '',
      benefits: '',
    },
    shouldFocusError: true,
  })

  // Store initial form data for edit mode
  const [initialFormData, setInitialFormData] = useState<RecruitmentRequestCreateFormData | null>(
    null
  )

  // Cascade select initial values (edit mode only)
  const cascadeInitialValues = useMemo(() => {
    if (!isEditMode || !initialValues) return undefined
    return {
      branch: initialValues.branch?.id?.toString(),
      block: initialValues.block?.id?.toString(),
      department: initialValues.department?.id?.toString(),
    }
  }, [isEditMode, initialValues])

  const jobDescriptionId = watch('job_description_id')
  const requirements = watch('requirements')
  const benefits = watch('benefits')

  const renderRichText = (htmlContent: string | null | undefined) => {
    if (!htmlContent) return ''

    return (
      <div
        className="prose prose-sm text-content-dark-4 max-w-none [&_h1]:text-inherit [&_h2]:text-inherit [&_h3]:text-inherit [&_li]:leading-6 [&_p]:mb-2 [&_p]:leading-6 [&_strong]:text-inherit [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    )
  }

  // Set default proposer to current user's employee (create mode only)
  useEffect(() => {
    if (isEditMode) return

    const employeeData = user?.employee as any
    if (employeeData && typeof employeeData === 'object' && employeeData.id && !defaultProposerId) {
      setDefaultProposerId(employeeData.id)
      reset(
        {
          name: '',
          job_description_id: undefined,
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
          proposer_id: employeeData.id,
          recruitment_type: RecruitmentRequestType.NEW_HIRE,
          status: RecruitmentRequestStatus.DRAFT,
          proposed_salary: '',
          number_of_positions: undefined,
          requirements: '',
          benefits: '',
        },
        { keepDefaultValues: false }
      )
    }
  }, [isEditMode, user?.employee, defaultProposerId, reset])

  // Transform initial values for edit mode
  useEffect(() => {
    if (!isEditMode || !initialValues) return

    const d = initialValues
    const formData = {
      name: d.name || '',
      job_description_id: d.job_description.id,
      branch_id: d.branch?.id,
      block_id: d.block?.id,
      department_id: d.department?.id,
      proposer_id: d.proposer.id,
      proposed_salary: d.proposed_salary,
      number_of_positions: d.number_of_positions || 1,
      requirements: d.job_description?.requirement || '',
      benefits: d.job_description?.benefit || '',
      recruitment_type: d.colored_recruitment_type?.value
        ? (d.colored_recruitment_type.value as RecruitmentRequestType)
        : RecruitmentRequestType.NEW_HIRE,
      status: d.colored_status?.value
        ? (d.colored_status.value as RecruitmentRequestStatus)
        : RecruitmentRequestStatus.DRAFT,
    }
    // Set position display separately (not part of form)
    setPositionDisplay(`${d.job_description?.code || ''} - ${d.job_description?.title || ''}`)
    setInitialFormData(formData)
  }, [isEditMode, initialValues])

  // Delayed form setting for edit mode
  useEffect(() => {
    if (initialFormData) {
      reset(initialFormData)
    }
  }, [initialFormData, reset])

  // Load job description details when selected
  useEffect(() => {
    if (!jobDescriptionId) return

    getJobDescriptionService()
      .getJobDescription(Number(jobDescriptionId))
      .then((jd) => {
        if (jd) {
          setPositionDisplay(`${jd.code} - ${jd.title}` || '')
          setValue('requirements', jd.requirement || '', { shouldDirty: true })
          setValue('benefits', jd.benefit || '', { shouldDirty: true })
          // Auto-fill salary only in create mode
          if (!isEditMode) {
            setValue('proposed_salary', jd.proposed_salary || '', { shouldDirty: true })
          }
        }
      })
      .catch((error: any) => {
        console.error('Error loading job description:', error)
      })
  }, [jobDescriptionId, setValue, isEditMode])

  const onSubmit = useCallback(
    async (data: RecruitmentRequestCreateFormData) => {
      try {
        // Field names match API, no mapping needed
        const apiData = {
          name: data.name?.trim(),
          job_description_id: Number(data.job_description_id),
          branch_id: Number(data.branch_id),
          block_id: Number(data.block_id),
          department_id: Number(data.department_id),
          proposer_id: Number(data.proposer_id),
          recruitment_type: data.recruitment_type,
          status: data.status,
          proposed_salary: data.proposed_salary,
          number_of_positions: data.number_of_positions,
          requirements: data.requirements,
          benefits: data.benefits,
        }

        if (isEditMode && initialValues) {
          await updateRequestMutation.mutateAsync({
            id: initialValues.id,
            data: apiData as any,
          })
          toastService.success('Cập nhật đề nghị tuyển dụng thành công.')
        } else {
          await createRequestMutation.mutateAsync(apiData)
          toastService.success('Tạo đề nghị tuyển dụng thành công.')
        }
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [isEditMode, initialValues, createRequestMutation, updateRequestMutation, onSuccess, setError]
  )

  const formTitle = isEditMode ? 'Chỉnh sửa đề nghị tuyển dụng' : 'Tạo mới đề nghị tuyển dụng'

  return (
    <Form loading={isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="6" className="w-full px-10 py-4">
        <Text className="typo-body-xl-semibold text-content-dark-1">{formTitle}</Text>

        <Flex direction="column" gap="4">
          <FormController
            register={register}
            name="name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên đề nghị',
              required: true,
              placeholder: 'Nhập tên đề nghị',
              showCharacterCount: true,
              maxLength: 255,
              disabled: isPending,
            }}
          />

          <FormController
            register={register}
            name="job_description_id"
            control={control}
            Field={Select}
            key={
              isEditMode
                ? `job-description-${initialFormData?.job_description_id || 'none'}`
                : undefined
            }
            fieldProps={{
              label: 'Mô tả công việc',
              required: true,
              placeholder: 'Nhập/chọn mô tả công việc',
              loadOptions: loadJobDescriptionOptions,
              loadInitialOptions: loadInitialJobDescriptionOptions,
              pageSize: PAGE_SIZE,
              searchPlaceholder: 'Tìm kiếm mô tả công việc...',
              enableSearch: true,
              disabled: isPending,
              className: 'flex-1',
            }}
          />

          <TextField label="Vị trí tuyển dụng" value={positionDisplay} disabled />

          <CascadeSelectGroupOrganization
            initialValues={cascadeInitialValues}
            showEmployee={false}
            layout="grid"
            branchRequired
            blockRequired
            departmentRequired
            formErrors={{
              branch_id: errors.branch_id,
              block_id: errors.block_id,
              department_id: errors.department_id,
            }}
            onFormChange={(data) => {
              const branchValue = data.branch_id > 0 ? data.branch_id : (undefined as any)
              const blockValue = data.block_id > 0 ? data.block_id : (undefined as any)
              const departmentValue =
                data.department_id && data.department_id > 0
                  ? data.department_id
                  : (undefined as any)

              setValue('branch_id', branchValue, {
                shouldDirty: true,
                shouldValidate: errors.branch_id !== undefined,
              })
              setValue('block_id', blockValue, {
                shouldDirty: true,
                shouldValidate: errors.block_id !== undefined,
              })
              setValue('department_id', departmentValue, {
                shouldDirty: true,
                shouldValidate: errors.department_id !== undefined,
              })
            }}
          />

          <FormController
            register={register}
            name="proposer_id"
            control={control}
            Field={Select}
            key={isEditMode ? `proposer-${initialFormData?.proposer_id || 'none'}` : undefined}
            fieldProps={{
              label: 'Người đề xuất',
              required: true,
              placeholder: 'Nhập/chọn họ tên hoặc mã nhân viên',
              loadOptions: loadEmployeeOptions,
              loadInitialOptions: loadInitialEmployeeOptions,
              pageSize: PAGE_SIZE,
              searchPlaceholder: 'Tìm kiếm nhân viên...',
              enableSearch: true,
              disabled: isPending,
            }}
          />

          <Grid cols="2" gap="4">
            <FormController
              register={register}
              name="recruitment_type"
              control={control}
              Field={RadioGroup}
              fieldProps={{
                label: 'Loại tuyển dụng',
                required: true,
                options: recruitmentTypeOptions,
                disabled: isPending,
              }}
            />

            <FormController
              register={register}
              name="status"
              control={control}
              Field={RadioGroup}
              fieldProps={{
                label: 'Trạng thái',
                required: true,
                options: statusOptions,
                disabled: isPending,
              }}
            />
          </Grid>

          <Grid cols="2" gap="4">
            <FormController
              register={register}
              name="proposed_salary"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Mức lương',
                required: true,
                placeholder: 'Nhập mức lương',
                showCharacterCount: true,
                maxLength: 50,
                className: 'flex-1',
                disabled: isPending,
              }}
            />

            <FormController
              register={register}
              name="number_of_positions"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Số lượng',
                required: true,
                type: 'number',
                placeholder: 'Nhập số lượng',
                showCharacterCount: true,
                maxLength: 5,
                className: 'flex-1',
                disabled: isPending,
              }}
            />
          </Grid>

          {/* Yêu cầu */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-0.5">
              <label className="typo-body-base-semibold text-content-dark-2">Yêu cầu</label>
              <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
            </div>
            <div className="border-border-1 bg-data-light-grey-disabled min-h-[150px] rounded border p-4">
              {renderRichText(requirements)}
            </div>
            <input type="hidden" {...register('requirements')} />
          </div>

          {/* Quyền lợi */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-0.5">
              <label className="typo-body-base-semibold text-content-dark-2">Quyền lợi</label>
              <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
            </div>
            <div className="border-border-1 bg-data-light-grey-disabled min-h-[150px] rounded border p-4">
              {renderRichText(benefits)}
            </div>
            <input type="hidden" {...register('benefits')} />
          </div>
        </Flex>

        <Flex justify="end" gap="4" className="pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isPending}
            className="w-[150px]"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            loading={isPending}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default RecruitmentRequestForm
