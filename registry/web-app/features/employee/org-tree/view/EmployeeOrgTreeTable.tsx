import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Chip } from '@/components/ui'
import { IconCaretdown, IconCaretright } from '@/assets/icons/arrows'
import { cn } from '@/utils'
import TableColumnConfig from '@/components/ui/table/column-config/TableColumnConfig'
import { Avatar as RadixAvatar, Flex } from '@radix-ui/themes'
import UserAvatar from '@/components/ui/avatar/DefaultAvatar'
import {
  VirtualTreeTable,
  type VirtualTreeColumn,
} from '@/components/ui/table-tree/VirtualTreeTable'
import romansLib from 'romans'
import { useAllBranches } from '@/features/org/services/branch-service'
import { useAllBlocks, type Block } from '@/features/org/services/block-service'
import { useAllDepartments, type Department } from '@/features/org/services/department-service'
import {
  useAllEmployees,
  type Employee,
  type GetEmployeesParams,
} from '@/features/employee/services/employee-service'
import { useColumnConfig } from '@/hooks/useColumnConfig'
import type { FetchAllProgress } from '@/utils/fetch-all-paginated'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatDate } from '@/utils/date-utils'
import type { ColumnConfig } from '@/types/table'
import type { ColoredValue } from '@/types/hrm-types'

const EMPTY_CELL = ''

// The OpenAPI schema is missing two runtime fields the API actually returns.
// Track them via this local extension instead of leaking `any` through the cells.
type EmployeeWithExtras = Employee & {
  contract_type?: { name?: string | null } | null
}

type OrgRow = {
  kind: 'org'
  id: string
  depth: 1 | 2 | 3
  stt: string | number
  label: string
  expandable: boolean
  expanded: boolean
  onExpandClick: () => void
}

type EmployeeRow = {
  kind: 'employee'
  id: string
  depth: 4
  stt: number
  employee: EmployeeWithExtras
}

type EmptyRow = {
  kind: 'empty'
  id: string
  depth: 1 | 2 | 3 | 4
}

type EmployeeOrgTreeRow = OrgRow | EmployeeRow | EmptyRow

function toRoman(num: number): string {
  return (romansLib as { romanize?: (n: number) => string }).romanize?.(num) ?? String(num)
}

function safeStr(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value : EMPTY_CELL
}

const defaultColumnConfig: ColumnConfig[] = [
  { id: 'stt', label: 'STT', visible: true, order: 0 },
  { id: 'label', label: 'Chi nhánh - Khối - Phòng ban - Nhân viên', visible: true, order: 1 },
  { id: 'code', label: 'Mã nhân viên', visible: true, order: 2 },
  { id: 'position', label: 'Chức vụ', visible: true, order: 3 },
  { id: 'phone', label: 'Số điện thoại', visible: true, order: 4 },
  { id: 'email', label: 'Email', visible: true, order: 5 },
  { id: 'coloredStatus', label: 'Trạng thái', visible: true, order: 6 },
  { id: 'attendanceCode', label: 'Mã chấm công', visible: false, order: 7 },
  { id: 'startDate', label: 'Ngày bắt đầu', visible: false, order: 8 },
  { id: 'resignationReason', label: 'Lý do nghỉ việc', visible: false, order: 9 },
  { id: 'resignationStartDate', label: 'Ngày nghỉ việc', visible: false, order: 10 },
  { id: 'contractType', label: 'Loại hợp đồng', visible: false, order: 11 },
  { id: 'employeeType', label: 'Loại nhân viên', visible: false, order: 34 },
  { id: 'personalEmail', label: 'Email cá nhân', visible: false, order: 12 },
  { id: 'defaultBankAccount', label: 'Tài khoản ngân hàng mặc định', visible: false, order: 13 },
  { id: 'taxCode', label: 'Mã số thuế', visible: false, order: 14 },
  { id: 'emergencyContactName', label: 'Người liên hệ khẩn cấp', visible: false, order: 15 },
  { id: 'emergencyContactPhone', label: 'SĐT người liên hệ khẩn cấp', visible: false, order: 16 },
  { id: 'gender', label: 'Giới tính', visible: false, order: 17 },
  { id: 'dateOfBirth', label: 'Ngày sinh', visible: false, order: 18 },
  { id: 'placeOfBirth', label: 'Nơi sinh', visible: false, order: 19 },
  { id: 'maritalStatus', label: 'Tình trạng hôn nhân', visible: false, order: 20 },
  { id: 'nationality', label: 'Quốc tịch', visible: false, order: 21 },
  { id: 'ethnicity', label: 'Dân tộc', visible: false, order: 22 },
  { id: 'religion', label: 'Tôn giáo', visible: false, order: 23 },
  { id: 'citizenId', label: 'Số CCCD/CMND', visible: false, order: 24 },
  { id: 'citizenIdIssuedDate', label: 'Ngày cấp CCCD/CMND', visible: false, order: 25 },
  { id: 'citizenIdIssuedPlace', label: 'Nơi cấp CCCD/CMND', visible: false, order: 26 },
  { id: 'residentialAddress', label: 'Địa chỉ cư trú', visible: false, order: 27 },
  { id: 'permanentAddress', label: 'Địa chỉ thường trú', visible: false, order: 28 },
  { id: 'username', label: 'Tài khoản đăng nhập', visible: false, order: 29 },
  { id: 'recruitmentCandidate', label: 'Ứng viên liên kết', visible: false, order: 30 },
  {
    id: 'recruitmentCandidateContactPerson',
    label: 'Người liên hệ',
    visible: false,
    order: 31,
  },
  { id: 'recruitmentCandidateReferrer', label: 'Người giới thiệu', visible: false, order: 32 },
  { id: 'note', label: 'Ghi chú', visible: false, order: 33 },
]

type TreeOrgFilter = {
  branchId?: number
  blockId?: number
  departmentId?: number
}

type EmployeeOrgTreeTableProps = {
  isShowTableColumnConfig?: boolean
  employeeFilterParams?: Record<string, unknown>
  treeOrgFilter?: TreeOrgFilter
  /**
   * Gate the employee fetch until the page has normalized its URL filter params.
   * Prevents a transient unfiltered fetch-all from racing the filtered one.
   */
  enabled?: boolean
}

const ROW_HEIGHT = 64

const EmployeeOrgTreeTable = ({
  isShowTableColumnConfig,
  employeeFilterParams,
  treeOrgFilter,
  enabled = true,
}: EmployeeOrgTreeTableProps) => {
  const { data: allBranches, isLoading: isAllBranchesLoading } = useAllBranches()
  const { data: allBlocks, isLoading: isAllBlocksLoading } = useAllBlocks()
  const { data: allDepartments, isLoading: isAllDepartmentsLoading } = useAllDepartments()

  const employeeListParams = useMemo((): NonNullable<GetEmployeesParams> => {
    const base = (employeeFilterParams ?? {}) as NonNullable<GetEmployeesParams>
    const params: NonNullable<GetEmployeesParams> = {
      ...base,
      ordering: 'branch__name,block__name,department__name,code',
    }
    if (treeOrgFilter?.branchId != null) params.branch = treeOrgFilter.branchId
    if (treeOrgFilter?.blockId != null) params.block = treeOrgFilter.blockId
    if (treeOrgFilter?.departmentId != null) params.department = treeOrgFilter.departmentId
    return params
  }, [employeeFilterParams, treeOrgFilter])

  // Employee pages load sequentially (100/page) - track progress for the loading bar
  const [employeeLoadProgress, setEmployeeLoadProgress] = useState<FetchAllProgress | null>(null)

  const handleEmployeeLoadProgress = useCallback((progress: FetchAllProgress) => {
    setEmployeeLoadProgress(progress)
  }, [])

  const { data: allEmployees, isLoading: isAllEmployeesLoading } = useAllEmployees(
    employeeListParams,
    { enabled, onProgress: handleEmployeeLoadProgress }
  )

  // Reset the bar whenever a fresh load starts (mount or filter change)
  useEffect(() => {
    if (isAllEmployeesLoading) {
      setEmployeeLoadProgress(null)
    }
  }, [isAllEmployeesLoading])

  const isLoading =
    !enabled ||
    isAllBranchesLoading ||
    isAllBlocksLoading ||
    isAllDepartmentsLoading ||
    isAllEmployeesLoading

  const employeeLoadPercentage = useMemo(() => {
    if (!employeeLoadProgress || employeeLoadProgress.total <= 0) return 0
    return Math.min(
      100,
      Math.round((employeeLoadProgress.loaded / employeeLoadProgress.total) * 100)
    )
  }, [employeeLoadProgress])

  const dataReady =
    !isLoading &&
    allBranches !== undefined &&
    allBlocks !== undefined &&
    allDepartments !== undefined &&
    allEmployees !== undefined

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.EMPLOYEE.STATUS,
      APP_CONSTANT_KEY.EMPLOYEE.GENDER,
      APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS,
      APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON,
      APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES,
    ],
  })

  const statusMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.STATUS) as
    | Record<string, string>
    | undefined
  const genderMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.GENDER) as
    | Record<string, string>
    | undefined
  const maritalStatusMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS) as
    | Record<string, string>
    | undefined
  const resignationReasonMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON) as
    | Record<string, string>
    | undefined
  const employeeTypeMap = keysMap.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES) as
    | Record<string, string>
    | undefined

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'employee-org-tree',
  })

  const [isShowConfigColumn, setIsShowConfigColumn] = useState(false)

  useLayoutEffect(() => {
    if (isShowTableColumnConfig) {
      setIsShowConfigColumn(true)
    }
  }, [isShowTableColumnConfig])

  const [expandedBranchIds, setExpandedBranchIds] = useState<number[]>([])
  const [expandedBlockKeys, setExpandedBlockKeys] = useState<string[]>([])
  const [expandedDeptKeys, setExpandedDeptKeys] = useState<string[]>([])

  // Default view expands every level so employees are visible immediately.
  useEffect(() => {
    if (!allBranches || !allBlocks || !allDepartments) return

    const branches = treeOrgFilter?.branchId
      ? allBranches.filter((b) => b.id === treeOrgFilter.branchId)
      : allBranches
    setExpandedBranchIds(branches.map((b) => b.id))

    const blockKeys: string[] = []
    for (const bl of allBlocks) {
      if (treeOrgFilter?.branchId && bl.branch.id !== treeOrgFilter.branchId) continue
      if (treeOrgFilter?.blockId && bl.id !== treeOrgFilter.blockId) continue
      blockKeys.push(`block-${bl.branch.id}-${bl.id}`)
    }
    setExpandedBlockKeys(blockKeys)

    const deptKeys: string[] = []
    for (const d of allDepartments) {
      if (treeOrgFilter?.branchId && d.branch.id !== treeOrgFilter.branchId) continue
      if (treeOrgFilter?.blockId && d.block.id !== treeOrgFilter.blockId) continue
      if (treeOrgFilter?.departmentId && d.id !== treeOrgFilter.departmentId) continue
      deptKeys.push(`dept-${d.branch.id}-${d.block.id}-${d.id}`)
    }
    setExpandedDeptKeys(deptKeys)
  }, [allBranches, allBlocks, allDepartments, treeOrgFilter])

  const handleBranchToggle = useCallback((branchId: number) => {
    setExpandedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    )
  }, [])

  const handleBlockToggle = useCallback((branchId: number, blockId: number) => {
    const key = `block-${branchId}-${blockId}`
    setExpandedBlockKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  const handleDeptToggle = useCallback((branchId: number, blockId: number, deptId: number) => {
    const key = `dept-${branchId}-${blockId}-${deptId}`
    setExpandedDeptKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  // Department is the smallest org level — every employee belongs to exactly one.
  const empByDeptKey = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const emp of allEmployees ?? []) {
      const branchId = emp.branch?.id
      const blockId = emp.block?.id
      const deptId = emp.department?.id
      if (branchId == null || blockId == null || deptId == null) continue
      const deptKey = `dept-${branchId}-${blockId}-${deptId}`
      const arr = map.get(deptKey) ?? []
      arr.push(emp)
      map.set(deptKey, arr)
    }
    return map
  }, [allEmployees])

  // Org units with no employees are hidden (cascade: a block/branch with no
  // staffed descendants is hidden too). empByDeptKey only holds staffed depts.
  const { staffedBranchIds, staffedBlockKeys } = useMemo(() => {
    const branchIds = new Set<number>()
    const blockKeys = new Set<string>()
    for (const deptKey of empByDeptKey.keys()) {
      // deptKey = `dept-${branchId}-${blockId}-${deptId}`
      const [, branchId, blockId] = deptKey.split('-')
      branchIds.add(Number(branchId))
      blockKeys.add(`block-${branchId}-${blockId}`)
    }
    return { staffedBranchIds: branchIds, staffedBlockKeys: blockKeys }
  }, [empByDeptKey])

  const blocksByBranchId = useMemo(() => {
    const map = new Map<number, Block[]>()
    for (const b of allBlocks ?? []) {
      const arr = map.get(b.branch.id) ?? []
      arr.push(b)
      map.set(b.branch.id, arr)
    }
    for (const [branchId, arr] of map.entries()) {
      map.set(
        branchId,
        [...arr].sort((a, b) => a.code.localeCompare(b.code))
      )
    }
    return map
  }, [allBlocks])

  const departmentsByBlockKey = useMemo(() => {
    const map = new Map<string, Department[]>()
    for (const d of allDepartments ?? []) {
      const key = `block-${d.branch.id}-${d.block.id}`
      const arr = map.get(key) ?? []
      arr.push(d)
      map.set(key, arr)
    }
    for (const [key, arr] of map.entries()) {
      map.set(
        key,
        [...arr].sort((a, b) => a.code.localeCompare(b.code))
      )
    }
    return map
  }, [allDepartments])

  // Build the visible flat row list from the org tree + expanded state.
  // Employee rows carry only the raw entity reference; cell renderers extract
  // fields lazily so build cost stays at O(visible nodes), not O(rows × fields).
  const rows = useMemo<EmployeeOrgTreeRow[]>(() => {
    if (!dataReady || !allBranches?.length) return []

    const result: EmployeeOrgTreeRow[] = []
    const branches = (
      treeOrgFilter?.branchId
        ? allBranches.filter((b) => b.id === treeOrgFilter.branchId)
        : allBranches
    ).filter((b) => staffedBranchIds.has(b.id))

    branches.forEach((branch, branchIdx) => {
      const branchId = branch.id
      const branchCode = branch.code?.trim()
      const branchRawName = branch.name?.trim() || EMPTY_CELL
      const branchName = branchCode ? `${branchCode} - ${branchRawName}` : branchRawName
      const branchKey = `branch-${branchId}`
      const isBranchExpanded = expandedBranchIds.includes(branchId)

      result.push({
        kind: 'org',
        id: branchKey,
        depth: 1,
        stt: toRoman(branchIdx + 1),
        label: branchName,
        expandable: true,
        expanded: isBranchExpanded,
        onExpandClick: () => handleBranchToggle(branchId),
      })

      if (!isBranchExpanded) return

      let blocks = (blocksByBranchId.get(branchId) ?? []).filter((b) =>
        staffedBlockKeys.has(`block-${branchId}-${b.id}`)
      )
      if (treeOrgFilter?.blockId) {
        blocks = blocks.filter((b) => b.id === treeOrgFilter.blockId)
      }

      if (blocks.length === 0) {
        result.push({ kind: 'empty', id: `${branchKey}-empty`, depth: 2 })
      }

      blocks.forEach((block, blockIdx) => {
        const blockId = block.id
        const blockCode = block.code?.trim()
        const blockRawName = block.name?.trim() || EMPTY_CELL
        const blockName = blockCode ? `${blockCode} - ${blockRawName}` : blockRawName
        const blockKey = `block-${branchId}-${blockId}`
        const isBlockExpanded = expandedBlockKeys.includes(blockKey)

        result.push({
          kind: 'org',
          id: blockKey,
          depth: 2,
          stt: blockIdx + 1,
          label: blockName,
          expandable: true,
          expanded: isBlockExpanded,
          onExpandClick: () => handleBlockToggle(branchId, blockId),
        })

        if (!isBlockExpanded) return

        let departments = (departmentsByBlockKey.get(blockKey) ?? []).filter((d) =>
          empByDeptKey.has(`dept-${branchId}-${blockId}-${d.id}`)
        )
        if (treeOrgFilter?.departmentId) {
          departments = departments.filter((d) => d.id === treeOrgFilter.departmentId)
        }

        if (departments.length === 0) {
          result.push({ kind: 'empty', id: `${blockKey}-empty`, depth: 3 })
        }

        departments.forEach((dept, deptIdx) => {
          const deptId = dept.id
          const deptCode = dept.code?.trim()
          const deptRawName = dept.name?.trim() || EMPTY_CELL
          const deptName = deptCode ? `${deptCode} - ${deptRawName}` : deptRawName
          const deptKey = `dept-${branchId}-${blockId}-${deptId}`
          const isDeptExpanded = expandedDeptKeys.includes(deptKey)

          result.push({
            kind: 'org',
            id: deptKey,
            depth: 3,
            stt: `${blockIdx + 1}.${deptIdx + 1}`,
            label: deptName,
            expandable: true,
            expanded: isDeptExpanded,
            onExpandClick: () => handleDeptToggle(branchId, blockId, deptId),
          })

          if (!isDeptExpanded) return

          const deptEmployees = empByDeptKey.get(deptKey) ?? []
          if (deptEmployees.length === 0) {
            result.push({ kind: 'empty', id: `${deptKey}-empty`, depth: 4 })
            return
          }
          deptEmployees.forEach((emp, empIdx) => {
            result.push({
              kind: 'employee',
              id: `${deptKey}-emp-${emp.id ?? empIdx}`,
              depth: 4,
              stt: empIdx + 1,
              employee: emp as EmployeeWithExtras,
            })
          })
        })
      })
    })

    return result
  }, [
    dataReady,
    allBranches,
    blocksByBranchId,
    departmentsByBlockKey,
    expandedBranchIds,
    expandedBlockKeys,
    expandedDeptKeys,
    empByDeptKey,
    staffedBranchIds,
    staffedBlockKeys,
    handleBranchToggle,
    handleBlockToggle,
    handleDeptToggle,
    treeOrgFilter,
  ])

  const boldHeader = (text: string) => (
    <span className="typo-body-base-semibold text-content-dark-1">{text}</span>
  )

  const allColumns: VirtualTreeColumn<EmployeeOrgTreeRow>[] = useMemo(
    () => [
      {
        id: 'stt',
        header: boldHeader('STT'),
        cell: (row) => {
          if (row.kind === 'empty') return null
          const sttContent = String(row.stt)
          if (row.kind === 'employee') return <span>{sttContent}</span>
          const Icon = row.expanded ? IconCaretdown : IconCaretright
          return (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  row.onExpandClick()
                }}
                className="text-content-dark-2 hover:text-content-dark-1 flex items-center justify-center p-0.5"
                aria-label={row.expanded ? 'Thu gọn' : 'Mở rộng'}
              >
                <Icon size={16} />
              </button>
              <span>{sttContent}</span>
            </div>
          )
        },
        meta: { width: 80, frozen: true, align: 'center' },
      },
      {
        id: 'label',
        header: boldHeader('Chi nhánh - Khối - Phòng ban - Nhân viên'),
        cell: (row) => {
          if (row.kind === 'empty') {
            return (
              <span
                className={cn(
                  'flex min-w-0 items-center',
                  row.depth === 2 && 'pl-4',
                  row.depth === 3 && 'pl-8',
                  row.depth === 4 && 'pl-12'
                )}
              >
                Không có bản ghi
              </span>
            )
          }
          if (row.kind === 'org') {
            const displayLabel = row.label?.trim() || EMPTY_CELL
            return (
              <span
                className={cn(
                  'flex min-w-0 items-center gap-2',
                  row.depth === 2 && 'pl-4',
                  row.depth === 3 && 'pl-8'
                )}
                title={displayLabel}
              >
                {displayLabel}
              </span>
            )
          }
          const empCode = safeStr(row.employee.code)
          const empName = safeStr(row.employee.fullname)
          const labelTitle = empCode ? `${empCode} - ${empName}` : empName
          return (
            <span className="flex min-w-0 items-center gap-2 pl-12" title={labelTitle}>
              <Flex justify={'start'} align={'center'} gap={'2'}>
                <RadixAvatar
                  size="2"
                  src={row.employee.avatar?.view_url ?? undefined}
                  fallback={<UserAvatar />}
                  radius="full"
                  variant="soft"
                  className="shrink-0"
                />
                <Flex direction={'column'} gap={'1'} className="typo-body-sm-medium block truncate">
                  <Flex gap={'1'}>
                    <span className={'text-content-dark-3 typo-body-sm-semibold'}>Mã:</span>
                    <span>{empCode}</span>
                  </Flex>
                  <Flex gap={'1'}>
                    <span className={'text-content-dark-3 typo-body-sm-semibold'}>Tên:</span>
                    <span>{empName}</span>
                  </Flex>
                </Flex>
              </Flex>
            </span>
          )
        },
        meta: { width: 320, frozen: true, align: 'left' },
      },
      {
        id: 'code',
        header: boldHeader('Mã nhân viên'),
        cell: (row) => (row.kind === 'employee' ? safeStr(row.employee.code) : null),
        meta: { width: 130, align: 'center' },
      },
      {
        id: 'position',
        header: boldHeader('Chức vụ'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.position?.name)
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'coloredStatus',
        header: boldHeader('Trạng thái'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const colored = row.employee.colored_status as ColoredValue | null | undefined
          if (!colored) return null
          const label = colored.value ? (statusMap?.[colored.value] ?? colored.value) : EMPTY_CELL
          return <Chip label={label} variant={colored.variant} size="small" />
        },
        meta: { width: 150, align: 'center' },
      },
      {
        id: 'phone',
        header: boldHeader('Số điện thoại'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.phone)}</span> : null,
        meta: { width: 130, align: 'center' },
      },
      {
        id: 'email',
        header: boldHeader('Email'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.email)
          return (
            <span className="block truncate" title={value || undefined}>
              {value}
            </span>
          )
        },
        meta: { width: 180, align: 'left' },
      },
      {
        id: 'attendanceCode',
        header: boldHeader('Mã chấm công'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.attendance_code)}</span> : null,
        meta: { width: 130, align: 'center' },
      },
      {
        id: 'startDate',
        header: boldHeader('Ngày bắt đầu'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{formatDate(row.employee.start_date) ?? EMPTY_CELL}</span>
          ) : null,
        meta: { width: 130, align: 'center' },
      },
      {
        id: 'resignationReason',
        header: boldHeader('Lý do nghỉ việc'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const raw = row.employee.resignation_reason ?? undefined
          const label = raw ? (resignationReasonMap?.[raw] ?? raw) : EMPTY_CELL
          return <span title={label || undefined}>{label}</span>
        },
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'resignationStartDate',
        header: boldHeader('Ngày nghỉ việc'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{formatDate(row.employee.resignation_start_date) ?? EMPTY_CELL}</span>
          ) : null,
        meta: { width: 130, align: 'center' },
      },
      {
        id: 'contractType',
        header: boldHeader('Loại hợp đồng'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.contract_type?.name)
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'employeeType',
        header: boldHeader('Loại nhân viên'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const raw = row.employee.employee_type
          const value = raw ? (employeeTypeMap?.[raw] ?? raw) : EMPTY_CELL
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'personalEmail',
        header: boldHeader('Email cá nhân'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.personal_email)
          return (
            <span className="block truncate" title={value || undefined}>
              {value}
            </span>
          )
        },
        meta: { width: 180, align: 'left' },
      },
      {
        id: 'defaultBankAccount',
        header: boldHeader('Tài khoản ngân hàng mặc định'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.default_bank_account?.account_number)
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 180, align: 'left' },
      },
      {
        id: 'taxCode',
        header: boldHeader('Mã số thuế'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.tax_code)}</span> : null,
        meta: { width: 130, align: 'center' },
      },
      {
        id: 'emergencyContactName',
        header: boldHeader('Người liên hệ khẩn cấp'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{safeStr(row.employee.emergency_contact_name)}</span>
          ) : null,
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'emergencyContactPhone',
        header: boldHeader('SĐT người liên hệ khẩn cấp'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{safeStr(row.employee.emergency_contact_phone)}</span>
          ) : null,
        meta: { width: 170, align: 'center' },
      },
      {
        id: 'gender',
        header: boldHeader('Giới tính'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const raw = row.employee.gender ?? undefined
          const label = raw ? (genderMap?.[raw] ?? raw) : EMPTY_CELL
          return <span>{label}</span>
        },
        meta: { width: 100, align: 'center' },
      },
      {
        id: 'dateOfBirth',
        header: boldHeader('Ngày sinh'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{formatDate(row.employee.date_of_birth) ?? EMPTY_CELL}</span>
          ) : null,
        meta: { width: 120, align: 'center' },
      },
      {
        id: 'placeOfBirth',
        header: boldHeader('Nơi sinh'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.place_of_birth)}</span> : null,
        meta: { width: 130, align: 'left' },
      },
      {
        id: 'maritalStatus',
        header: boldHeader('Tình trạng hôn nhân'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const raw = row.employee.marital_status ?? undefined
          const label = raw ? (maritalStatusMap?.[raw] ?? raw) : EMPTY_CELL
          return <span>{label}</span>
        },
        meta: { width: 150, align: 'center' },
      },
      {
        id: 'nationality',
        header: boldHeader('Quốc tịch'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.nationality?.name)}</span> : null,
        meta: { width: 120, align: 'center' },
      },
      {
        id: 'ethnicity',
        header: boldHeader('Dân tộc'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.ethnicity)}</span> : null,
        meta: { width: 120, align: 'center' },
      },
      {
        id: 'religion',
        header: boldHeader('Tôn giáo'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.religion)}</span> : null,
        meta: { width: 120, align: 'center' },
      },
      {
        id: 'citizenId',
        header: boldHeader('Số CCCD/CMND'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.citizen_id)}</span> : null,
        meta: { width: 140, align: 'center' },
      },
      {
        id: 'citizenIdIssuedDate',
        header: boldHeader('Ngày cấp CCCD/CMND'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{formatDate(row.employee.citizen_id_issued_date) ?? EMPTY_CELL}</span>
          ) : null,
        meta: { width: 150, align: 'center' },
      },
      {
        id: 'citizenIdIssuedPlace',
        header: boldHeader('Nơi cấp CCCD/CMND'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{safeStr(row.employee.citizen_id_issued_place)}</span>
          ) : null,
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'residentialAddress',
        header: boldHeader('Địa chỉ cư trú'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.residential_address)
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 200, align: 'left' },
      },
      {
        id: 'permanentAddress',
        header: boldHeader('Địa chỉ thường trú'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.permanent_address)
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 200, align: 'left' },
      },
      {
        id: 'username',
        header: boldHeader('Tài khoản đăng nhập'),
        cell: (row) =>
          row.kind === 'employee' ? <span>{safeStr(row.employee.username)}</span> : null,
        meta: { width: 150, align: 'center' },
      },
      {
        id: 'recruitmentCandidate',
        header: boldHeader('Ứng viên liên kết'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const cand = row.employee.recruitment_candidate
          const value = cand?.code && cand?.name ? `${cand.code} - ${cand.name}` : EMPTY_CELL
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 180, align: 'left' },
      },
      {
        id: 'recruitmentCandidateContactPerson',
        header: boldHeader('Người liên hệ'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{safeStr(row.employee.recruitment_candidate?.contact_person)}</span>
          ) : null,
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'recruitmentCandidateReferrer',
        header: boldHeader('Người giới thiệu'),
        cell: (row) =>
          row.kind === 'employee' ? (
            <span>{safeStr(row.employee.recruitment_candidate?.referrer)}</span>
          ) : null,
        meta: { width: 150, align: 'left' },
      },
      {
        id: 'note',
        header: boldHeader('Ghi chú'),
        cell: (row) => {
          if (row.kind !== 'employee') return null
          const value = safeStr(row.employee.note)
          return <span title={value || undefined}>{value}</span>
        },
        meta: { width: 200, align: 'left' },
      },
    ],
    [statusMap, genderMap, maritalStatusMap, resignationReasonMap, employeeTypeMap]
  )

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => col.id === c.id))
      .filter(Boolean) as VirtualTreeColumn<EmployeeOrgTreeRow>[]
  }, [columnConfig, allColumns])

  const getRowClassName = useCallback((row: EmployeeOrgTreeRow): string | undefined => {
    const border = 'border-b border-border-1'
    switch (row.depth) {
      case 1:
        return `bg-red-10 text-content-dark-1 ${border}`
      case 2:
        return `bg-background-org-block text-content-dark-1 ${border}`
      case 3:
        return `bg-background-org-department text-content-dark-1 ${border}`
      case 4:
        return `bg-background-1 text-content-dark-1 ${border}`
      default:
        return border
    }
  }, [])

  const isRowClickable = useCallback((row: EmployeeOrgTreeRow) => row.kind === 'org', [])

  const handleRowClick = useCallback((row: EmployeeOrgTreeRow) => {
    if (row.kind === 'org') row.onExpandClick()
  }, [])

  return (
    <>
      {isLoading ? (
        <div className="flex w-full flex-col items-center justify-center gap-3 px-10 py-16">
          <p className="typo-body-base-medium text-content-dark-2">Đang tải dữ liệu nhân sự...</p>
          <div className="bg-data-light-grey-default h-2 w-full max-w-[544px] overflow-hidden rounded-full">
            <div
              className="bg-action-primary-red-default h-full rounded-full transition-all"
              style={{ width: `${employeeLoadPercentage}%` }}
            />
          </div>
          <p className="typo-body-sm-regular text-content-dark-3">
            {employeeLoadProgress
              ? `${employeeLoadProgress.loaded.toLocaleString('vi-VN')}/${employeeLoadProgress.total.toLocaleString('vi-VN')} nhân viên (${employeeLoadPercentage}%)`
              : 'Đang chuẩn bị dữ liệu...'}
          </p>
        </div>
      ) : (
        <VirtualTreeTable
          data={rows}
          columns={visibleColumns}
          rowHeight={ROW_HEIGHT}
          isLoading={false}
          getRowClassName={getRowClassName}
          isRowClickable={isRowClickable}
          onRowClick={handleRowClick}
          emptyMessage="Không có dữ liệu"
        />
      )}
      <TableColumnConfig
        isShowConfigColumn={isShowConfigColumn}
        setIsShowConfigColumn={setIsShowConfigColumn}
        columns={columnConfig}
        onApply={handleApply}
        onReset={handleReset}
      />
    </>
  )
}

export { defaultColumnConfig }
export type { EmployeeOrgTreeTableProps }

export default EmployeeOrgTreeTable
