import React, { forwardRef, useImperativeHandle } from 'react'
import { Checkbox, FormController, Select, type SelectOption } from '@/components/ui'
import { type CascadeSelectOptions, useCascadeSelect } from './useCascadeSelect.ts'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PAGE_SIZE } from '@/constants/table.ts'
import { useAbility } from '@/lib/ability'

const createCascadeSelectSchema = (showDepartment: boolean = true) =>
  z
    .object({
      branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh'),
      branch_name: z.string().optional(),
      block_id: z.number().min(1, 'Vui lòng chọn khối'),
      block_name: z.string().optional(),
      department_id: showDepartment
        ? z.number().min(1, 'Vui lòng chọn phòng ban')
        : z.number().optional(),
      department_name: z.string().optional(),
      employee_id: z.number().min(1, 'Vui lòng chọn nhân viên'),
      employee_name: z.string().optional(),
      position_id: z.number(),
      position_name: z.string().optional(),
      block_types: z.array(z.string()).optional(),
    })
    .refine(
      (data) => {
        if (showDepartment) {
          return (
            data.branch_id > 0 &&
            data.block_id > 0 &&
            data.department_id! > 0 &&
            data.employee_id > 0
          )
        }
        return data.branch_id > 0 && data.block_id > 0 && data.employee_id > 0
      },
      {
        message: showDepartment
          ? 'Vui lòng chọn đầy đủ Chi nhánh, Khối, Phòng ban và Nhân viên giới thiệu'
          : 'Vui lòng chọn đầy đủ Chi nhánh, Khối và Nhân viên giới thiệu',
        path: ['employee_id'], // Show error on employee_id field
      }
    )

const cascadeSelectSchema = createCascadeSelectSchema()

export type CascadeSelectFormData = z.infer<typeof cascadeSelectSchema>

export interface CascadeSelectGroupRef {
  reset: () => void
  clearAll: () => void
}

export interface CascadeSelectGroupProps extends CascadeSelectOptions {
  onFormChange?: (data: CascadeSelectFormData) => void
  className?: string
  showEmployee?: boolean
  employeeLabel?: string
  showPosition?: boolean
  positionLabel?: string
  layout?: 'grid' | 'vertical'
  formErrors?: any
  skipValidation?: boolean
  showBlockTypeFilter?: boolean
  blockTypeLabel?: string
  showDepartment?: boolean
  departmentLabel?: string
  showBlock?: boolean
  branchRequired?: boolean
  blockRequired?: boolean
  departmentRequired?: boolean
  employeeRequired?: boolean
  positionRequired?: boolean
  blockTypeVariant?: 'checkbox' | 'select'
  /** Khi true: gap nhỏ hơn, Chi nhánh và Loại khối cùng một hàng (khi chỉ có 2 trường) */
  compactFilterLayout?: boolean
  excludePositionFromEmployeeQuery?: boolean
  employeeAdditionalParams?: Record<string, any> | (() => Record<string, any>)
  disabled?: boolean
}

export const CascadeSelectGroupOrganization = forwardRef<
  CascadeSelectGroupRef,
  CascadeSelectGroupProps
>(
  (
    {
      initialValues,

      branchRequired = false,

      blockRequired = false,
      blockTypeLabel = 'Khối chức năng',
      showBlockTypeFilter = false,

      showDepartment = true,
      departmentLabel = 'Phòng ban',
      showBlock = true,
      departmentRequired = false,

      showPosition = false,
      positionLabel = 'Chức vụ',
      positionRequired = false,

      showEmployee = true,
      employeeLabel = 'Nhân viên giới thiệu',
      employeeRequired = false,
      onEmployeeSelect,

      layout = 'grid',
      className = '',
      formErrors,
      onFormChange,
      skipValidation = false,
      blockTypeVariant = 'checkbox',
      compactFilterLayout = false,
      excludePositionFromEmployeeQuery = false,
      employeeAdditionalParams,
      disabled = false,
    },
    ref
  ) => {
    const ability = useAbility()
    const canAccessEmployeeDropdown = ability.can('dropdown', 'employee')

    const cascadeSelect = useCascadeSelect({
      initialValues,
      onEmployeeSelect,
      showDepartment,
      showPosition,
      excludePositionFromEmployeeQuery,
      employeeAdditionalParams,
    })
    const {
      blockOptions: cascadeBlockOptions,
      loadBlockOptions,
      loadInitialBlockOptions,
      loadDepartmentOptions,
      loadInitialDepartmentOptions,
      loadBranchOptions,
      loadInitialBranchOptions,
      isHydratingFromEmployee,
      setSelectedBlockTypes: cascadeSetSelectedBlockTypes,
      selectedBlockTypes: cascadeSelectedBlockTypes,
      blockTypeOptions: cascadeBlockTypeOptions,
    } = cascadeSelect

    const form = useForm<CascadeSelectFormData>({
      resolver: skipValidation ? undefined : zodResolver(createCascadeSelectSchema(showDepartment)),
      mode: skipValidation ? 'onBlur' : 'onChange', // Disable validation on change if skipValidation is true
      defaultValues: {
        branch_id: 0,
        branch_name: undefined,
        block_id: 0,
        block_name: undefined,
        department_id: 0,
        department_name: undefined,
        employee_id: 0,
        employee_name: undefined,
        position_id: 0,
        position_name: undefined,
        block_types: [],
      },
    })

    const {
      control,
      register,
      watch,
      formState: { errors },
    } = form

    // Expose reset methods via ref
    useImperativeHandle(ref, () => ({
      reset: () => {
        cascadeSelect.reset()
        form.reset({
          branch_id: 0,
          branch_name: undefined,
          block_id: 0,
          block_name: undefined,
          department_id: 0,
          department_name: undefined,
          employee_id: 0,
          employee_name: undefined,
          position_id: 0,
          position_name: undefined,
          block_types: [],
        })
      },
      clearAll: () => {
        cascadeSelect.reset()
        form.reset({
          branch_id: 0,
          branch_name: undefined,
          block_id: 0,
          block_name: undefined,
          department_id: 0,
          department_name: undefined,
          employee_id: 0,
          employee_name: undefined,
          position_id: 0,
          position_name: undefined,
          block_types: [],
        })
      },
    }))

    const watchedBlockTypesRaw = form.watch('block_types')
    const normalizedBlockTypes = React.useMemo(() => {
      if (!watchedBlockTypesRaw) {
        return []
      }
      if (!Array.isArray(watchedBlockTypesRaw)) {
        return []
      }
      return watchedBlockTypesRaw.map((value) => String(value))
    }, [watchedBlockTypesRaw])

    const [isBlockTypeHydrating, setIsBlockTypeHydrating] = React.useState(false)
    const hasEmittedInitialRef = React.useRef(false)
    const isHydratingRef = React.useRef(false)
    const initialBlockTypesSetRef = React.useRef(false)

    React.useEffect(() => {
      const setIfChanged = (field: keyof CascadeSelectFormData, value: any) => {
        const current = form.getValues(field as any)
        if (current === value) {
          return
        }
        // Don't overwrite an existing non-empty name string with undefined/null
        // (preserves name set by onChangeOption when async options haven't loaded yet)
        if (
          (value === undefined || value === null) &&
          typeof current === 'string' &&
          current !== ''
        ) {
          return
        }
        form.setValue(field as any, value, { shouldDirty: false, shouldValidate: false })
      }

      const findLabel = (
        options: Array<{ value: string | number; label: string }>,
        value?: string
      ) => {
        if (!value) {
          return undefined
        }
        return options.find((option) => String(option.value) === String(value))?.label
      }

      const branchId = cascadeSelect.selectedBranch ? Number(cascadeSelect.selectedBranch) : 0
      const branchName =
        findLabel(cascadeSelect.branchOptions, cascadeSelect.selectedBranch) ??
        cascadeSelect.selectedEmployee?.branch?.name
      setIfChanged('branch_id', branchId)
      setIfChanged('branch_name', branchName)

      const blockId = cascadeSelect.selectedBlock ? Number(cascadeSelect.selectedBlock) : 0
      const blockName =
        findLabel(cascadeBlockOptions, cascadeSelect.selectedBlock) ??
        cascadeSelect.selectedEmployee?.block?.name
      setIfChanged('block_id', blockId)
      setIfChanged('block_name', blockName)

      const departmentId =
        showDepartment && cascadeSelect.selectedDepartment
          ? Number(cascadeSelect.selectedDepartment)
          : 0
      const departmentName = showDepartment
        ? (findLabel(cascadeSelect.departmentOptions, cascadeSelect.selectedDepartment) ??
          cascadeSelect.selectedEmployee?.department?.name)
        : undefined
      setIfChanged('department_id', departmentId)
      setIfChanged('department_name', departmentName)

      const employeeId = cascadeSelect.selectedEmployee?.id ?? 0
      const employeeName = cascadeSelect.selectedEmployee?.fullname ?? undefined
      setIfChanged('employee_id', employeeId)
      setIfChanged('employee_name', employeeName)

      const positionId = cascadeSelect.selectedPosition ? Number(cascadeSelect.selectedPosition) : 0
      setIfChanged('position_id', positionId)
      if (cascadeSelect.selectedEmployee?.position?.name) {
        setIfChanged('position_name', cascadeSelect.selectedEmployee.position.name)
      } else if (!cascadeSelect.selectedEmployee) {
        setIfChanged('position_name', undefined)
      }
    }, [
      cascadeSelect.branchOptions,
      cascadeSelect.departmentOptions,
      cascadeBlockOptions,
      cascadeSelect.selectedBranch,
      cascadeSelect.selectedBlock,
      cascadeSelect.selectedDepartment,
      cascadeSelect.selectedEmployee,
      cascadeSelect.selectedPosition,
      showDepartment,
      form,
    ])

    const handleBlockTypeToggle = React.useCallback(
      (value: string, checked: boolean) => {
        const current = form.getValues('block_types') ?? []
        const currentSet = new Set(current.map((item) => String(item)))

        if (checked) {
          currentSet.add(value)
        } else {
          currentSet.delete(value)
        }

        const orderedNext = cascadeSelect?.blockTypeOptions
          .map((option) => option.value)
          .filter((optionValue) => currentSet.has(optionValue))

        form.setValue('block_types', orderedNext, { shouldDirty: true, shouldValidate: false })

        // This will reset Block, Department, Employee via setSelectedBlockTypes
        cascadeSetSelectedBlockTypes(orderedNext, 'manual')
      },
      [cascadeSelect, form]
    )

    const handleBlockTypeSelectChange = React.useCallback(
      (value: string | number | (string | number)[] | null) => {
        const nextValues = Array.isArray(value)
          ? value
          : value === null || value === undefined
            ? []
            : [value]
        const normalized = nextValues.map((item) => String(item))

        form.setValue('block_types', normalized, { shouldDirty: true, shouldValidate: false })
        cascadeSetSelectedBlockTypes(normalized, 'manual')
      },
      [cascadeSetSelectedBlockTypes, form]
    )

    // Watch only specific fields and emit changes when values actually change
    const watchedValues = watch([
      'branch_id',
      'branch_name',
      'block_id',
      'block_name',
      'department_id',
      'department_name',
      'employee_id',
      'employee_name',
      'position_id',
      'position_name',
      'block_types',
    ])
    const lastEmittedRef = React.useRef<string>('')
    React.useEffect(() => {
      if (!hasEmittedInitialRef.current) {
        hasEmittedInitialRef.current = true
        return
      }
      if (isBlockTypeHydrating) {
        return
      }
      const current = form.getValues()
      const payload = {
        branch_id: current.branch_id,
        branch_name: current.branch_name,
        block_id: current.block_id,
        block_name: current.block_name,
        department_id: current.department_id,
        department_name: current.department_name,
        employee_id: current.employee_id,
        employee_name: current.employee_name,
        position_id: current.position_id,
        position_name: current.position_name,
        block_types: current.block_types,
      }
      const serialized = JSON.stringify(payload)
      if (serialized !== lastEmittedRef.current) {
        lastEmittedRef.current = serialized
        onFormChange?.(payload as any)
      }
    }, [watchedValues, onFormChange, form, isBlockTypeHydrating])

    const isCompactRow = compactFilterLayout && !showBlock && showBlockTypeFilter && !showDepartment
    const gridGap = compactFilterLayout ? 'gap-3' : 'gap-5'
    const containerClass =
      layout === 'grid'
        ? `grid grid-cols-12 ${gridGap} w-full`
        : `flex flex-col ${compactFilterLayout ? 'gap-3' : 'gap-6'} w-full`

    const branchColClass =
      layout === 'grid' ? (showDepartment ? 'col-span-4 w-full' : 'col-span-6 w-full') : 'w-full'

    const blockColClass =
      layout === 'grid' ? (showDepartment ? 'col-span-4 w-full' : 'col-span-6 w-full') : 'w-full'

    const departmentColClass = layout === 'grid' ? 'col-span-4 w-full' : 'w-full'
    const employeeColClass =
      layout === 'grid' ? (showPosition ? 'col-span-6 w-full' : 'col-span-12 w-full') : 'w-full'
    // Bám `hasEmployeeColumn`, không phải `showEmployee`: ô Nhân viên còn qua cổng phân quyền
    // `dropdown:employee`. Người dùng không có quyền đó mà chỉ xét `showEmployee` thì "Chức vụ"
    // co lại nửa lưới 12 cột, bỏ trống hẳn nửa bên phải.
    const hasEmployeeColumn = showEmployee && canAccessEmployeeDropdown
    const positionColClass =
      layout === 'grid'
        ? hasEmployeeColumn
          ? 'col-span-6 w-full'
          : 'col-span-12 w-full'
        : 'w-full'

    const initialBlockTypesKey = React.useMemo(
      () => JSON.stringify(initialValues?.block_types ?? []),
      [initialValues?.block_types]
    )

    React.useEffect(() => {
      const initialBlockTypes = Array.isArray(initialValues?.block_types)
        ? initialValues.block_types.map((value) => String(value))
        : []
      initialBlockTypesSetRef.current = false
      isHydratingRef.current = true
      setIsBlockTypeHydrating(true)
      form.setValue('block_types', initialBlockTypes, {
        shouldDirty: false,
        shouldValidate: false,
      })
      cascadeSetSelectedBlockTypes(initialBlockTypes, 'initial')
      const timer = window.setTimeout(() => {
        initialBlockTypesSetRef.current = true
        isHydratingRef.current = false
        setIsBlockTypeHydrating(false)
      }, 150)
      return () => {
        window.clearTimeout(timer)
        isHydratingRef.current = false
        initialBlockTypesSetRef.current = false
      }
    }, [initialBlockTypesKey, form, cascadeSetSelectedBlockTypes])

    React.useEffect(() => {
      if (isBlockTypeHydrating || isHydratingRef.current || !initialBlockTypesSetRef.current) {
        return
      }
      const formBlockTypes = normalizedBlockTypes
      const cascadeBlockTypes = Array.isArray(cascadeSelectedBlockTypes)
        ? cascadeSelectedBlockTypes.map((value) => String(value))
        : []
      const isSame =
        formBlockTypes.length === cascadeBlockTypes.length &&
        formBlockTypes.every((value, index) => value === cascadeBlockTypes[index])

      if (!isSame) {
        cascadeSetSelectedBlockTypes(formBlockTypes, 'manual')
      }
    }, [
      normalizedBlockTypes,
      cascadeSelectedBlockTypes,
      cascadeSetSelectedBlockTypes,
      isBlockTypeHydrating,
    ])

    return (
      <div className={`flex flex-col ${className}`}>
        <div className={containerClass}>
          {/* Chi nhánh */}
          <div className={branchColClass}>
            <FormController<CascadeSelectFormData, any>
              name="branch_id"
              control={control}
              register={register}
              Field={Select}
              fieldProps={{
                placeholder: 'Nhập/chọn chi nhánh',
                label: 'Chi nhánh',
                required: branchRequired,
                value: cascadeSelect.selectedBranch ?? null,
                onChange: (value: string | number | null) => {
                  cascadeSelect.handleBranchChange(value)
                  if (!skipValidation) {
                    const fieldsToValidate = showDepartment
                      ? ['block_id', 'department_id', 'employee_id']
                      : ['block_id', 'employee_id']
                    form.trigger(fieldsToValidate as any)
                  }
                },
                onChangeOption: (opt: SelectOption | null) => {
                  form.setValue('branch_name', opt?.label || '')
                },
                loadOptions: loadBranchOptions,
                loadInitialOptions: loadInitialBranchOptions,
                pageSize: PAGE_SIZE,
                disabled: disabled || cascadeSelect.branchesLoading || isHydratingFromEmployee,
                enableSearch: true,
                searchPlaceholder: 'Tìm kiếm chi nhánh...',
                debounceMs: 300,
                error: (() => {
                  // If skipValidation is true, only show errors from formErrors (parent form)
                  if (skipValidation) {
                    return formErrors?.branch_id?.message
                  }
                  // If skipValidation is false, check both formErrors and internal errors
                  const hasFormErrors = formErrors !== undefined
                  const formErrorValue = formErrors?.branch_id?.message
                  const internalErrorValue = errors.branch_id?.message
                  // Only use formErrors if it's provided; if formErrors exists but field is undefined, don't fallback to internal errors
                  return hasFormErrors && formErrorValue !== undefined
                    ? formErrorValue
                    : formErrors === undefined
                      ? internalErrorValue
                      : undefined
                })(),
              }}
            />
          </div>

          {/* Khối */}
          {showBlock && (
            <div className={blockColClass}>
              <FormController<CascadeSelectFormData, any>
                name="block_id"
                control={control}
                register={register}
                Field={Select}
                fieldProps={{
                  placeholder: 'Nhập/chọn khối',
                  label: 'Khối',
                  required: blockRequired,
                  value: cascadeSelect.selectedBlock ?? null,
                  onChange: (value: string | number | null) => {
                    cascadeSelect.handleBlockChange(value)
                    if (!skipValidation) {
                      const fieldsToValidate = showDepartment
                        ? ['department_id', 'employee_id']
                        : ['employee_id']
                      form.trigger(fieldsToValidate as any)
                    }
                  },
                  onChangeOption: (opt: SelectOption | null) => {
                    form.setValue('block_name', opt?.label || '')
                  },
                  loadOptions: loadBlockOptions,
                  loadInitialOptions: loadInitialBlockOptions,
                  pageSize: PAGE_SIZE,
                  searchPlaceholder: 'Tìm kiếm khối...',
                  enableSearch: true,
                  debounceMs: 300,
                  disabled: disabled || !cascadeSelect.selectedBranch || isHydratingFromEmployee,
                  error: (() => {
                    // If skipValidation is true, only show errors from formErrors (parent form)
                    if (skipValidation) {
                      return formErrors?.block_id?.message
                    }
                    // If skipValidation is false, check both formErrors and internal errors
                    const hasFormErrors = formErrors !== undefined
                    const formErrorValue = formErrors?.block_id?.message
                    const internalErrorValue = errors.block_id?.message
                    // Only use formErrors if it's provided; if formErrors exists but field is undefined, don't fallback to internal errors
                    return hasFormErrors && formErrorValue !== undefined
                      ? formErrorValue
                      : formErrors === undefined
                        ? internalErrorValue
                        : undefined
                  })(),
                }}
              />
            </div>
          )}

          {/* Loại khối cùng hàng (compact: chỉ Chi nhánh + Loại khối) */}
          {isCompactRow && (
            <div className="col-span-6 flex w-full flex-col gap-2">
              <span className="typo-body-base-semibold text-content-dark-2">{blockTypeLabel}</span>
              {blockTypeVariant === 'select' ? (
                <Select
                  placeholder="Chọn chức năng khối"
                  options={cascadeBlockTypeOptions}
                  value={normalizedBlockTypes}
                  onChange={handleBlockTypeSelectChange}
                />
              ) : (
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {cascadeBlockTypeOptions.map((option) => {
                    const checkboxId = `block-type-compact-${option.value}`
                    return (
                      <div key={option.value} className="flex items-center gap-2 py-1.5">
                        <Checkbox
                          id={checkboxId}
                          className="h-5 w-5"
                          checked={normalizedBlockTypes.includes(option.value)}
                          onCheckedChange={(checked) =>
                            handleBlockTypeToggle(option.value, checked === true)
                          }
                        />
                        <label
                          className="typo-body-base-regular text-content-dark-1"
                          htmlFor={checkboxId}
                        >
                          {option.label}
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Phòng ban */}
          {showDepartment && (
            <div className={departmentColClass}>
              <FormController<CascadeSelectFormData, any>
                name="department_id"
                control={control}
                register={register}
                Field={Select}
                fieldProps={{
                  placeholder: 'Nhập/chọn phòng ban',
                  label: departmentLabel,
                  required: departmentRequired,
                  value: cascadeSelect.selectedDepartment ?? null,
                  onChange: (value: string | number | null) => {
                    cascadeSelect.handleDepartmentChange(value)
                    if (!skipValidation) {
                      form.trigger(['employee_id'])
                    }
                  },
                  onChangeOption: (opt: SelectOption | null) => {
                    form.setValue('department_name', opt?.label || '')
                  },
                  loadOptions: loadDepartmentOptions,
                  loadInitialOptions: loadInitialDepartmentOptions,
                  pageSize: PAGE_SIZE,
                  searchPlaceholder: 'Tìm kiếm phòng ban...',
                  enableSearch: true,
                  debounceMs: 300,
                  disabled:
                    disabled ||
                    !cascadeSelect.selectedBranch ||
                    !cascadeSelect.selectedBlock ||
                    isHydratingFromEmployee,
                  className: 'truncate',
                  title: watch('department_name') ?? undefined,
                  error: (() => {
                    // If skipValidation is true, only show errors from formErrors (parent form)
                    if (skipValidation) {
                      return formErrors?.department_id?.message
                    }
                    // If skipValidation is false, check both formErrors and internal errors
                    const hasFormErrors = formErrors !== undefined
                    const formErrorValue = formErrors?.department_id?.message
                    const internalErrorValue = errors.department_id?.message
                    // Only use formErrors if it's provided; if formErrors exists but field is undefined, don't fallback to internal errors
                    return hasFormErrors && formErrorValue !== undefined
                      ? formErrorValue
                      : formErrors === undefined
                        ? internalErrorValue
                        : undefined
                  })(),
                }}
              />
            </div>
          )}
        </div>

        {showBlockTypeFilter && !isCompactRow && (
          <div
            className={
              layout === 'grid'
                ? 'col-span-12 flex w-full flex-col gap-2'
                : 'flex w-full flex-col gap-2'
            }
          >
            <span className="typo-body-base-semibold text-content-dark-2">{blockTypeLabel}</span>
            {blockTypeVariant === 'select' ? (
              <Select
                placeholder="Chọn chức năng khối"
                options={cascadeBlockTypeOptions}
                value={normalizedBlockTypes}
                onChange={handleBlockTypeSelectChange}
              />
            ) : (
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {cascadeBlockTypeOptions.map((option) => {
                  const checkboxId = `block-type-${option.value}`
                  return (
                    <div key={`${option.value}`} className="flex items-center gap-2 py-1.5">
                      <Checkbox
                        id={checkboxId}
                        className="h-5 w-5"
                        checked={normalizedBlockTypes.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handleBlockTypeToggle(option.value, checked === true)
                        }
                      />
                      <label
                        className="typo-body-base-regular text-content-dark-1"
                        htmlFor={checkboxId}
                      >
                        {option.label}
                      </label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Hàng thứ hai chỉ dựng khi thật sự có field. Trước đây nó luôn render, và với màn
            tắt cả chức vụ lẫn nhân viên thì đó là một flex item cao 0px — vô hình, nhưng cột
            cha vẫn tính `gap` cho cả hai phía của nó, nên khoảng trống dưới hàng Chi nhánh /
            Khối / Phòng ban rộng gấp đôi mọi khoảng khác và cụm này trông tách rời hẳn. */}
        {(showPosition || (showEmployee && canAccessEmployeeDropdown)) && (
          <div className={containerClass}>
            {showPosition && (
              <div className={positionColClass}>
                <FormController<CascadeSelectFormData, any>
                  name="position_id"
                  control={control}
                  register={register}
                  Field={Select}
                  fieldProps={{
                    placeholder: 'Nhập/chọn chức vụ',
                    label: positionLabel,
                    required: positionRequired,
                    value: cascadeSelect.selectedPosition
                      ? Number(cascadeSelect.selectedPosition)
                      : null,
                    onChange: (value: string | number | null) => {
                      cascadeSelect.handlePositionChange(value)
                      if (!skipValidation) {
                        form.trigger(['employee_id'])
                      }
                    },
                    onChangeOption: (opt: SelectOption | null) => {
                      form.setValue('position_name', opt?.label || '')
                    },
                    loadOptions: cascadeSelect.loadPositionOptions,
                    loadInitialOptions: cascadeSelect.loadInitialPositionOptions,
                    pageSize: PAGE_SIZE,
                    searchPlaceholder: 'Tìm kiếm chức vụ...',
                    enableSearch: true,
                    debounceMs: 300,
                    title: undefined,
                    disabled: disabled,
                    error: skipValidation
                      ? formErrors?.position_id?.message
                      : formErrors?.position_id?.message || errors.position_id?.message,
                  }}
                />
              </div>
            )}
            {/* Nhân viên giới thiệu - chỉ hiển thị khi showEmployee = true và có quyền employee.dropdown */}
            {showEmployee && canAccessEmployeeDropdown && (
              <div className={employeeColClass}>
                <FormController<CascadeSelectFormData, any>
                  name="employee_id"
                  control={control}
                  register={register}
                  Field={Select}
                  fieldProps={{
                    placeholder: 'Nhập/chọn họ tên hoặc mã nhân viên',
                    label: employeeLabel,
                    required: employeeRequired,
                    value: cascadeSelect.selectedEmployee
                      ? cascadeSelect.selectedEmployee.id.toString()
                      : null,
                    onChange: (value: string | number | null) => {
                      cascadeSelect.handleEmployeeChange(value)
                    },
                    onChangeOption: (opt: SelectOption | null) => {
                      form.setValue('employee_name', opt?.label || '')
                    },
                    loadOptions: cascadeSelect.loadEmployeeOptions,
                    loadInitialOptions: cascadeSelect.loadInitialEmployeeOptions,
                    pageSize: PAGE_SIZE,
                    searchPlaceholder: 'Tìm kiếm nhân viên...',
                    enableSearch: true,
                    debounceMs: 300,
                    disabled: isHydratingFromEmployee,
                    error: (() => {
                      // If skipValidation is true, only show errors from formErrors (parent form)
                      if (skipValidation) {
                        return formErrors?.employee_id?.message
                      }
                      // If skipValidation is false, check both formErrors and internal errors
                      const hasFormErrors = formErrors !== undefined
                      const formErrorValue = formErrors?.employee_id?.message
                      const internalErrorValue = errors.employee_id?.message
                      // Only use formErrors if it's provided; if formErrors exists but field is undefined, don't fallback to internal errors
                      return hasFormErrors && formErrorValue !== undefined
                        ? formErrorValue
                        : formErrors === undefined
                          ? internalErrorValue
                          : undefined
                    })(),
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

CascadeSelectGroupOrganization.displayName = 'CascadeSelectGroupOrganization'
