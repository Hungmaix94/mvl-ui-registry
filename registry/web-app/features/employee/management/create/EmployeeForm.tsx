import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Checkbox, RadioGroup, Select, TextArea, TextField } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  type Employee,
  type EmployeeRequest,
  type PatchedEmployeeRequest,
  useCreateEmployee,
  usePartialUpdateEmployee,
} from '@/features/employee/services/employee-service'
import {
  CMND_IMAGE_ACCEPT,
  MAX_PROFILE_ATTACHMENTS,
  PROFILE_ATTACHMENTS_ACCEPT,
  PRESIGN_PURPOSE_EMPLOYEE_PROFILE_ATTACHMENTS,
} from '@/features/hrm/_shares/file-upload-constraints.ts'
import {
  buildProfileAttachmentsWriteParts,
  initialProfileAttachmentFieldValue,
} from '@/features/hrm/_shares/profile-attachments-payload.ts'
import {
  buildCitizenIdFilesWriteParts,
  initialCitizenIdFilesFieldValue,
  MAX_CITIZEN_ID_FILES,
} from '@/features/hrm/_shares/citizen-id-files-payload.ts'
import { useNationalities } from '@/services/common-service'
import { useProvinces, type Province } from '@/services/province-service'
import { usePositionSelect } from '@/hooks/usePositionSelect'
import { PAGE_SIZE } from '@/constants/table.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import {
  type CreateEmployeeFormData,
  type CreateEmployeeFormInput,
  createEmployeeSchema,
  type UpdateEmployeeFormData,
  type UpdateEmployeeFormInput,
  updateEmployeeSchema,
} from '@/features/employee/management/_shares/schemas'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { cn, createOptions } from '@/utils'
import { removeVietnameseDiacritics } from '@/utils/string-utils'
import { getEthnicitySelectOptions } from '@/utils/ethnicity-options'
import { resolvePlaceOfBirthToOptionValue } from '@/utils/place-of-birth-utils'
import {
  EmployeeCodeType,
  EmployeeGender,
  EmployeeMaritalStatus,
  EmployeeStatus,
} from '@/constants/api-schema-aliases'

interface EmployeeFormProps {
  mode?: 'create' | 'edit'
  employeeData?: Employee
  employeeLoading: boolean
  isCopyMode?: boolean
  onSuccess?: (employeeId: number) => void
  onCancel?: () => void
}

export default function EmployeeForm({
  mode = 'create',
  employeeData,
  employeeLoading,
  isCopyMode = false,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const navigate = useNavigate()
  const createEmployeeMutation = useCreateEmployee()
  const updateEmployeeMutation = usePartialUpdateEmployee()
  const invalidateQueries = useInvalidateQueries()
  const isInitialized = useRef(false)
  // Helper function to map colored_status.value to status enum
  const mapStatus = (coloredStatus: any) => {
    if (!coloredStatus?.value) return EmployeeStatus.Onboarding

    // Map colored_status.value to the correct enum value
    switch (coloredStatus.value) {
      case 'Active':
        return EmployeeStatus.Active
      case 'Onboarding':
        return EmployeeStatus.Onboarding
      case 'Resigned':
        return EmployeeStatus.Resigned
      case 'Maternity Leave':
        return EmployeeStatus.Maternity_Leave
      case 'Unpaid Leave':
        return EmployeeStatus.Unpaid_Leave
      default:
        return EmployeeStatus.Onboarding
    }
  }

  // Helper function to map employee data to form values
  const mapEmployeeToFormValues = (
    employee: any
  ): CreateEmployeeFormInput | UpdateEmployeeFormInput => {
    if (!employee) {
      return mode === 'edit' ? ({} as UpdateEmployeeFormInput) : ({} as CreateEmployeeFormInput)
    }

    const baseValues = {
      fullname: employee.fullname || '',
      attendance_code: employee.attendance_code || '',
      branch_id: employee.branch?.id || 0,
      block_id: employee.block?.id || 0,
      department_id: employee.department?.id || 0,
      position_id: employee.position?.id || undefined,
      status: mapStatus(employee.colored_status),
      start_date: employee.start_date,
      resignation_reason: employee.resignation_reason || undefined,
      handover_completed: employee.handover_completed ?? false,
      note: employee.note || '',
      date_of_birth: employee.date_of_birth,
      gender: employee.gender || EmployeeGender.MALE,
      marital_status: employee.marital_status || EmployeeMaritalStatus.SINGLE,
      ethnicity: employee.ethnicity ?? undefined,
      religion: employee.religion || '',
      nationality_id: employee.nationality?.id || undefined,
      citizen_id: employee.citizen_id || '',
      citizen_id_issued_date: employee.citizen_id_issued_date || undefined,
      citizen_id_issued_place: employee.citizen_id_issued_place || '',
      citizen_id_files_ids: initialCitizenIdFilesFieldValue(employee.citizen_id_files),
      phone: employee.phone || '',
      personal_email: employee.personal_email || '',
      tax_code: employee.tax_code || '',
      place_of_birth: employee.place_of_birth?.trim() || undefined,
      residential_address: employee.residential_address || '',
      permanent_address: employee.permanent_address || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      profile_attachments: initialProfileAttachmentFieldValue(employee.attachments),
    }

    // Helper function to map colored_code_type.value to code_type enum
    const mapCodeType = (coloredCodeType: any) => {
      if (!coloredCodeType?.value) return EmployeeCodeType.MV

      // Map colored_code_type.value to the correct enum value
      switch (coloredCodeType.value) {
        case 'CTV':
          return EmployeeCodeType.CTV
        case 'MV':
          return EmployeeCodeType.MV
        case 'OS':
          return EmployeeCodeType.OS
        default:
          return EmployeeCodeType.MV
      }
    }

    // Add fields that are only in create mode
    if (mode === 'create') {
      return {
        ...baseValues,
        code_type: mapCodeType(employee.colored_code_type),
        username: employee.username || '',
        email: employee.email || '',
      } as CreateEmployeeFormInput
    }

    // For edit mode, include all fields but some will be disabled
    return {
      ...baseValues,
      code_type: mapCodeType(employee.colored_code_type),
      username: employee.username || '',
      email: employee.email || '',
    } as UpdateEmployeeFormInput
  }

  const form = useForm<
    CreateEmployeeFormInput | UpdateEmployeeFormInput,
    any,
    CreateEmployeeFormData | UpdateEmployeeFormData
  >({
    resolver: zodResolver(mode === 'edit' ? updateEmployeeSchema : createEmployeeSchema),
    mode: 'onSubmit', // Use onSubmit mode to validate only on submit
    defaultValues:
      mode === 'edit' && employeeData
        ? mapEmployeeToFormValues(employeeData)
        : isCopyMode && employeeData
          ? {
              ...mapEmployeeToFormValues(employeeData),
              citizen_id_files_ids: [], // Don't copy files - user needs to upload new ones
              profile_attachments: [],
            }
          : {
              code_type: EmployeeCodeType.MV,
              status: EmployeeStatus.Onboarding,
              gender: EmployeeGender.MALE,
              marital_status: EmployeeMaritalStatus.SINGLE,
              start_date: new Date().toISOString().split('T')[0], // Auto-fill with current date in YYYY-MM-DD format
              citizen_id_files_ids: [],
              profile_attachments: [],
            },
    shouldFocusError: false, // Disable default focus to use custom scroll
  })

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting, errors },
  } = form

  // Auto-scroll to first error field when validation fails
  useScrollToError(errors)

  // Reset form with employee data when it's loaded in edit mode
  useEffect(() => {
    if (mode === 'edit' && employeeData && !employeeLoading && !isInitialized.current) {
      const formValues = mapEmployeeToFormValues(employeeData)
      reset(formValues)
      isInitialized.current = true
    }
  }, [mode, employeeData, employeeLoading, reset])

  // Watch form values for cascade initial values
  const watchBranchId = watch('branch_id')
  const watchBlockId = watch('block_id')
  const watchDepartmentId = watch('department_id')
  const watchFullname = watch('fullname')
  const watchPhone = watch('phone')
  // Helper function to generate email and username from fullname
  const generateEmailAndUsername = useCallback(
    (fullname: string) => {
      if (!fullname || fullname.trim() === '') {
        return { email: '', username: '' }
      }

      // Remove Vietnamese diacritics
      const normalizedFullname = removeVietnameseDiacritics(fullname)

      // Remove extra spaces and split by space
      const parts = normalizedFullname
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0)

      if (parts.length === 0) {
        return { email: '', username: '' }
      }

      // Last part is the first name (tên)
      const firstName = parts[parts.length - 1]
      // All other parts are last name and middle name (họ và đệm)
      const lastNameParts = parts.slice(0, parts.length - 1)

      // Get first character of each word in last name parts
      const lastNameInitials = lastNameParts.map((part) => part.charAt(0).toUpperCase()).join('')

      // Email: [tên viết thường + ký tự đầu họ và đệm] + @maivietland.vn
      const emailLocalPart = `${firstName.toLowerCase()}${lastNameInitials.toLowerCase()}`
      const email = `${emailLocalPart}@maivietland.vn`

      // Username: phần trước @ trong Email viết HOA + @MVL
      const username = `${emailLocalPart.toUpperCase()}@MVL`

      return { email, username }
    },
    [removeVietnameseDiacritics]
  )

  // Auto-fill email when fullname changes in create mode
  useEffect(() => {
    if (mode === 'create' && watchFullname) {
      const { email } = generateEmailAndUsername(watchFullname)
      if (email) {
        setValue('email', email, { shouldValidate: false, shouldDirty: false })
      }
    }
  }, [watchFullname, mode, generateEmailAndUsername, setValue])

  // Auto-fill username from phone number
  useEffect(() => {
    if (watchPhone) {
      setValue('username', watchPhone, { shouldValidate: false, shouldDirty: false })
    } else {
      setValue('username', '', { shouldValidate: false, shouldDirty: false })
    }
  }, [watchPhone, setValue])

  // Handle cascade select changes and sync to form state
  const handleCascadeChange = useCallback(
    (data: CascadeSelectFormData) => {
      setValue('branch_id', data.branch_id || 0, { shouldValidate: false })
      setValue('block_id', data.block_id || 0, { shouldValidate: false })
      setValue('department_id', data.department_id || 0, { shouldValidate: false })
    },
    [setValue]
  )

  // Create initial values for CascadeSelectGroupOrganization
  const cascadeInitialValues = useMemo(() => {
    // In edit mode, use employeeData if available
    if (mode === 'edit' && employeeData) {
      return {
        branch: employeeData.branch?.id?.toString(),
        block: employeeData.block?.id?.toString(),
        department: employeeData.department?.id?.toString(),
      }
    }
    // For create mode or when form has values, use form values
    if (watchBranchId || watchBlockId || watchDepartmentId) {
      return {
        branch: watchBranchId?.toString(),
        block: watchBlockId?.toString(),
        department: watchDepartmentId?.toString(),
      }
    }
    return undefined
  }, [mode, employeeData, watchBranchId, watchBlockId, watchDepartmentId])

  // Use position select hook for pagination and search (like CascadeSelectGroupOrganization)
  const { loadPositionOptions, loadInitialPositionOptions } = usePositionSelect({
    pageSize: PAGE_SIZE,
  })
  const {
    data: nationalitiesResponse,
    isLoading: nationalitiesLoading,
    error: nationalitiesError,
  } = useNationalities()

  // Create options for selects
  const nationalityOptions = useMemo(() => {
    return createOptions(nationalitiesResponse || [])
  }, [nationalitiesResponse])

  const { data: provincesResponse, isLoading: provincesLoading } = useProvinces({
    // level: ProvinceLevel.province,
  })
  const provinceOptions = useMemo(() => {
    const list: Province[] = Array.isArray(provincesResponse)
      ? provincesResponse
      : ((provincesResponse as { results?: Province[] } | undefined)?.results ?? [])
    return list.map((p) => ({ label: p.name, value: p.name }))
  }, [provincesResponse])
  const ethnicityOptions = useMemo(() => getEthnicitySelectOptions(), [])

  // Resolve place_of_birth to option value when saved value differs from option label (e.g. "Hà Nội" -> "Thành phố Hà Nội")
  const watchedPlaceOfBirth = watch('place_of_birth')
  useEffect(() => {
    if (provinceOptions.length === 0) return
    const saved =
      watchedPlaceOfBirth != null && watchedPlaceOfBirth !== ''
        ? String(watchedPlaceOfBirth).trim()
        : undefined
    if (!saved) return
    const optionValues = provinceOptions.map((o) => String(o.value))
    if (optionValues.includes(saved)) return
    const resolved = resolvePlaceOfBirthToOptionValue(saved, optionValues)
    if (resolved) setValue('place_of_birth', resolved, { shouldDirty: false })
  }, [provinceOptions, watchedPlaceOfBirth, setValue])

  // Constants-driven options
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.EMPLOYEE.CODE_TYPE,
      APP_CONSTANT_KEY.EMPLOYEE.GENDER,
      APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS,
    ],
  })

  const codeTypeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.CODE_TYPE) || [],
    [keysMapOptions]
  )
  const genderRadioOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.GENDER) || [],
    [keysMapOptions]
  )
  const maritalStatusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS) || [],
    [keysMapOptions]
  )

  // Handle create submission
  const handleCreateSubmit = useCallback(
    async (data: CreateEmployeeFormData | UpdateEmployeeFormData) => {
      // Type narrowing: in create mode, data is CreateEmployeeFormData
      // This is safe because form resolver uses createEmployeeSchema in create mode
      const createData = data as CreateEmployeeFormData

      // Create submit data - remove fields that are not in API
      // Exclude branch_id, block_id (auto-set from department)
      const { branch_id, block_id, citizen_id_files_ids, profile_attachments, ...restData } =
        createData

      const attParts = buildProfileAttachmentsWriteParts(profile_attachments, false)
      const cmndParts = buildCitizenIdFilesWriteParts(citizen_id_files_ids, false)

      const filesBlock: NonNullable<EmployeeRequest['files']> = {}
      if (cmndParts.files?.citizen_id_files?.length) {
        filesBlock.citizen_id_files = cmndParts.files.citizen_id_files
      }
      if (attParts.files?.attachments?.length) {
        filesBlock.attachments = attParts.files.attachments
      }

      // Build EmployeeRequest - all required fields are validated by Zod
      const requestData: EmployeeRequest = {
        ...restData,
        ...(cmndParts.citizen_id_files_ids
          ? { citizen_id_files_ids: cmndParts.citizen_id_files_ids }
          : {}),
        ...(Object.keys(filesBlock).length > 0 ? { files: filesBlock } : {}),
      }

      const createdResponse = await createEmployeeMutation.mutateAsync(requestData)
      const createdEmployee = (createdResponse as any)?.data || createdResponse
      const newId = createdEmployee?.id
      if (!newId) {
        throw new Error('Không lấy được ID nhân viên sau khi tạo')
      }
      if (isCopyMode) {
        toastService.success('Sao chép nhân viên thành công!')
      } else {
        toastService.success('Tạo nhân viên mới thành công')
      }
      return newId as number
    },
    [createEmployeeMutation, isCopyMode]
  )

  // Handle update submission
  const handleUpdateSubmit = useCallback(
    async (data: CreateEmployeeFormData | UpdateEmployeeFormData) => {
      if (!employeeData?.id) {
        throw new Error('Không tìm thấy nhân viên để cập nhật')
      }

      // Type narrowing: in edit mode, data is UpdateEmployeeFormData
      // This is safe because form resolver uses updateEmployeeSchema in edit mode
      const updateData = data as UpdateEmployeeFormData

      // Create submit data - remove fields that are not in API
      // Exclude branch_id, block_id (auto-set from department) and citizen_id_files_ids
      const { branch_id, block_id, citizen_id_files_ids, profile_attachments, ...restData } =
        updateData

      const attParts = buildProfileAttachmentsWriteParts(
        profile_attachments,
        true,
        employeeData?.attachments?.map((a) => a.id)
      )
      const cmndParts = buildCitizenIdFilesWriteParts(
        citizen_id_files_ids,
        true,
        employeeData?.citizen_id_files?.map((f) => f.id)
      )

      const filesBlock: NonNullable<PatchedEmployeeRequest['files']> = {}
      if (cmndParts.files?.citizen_id_files?.length) {
        filesBlock.citizen_id_files = cmndParts.files.citizen_id_files
      }
      if (attParts.files?.attachments?.length) {
        filesBlock.attachments = attParts.files.attachments
      }

      const existingFilesBlock: NonNullable<PatchedEmployeeRequest['existing_files']> = {}
      if (cmndParts.existing_files) {
        existingFilesBlock.citizen_id_files = cmndParts.existing_files.citizen_id_files
      }
      if (attParts.existing_files) {
        existingFilesBlock.attachments = attParts.existing_files.attachments
      }

      const requestData: PatchedEmployeeRequest = {
        ...restData,
        fullname: updateData.fullname ?? '',
        username: employeeData?.username ?? updateData.username ?? '',
        email: updateData.email ?? '',
        department_id: updateData.department_id ?? 0,
        start_date: updateData.start_date ?? '',
        citizen_id: updateData.citizen_id ?? '',
        code_type: updateData.code_type,
        ...(Object.keys(filesBlock).length > 0 ? { files: filesBlock } : {}),
        ...(Object.keys(existingFilesBlock).length > 0
          ? { existing_files: existingFilesBlock }
          : {}),
      }

      await updateEmployeeMutation.mutateAsync({
        id: employeeData.id,
        data: requestData,
      })
      toastService.success('Cập nhật thông tin nhân viên thành công')
      return employeeData.id as number
    },
    [updateEmployeeMutation, employeeData]
  )

  const onSubmit = useCallback(
    async (data: CreateEmployeeFormData | UpdateEmployeeFormData) => {
      try {
        // At runtime, mode determines which type data is:
        // - In edit mode: form uses updateEmployeeSchema, so data is UpdateEmployeeFormData
        // - In create mode: form uses createEmployeeSchema, so data is CreateEmployeeFormData
        // TypeScript cannot verify this at compile time, but it's guaranteed at runtime
        // by the form's resolver configuration (zodResolver based on mode)
        let resultId: number
        if (mode === 'edit' && employeeData?.id) {
          resultId = await handleUpdateSubmit(data)
        } else {
          resultId = await handleCreateSubmit(data)
        }

        // Invalidate employee list queries
        await invalidateQueries.invalidateByPrefix('hrm/employees')

        if (onSuccess) {
          onSuccess(resultId)
        } else {
          navigate(APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(resultId)))
        }
      } catch (error: any) {
        handleApiError(error, form.setError) // Field names đã khớp với API, không cần fieldMap
      }
    },
    [
      handleCreateSubmit,
      handleUpdateSubmit,
      invalidateQueries,
      navigate,
      onSuccess,
      form,
      mode,
      employeeData,
    ]
  )

  // Show loading state while fetching employee data in edit mode
  if (mode === 'edit' && employeeLoading) {
    return (
      <div className="w-full">
        <div className="flex h-64 items-center justify-center">
          <div className="text-content-dark-2">Đang tải thông tin nhân viên...</div>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={'w-full space-y-6 py-4'}
      noValidate // Disable HTML5 validation to prevent browser "Required" messages
    >
      <Flex direction="column" gap="5" className="w-full">
        <div className="space-y-6">
          {/* Section 1: Thông tin nhân sự */}
          <div className={cn('space-y-5', 'pb-4')}>
            <h3 className="text-content-dark-1 text-lg font-semibold">Thông tin nhân sự</h3>

            <div className={cn(mode === 'edit' ? 'grid grid-cols-2 gap-5' : 'flex w-full')}>
              {/* Mã nhân viên - Only show in edit mode */}
              {mode === 'edit' && (
                <TextField
                  label="Mã nhân viên"
                  value={employeeData?.code || ''}
                  disabled={true}
                  placeholder="Mã nhân viên"
                />
              )}

              {/* Loại mã nhân viên */}
              <FormController
                register={register}
                name="code_type"
                control={control}
                Field={RadioGroup}
                fieldProps={{
                  label: 'Loại mã nhân viên',
                  required: true,
                  options: codeTypeOptions,
                  orientation: 'horizontal',
                  disabled: mode === 'edit',
                }}
              />
            </div>

            {/* Họ và tên + Mã chấm công */}
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="fullname"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Họ và tên',
                  required: true,
                  placeholder: 'Nhập họ và tên',
                  maxLength: 100,
                  showCharacterCount: true,
                }}
              />
              <FormController
                register={register}
                name="attendance_code"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Mã chấm công',
                  placeholder: 'Nhập mã máy chấm công',
                  maxLength: 20,
                  showCharacterCount: true,
                }}
              />
            </div>

            {/* Số điện thoại + Tài khoản đăng nhập */}
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="phone"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số điện thoại',
                  required: true,
                  placeholder: 'Nhập số điện thoại',
                }}
              />
              <FormController
                register={register}
                name="username"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Tài khoản đăng nhập',
                  required: true,
                  placeholder: 'Tài khoản đăng nhập',
                  maxLength: 50,
                  showCharacterCount: true,
                  disabled: true,
                }}
              />
            </div>

            {/* Email */}
            <FormController
              register={register}
              name="email"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Email',
                required: true,
                placeholder: 'Nhập email',
                type: 'email',
                maxLength: 100,
                showCharacterCount: true,
              }}
            />

            {/* Organization Selection */}
            <div className="space-y-5">
              <CascadeSelectGroupOrganization
                initialValues={cascadeInitialValues}
                onFormChange={handleCascadeChange}
                showEmployee={false}
                showPosition={false}
                showDepartment={true}
                layout="grid"
                skipValidation={true}
                branchRequired={true}
                blockRequired={true}
                departmentRequired={true}
                disabled={mode === 'edit'}
                formErrors={{
                  branch_id: errors.branch_id,
                  block_id: errors.block_id,
                  department_id: errors.department_id,
                }}
              />
            </div>

            {/* Hidden field for start_date - auto-filled with current date */}
            <input type="hidden" {...register('start_date')} />

            {/* Chức vụ */}
            <FormController
              register={register}
              name="position_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Chức vụ',
                placeholder: 'Nhập/chọn chức vụ',
                loadOptions: loadPositionOptions,
                loadInitialOptions: loadInitialPositionOptions,
                pageSize: PAGE_SIZE,
                searchPlaceholder: 'Tìm kiếm chức vụ...',
                enableSearch: true,
                debounceMs: 300,
                disabled: mode === 'edit',
              }}
            />

            {/* Đã hoàn tất bàn giao nghỉ việc — chỉ hiển thị cho NV trạng thái Resigned */}
            {watch('status') === EmployeeStatus.Resigned && (
              <Controller
                control={control}
                name="handover_completed"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={(checked: boolean) => field.onChange(checked === true)}
                    />
                    <label
                      className="typo-body-base-regular text-content-dark-1 cursor-pointer"
                      onClick={() => field.onChange(!(field.value ?? false))}
                    >
                      Đã hoàn tất thủ tục bàn giao nghỉ việc
                    </label>
                  </div>
                )}
              />
            )}

            {/* Ghi chú */}
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
          </div>

          {/* Section 2: Thông tin bổ sung */}
          <div className={cn('space-y-5', 'border-border-1 border-t', 'pt-8 pb-4')}>
            <h3 className="text-content-dark-1 text-lg font-semibold">Thông tin bổ sung</h3>

            {/* Ngày sinh + Giới tính + Tình trạng hôn nhân */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <FormController
                register={register}
                name="date_of_birth"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày sinh',
                  required: true,
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  fromYear: 1926,
                }}
              />
              <Flex
                direction={{ initial: 'column', md: 'row' }}
                justify={'between'}
                gap={'5'}
                className={'col-span-2'}
              >
                <FormController
                  register={register}
                  name="gender"
                  control={control}
                  Field={RadioGroup}
                  fieldProps={{
                    label: 'Giới tính',
                    required: true,
                    options: genderRadioOptions,
                    orientation: 'horizontal',
                    className: 'items-start',
                  }}
                />
                <FormController
                  register={register}
                  name="marital_status"
                  control={control}
                  Field={RadioGroup}
                  fieldProps={{
                    label: 'Tình trạng hôn nhân',
                    required: true,
                    options: maritalStatusOptions,
                    orientation: 'horizontal',
                  }}
                />
              </Flex>
            </div>

            {/* Quốc tịch + Dân tộc + Tôn giáo */}
            <div className="grid grid-cols-3 gap-5">
              <FormController
                register={register}
                name="nationality_id"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Quốc tịch',
                  placeholder: nationalitiesLoading
                    ? 'Đang tải...'
                    : nationalitiesError
                      ? 'Không thể tải danh sách quốc tịch'
                      : 'Nhập/chọn quốc tịch',
                  options: nationalityOptions,
                  searchable: true,
                  disabled: nationalitiesLoading,
                  loading: nationalitiesLoading,
                }}
              />
              <FormController
                register={register}
                name="ethnicity"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Dân tộc',
                  placeholder: 'Nhập/chọn Dân tộc',
                  options: ethnicityOptions,
                  enableSearch: true,
                  searchPlaceholder: 'Tìm kiếm dân tộc...',
                }}
              />
              <FormController
                register={register}
                name="religion"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Tôn giáo',
                  placeholder: 'Nhập tôn giáo',
                  maxLength: 100,
                  showCharacterCount: true,
                }}
              />
            </div>

            {/* Số CMND/CCCD + Ngày cấp + Nơi cấp */}
            <div className="grid grid-cols-3 gap-5">
              <FormController
                register={register}
                name="citizen_id"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số CMND/CCCD',
                  required: true,
                  placeholder: 'Nhập số CMND/CCCD',
                  maxLength: 20,
                  showCharacterCount: true,
                }}
              />
              <FormController
                register={register}
                name="citizen_id_issued_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày cấp',
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                }}
              />
              <FormController
                register={register}
                name="citizen_id_issued_place"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Nơi cấp',
                  placeholder: 'Nhập nơi cấp',
                  maxLength: 100,
                  showCharacterCount: true,
                }}
              />
            </div>

            {/* Email cá nhân + Mã số thuế */}
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="personal_email"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Email cá nhân',
                  required: true,
                  placeholder: 'Nhập email cá nhân',
                  type: 'email',
                  maxLength: 100,
                  showCharacterCount: true,
                }}
              />
              <FormController
                register={register}
                name="tax_code"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Mã số thuế',
                  placeholder: 'Nhập mã số thuế',
                  maxLength: 12,
                  showCharacterCount: true,
                }}
              />
            </div>

            {/* Nơi sinh */}
            <FormController
              register={register}
              name="place_of_birth"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Nơi sinh',
                placeholder: provincesLoading ? 'Đang tải...' : 'Nhập/chọn Nơi sinh ',
                options: provinceOptions,
                enableSearch: true,
                searchPlaceholder: 'Tìm kiếm tỉnh/thành phố...',
                disabled: provincesLoading,
                loading: provincesLoading,
              }}
            />

            {/* Địa chỉ cư trú */}
            <FormController
              register={register}
              name="residential_address"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Địa chỉ cư trú',
                placeholder: 'Nhập địa chỉ cư trú',
                maxLength: 500,
                rows: 2,
              }}
            />

            {/* Địa chỉ thường trú */}
            <FormController
              register={register}
              name="permanent_address"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Địa chỉ thường trú',
                placeholder: 'Nhập địa chỉ thường trú',
                maxLength: 500,
                rows: 2,
              }}
            />
          </div>

          {/* Section 3: CMND/CCCD */}
          <div className={cn('space-y-5', 'border-border-1 border-t', 'pt-8 pb-4')}>
            <h3 className="text-content-dark-1 text-lg font-semibold">CMND/CCCD</h3>
            <p className="text-content-dark-3 typo-body-sm-regular -mt-2 max-w-xl">
              Tối đa 2 ảnh (mặt trước và mặt sau).
            </p>
            <Controller
              name="citizen_id_files_ids"
              control={control}
              render={({ field, fieldState }) => {
                const valueArray = Array.isArray(field.value)
                  ? (field.value as (string | number)[])
                  : []
                const tokens = valueArray.filter(
                  (v): v is string => typeof v === 'string' && v !== ''
                )
                return (
                  <FileUpload
                    multiple
                    maxFiles={MAX_CITIZEN_ID_FILES}
                    multiTrackExistingIds
                    accept={[...CMND_IMAGE_ACCEPT]}
                    existingFiles={
                      mode === 'edit' && employeeData?.citizen_id_files?.length
                        ? employeeData.citizen_id_files
                        : undefined
                    }
                    value={tokens}
                    onChange={(newTokens: string | string[]) => {
                      const current = (getValues('citizen_id_files_ids') ?? []) as (
                        | string
                        | number
                      )[]
                      const keptIds = current.filter(
                        (v): v is number => typeof v === 'number' && Number.isFinite(v)
                      )
                      const tokensArr = Array.isArray(newTokens)
                        ? newTokens
                        : typeof newTokens === 'string' && newTokens !== ''
                          ? [newTokens]
                          : []
                      // Cap tại MAX_CITIZEN_ID_FILES để chống race condition
                      // (existingFiles có thể đến sau khi user đã upload, làm form value vượt quá maxFiles).
                      field.onChange([...keptIds, ...tokensArr].slice(0, MAX_CITIZEN_ID_FILES))
                    }}
                    onKeptExistingIdsChange={(newKeptIds: number[]) => {
                      const current = (getValues('citizen_id_files_ids') ?? []) as (
                        | string
                        | number
                      )[]
                      const tokensFromForm = current.filter(
                        (v): v is string => typeof v === 'string' && v !== ''
                      )
                      field.onChange(
                        [...newKeptIds, ...tokensFromForm].slice(0, MAX_CITIZEN_ID_FILES)
                      )
                    }}
                    error={fieldState.error?.message}
                    required={false}
                    hiddenLabel
                    purpose="citizen_id"
                    largeImagePreview
                  />
                )
              }}
            />
          </div>

          <div className={cn('space-y-5', 'border-border-1 border-t', 'pt-8 pb-4')}>
            <h3 className="text-content-dark-1 text-lg font-semibold">Tệp đính kèm</h3>
            <p className="text-content-dark-3 typo-body-sm-regular -mt-2 max-w-xl">
              Tối đa {MAX_PROFILE_ATTACHMENTS} tệp (PDF, Word, Excel, CSV, ảnh JPG/PNG).
            </p>
            <Controller
              name="profile_attachments"
              control={control}
              render={({ field, fieldState }) => (
                <FileUpload
                  hiddenLabel
                  required={false}
                  multiple
                  maxFiles={MAX_PROFILE_ATTACHMENTS}
                  multiTrackExistingIds
                  existingFiles={
                    mode === 'edit' && employeeData?.attachments?.length
                      ? employeeData.attachments
                      : undefined
                  }
                  value={field.value as (string | number)[] | undefined}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  accept={[...PROFILE_ATTACHMENTS_ACCEPT]}
                  purpose={PRESIGN_PURPOSE_EMPLOYEE_PROFILE_ATTACHMENTS}
                  hiddenDescription
                />
              )}
            />
          </div>

          {/* Section 4: Thông tin liên hệ khẩn cấp */}
          <div className={cn('space-y-5', 'border-border-1 border-t', 'pt-8 pb-4')}>
            <h3 className="text-content-dark-1 text-lg font-semibold">
              Thông tin liên hệ khẩn cấp
            </h3>

            {/* Họ và tên + Số điện thoại */}
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="emergency_contact_name"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Họ và tên',
                  placeholder: 'Nhập họ tên người liên hệ khẩn cấp',
                  maxLength: 100,
                  showCharacterCount: true,
                }}
              />
              <FormController
                register={register}
                name="emergency_contact_phone"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số điện thoại',
                  placeholder: 'Nhập SĐT liên hệ khẩn cấp',
                  prefix: '+84',
                }}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className={cn('flex justify-end gap-3 pt-6', 'border-border-1 border-t')}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel || (() => navigate(APP_PATH.EMPLOYEE_MANAGEMENT))}
            disabled={isSubmitting}
            className={'min-w-[150px]'}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || (mode === 'edit' && employeeLoading)}
            loading={isSubmitting || (mode === 'edit' && employeeLoading)}
            className={'min-w-[150px]'}
          >
            {mode === 'edit' ? 'Cập nhật nhân viên' : 'Tạo nhân viên'}
          </Button>
        </div>
      </Flex>
    </form>
  )
}
