import { Button, Checkbox, Select, TextArea, TextField } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select'
import {
  type DepartmentRequest,
  type Department,
  useCreateDepartment,
  useUpdateDepartment,
} from '@/features/org/services/department-service'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import {
  departmentCreateSchema,
  type DepartmentCreateSchema,
} from '@/features/org/department/_shares/schemas/department-create-schema.ts'
import {
  departmentEditSchema,
  type DepartmentEditFormData,
} from '@/features/org/department/_shares/schemas/department-edit-schema.ts'
import { useCallback, useEffect, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import useOrganization from '@/hooks/useOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

interface DepartmentFormProps {
  initialData?: Department
  onSuccess?: () => void
  onCancel?: () => void
}

type DepartmentFormData = DepartmentCreateSchema | DepartmentEditFormData

const DepartmentForm = ({ initialData, onSuccess, onCancel }: DepartmentFormProps) => {
  const isEdit = !!initialData
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()

  const mutation = isEdit ? updateMutation : createMutation
  const schema = isEdit ? departmentEditSchema : departmentCreateSchema

  const keyConstant = APP_CONSTANT_KEY.DEPARTMENT.FUNCTION
  const { keysMapOptions } = useAppConstant({ module: 'hrm', keys: [keyConstant] })
  const departmentFunctions = useMemo(
    () => keysMapOptions.get(keyConstant) || [],
    [keysMapOptions, keyConstant]
  )

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    setError,
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          branch_id: initialData.branch.id,
          block_id: initialData.block.id,
          function: initialData.function || null,
          is_main_department: initialData.is_main_department ?? false,
          management_department_id: initialData.management_department?.id || null,
          leader_id: initialData.leader?.id || null,
          description: initialData.description || '',
        }
      : {
          name: '',
          branch_id: null,
          block_id: null,
          function: null,
          is_main_department: false,
          management_department_id: undefined,
          description: '',
        },
    shouldFocusError: true,
  })

  // Watch form values for conditional logic
  const watchedBranch = watch('branch_id')
  const watchedBlock = watch('block_id')
  const watchedFunc = watch('function')
  const managementDepartment = watch('management_department_id')

  const { blocks, departments, departmentOptions } = useOrganization({
    branch: watchedBranch ? Number(watchedBranch) : undefined,
    block: watchedBlock && watchedBlock !== null ? Number(watchedBlock) : undefined,
  })

  // Handle cascade selection changes (branch & block)
  const handleCascadeChange = useCallback(
    (data: CascadeSelectFormData) => {
      const currentBranch = watch('branch_id')
      const currentBlock = watch('block_id')
      const nextBranch = data.branch_id > 0 ? data.branch_id : null
      const nextBlock = data.block_id > 0 ? data.block_id : null

      if (currentBranch !== nextBranch) {
        setValue('branch_id', nextBranch, { shouldDirty: true, shouldValidate: true })
        // Reset dependent fields when branch changes
        setValue('block_id', null)
        setValue('function', null)
        setValue('management_department_id', isEdit ? null : undefined)
      }
      if (currentBlock !== nextBlock) {
        setValue('block_id', nextBlock, { shouldDirty: true, shouldValidate: true })
        // Reset dependent fields when block changes
        setValue('function', null)
        setValue('management_department_id', isEdit ? null : undefined)
      }
    },
    [watch, setValue, isEdit]
  )

  // Get selected block to determine function options
  const selectedBlock = useMemo(() => {
    if (!watchedBlock || !blocks.length) return null
    return blocks.find((b) => b.id === watchedBlock)
  }, [watchedBlock, blocks])

  // Function options based on block type
  const funcOptions: SelectOption[] = useMemo(() => {
    if (!selectedBlock || !departmentFunctions.length) return []

    // If business block, only show "business" function
    if (selectedBlock.block_type === 'business') {
      return departmentFunctions.filter((opt: SelectOption) => opt.value === 'business')
    }

    // If support block, show all support functions (exclude business)
    return departmentFunctions.filter((opt: SelectOption) => opt.value !== 'business')
  }, [selectedBlock, departmentFunctions])

  // Auto-fill function when business block is selected
  useEffect(() => {
    if (selectedBlock?.block_type === 'business') {
      const hasBusinessOption = funcOptions.some((opt) => opt.value === 'business')
      if (hasBusinessOption && watchedFunc !== 'business') {
        setValue('function', 'business', { shouldValidate: true, shouldDirty: true })
      }
    } else if (selectedBlock && watchedFunc === 'business') {
      // Reset function if switching from business block to support block
      setValue('function', null as unknown as string, { shouldValidate: true })
    }

    // Validate current function is still valid for the selected block
    if (watchedFunc && funcOptions.length > 0) {
      const isCurrentValueValid = funcOptions.some((opt) => opt.value === watchedFunc)
      if (isCurrentValueValid) {
        setValue('function', watchedFunc, { shouldValidate: true, shouldDirty: false })
      } else if (watchedFunc !== 'business') {
        setValue('function', null as unknown as string, { shouldValidate: false })
      }
    }
  }, [selectedBlock, setValue, watchedFunc, funcOptions])

  // Handle management department validity when dependencies change
  useEffect(() => {
    if (
      !watchedFunc ||
      (watchedBranch &&
        watchedBlock &&
        watchedFunc &&
        managementDepartment &&
        departmentOptions.every((opt) => Number(opt.value) !== managementDepartment))
    ) {
      setValue('management_department_id', isEdit ? null : undefined)
    }
  }, [
    watchedFunc,
    watchedBranch,
    watchedBlock,
    departmentOptions,
    managementDepartment,
    setValue,
    isEdit,
  ])

  // Auto-scroll to first error field when validation fails
  useScrollToError(errors)

  // Filter departments for management department dropdown (edit mode)
  const filteredDepartments = useMemo(() => {
    if (!isEdit || !watchedBranch || !watchedBlock || !watchedFunc) {
      return []
    }

    const filtered = departments
      .filter((dept) => {
        // Exclude current department from management options
        if (dept.id === initialData!.id) return false
        return dept.function === watchedFunc
      })
      .map((dept) => ({
        value: dept.id,
        label: dept.name,
      }))

    return filtered
  }, [isEdit, watchedBranch, watchedBlock, watchedFunc, initialData, departments])

  // Leader dropdown: only leadership position filter; page/page_size come from useEmployeeSelect.
  const leaderSelectAdditionalParams = useMemo(() => {
    if (!isEdit) return {}
    return { position__is_leadership: true } as Record<string, any>
  }, [isEdit])

  // === Submit handler ===
  const onSubmit = useCallback(
    async (data: DepartmentFormData) => {
      const payload: DepartmentRequest = {
        name: data.name.trim(),
        branch_id: Number(data.branch_id!),
        block_id: Number(data.block_id!),
        function: data.function! as DepartmentRequest['function'],
        is_main_department: data.is_main_department ?? false,
        management_department_id: data.management_department_id
          ? Number(data.management_department_id)
          : undefined,
        leader_id: isEdit ? (data as DepartmentEditFormData).leader_id || null : undefined,
        description: data.description?.trim() ?? '',
      }

      try {
        if (isEdit) {
          await updateMutation.mutateAsync({ id: initialData!.id, data: payload })
          toastService.success('Đã chỉnh sửa thành công')
        } else {
          await createMutation.mutateAsync(payload)
          toastService.success('Tạo phòng ban thành công')
        }
        onSuccess?.()
      } catch (error: any) {
        handleApiError(error, setError)
      }
    },
    [isEdit, createMutation, updateMutation, initialData, onSuccess, setError]
  )

  // Management department options (create mode)
  const managementDeptOptions = useMemo(() => {
    if (isEdit) return []
    return departmentOptions.filter(
      (opt) => departments.find((dept) => dept.id === Number(opt.value))?.function === watchedFunc
    )
  }, [isEdit, departmentOptions, departments, watchedFunc])

  return (
    <Form
      key={`department-form-${initialData?.id || 'create'}`}
      loading={mutation.isPending}
      onSubmit={onSubmit}
      handleSubmit={handleSubmit}
    >
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Row 1: Tên phòng ban (+ Mã phòng ban in edit mode) */}
        {isEdit ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên phòng ban',
                required: true,
                placeholder: 'Nhập tên phòng ban',
                autoFocus: true,
                disabled: mutation.isPending,
              }}
            />

            <FormController
              register={register}
              name="code"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Mã phòng ban',
                required: true,
                placeholder: 'Mã phòng ban',
                disabled: true, // Readonly field
                error: (errors as any).code?.message,
              }}
            />
          </div>
        ) : (
          <FormController
            register={register}
            name="name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên phòng ban',
              required: true,
              placeholder: 'Nhập tên phòng ban',
              autoFocus: true,
              disabled: mutation.isPending,
            }}
          />
        )}

        {/* Row 2: Chi nhánh & Khối using Cascade */}
        <CascadeSelectGroupOrganization
          showEmployee={false}
          showPosition={false}
          showDepartment={false}
          branchRequired={true}
          blockRequired={true}
          layout="grid"
          onFormChange={handleCascadeChange}
          className="w-full"
          initialValues={
            isEdit
              ? {
                  branch: String(initialData!.branch.id),
                  block: String(initialData!.block.id),
                }
              : undefined
          }
          formErrors={errors}
          skipValidation={true}
        />

        {/* Row 3: Chức năng & Cấp */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormController
            key={`function-${watchedBlock}-${funcOptions.length}`}
            register={register}
            name="function"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Chức năng phòng ban',
              required: true,
              options: funcOptions,
              placeholder: 'Chọn chức năng phòng ban',
              disabled: !watchedBlock || funcOptions.length === 0 || mutation.isPending,
            }}
          />

          {/* Checkbox */}
          <div data-field-name="is_main_department">
            <label className="typo-body-base-semibold text-content-dark-2 mb-2 block">Cấp</label>
            <Controller
              name="is_main_department"
              control={control}
              render={({ field, fieldState }) => (
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                  disabled={mutation.isPending}
                  label="Đầu mối"
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
        </div>

        {/* Phòng ban quản lý */}
        <FormController
          register={register}
          name="management_department_id"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Phòng ban quản lý',
            options: isEdit ? filteredDepartments : managementDeptOptions,
            placeholder:
              (isEdit ? filteredDepartments.length : managementDeptOptions.length) === 0
                ? 'Không có phòng ban quản lý'
                : 'Chọn phòng ban quản lý',
            disabled: !watchedBranch || !watchedBlock || !watchedFunc || mutation.isPending,
          }}
        />

        {/* Nhân viên trưởng phòng (only in edit mode) */}
        {isEdit && (
          <Controller
            name="leader_id"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EmployeeSelectWithDialog
                value={field.value}
                onChange={field.onChange}
                error={error?.message}
                disabled={mutation.isPending}
                label="Nhân viên trưởng phòng"
                additionalParams={leaderSelectAdditionalParams}
              />
            )}
          />
        )}

        {/* Mô tả */}
        <FormController
          register={register}
          name="description"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Mô tả',
            placeholder: 'Nhập mô tả về phòng ban',
            rows: 4,
            disabled: mutation.isPending,
          }}
        />

        {/* Buttons */}
        <Flex gap={isEdit ? '4' : '2'} justify="end" className={isEdit ? 'pt-10' : 'pt-4'}>
          <Button
            className="w-[150px]"
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            Hủy
          </Button>
          <Button
            className="w-[150px]"
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            loading={mutation.isPending}
          >
            {isEdit ? 'Lưu' : 'Tạo mới'}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default DepartmentForm
