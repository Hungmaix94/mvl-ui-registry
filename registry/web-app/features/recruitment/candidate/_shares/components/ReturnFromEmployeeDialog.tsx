import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { CurrencyInput, RadioGroup, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { Flex, Grid } from '@radix-ui/themes'
import type { SelectOption } from '@/components/ui/select'
import { formatDateToApi } from '@/utils/date-utils.ts'
import type { CreateFromEmployeeRequest } from '@/features/recruitment/services/recruitment-candidate-service'
import { useCreateRecruitmentCandidateFromEmployee } from '@/features/recruitment/services/recruitment-candidate-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import type { ReturnFromEmployeePreview } from '@/features/recruitment/candidate/_shares/utils/recruitment-candidate-duplicate.ts'
import { ContractNet_percentage } from '@/api/schema.ts'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { isValid, parse } from 'date-fns'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { RecruitmentCandidateEmployeeType } from '@/constants/api-schema-aliases'

const NET_PERCENTAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: String(ContractNet_percentage.Value100), label: '100%' },
  { value: String(ContractNet_percentage.Value85), label: '85%' },
]

type NetPercentageRadioGroupProps = {
  id: string
  label: string
  disabled: boolean
  options: Array<{ value: string; label: string }>
  value?: ContractNet_percentage | null
  onChange?: (value: ContractNet_percentage) => void
  error?: string
  required?: boolean
}

function NetPercentageRadioGroup({
  value,
  onChange,
  options,
  ...props
}: NetPercentageRadioGroupProps) {
  const stringValue = value != null ? String(value) : undefined
  return (
    <RadioGroup
      {...props}
      value={stringValue}
      onChange={(next) => onChange?.(Number(next) as ContractNet_percentage)}
      options={options}
    />
  )
}

/** API `attr` → form field name. Attrs không có trong map (vd. `employee_id`) → toast (handleApiError). */
const CREATE_FROM_EMPLOYEE_VALIDATION_FIELD_MAP: Record<string, string> = {
  department_id: 'department_id',
  employee_type: 'employee_type',
  job_title: 'job_title',
  policy_start_date: 'policy_start_date',
  policy_end_date: 'policy_end_date',
  base_salary: 'base_salary',
  base_salary_percentage: 'base_salary_percentage',
  keep_seniority: 'keep_seniority',
  return_date: 'return_date',
  note: 'note',
}

function preprocessDateDdMmYyyy(value: unknown): Date | null | undefined {
  if (value == null) return value as null | undefined
  if (value instanceof Date) return isValid(value) ? value : value
  if (typeof value !== 'string') return value as any

  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parse(trimmed, DATE_FORMAT, new Date())
  return isValid(parsed) ? parsed : (value as any)
}

const returnFromEmployeeSchema = z.object({
  branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh'),
  block_id: z.number().min(1, 'Vui lòng chọn khối'),
  department_id: z.number().min(1, 'Vui lòng chọn phòng ban'),
  employee_type: z.nativeEnum(RecruitmentCandidateEmployeeType, {
    required_error: 'Chọn loại nhân viên',
  }),
  job_title: z.string({ required_error: 'Vui lòng nhập chức danh/Vị trí' }).min(1),
  policy_start_date: z.preprocess(preprocessDateDdMmYyyy, z.date().nullable().optional()),
  policy_end_date: z.preprocess(preprocessDateDdMmYyyy, z.date().nullable().optional()),
  base_salary: z.number().optional().nullable(),
  base_salary_percentage: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return null
      const n = Number(trimmed)
      return Number.isFinite(n) ? n : null
    }
    return null
  }, z.nativeEnum(ContractNet_percentage).nullable().optional()),
  keep_seniority: z.enum(['yes', 'no'], { required_error: 'Chọn có giữ thâm niên hay không' }),
  return_date: z.preprocess(
    preprocessDateDdMmYyyy,
    z.date({ required_error: 'Chọn ngày quay lại làm việc' })
  ),
  note: z.string().max(500).optional(),
})

type ReturnFromEmployeeFormData = z.input<typeof returnFromEmployeeSchema>
type ReturnFromEmployeeParsedData = z.output<typeof returnFromEmployeeSchema>

type ReturnFromEmployeeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: number
  preview?: ReturnFromEmployeePreview
  employeeTypeOptions: SelectOption[]
  onSuccess: (candidateId: number) => void
}

export default function ReturnFromEmployeeDialog({
  open,
  onOpenChange,
  employeeId,
  preview,
  employeeTypeOptions,
  onSuccess,
}: ReturnFromEmployeeDialogProps) {
  const createMutation = useCreateRecruitmentCandidateFromEmployee()
  const invalidateQueries = useInvalidateQueries()
  const [shouldShowOrgErrors, setShouldShowOrgErrors] = useState(false)

  const form = useForm<ReturnFromEmployeeFormData>({
    resolver: zodResolver(returnFromEmployeeSchema),
    defaultValues: {
      branch_id: 0,
      block_id: 0,
      department_id: 0,
      employee_type: undefined,
      job_title: '',
      policy_start_date: null,
      policy_end_date: null,
      base_salary: undefined,
      base_salary_percentage: ContractNet_percentage.Value100,
      keep_seniority: 'yes',
      return_date: undefined,
      note: '',
    },
    mode: 'onTouched',
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState,
    formState: { isSubmitting },
  } = form

  useEffect(() => {
    if (!open) return

    const type = preview?.employeeType
    if (type) {
      const isValid = Object.values(RecruitmentCandidateEmployeeType).includes(
        type as RecruitmentCandidateEmployeeType
      )
      if (isValid) {
        setValue('employee_type', type as RecruitmentCandidateEmployeeType, { shouldDirty: false })
      }
    }

    const jobTitle = preview?.positionName
    if (jobTitle != null && jobTitle !== '') {
      setValue('job_title', jobTitle, { shouldDirty: false })
    }
  }, [open, preview?.employeeType, preview?.positionName, setValue])

  const handleClose = (next: boolean) => {
    if (!next) {
      reset()
      setShouldShowOrgErrors(false)
    }
    onOpenChange(next)
  }

  const onSubmit = async (data: ReturnFromEmployeeFormData) => {
    try {
      const parsed: ReturnFromEmployeeParsedData = returnFromEmployeeSchema.parse(data)
      const payload: CreateFromEmployeeRequest = {
        department_id: parsed.department_id,
        employee_id: employeeId,
        employee_type: parsed.employee_type,
        job_title: parsed.job_title.trim(),
        policy_start_date: parsed.policy_start_date
          ? formatDateToApi(parsed.policy_start_date)
          : null,
        policy_end_date: parsed.policy_end_date ? formatDateToApi(parsed.policy_end_date) : null,
        base_salary:
          parsed.base_salary != null && !Number.isNaN(parsed.base_salary)
            ? String(parsed.base_salary)
            : null,
        base_salary_percentage:
          parsed.base_salary_percentage != null && !Number.isNaN(parsed.base_salary_percentage)
            ? String(parsed.base_salary_percentage)
            : null,
        keep_seniority: parsed.keep_seniority === 'yes',
        return_date: formatDateToApi(parsed.return_date),
        note: parsed.note?.trim() ?? '',
      }

      const created = await createMutation.mutateAsync(payload)
      toastService.success('Tạo ứng viên từ nhân viên quay lại thành công')
      await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')
      reset()
      onSuccess(created.id)
      handleClose(false)
    } catch (error: unknown) {
      handleApiError(error, setError, CREATE_FROM_EMPLOYEE_VALIDATION_FIELD_MAP)
      const base = error != null && typeof error === 'object' ? error : new Error('Request failed')
      throw Object.assign(base, { isApiError: true })
    }
  }

  const confirmFromFooter = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      setShouldShowOrgErrors(true)
      void handleSubmit(
        async (data) => {
          try {
            await onSubmit(data)
            resolve()
          } catch (e) {
            reject(e)
          }
        },
        () => {
          reject(Object.assign(new Error('validation'), { isValidationError: true }))
        }
      )()
    })
  }, [handleSubmit, onSubmit])

  const keepSeniorityOptions = [
    { value: 'yes', label: 'Có' },
    { value: 'no', label: 'Không' },
  ]

  return (
    <AppDialog
      variant="custom"
      size="2xl"
      open={open}
      onOpenChange={handleClose}
      disableBackdropClose
      title="Đề xuất chính sách — Nhân viên quay lại làm việc"
      dialogContentClassName="px-0"
      dialogFormClassName="py-0"
      cancelText="Hủy"
      onCancel={() => handleClose(false)}
      confirmText="Xác nhận tạo ứng viên"
      onConfirm={confirmFromFooter}
      loading={isSubmitting || createMutation.isPending}
      isHideCancelButton={false}
      content={
        <>
          {preview && (
            <>
              <Flex direction={'column'} gap={'2'}>
                <p className="typo-body-base-semibold text-content-dark-2 mb-0">
                  Thông tin nhân viên cũ
                </p>
                <div className="bg-data-light-grey-default border-border-1 mb-4 rounded-md border border-solid p-4">
                  <div className="typo-body-sm-medium text-content-dark-1 flex flex-col gap-1">
                    <Grid columns={'3'} width="100%">
                      {preview.code != null && preview.code !== '' && (
                        <span title={preview.code}>
                          <b className={'text-content-dark-3'}>Mã:</b> {preview.code}
                        </span>
                      )}
                      {preview.fullname != null && preview.fullname !== '' && (
                        <span title={preview.fullname}>
                          <b className={'text-content-dark-3'}>Họ tên:</b> {preview.fullname}
                        </span>
                      )}
                      {preview.dateOfBirthLabel != null && preview.dateOfBirthLabel !== '' ? (
                        <span title={preview.dateOfBirthLabel}>
                          <b className={'text-content-dark-3'}>Ngày sinh:</b>{' '}
                          {preview.dateOfBirthLabel}
                        </span>
                      ) : (
                        <>&nbsp;</>
                      )}
                      {preview.branchName != null && preview.branchName !== '' && (
                        <span title={preview.branchName}>
                          <b className={'text-content-dark-3'}>Chi nhánh:</b> {preview.branchName}
                        </span>
                      )}
                      {preview.blockName != null && preview.blockName !== '' && (
                        <span title={preview.blockName}>
                          <b className={'text-content-dark-3'}>Khối:</b> {preview.blockName}
                        </span>
                      )}
                      {preview.departmentName != null && preview.departmentName !== '' && (
                        <span title={preview.departmentName}>
                          <b className={'text-content-dark-3'}>Phòng ban:</b>{' '}
                          {preview.departmentName}
                        </span>
                      )}
                      {preview.employeeType != null && preview.employeeType !== '' && (
                        <span
                          title={
                            employeeTypeOptions.find(
                              (o) => String(o.value) === String(preview.employeeType)
                            )?.label ?? String(preview.employeeType)
                          }
                        >
                          <b className={'text-content-dark-3'}>Loại nhân viên cũ:</b>{' '}
                          {employeeTypeOptions.find(
                            (o) => String(o.value) === String(preview.employeeType)
                          )?.label ?? String(preview.employeeType)}
                        </span>
                      )}
                      {preview.positionName != null && preview.positionName !== '' && (
                        <span title={preview.positionName}>
                          <b className={'text-content-dark-3'}>Chức vụ:</b> {preview.positionName}
                        </span>
                      )}
                    </Grid>
                  </div>
                </div>
              </Flex>
            </>
          )}

          <Form
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            loading={isSubmitting || createMutation.isPending}
            className="flex w-full flex-col"
          >
            <Flex direction="column" gap="4">
              <input type="hidden" {...register('branch_id', { valueAsNumber: true })} />
              <input type="hidden" {...register('block_id', { valueAsNumber: true })} />
              <input type="hidden" {...register('department_id', { valueAsNumber: true })} />

              <CascadeSelectGroupOrganization
                showEmployee={false}
                showPosition={false}
                showBlock={true}
                showDepartment={true}
                branchRequired
                blockRequired
                departmentRequired
                skipValidation
                formErrors={shouldShowOrgErrors ? formState.errors : undefined}
                onFormChange={(org) => {
                  setValue('branch_id', org.branch_id ?? 0, {
                    shouldDirty: true,
                    shouldValidate: false,
                  })
                  setValue('block_id', org.block_id ?? 0, {
                    shouldDirty: true,
                    shouldValidate: false,
                  })
                  setValue('department_id', org.department_id ?? 0, {
                    shouldDirty: true,
                    shouldValidate: false,
                  })
                }}
              />

              <FormController
                register={register}
                name="employee_type"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Loại nhân viên',
                  required: true,
                  placeholder: 'Chọn loại nhân viên',
                  options: employeeTypeOptions,
                }}
              />
              <FormController
                register={register}
                name="job_title"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Chức danh',
                  required: true,
                  placeholder: 'Nhập chức danh',
                }}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormController
                  register={register}
                  name="policy_start_date"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày bắt đầu thử thách',
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                  }}
                />
                <FormController
                  register={register}
                  name="policy_end_date"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày kết thúc thử thách',
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                  }}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormController
                  register={register}
                  name="base_salary"
                  control={control}
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Mức lương cơ bản',
                    placeholder: 'Nhập mức lương cơ bản',
                  }}
                />
                <FormController
                  register={register}
                  name="base_salary_percentage"
                  control={control}
                  Field={NetPercentageRadioGroup}
                  fieldProps={{
                    label: 'Phầm trăm lương thực nhận trong thời gian thử việc',
                    id: 'return-base-salary-percentage',
                    disabled: false,
                    options: NET_PERCENTAGE_OPTIONS,
                  }}
                />
              </div>
              <FormController
                register={register}
                name="keep_seniority"
                control={control}
                Field={RadioGroup}
                fieldProps={{
                  label: 'Giữ thâm niên',
                  required: true,
                  options: keepSeniorityOptions,
                  id: 'return-keep-seniority',
                }}
              />
              <FormController
                register={register}
                name="return_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày quay lại làm việc',
                  required: true,
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                }}
              />
              <FormController
                register={register}
                name="note"
                control={control}
                Field={TextArea}
                fieldProps={{
                  label: 'Ghi chú',
                  placeholder: 'Nhập ghi chú',
                  maxCharacters: 500,
                  rows: 3,
                }}
              />
            </Flex>
          </Form>
        </>
      }
    />
  )
}
