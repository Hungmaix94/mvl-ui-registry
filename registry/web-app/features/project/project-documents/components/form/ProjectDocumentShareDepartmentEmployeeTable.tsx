import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Checkbox, TextField } from '@/components/ui'
import { RadioGroup } from '@/components/ui/radio-group.tsx'
import {
  IconArrowlineup,
  IconCaretdown,
  IconCaretright,
  IconChecksquare,
  IconMagnifyingglass,
} from '@/assets/icons'
import { getEmployeeService } from '@/features/employee/services/employee-service'
import { getDepartmentService } from '@/features/org/services/department-service'
import { cn } from '@/utils'
import { Box } from '@radix-ui/themes'

type DepartmentRow = {
  id: number
  name: string
  code: string
  branchName?: string
  blockName?: string
}

type EmployeeRow = {
  id: number
  code: string
  fullname: string
  positionName: string
  departmentId: number
  departmentName: string
  branchName: string
  blockName: string
}

type SearchFilterType = 'employee' | 'department'

type ProjectDocumentShareDepartmentEmployeeTableProps = {
  selectedDepartmentIds: number[]
  onSelectedDepartmentIdsChange: (ids: number[]) => void
  selectedEmployeeIds: number[]
  onSelectedEmployeeIdsChange: (ids: number[]) => void
}

const SEARCH_DEBOUNCE_MS = 400
const PAGE_SIZE = 100
const DEPARTMENT_PAGE_SIZE = 200

/** Dedupes concurrent fetches (e.g. React Strict Mode) via React Query cache. */
const PROJECT_DOCUMENT_SHARE_DEPARTMENTS_QUERY_KEY = [
  'hrm',
  'departments',
  'project-document-share-all-pages',
] as const

const DEPARTMENTS_STALE_MS = 5 * 60 * 1000

async function fetchAllDepartmentsForShareForm(): Promise<DepartmentRow[]> {
  const service = getDepartmentService()
  let page = 1
  const rows: DepartmentRow[] = []

  while (true) {
    const response = await service.getDepartments({
      page,
      page_size: DEPARTMENT_PAGE_SIZE,
    })

    const mapped = (response?.results ?? []).map((department: any) => ({
      id: department.id,
      name: department?.name ?? '-',
      code: department?.code ?? '-',
      branchName: department?.branch?.name ?? '-',
      blockName: department?.block?.name ?? '-',
    })) as DepartmentRow[]

    if (mapped.length === 0) break
    rows.push(...mapped)
    if (!response?.next) break
    page += 1
  }

  return rows
}

function mapEmployee(raw: any): EmployeeRow | null {
  const departmentId = raw?.department?.id
  if (typeof departmentId !== 'number') return null

  return {
    id: raw.id,
    code: raw.code ?? '-',
    fullname: raw.fullname ?? '-',
    positionName: raw?.position?.name ?? '-',
    departmentId,
    departmentName: raw?.department?.name ?? '-',
    branchName: raw?.branch?.name ?? '-',
    blockName: raw?.block?.name ?? '-',
  }
}

function groupEmployeesByDepartment(employees: EmployeeRow[]): Record<number, EmployeeRow[]> {
  return employees.reduce<Record<number, EmployeeRow[]>>((acc, employee) => {
    if (!acc[employee.departmentId]) acc[employee.departmentId] = []
    acc[employee.departmentId].push(employee)
    return acc
  }, {})
}

export default function ProjectDocumentShareDepartmentEmployeeTable({
  selectedDepartmentIds,
  onSelectedDepartmentIdsChange,
  selectedEmployeeIds,
  onSelectedEmployeeIdsChange,
}: ProjectDocumentShareDepartmentEmployeeTableProps) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchFilterType, setSearchFilterType] = useState<SearchFilterType>('employee')
  const [isShowOnlyCheckedDepartments, setIsShowOnlyCheckedDepartments] = useState(false)
  const { data: departmentRows = [], isPending: isDepartmentListLoading } = useQuery({
    queryKey: PROJECT_DOCUMENT_SHARE_DEPARTMENTS_QUERY_KEY,
    queryFn: fetchAllDepartmentsForShareForm,
    staleTime: DEPARTMENTS_STALE_MS,
  })
  const [matchingDepartmentIds, setMatchingDepartmentIds] = useState<number[]>([])
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState<number[]>([])
  const [departmentLoadingIds, setDepartmentLoadingIds] = useState<number[]>([])
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [employeesByDepartment, setEmployeesByDepartment] = useState<Record<number, EmployeeRow[]>>(
    {}
  )
  const [searchEmployeesByDepartment, setSearchEmployeesByDepartment] = useState<
    Record<number, EmployeeRow[]>
  >({})
  const employeeSearchRequestIdRef = useRef(0)
  const departmentSearchRequestIdRef = useRef(0)

  const selectedDepartmentSet = useMemo(
    () => new Set(selectedDepartmentIds),
    [selectedDepartmentIds]
  )
  const selectedEmployeeSet = useMemo(() => new Set(selectedEmployeeIds), [selectedEmployeeIds])
  const hasSearchTerm = debouncedSearch.length > 0
  const isEmployeeSearchMode = searchFilterType === 'employee' && hasSearchTerm
  const isDepartmentSearchMode = searchFilterType === 'department' && hasSearchTerm
  const isTableLoading = isDepartmentListLoading || isSearchLoading

  const searchFilterOptions = useMemo(
    () => [
      { value: 'department', label: 'Theo phòng ban' },
      { value: 'employee', label: 'Theo nhân viên' },
    ],
    []
  )

  const departmentRowById = useMemo(() => {
    return departmentRows.reduce<Record<number, DepartmentRow>>((acc, row) => {
      acc[row.id] = row
      return acc
    }, {})
  }, [departmentRows])

  const activeEmployeesByDepartment = isEmployeeSearchMode
    ? searchEmployeesByDepartment
    : employeesByDepartment

  const matchingDepartmentIdSet = useMemo(
    () => new Set(matchingDepartmentIds),
    [matchingDepartmentIds]
  )

  const visibleDepartmentRows = useMemo(() => {
    if (isEmployeeSearchMode) {
      return Object.entries(searchEmployeesByDepartment).map(([departmentId, employees]) => {
        const id = Number(departmentId)
        const found = departmentRowById[id]
        const fallback = employees[0]

        return {
          id,
          name: found?.name ?? fallback?.departmentName ?? '-',
          code: found?.code ?? '-',
          branchName: found?.branchName ?? fallback?.branchName,
          blockName: found?.blockName ?? fallback?.blockName,
        } satisfies DepartmentRow
      })
    }

    if (isDepartmentSearchMode) {
      return departmentRows.filter((department) => matchingDepartmentIdSet.has(department.id))
    }

    return departmentRows
  }, [
    departmentRowById,
    departmentRows,
    isDepartmentSearchMode,
    isEmployeeSearchMode,
    matchingDepartmentIdSet,
    searchEmployeesByDepartment,
  ])

  const visibleFilteredDepartmentRows = useMemo(() => {
    if (!isShowOnlyCheckedDepartments) return visibleDepartmentRows

    return visibleDepartmentRows.filter((department) => {
      const departmentEmployees = activeEmployeesByDepartment[department.id] ?? []
      const isDepartmentChecked = selectedDepartmentSet.has(department.id)

      const checkedEmployees = departmentEmployees.filter(
        (employee) => isDepartmentChecked || selectedEmployeeSet.has(employee.id)
      )

      const isDepartmentIndeterminate = !isDepartmentChecked && checkedEmployees.length > 0

      return isDepartmentChecked || isDepartmentIndeterminate
    })
  }, [
    activeEmployeesByDepartment,
    isShowOnlyCheckedDepartments,
    selectedDepartmentSet,
    selectedEmployeeSet,
    visibleDepartmentRows,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const fetchAllEmployees = useCallback(
    async (params: Record<string, unknown>): Promise<EmployeeRow[]> => {
      const service = getEmployeeService()
      let page = 1
      const allEmployees: EmployeeRow[] = []

      while (true) {
        const response = await service.listEmployeesDropdown({
          ...params,
          page,
          page_size: PAGE_SIZE,
        })

        const rows = (response?.results ?? []).map(mapEmployee).filter(Boolean) as EmployeeRow[]
        if (rows.length === 0) break

        allEmployees.push(...rows)

        if (!response?.next) break
        page += 1
      }

      return allEmployees
    },
    []
  )

  const fetchAllDepartmentIdsBySearch = useCallback(async (search: string) => {
    const service = getDepartmentService()
    let page = 1
    const ids: number[] = []

    while (true) {
      const response = await service.getDepartments({
        search,
        page,
        page_size: DEPARTMENT_PAGE_SIZE,
      })

      const rows = response?.results ?? []
      if (rows.length === 0) break

      rows.forEach((department: any) => {
        if (typeof department?.id === 'number') ids.push(department.id)
      })

      if (!response?.next) break
      page += 1
    }

    return ids
  }, [])

  const loadDepartmentEmployees = useCallback(
    async (departmentId: number) => {
      if (employeesByDepartment[departmentId]) return

      setDepartmentLoadingIds((prev) =>
        prev.includes(departmentId) ? prev : [...prev, departmentId]
      )
      try {
        const employees = await fetchAllEmployees({ department: departmentId })
        setEmployeesByDepartment((prev) => ({ ...prev, [departmentId]: employees }))
      } finally {
        setDepartmentLoadingIds((prev) => prev.filter((id) => id !== departmentId))
      }
    },
    [employeesByDepartment, fetchAllEmployees]
  )

  useEffect(() => {
    if (!isEmployeeSearchMode) return

    const requestId = employeeSearchRequestIdRef.current + 1
    employeeSearchRequestIdRef.current = requestId
    let isActive = true

    const run = async () => {
      setIsSearchLoading(true)
      try {
        const employees = await fetchAllEmployees({ search: debouncedSearch })
        if (!isActive || employeeSearchRequestIdRef.current !== requestId) return

        const grouped = groupEmployeesByDepartment(employees)
        setSearchEmployeesByDepartment(grouped)
        setExpandedDepartmentIds(Object.keys(grouped).map((id) => Number(id)))
      } finally {
        if (isActive && employeeSearchRequestIdRef.current === requestId) setIsSearchLoading(false)
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [debouncedSearch, fetchAllEmployees, isEmployeeSearchMode])

  useEffect(() => {
    if (!isDepartmentSearchMode) return

    const requestId = departmentSearchRequestIdRef.current + 1
    departmentSearchRequestIdRef.current = requestId
    let isActive = true

    const run = async () => {
      setIsSearchLoading(true)
      try {
        const departmentIds = await fetchAllDepartmentIdsBySearch(debouncedSearch)
        if (!isActive || departmentSearchRequestIdRef.current !== requestId) return

        setMatchingDepartmentIds(departmentIds)
      } finally {
        if (isActive && departmentSearchRequestIdRef.current === requestId)
          setIsSearchLoading(false)
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [debouncedSearch, fetchAllDepartmentIdsBySearch, isDepartmentSearchMode])

  useEffect(() => {
    if (!isEmployeeSearchMode) {
      setSearchEmployeesByDepartment({})
      setIsSearchLoading(false)
    }
  }, [isEmployeeSearchMode])

  useEffect(() => {
    if (!isDepartmentSearchMode) {
      setMatchingDepartmentIds([])
      setIsSearchLoading(false)
    }
  }, [isDepartmentSearchMode])

  const isTopPosition = useCallback((positionName: string) => {
    const normalized = positionName.trim().toLowerCase()
    return normalized === 'trưởng phòng' || normalized.includes('trưởng phòng')
  }, [])

  const sortEmployeesWithTopPosition = useCallback(
    (employees: EmployeeRow[]) =>
      [...employees].sort((a, b) => {
        const aTop = isTopPosition(a.positionName)
        const bTop = isTopPosition(b.positionName)
        if (aTop && !bTop) return -1
        if (!aTop && bTop) return 1
        return a.fullname.localeCompare(b.fullname)
      }),
    [isTopPosition]
  )

  const handleToggleDepartment = useCallback(
    (departmentId: number, employeesInDepartment: EmployeeRow[]) => {
      const employeeIdsInDepartment = employeesInDepartment.map((e) => e.id)

      if (selectedDepartmentSet.has(departmentId)) {
        onSelectedDepartmentIdsChange(selectedDepartmentIds.filter((id) => id !== departmentId))
        onSelectedEmployeeIdsChange(
          selectedEmployeeIds.filter((id) => !employeeIdsInDepartment.includes(id))
        )
        return
      }

      onSelectedDepartmentIdsChange([...selectedDepartmentIds, departmentId])
      onSelectedEmployeeIdsChange(
        selectedEmployeeIds.filter((id) => !employeeIdsInDepartment.includes(id))
      )
    },
    [
      onSelectedDepartmentIdsChange,
      onSelectedEmployeeIdsChange,
      selectedDepartmentIds,
      selectedDepartmentSet,
      selectedEmployeeIds,
    ]
  )

  const handleToggleEmployee = useCallback(
    (
      departmentId: number,
      employeeId: number,
      checked: boolean,
      employeesInDepartment: EmployeeRow[]
    ) => {
      const employeeIdsInDepartment = employeesInDepartment.map((e) => e.id)
      const isDepartmentSelected = selectedDepartmentSet.has(departmentId)

      if (!checked && isDepartmentSelected) {
        const nextEmployeesForThisDept = employeeIdsInDepartment.filter((id) => id !== employeeId)
        const otherDeptEmployeeIds = selectedEmployeeIds.filter(
          (id) => !employeeIdsInDepartment.includes(id)
        )

        onSelectedDepartmentIdsChange(selectedDepartmentIds.filter((id) => id !== departmentId))
        onSelectedEmployeeIdsChange([...otherDeptEmployeeIds, ...nextEmployeesForThisDept])
        return
      }

      if (!checked) {
        onSelectedEmployeeIdsChange(selectedEmployeeIds.filter((id) => id !== employeeId))
        return
      }

      onSelectedDepartmentIdsChange(selectedDepartmentIds.filter((id) => id !== departmentId))
      onSelectedEmployeeIdsChange(Array.from(new Set([...selectedEmployeeIds, employeeId])))
    },
    [
      onSelectedDepartmentIdsChange,
      onSelectedEmployeeIdsChange,
      selectedDepartmentIds,
      selectedDepartmentSet,
      selectedEmployeeIds,
    ]
  )

  const handleToggleExpand = useCallback(
    (departmentId: number) => {
      const isExpanded = expandedDepartmentIds.includes(departmentId)
      setExpandedDepartmentIds((prev) =>
        isExpanded ? prev.filter((id) => id !== departmentId) : [...prev, departmentId]
      )

      if (isExpanded) return
      if (isEmployeeSearchMode) return

      void loadDepartmentEmployees(departmentId)
    },
    [expandedDepartmentIds, isEmployeeSearchMode, loadDepartmentEmployees]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <TextField
          value={searchInput}
          placeholder={
            searchFilterType === 'department'
              ? 'Tìm kiếm theo tên phòng ban'
              : 'Tìm kiếm theo nhân viên'
          }
          onChange={setSearchInput}
          prefix={<IconMagnifyingglass size={14} className="h-5 w-5" />}
          className="flex-1"
        />

        <Box className={'w-fit'}>
          <RadioGroup
            id="share-department-employee-filter-type"
            label="Kiểu tìm kiếm"
            hiddenLabel
            disabled={false}
            options={searchFilterOptions}
            value={searchFilterType}
            onChange={(value) => {
              if (value === 'department' || value === 'employee') {
                setSearchFilterType(value)
              }
            }}
            className="typo-body-sm-medium shrink-0 gap-2"
          />
        </Box>

        <Button
          variant="text"
          size="small"
          leftIcon={<IconArrowlineup size={16} />}
          iconOnly
          onClick={() => setExpandedDepartmentIds([])}
          disabled={expandedDepartmentIds.length === 0}
          title="Thu gọn tất cả"
          className={cn(
            'text-nowrap',
            'text-content-dark-3 hover:text-content-dark-1',
            'hover:bg-data-light-grey-hover'
          )}
        >
          Thu gọn tất cả
        </Button>

        <Button
          variant="text"
          size="small"
          leftIcon={<IconChecksquare size={16} />}
          iconOnly
          onClick={() => setIsShowOnlyCheckedDepartments((prev) => !prev)}
          title={
            isShowOnlyCheckedDepartments
              ? 'Tắt lọc: hiển thị tất cả phòng ban'
              : 'Bật lọc: chỉ hiển thị phòng ban đã chọn'
          }
          className={cn(
            'hover:bg-data-light-grey-hover hover:text-content-dark-1',
            isShowOnlyCheckedDepartments
              ? 'text-content-dark-1 bg-data-light-grey-focus'
              : 'text-content-dark-3'
          )}
        />
      </div>

      <div className="border-border-1 overflow-hidden rounded-sm border">
        <div className="bg-background-2 text-content-dark-1 typo-body-sm-medium grid grid-cols-[minmax(280px,2fr)_minmax(100px,1fr)_minmax(180px,1fr)] gap-2 px-3 py-2">
          <span>Tên</span>
          <span>Mã</span>
          <span>Chức vụ</span>
        </div>

        <div className="max-h-[300px] overflow-auto">
          {isTableLoading && (
            <div className="typo-body-sm-regular text-content-dark-3 dot-loader px-3 py-2">
              Đang tải danh sách
            </div>
          )}

          {!isTableLoading && visibleFilteredDepartmentRows.length === 0 && (
            <div className="typo-body-sm-regular text-content-dark-3 px-3 py-2">
              Không có dữ liệu hiển thị
            </div>
          )}

          {visibleFilteredDepartmentRows.map((department) => {
            const departmentEmployees = activeEmployeesByDepartment[department.id] ?? []
            const isExpanded = expandedDepartmentIds.includes(department.id)
            const isLoadingDepartment = departmentLoadingIds.includes(department.id)
            const isDepartmentChecked = selectedDepartmentSet.has(department.id)

            const checkedEmployees = departmentEmployees.filter(
              (employee) => isDepartmentChecked || selectedEmployeeSet.has(employee.id)
            )

            const isDepartmentIndeterminate = !isDepartmentChecked && checkedEmployees.length > 0

            const hierarchyText = [
              department.branchName ?? 'Chi nhánh -',
              department.blockName ?? 'Khối -',
              department.name ?? 'Phòng ban -',
            ].join(' - ')

            const sorted = sortEmployeesWithTopPosition(departmentEmployees)

            return (
              <div key={department.id} className="border-border-1 border-t first:border-t-0">
                <div className="flex items-center justify-start gap-2 px-4 py-2">
                  <Checkbox
                    checked={
                      isDepartmentChecked
                        ? true
                        : isDepartmentIndeterminate
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={() =>
                      handleToggleDepartment(department.id, departmentEmployees)
                    }
                  />

                  <button
                    type="button"
                    className="text-content-dark-3 hover:text-content-dark-1 inline-flex items-center justify-center"
                    onClick={() => handleToggleExpand(department.id)}
                    title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                  >
                    {isExpanded ? <IconCaretdown size={16} /> : <IconCaretright size={16} />}
                  </button>

                  <span
                    className="typo-body-sm-medium text-content-dark-2 flex-1 truncate"
                    title={hierarchyText}
                    onClick={() => handleToggleExpand(department.id)}
                  >
                    {hierarchyText}
                  </span>
                </div>

                {isExpanded && (
                  <div className="bg-background-2">
                    {isLoadingDepartment && !isEmployeeSearchMode && (
                      <div className="typo-body-sm-regular text-content-dark-3 dot-loader px-3 py-2 pl-11">
                        Đang tải nhân viên
                      </div>
                    )}

                    {!isLoadingDepartment &&
                      sorted.map((employee) => {
                        const isEmployeeChecked =
                          isDepartmentChecked || selectedEmployeeSet.has(employee.id)

                        return (
                          <div
                            key={employee.id}
                            className="border-border-1 grid grid-cols-[minmax(280px,2fr)_minmax(100px,1fr)_minmax(180px,1fr)] items-center gap-2 border-t px-3 py-2"
                          >
                            <div className="flex items-center gap-2 pl-8">
                              <Checkbox
                                checked={isEmployeeChecked}
                                onCheckedChange={(checked) =>
                                  handleToggleEmployee(
                                    department.id,
                                    employee.id,
                                    Boolean(checked),
                                    departmentEmployees
                                  )
                                }
                              />

                              <span
                                className="typo-body-sm-medium text-content-dark-3 truncate"
                                title={employee.fullname}
                              >
                                {employee.fullname}
                              </span>
                            </div>

                            <span className="typo-body-sm-medium text-content-dark-3">
                              {employee.code}
                            </span>

                            <span
                              className="typo-body-sm-medium text-content-dark-3 truncate"
                              title={employee.positionName}
                            >
                              {employee.positionName}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
