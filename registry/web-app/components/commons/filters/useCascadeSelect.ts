import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Employee } from '@/services'
import { getEmployeeService } from '@/features/employee/services/employee-service'
import { useBlockSelect } from '@/hooks/useBlockSelect'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect'
import useOrganization from '@/hooks/useOrganization.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { usePositionSelect } from '@/hooks/usePositionSelect'
import { useBranchSelect } from '@/hooks/useBranchSelect'
import { PAGE_SIZE } from '@/constants/table.ts'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { BlockType } from '@/constants/api-schema-aliases'

type SelectionSource = 'initial' | 'manual' | 'employee'

export interface CascadeSelectOptions {
  initialValues?: {
    branch?: string
    block?: string
    department?: string
    employee?: string
    position?: string
    block_types?: string[]
  }
  onEmployeeSelect?: (employee: any) => void
  showDepartment?: boolean
  showPosition?: boolean
  excludePositionFromEmployeeQuery?: boolean
  employeeAdditionalParams?: Record<string, any> | (() => Record<string, any>)
}

export function useCascadeSelect(options: CascadeSelectOptions = {}) {
  const {
    initialValues,
    onEmployeeSelect,
    showDepartment = true,
    showPosition = false,
    excludePositionFromEmployeeQuery = false,
    employeeAdditionalParams,
  } = options
  const queryClient = useQueryClient()

  const [filters, setFilters] = useState({
    branch: initialValues?.branch,
    block: initialValues?.block,
    department: showDepartment ? initialValues?.department : undefined,
  })

  const [position, setPosition] = useState(initialValues?.position)
  const [selectedEmployee, setSelectedEmployeeState] = useState<Employee | null>(null)
  const [selectedBlockTypes, setSelectedBlockTypesState] = useState<string[]>(
    initialValues?.block_types ?? []
  )
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(
    initialValues?.employee ? 'employee' : 'manual'
  )
  const [isHydratingFromEmployee, setIsHydratingFromEmployee] = useState<boolean>(
    !!initialValues?.employee
  )
  const [isInitialized, setIsInitialized] = useState<boolean>(!initialValues?.employee)
  const pendingEmployeeIdRef = useRef<number | null>(
    initialValues?.employee ? Number(initialValues.employee) : null
  )
  const shouldSyncFromEmployeeRef = useRef<boolean>(!!initialValues?.employee)

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.BLOCK.TYPE],
  })

  const blockTypeOptions = useMemo<Array<{ value: string; label: string }>>(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.BLOCK.TYPE) || []
    if (!options.length) {
      return [
        { value: 'business', label: 'Kinh doanh' },
        { value: 'support', label: 'Hỗ trợ' },
      ]
    }

    const preferredOrder = ['business', 'support']
    const optionMap = new Map(
      options.map((option) => [String(option.value), option.label] as const)
    )

    const ordered = preferredOrder
      .map((value) => {
        const label = optionMap.get(value)
        if (!label) {
          return null
        }
        return { value, label }
      })
      .filter((item): item is { value: string; label: string } => item !== null)

    if (ordered.length) {
      return ordered
    }

    return options.map((option) => ({
      value: String(option.value),
      label: option.label,
    }))
  }, [keysMapOptions])

  // Sync filters when initialValues for organization (branch/block/department) change
  useEffect(() => {
    if (!initialValues) {
      return
    }

    setFilters((prev) => {
      const next = {
        branch: initialValues.branch,
        block: initialValues.block,
        department: showDepartment ? initialValues.department : undefined,
      }

      if (
        prev.branch === next.branch &&
        prev.block === next.block &&
        prev.department === next.department
      ) {
        return prev
      }

      return next
    })
  }, [initialValues?.branch, initialValues?.block, initialValues?.department, showDepartment])

  // API hooks - load branches always
  const blockTypeFilter = useMemo<BlockType | undefined>(() => {
    if (!selectedBlockTypes.length) {
      return undefined
    }

    if (blockTypeOptions.length && selectedBlockTypes.length === blockTypeOptions.length) {
      return undefined
    }

    if (selectedBlockTypes.length === 1) {
      return selectedBlockTypes[0] as BlockType
    }

    return undefined
  }, [selectedBlockTypes, blockTypeOptions])

  const {
    branches,
    blocks,
    departments,
    branchOptions: brOpts,
    blockOptions: blOpts,
    departmentOptions: dOpts,
    isBranchesLoading,
    isBlocksLoading,
    isDepartmentsLoading,
  } = useOrganization({
    branch: filters.branch ? parseInt(filters.branch) : undefined,
    block: filters.block ? parseInt(filters.block) : undefined,
    blockType: blockTypeFilter,
    fetchBranches: false,
    fetchBlocks: false,
    fetchDepartments: false,
  })

  // Use position select hook for pagination
  const { loadPositionOptions, loadInitialPositionOptions } = usePositionSelect({
    pageSize: PAGE_SIZE,
  })

  // Branch select utilities (for initial hydration by IDs)

  // Build employee params for useEmployeeSelect hook - use function form to react to changes
  const employeeParams = useCallback(() => {
    const params: Record<string, any> = {}
    if (filters.branch) params.branch = parseInt(filters.branch)
    if (filters.block) params.block = parseInt(filters.block)
    if (filters.department) params.department = parseInt(filters.department)
    if (position && !excludePositionFromEmployeeQuery) params.position = parseInt(position)

    // Merge additional params if provided
    if (employeeAdditionalParams) {
      const resolvedAdditionalParams =
        typeof employeeAdditionalParams === 'function'
          ? employeeAdditionalParams()
          : employeeAdditionalParams
      Object.assign(params, resolvedAdditionalParams)
    }

    // If we have initial employee but no filters yet, return empty params to load all employees
    if (initialValues?.employee && !isInitialized) {
      // Still include additionalParams even when loading initial employee
      if (employeeAdditionalParams) {
        const resolvedAdditionalParams =
          typeof employeeAdditionalParams === 'function'
            ? employeeAdditionalParams()
            : employeeAdditionalParams
        return resolvedAdditionalParams
      }
      return {} // Load all employees
    }

    // Return params if we have any filters, otherwise return additionalParams only
    return Object.keys(params).length > 0 ? params : {}
  }, [
    filters.branch,
    filters.block,
    filters.department,
    initialValues?.employee,
    isInitialized,
    position,
    excludePositionFromEmployeeQuery,
    employeeAdditionalParams,
  ])

  // Use employee select hook for pagination (getCachedEmployeeById avoids refetch when selection is from dropdown)
  const { loadEmployeeOptions, loadInitialEmployeeOptions, getCachedEmployeeById } =
    useEmployeeSelect({
      valueType: 'id',
      pageSize: PAGE_SIZE,
      fields: ['id', 'code', 'fullname', 'block', 'branch', 'department', 'position'].filter(
        (field) => {
          switch (field) {
            case 'department':
              return showDepartment
            case 'position':
              return showPosition
            default:
              return true
          }
        }
      ),
      additionalParams: employeeParams,
    })

  // Memoize options to ensure they update when data changes
  const branchOptions = useMemo(
    () => brOpts.map((branch) => ({ ...branch, value: branch.value.toString() })),
    [brOpts]
  )

  const rawBlockOptions = useMemo(
    () => blOpts.map((block) => ({ ...block, value: String(block.value) })),
    [blOpts]
  )

  const departmentOptions = useMemo(
    () => dOpts.map((department) => ({ ...department, value: department.value.toString() })),
    [dOpts]
  )

  const blockTypeLookup = useMemo(() => {
    const lookup = new Map<string, string | undefined>()
    blocks.forEach((block) => {
      lookup.set(String(block.id), block.block_type ? String(block.block_type) : undefined)
    })
    return lookup
  }, [blocks])

  const blockOptions = useMemo(() => {
    if (!selectedBlockTypes.length || selectedBlockTypes.length === blockTypeOptions.length) {
      return rawBlockOptions
    }

    const allowed = new Set(selectedBlockTypes)
    return rawBlockOptions.filter((option) => {
      const type = blockTypeLookup.get(String(option.value))
      if (!type) {
        return false
      }
      return allowed.has(type)
    })
  }, [rawBlockOptions, blockTypeLookup, selectedBlockTypes, blockTypeOptions.length])

  const employeeOptions = useMemo(() => [], [])

  const positionOptions = useMemo(() => [], [])

  const normalizeIdValue = (value: string | number | null | undefined) =>
    value ? String(value) : undefined

  const clearEmployeeSelection = useCallback(() => {
    shouldSyncFromEmployeeRef.current = false
    pendingEmployeeIdRef.current = null
    setSelectedEmployeeState(null)
  }, [])

  const handleFilterChange = useCallback(
    (
      key: 'branch' | 'block' | 'department',
      value: string | undefined,
      source: SelectionSource
    ) => {
      let hasChanged = false

      setFilters((prev) => {
        switch (key) {
          case 'branch': {
            if (prev.branch === value) {
              return prev
            }
            hasChanged = true
            return {
              branch: value,
              block: undefined,
              department: undefined,
            }
          }
          case 'block': {
            if (prev.block === value) {
              return prev
            }
            hasChanged = true
            return {
              ...prev,
              block: value,
              department: undefined,
            }
          }
          case 'department': {
            if (prev.department === value) {
              return prev
            }
            hasChanged = true
            return {
              ...prev,
              department: value,
            }
          }
          default:
            return prev
        }
      })

      if (!hasChanged) {
        return
      }

      if (source === 'manual') {
        setSelectionSource('manual')
        clearEmployeeSelection()
      } else if (source === 'employee') {
        setSelectionSource('employee')
      } else if (source === 'initial') {
        setSelectionSource('initial')
      }
    },
    [clearEmployeeSelection, filters]
  )

  const updateBlockTypes = useCallback(
    (values: string[], source: SelectionSource = 'manual') => {
      const normalized = Array.isArray(values) ? values.map((value) => String(value)) : []

      setSelectedBlockTypesState((prev) => {
        const isSame =
          prev.length === normalized.length &&
          prev.every((item, index) => item === normalized[index])

        if (isSame) {
          return prev
        }

        if (source === 'manual') {
          setSelectionSource('manual')
          setFilters((current) => {
            if (!current.block && !current.department) {
              return current
            }
            return {
              ...current,
              block: undefined,
              department: undefined,
            }
          })
          clearEmployeeSelection()
        } else if (source === 'employee') {
          setSelectionSource('employee')
        } else if (source === 'initial') {
          setSelectionSource('initial')
        }

        return normalized
      })
    },
    [clearEmployeeSelection]
  )

  const handleBranchChange = useCallback(
    (value: string | number | null) => {
      const normalized = normalizeIdValue(value)
      handleFilterChange('branch', normalized, 'manual')
      return normalized ? Number(normalized) : 0
    },
    [handleFilterChange]
  )

  const handleBlockChange = useCallback(
    (value: string | number | null) => {
      const normalized = normalizeIdValue(value)
      handleFilterChange('block', normalized, 'manual')
      return normalized ? Number(normalized) : 0
    },
    [handleFilterChange]
  )

  const handleDepartmentChange = useCallback(
    (value: string | number | null) => {
      const normalized = normalizeIdValue(value)
      handleFilterChange('department', normalized, 'manual')
      return normalized ? Number(normalized) : 0
    },
    [handleFilterChange]
  )

  const handlePositionChange = useCallback(
    (value: string | number | null, source: SelectionSource = 'manual') => {
      const normalized = normalizeIdValue(value)
      setPosition((prev) => {
        if (prev === normalized) {
          return prev
        }
        return normalized
      })

      if (source === 'manual') {
        setSelectionSource('manual')
        clearEmployeeSelection()
      } else if (source === 'employee') {
        setSelectionSource('employee')
      }

      return normalized ? Number(normalized) : 0
    },
    [clearEmployeeSelection]
  )

  const fetchEmployeeDetail = useCallback(
    async (employeeId: number) => {
      const params = { id__in: [employeeId], page: 1, page_size: 1 }
      const data = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(params),
        queryFn: () => getEmployeeService().listEmployeesDropdown(params),
        staleTime: 5 * 60 * 1000,
      })
      return data?.results?.[0]
    },
    [queryClient]
  )

  const handleEmployeeChange = useCallback(
    (value: string | number | null) => {
      const normalized = normalizeIdValue(value)

      if (!normalized) {
        setSelectionSource('manual')
        setIsHydratingFromEmployee(false)
        clearEmployeeSelection()
        return 0
      }

      const employeeId = Number(normalized)
      pendingEmployeeIdRef.current = employeeId
      shouldSyncFromEmployeeRef.current = true
      setSelectionSource('employee')
      setIsHydratingFromEmployee(true)

      const cached = getCachedEmployeeById(employeeId)
      if (cached) {
        setSelectedEmployeeState(cached as unknown as Employee)
        onEmployeeSelect?.(cached)
        setIsInitialized(true)
        setIsHydratingFromEmployee(false)
        return employeeId
      }

      fetchEmployeeDetail(employeeId)
        .then((employee) => {
          if (!employee || pendingEmployeeIdRef.current !== employeeId) {
            return
          }
          setSelectedEmployeeState(employee as unknown as Employee)
          onEmployeeSelect?.(employee)
          setIsInitialized(true)
        })
        .catch((error) => {
          console.error('Error fetching employee:', error)
          if (pendingEmployeeIdRef.current === employeeId) {
            clearEmployeeSelection()
            setSelectionSource('manual')
          }
        })
        .finally(() => {
          if (pendingEmployeeIdRef.current === employeeId) {
            setIsHydratingFromEmployee(false)
            setIsInitialized(true)
          }
        })

      return employeeId
    },
    [clearEmployeeSelection, onEmployeeSelect, fetchEmployeeDetail, getCachedEmployeeById]
  )

  useEffect(() => {
    if (!initialValues?.employee) {
      setIsInitialized(true)
    }
  }, [initialValues?.employee])

  const initialEmployeeIdKey = useMemo(
    () => (initialValues?.employee ? String(initialValues.employee) : ''),
    [initialValues?.employee]
  )

  useEffect(() => {
    if (!initialValues?.employee) {
      return
    }
    handleEmployeeChange(initialValues.employee)
  }, [initialEmployeeIdKey, handleEmployeeChange, initialValues?.employee])

  const initialBlockTypesKey = useMemo(
    () => JSON.stringify(initialValues?.block_types ?? []),
    [initialValues?.block_types]
  )

  useEffect(() => {
    const initial = Array.isArray(initialValues?.block_types)
      ? initialValues.block_types.map((value) => String(value))
      : []
    updateBlockTypes(initial, 'initial')
  }, [initialBlockTypesKey, updateBlockTypes])

  useEffect(() => {
    if (!selectedEmployee || !shouldSyncFromEmployeeRef.current) {
      return
    }

    const nextBranch = selectedEmployee.branch?.id ? String(selectedEmployee.branch.id) : undefined
    const nextBlock = selectedEmployee.block?.id ? String(selectedEmployee.block.id) : undefined
    const nextDepartment = selectedEmployee.department?.id
      ? String(selectedEmployee.department.id)
      : undefined
    const nextPosition = selectedEmployee.position?.id
      ? String(selectedEmployee.position.id)
      : undefined

    handleFilterChange('branch', nextBranch, 'employee')
    handleFilterChange('block', nextBlock, 'employee')
    if (showDepartment) {
      handleFilterChange('department', nextDepartment, 'employee')
    }
    handlePositionChange(nextPosition ?? null, 'employee')

    const timer = window.setTimeout(() => {
      shouldSyncFromEmployeeRef.current = false
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [selectedEmployee, showDepartment, handleFilterChange, handlePositionChange])

  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect({
    pageSize: PAGE_SIZE,
  })

  const { loadBlockOptions, loadInitialBlockOptions } = useBlockSelect({
    pageSize: PAGE_SIZE,
    additionalParams: () => ({
      branch: filters.branch ? parseInt(filters.branch, 10) : undefined,
    }),
  })

  const { loadDepartmentOptions, loadInitialDepartmentOptions } = useDepartmentSelect({
    pageSize: PAGE_SIZE,
    additionalParams: () => ({
      branch: filters.branch ? parseInt(filters.branch, 10) : undefined,
      block: filters.block ? parseInt(filters.block, 10) : undefined,
    }),
  })

  const setBlockTypes = useCallback(
    (values: string[], source: SelectionSource = 'manual') => {
      updateBlockTypes(values, source)
    },
    [updateBlockTypes]
  )

  return {
    branches,
    blocks,
    departments,
    employees: [],
    positions: undefined,
    branchesLoading: isBranchesLoading,
    blocksLoading: isBlocksLoading,
    departmentsLoading: isDepartmentsLoading,
    employeesLoading: false,
    positionLoading: false,
    branchOptions,
    blockOptions,
    departmentOptions,
    employeeOptions,
    positionOptions,
    blockTypeOptions,
    loadEmployeeOptions,
    loadInitialEmployeeOptions,
    loadPositionOptions,
    loadInitialPositionOptions,
    loadBranchOptions,
    loadInitialBranchOptions,
    loadBlockOptions,
    loadInitialBlockOptions,
    loadDepartmentOptions,
    loadInitialDepartmentOptions,
    selectedBranch: filters.branch,
    selectedBlock: filters.block,
    selectedDepartment: filters.department,
    selectedEmployee,
    selectedPosition: position,
    selectedBlockTypes,
    selectionSource,
    isHydratingFromEmployee,
    handleBranchChange,
    handleBlockChange,
    handleDepartmentChange,
    handleEmployeeChange,
    handlePositionChange,
    reset: () => {
      setFilters({
        branch: undefined,
        block: undefined,
        department: undefined,
      })
      clearEmployeeSelection()
      setIsInitialized(!initialValues?.employee)
      setPosition(undefined)
      updateBlockTypes([], 'initial')
      setSelectionSource('manual')
      setIsHydratingFromEmployee(false)
      shouldSyncFromEmployeeRef.current = false
      pendingEmployeeIdRef.current = null
    },
    setSelectedBranch: (value: string | undefined) => {
      handleFilterChange('branch', value, 'manual')
    },
    setSelectedBlock: (value: string | undefined) => {
      handleFilterChange('block', value, 'manual')
    },
    setSelectedDepartment: (value: string | undefined) => {
      handleFilterChange('department', value, 'manual')
    },
    setSelectedEmployee: (value: any) => {
      if (!value) {
        setSelectionSource('manual')
        clearEmployeeSelection()
        return
      }
      setSelectionSource('employee')
      setSelectedEmployeeState(value)
    },
    setSelectedPosition: (value: string | number | null) => {
      handlePositionChange(value)
    },
    setSelectedBlockTypes: setBlockTypes,
    clearSelectedEmployee: () => {
      setSelectionSource('manual')
      clearEmployeeSelection()
    },
  }
}
