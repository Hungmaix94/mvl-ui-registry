import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import { TableTree, type GroupedHeader } from '@/components/ui/table-tree/TableTree'
import { Loading } from '@/components/Loading'
import { IconCaretdown, IconCaretright } from '@/assets/icons/arrows'
import {
  type AttendanceMethodChildItem,
  type AttendanceMethodReport,
  type GetAttendanceByMethodReportParams,
  getAttendanceReportService,
  useAttendanceByMethodReport,
} from '@/features/report/services/attendance-report-service'
import romansLib from 'romans'
import { cn } from '@/utils'
import { formatNumber as formatNumberCommon, formatPercent } from '@/utils/common'

type AttendanceMethodRow = {
  id: string
  level: 1 | 2
  stt: number | string
  label: string
  deviceCount: string
  deviceRate: string
  wifiCount: string
  wifiRate: string
  geolocationCount: string
  geolocationRate: string
  otherCount: string
  otherRate: string
  totalHasAttendanceCount: string
  totalHasAttendanceRate: string
  totalNotAttendanceCount: string
  totalNotAttendanceRate: string
  notOnTimeCount: string
  notOnTimeRate: string
  totalEmployeeCount: string
  totalEmployeeRate: string
  expandable?: boolean
  expanded?: boolean
  onExpandClick?: () => void
  isLoadingChildren?: boolean
  branchId?: number
  blockId?: number
  parentBranchId?: number
  depth?: number
}

function toRoman(num: number): string {
  return (romansLib as { romanize?: (n: number) => string })?.romanize?.(num) ?? String(num)
}

/** Bóc tách tên theo cấp: không filter → branch_name; filter branch → block_name; filter branch+block → department_name */
function getChildOrgName(child: AttendanceMethodChildItem): string {
  const raw =
    child.branch_name ??
    child.block_name ??
    child.department_name ??
    (child as Record<string, unknown>).name ??
    ''
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  return trimmed || '-'
}

const ROOT_LABEL = 'Tổng cộng'

type AttendanceMethodTableProps = {
  filters: GetAttendanceByMethodReportParams
  onDataLoaded?: (data?: AttendanceMethodReport) => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

function formatNumber(value?: string | null) {
  if (value === null || value === undefined || value === '') return '-'
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return formatNumberCommon(parsed, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getDataFromChild(child: AttendanceMethodChildItem) {
  return {
    deviceCount: formatNumber(child.absolute?.method_breakdown?.device),
    deviceRate: formatPercent(child.percentage?.method_breakdown?.device),
    wifiCount: formatNumber(child.absolute?.method_breakdown?.wifi),
    wifiRate: formatPercent(child.percentage?.method_breakdown?.wifi),
    geolocationCount: formatNumber(child.absolute?.method_breakdown?.geolocation),
    geolocationRate: formatPercent(child.percentage?.method_breakdown?.geolocation),
    otherCount: formatNumber(child.absolute?.method_breakdown?.other),
    otherRate: formatPercent(child.percentage?.method_breakdown?.other),
    totalHasAttendanceCount: formatNumber(child.absolute?.has_attendance),
    totalHasAttendanceRate: formatPercent(child.percentage?.has_attendance),
    totalNotAttendanceCount: formatNumber(child.absolute?.not_attendance),
    totalNotAttendanceRate: formatPercent(child.percentage?.not_attendance),
    notOnTimeCount: formatNumber(child.absolute?.not_on_time),
    notOnTimeRate: formatPercent(child.percentage?.not_on_time),
    totalEmployeeCount: formatNumber(child.absolute?.total_employee),
    totalEmployeeRate: formatPercent(child.percentage?.total_employee),
  }
}

const AttendanceMethodTable = ({ filters, scrollContainerRef }: AttendanceMethodTableProps) => {
  const { data: report, isLoading } = useAttendanceByMethodReport(filters)

  const [expandedBranchIds, setExpandedBranchIds] = useState<number[]>([])
  const [expandedBlockKeys, setExpandedBlockKeys] = useState<string[]>([])
  const [childrenCache, setChildrenCache] = useState<Record<string, AttendanceMethodReport>>({})
  const [loadingBranchId, setLoadingBranchId] = useState<number | null>(null)
  const [loadingBlockKey, setLoadingBlockKey] = useState<string | null>(null)

  useEffect(() => {
    setExpandedBranchIds([])
    setExpandedBlockKeys([])
    setChildrenCache({})
    setLoadingBranchId(null)
    setLoadingBlockKey(null)
  }, [filters?.from_date, filters?.to_date, filters?.branch, filters?.block, filters?.department])

  const handleBranchToggle = useCallback(
    async (branchId: number) => {
      const key = `branch-${branchId}`
      const isExpanded = expandedBranchIds.includes(branchId)
      if (isExpanded) {
        setExpandedBranchIds((prev) => prev.filter((id) => id !== branchId))
        return
      }
      setExpandedBranchIds((prev) => [...prev, branchId])
      if (childrenCache[key]) return
      setLoadingBranchId(branchId)
      try {
        const params: GetAttendanceByMethodReportParams = {
          ...filters,
          branch: branchId,
          block: undefined,
          department: undefined,
        }
        const data = await getAttendanceReportService().getAttendanceByMethodReport(params)
        if (data) {
          setChildrenCache((prev) => ({ ...prev, [key]: data }))
        }
      } finally {
        setLoadingBranchId(null)
      }
    },
    [filters, expandedBranchIds, childrenCache]
  )

  const handleBlockToggle = useCallback(
    async (branchId: number, blockId: number) => {
      const key = `block-${branchId}-${blockId}`
      const isExpanded = expandedBlockKeys.includes(key)
      if (isExpanded) {
        setExpandedBlockKeys((prev) => prev.filter((k) => k !== key))
        return
      }
      setExpandedBlockKeys((prev) => [...prev, key])
      if (childrenCache[key]) return
      setLoadingBlockKey(key)
      try {
        const params: GetAttendanceByMethodReportParams = {
          ...filters,
          branch: branchId,
          block: blockId,
          department: undefined,
        }
        const data = await getAttendanceReportService().getAttendanceByMethodReport(params)
        if (data) {
          setChildrenCache((prev) => ({ ...prev, [key]: data }))
        }
      } finally {
        setLoadingBlockKey(null)
      }
    },
    [filters, expandedBlockKeys, childrenCache]
  )

  const rows: AttendanceMethodRow[] = useMemo(() => {
    if (!report) {
      return []
    }

    const result: AttendanceMethodRow[] = []

    const rootRow: AttendanceMethodRow = {
      id: 'root-title',
      level: 1,
      stt: '',
      label: ROOT_LABEL,
      deviceCount: formatNumber(report.absolute?.method_breakdown?.device),
      deviceRate: formatPercent(report.percentage?.method_breakdown?.device),
      wifiCount: formatNumber(report.absolute?.method_breakdown?.wifi),
      wifiRate: formatPercent(report.percentage?.method_breakdown?.wifi),
      geolocationCount: formatNumber(report.absolute?.method_breakdown?.geolocation),
      geolocationRate: formatPercent(report.percentage?.method_breakdown?.geolocation),
      otherCount: formatNumber(report.absolute?.method_breakdown?.other),
      otherRate: formatPercent(report.percentage?.method_breakdown?.other),
      totalHasAttendanceCount: formatNumber(report.absolute?.has_attendance),
      totalHasAttendanceRate: formatPercent(report.percentage?.has_attendance),
      totalNotAttendanceCount: formatNumber(report.absolute?.not_attendance),
      totalNotAttendanceRate: formatPercent(report.percentage?.not_attendance),
      notOnTimeCount: formatNumber(report.absolute?.not_on_time),
      notOnTimeRate: formatPercent(report.percentage?.not_on_time),
      totalEmployeeCount: formatNumber(report.absolute?.total_employee),
      totalEmployeeRate: formatPercent(report.percentage?.total_employee),
      depth: 0,
    }
    result.push(rootRow)

    const selectedBranchId = filters?.branch ?? null
    const selectedBlockId = filters?.block ?? null

    // Branch & block filter on → API returns report.children = departments
    // Show departments directly under the root (no further expansion)
    if (selectedBranchId != null && selectedBlockId != null) {
      const departments = report.children ?? []
      departments.forEach((deptChild, deptIdx) => {
        const deptLabel =
          (deptChild.department_name && String(deptChild.department_name).trim()) ||
          getChildOrgName(deptChild)
        const data = getDataFromChild(deptChild)
        const deptRow: AttendanceMethodRow = {
          id: `filtered-dept-${deptIdx}`,
          level: 1,
          stt: `1.${deptIdx + 1}`,
          label: deptLabel,
          ...data,
          depth: 3,
        }
        result.push(deptRow)
      })
      return result
    }

    // Branch filter on, block filter off → API returns report.children = blocks (block_id, block_name)
    if (selectedBranchId != null && selectedBlockId == null) {
      const branchId = selectedBranchId
      const blocks = report.children ?? []
      blocks.forEach((blockChild, blockIdx) => {
        const blockId = blockChild.block_id
        const blockLabel =
          (blockChild.block_name && String(blockChild.block_name).trim()) ||
          getChildOrgName(blockChild)
        const blockStt = blockIdx + 1
        const blockKey =
          blockId != null
            ? `block-${branchId}-${blockId}`
            : `block-branch-${branchId}-idx-${blockIdx}`

        const isBlockExpanded =
          blockId != null && expandedBlockKeys.includes(`block-${branchId}-${blockId}`)
        const isBlockLoading = loadingBlockKey === `block-${branchId}-${blockId}`
        const blockCache =
          blockId != null ? childrenCache[`block-${branchId}-${blockId}`] : undefined
        const departments = blockCache?.children ?? []

        const blockData = getDataFromChild(blockChild)
        const blockRow: AttendanceMethodRow = {
          id: `branch-filtered-block-${blockIdx}`,
          level: 1,
          stt: blockStt,
          label: blockLabel,
          ...blockData,
          depth: 2,
          expandable: blockId != null,
          expanded: isBlockExpanded,
          onExpandClick: blockId != null ? () => handleBlockToggle(branchId, blockId) : undefined,
          isLoadingChildren: isBlockLoading,
          blockId: blockId ?? undefined,
          parentBranchId: branchId,
        }
        result.push(blockRow)

        if (isBlockExpanded && blockId != null) {
          if (isBlockLoading) {
            result.push({
              id: `${blockKey}-loading`,
              level: 2,
              stt: '',
              label: 'Đang tải...',
              deviceCount: '-',
              deviceRate: '-',
              wifiCount: '-',
              wifiRate: '-',
              geolocationCount: '-',
              geolocationRate: '-',
              otherCount: '-',
              otherRate: '-',
              totalHasAttendanceCount: '-',
              totalHasAttendanceRate: '-',
              totalNotAttendanceCount: '-',
              totalNotAttendanceRate: '-',
              notOnTimeCount: '-',
              notOnTimeRate: '-',
              totalEmployeeCount: '-',
              totalEmployeeRate: '-',
              depth: 3,
            })
          } else {
            departments.forEach((deptChild, deptIdx) => {
              const deptLabel =
                (deptChild.department_name && String(deptChild.department_name).trim()) ||
                getChildOrgName(deptChild)
              const deptData = getDataFromChild(deptChild)
              const deptRow: AttendanceMethodRow = {
                id: `${blockKey}-dept-${deptIdx}`,
                level: 1,
                stt: `${blockStt}.${deptIdx + 1}`,
                label: deptLabel,
                ...deptData,
                depth: 3,
              }
              result.push(deptRow)
            })
          }
        }
      })
      return result
    }

    // No branch filter (or branch+block both set) → API returns report.children = branches (branch_id) or departments
    const branches = report.children ?? []
    branches.forEach((child, branchIdx) => {
      const branchId = child.branch_id
      const branchLabel =
        (child.branch_name && String(child.branch_name).trim()) || getChildOrgName(child)
      const romanStt = toRoman(branchIdx + 1)
      const branchKey = branchId != null ? `branch-${branchId}` : `branch-idx-${branchIdx}`

      const isBranchExpanded = branchId != null && expandedBranchIds.includes(branchId)
      const isBranchLoading = branchId != null && loadingBranchId === branchId
      const branchCache = branchId != null ? childrenCache[`branch-${branchId}`] : undefined
      const blocks = branchCache?.children ?? []

      const branchData = getDataFromChild(child)
      const branchRow: AttendanceMethodRow = {
        id: `child-${branchIdx}`,
        level: 1,
        stt: romanStt,
        label: branchLabel,
        ...branchData,
        depth: 1,
        expandable: branchId != null,
        expanded: isBranchExpanded,
        onExpandClick: branchId != null ? () => handleBranchToggle(branchId) : undefined,
        isLoadingChildren: isBranchLoading,
        branchId: branchId ?? undefined,
      }
      result.push(branchRow)

      if (isBranchExpanded && branchId != null) {
        if (isBranchLoading) {
          result.push({
            id: `${branchKey}-loading`,
            level: 2,
            stt: '',
            label: 'Đang tải...',
            deviceCount: '-',
            deviceRate: '-',
            wifiCount: '-',
            wifiRate: '-',
            geolocationCount: '-',
            geolocationRate: '-',
            otherCount: '-',
            otherRate: '-',
            totalHasAttendanceCount: '-',
            totalHasAttendanceRate: '-',
            totalNotAttendanceCount: '-',
            totalNotAttendanceRate: '-',
            notOnTimeCount: '-',
            notOnTimeRate: '-',
            totalEmployeeCount: '-',
            totalEmployeeRate: '-',
            depth: 2,
          })
        } else {
          blocks.forEach((blockChild, blockIdx) => {
            const blockId = blockChild.block_id
            const blockLabel =
              (blockChild.block_name && String(blockChild.block_name).trim()) ||
              getChildOrgName(blockChild)
            const blockStt = blockIdx + 1
            const blockKey =
              blockId != null
                ? `block-${branchId}-${blockId}`
                : `block-${branchIdx}-idx-${blockIdx}`

            const isBlockExpanded =
              blockId != null && expandedBlockKeys.includes(`block-${branchId}-${blockId}`)
            const isBlockLoading = loadingBlockKey === `block-${branchId}-${blockId}`
            const blockCache =
              blockId != null ? childrenCache[`block-${branchId}-${blockId}`] : undefined
            const departments = blockCache?.children ?? []

            const blockData = getDataFromChild(blockChild)
            const blockRow: AttendanceMethodRow = {
              id: `${branchKey}-block-${blockIdx}`,
              level: 1,
              stt: blockStt,
              label: blockLabel,
              ...blockData,
              depth: 2,
              expandable: blockId != null,
              expanded: isBlockExpanded,
              onExpandClick:
                blockId != null ? () => handleBlockToggle(branchId, blockId) : undefined,
              isLoadingChildren: isBlockLoading,
              blockId: blockId ?? undefined,
              parentBranchId: branchId,
            }
            result.push(blockRow)

            if (isBlockExpanded && blockId != null) {
              if (isBlockLoading) {
                result.push({
                  id: `${blockKey}-loading`,
                  level: 2,
                  stt: '',
                  label: 'Đang tải...',
                  deviceCount: '-',
                  deviceRate: '-',
                  wifiCount: '-',
                  wifiRate: '-',
                  geolocationCount: '-',
                  geolocationRate: '-',
                  otherCount: '-',
                  otherRate: '-',
                  totalHasAttendanceCount: '-',
                  totalHasAttendanceRate: '-',
                  totalNotAttendanceCount: '-',
                  totalNotAttendanceRate: '-',
                  notOnTimeCount: '-',
                  notOnTimeRate: '-',
                  totalEmployeeCount: '-',
                  totalEmployeeRate: '-',
                  depth: 3,
                })
              } else {
                departments.forEach((deptChild, deptIdx) => {
                  const deptLabel =
                    (deptChild.department_name && String(deptChild.department_name).trim()) ||
                    getChildOrgName(deptChild)
                  const deptData = getDataFromChild(deptChild)
                  const deptRow: AttendanceMethodRow = {
                    id: `${blockKey}-dept-${deptIdx}`,
                    level: 1,
                    stt: `${blockStt}.${deptIdx + 1}`,
                    label: deptLabel,
                    ...deptData,
                    depth: 3,
                  }
                  result.push(deptRow)
                })
              }
            }
          })
        }
      }
    })

    return result
  }, [
    report,
    filters?.branch,
    filters?.block,
    expandedBranchIds,
    expandedBlockKeys,
    childrenCache,
    loadingBranchId,
    loadingBlockKey,
    handleBranchToggle,
    handleBlockToggle,
  ])

  const boldHeader = (text: string) => (
    <span className="typo-body-base-semibold text-content-dark-1">{text}</span>
  )

  const dataCell = useCallback(
    (value: string, row: AttendanceMethodRow) => (
      <span className={row.depth === 0 ? 'typo-body-base-semibold' : ''}>{value}</span>
    ),
    []
  )

  const columns = useMemo(
    () => [
      {
        id: 'stt',
        header: boldHeader('STT'),
        cell: (row: AttendanceMethodRow) => {
          const sttContent = row.stt !== undefined && row.stt !== null ? String(row.stt) : ''
          if (!row.expandable) {
            return <span>{sttContent}</span>
          }
          if (row.isLoadingChildren) {
            return (
              <div className="flex items-center justify-center gap-1">
                <Loading size="sm" variant="spinner" className="!w-auto" />
                <span>{sttContent}</span>
              </div>
            )
          }
          const isExpanded = row.expanded
          const Icon = isExpanded ? IconCaretdown : IconCaretright
          return (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  row.onExpandClick?.()
                }}
                className="text-content-dark-2 hover:text-content-dark-1 flex items-center justify-center p-0.5"
                aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                <Icon size={16} />
              </button>
              <span>{sttContent}</span>
            </div>
          )
        },
        meta: { width: '80px', frozen: true as const, align: 'center' as const },
      },
      {
        id: 'label',
        header: boldHeader('Chi nhánh - Khối - Phòng ban'),
        cell: (row: AttendanceMethodRow) => {
          const displayLabel = (row.label && String(row.label).trim()) || '-'
          return (
            <span
              className={cn('block min-w-0', row.depth === 2 && 'pl-4', row.depth === 3 && 'pl-8')}
              title={displayLabel}
            >
              <span className="block truncate">{displayLabel}</span>
            </span>
          )
        },
        meta: { width: '260px', frozen: true as const, align: 'left' as const },
      },
      {
        id: 'deviceCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.deviceCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'deviceRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.deviceRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
      {
        id: 'wifiCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.wifiCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'wifiRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.wifiRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
      {
        id: 'geolocationCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.geolocationCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'geolocationRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.geolocationRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
      {
        id: 'otherCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.otherCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'otherRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.otherRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
      {
        id: 'totalHasAttendanceCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.totalHasAttendanceCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'totalHasAttendanceRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.totalHasAttendanceRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
      {
        id: 'totalNotAttendanceCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.totalNotAttendanceCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'totalNotAttendanceRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.totalNotAttendanceRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
      {
        id: 'notOnTimeCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.notOnTimeCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'notOnTimeRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.notOnTimeRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
      {
        id: 'totalEmployeeCount',
        header: 'Số lượng',
        cell: (row: AttendanceMethodRow) => dataCell(row.totalEmployeeCount, row),
        meta: { width: '90px', align: 'center' as const },
      },
      {
        id: 'totalEmployeeRate',
        header: 'Tỉ lệ',
        cell: (row: AttendanceMethodRow) => dataCell(row.totalEmployeeRate, row),
        meta: {
          width: '90px',
          align: 'center' as const,
          cellClassName: 'border-r border-border-2',
          headerClassName: 'border-r border-border-2',
        },
      },
    ],
    [dataCell]
  )

  const groupedHeaders: GroupedHeader[] = useMemo(
    () => [
      { id: 'stt', title: boldHeader('STT'), colSpan: 1, align: 'center' },
      { id: 'label', title: boldHeader('Chi nhánh - Khối - Phòng ban'), colSpan: 1, align: 'left' },
      {
        id: 'device',
        title: 'Chấm công bằng máy',
        align: 'center',
        children: [
          { id: 'deviceCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'deviceRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
      {
        id: 'wifi',
        title: 'Chấm công bằng wifi',
        align: 'center',
        children: [
          { id: 'wifiCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'wifiRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
      {
        id: 'geolocation',
        title: 'Chấm công bằng GPS',
        align: 'center',
        children: [
          { id: 'geolocationCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'geolocationRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
      {
        id: 'other',
        title: 'Chấm công khác',
        align: 'center',
        children: [
          { id: 'otherCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'otherRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
      {
        id: 'totalHasAttendance',
        title: 'Tổng nhân sự checkin',
        align: 'center',
        children: [
          { id: 'totalHasAttendanceCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'totalHasAttendanceRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
      {
        id: 'totalNotAttendance',
        title: boldHeader('Tổng nhân sự không checkin'),
        align: 'center',
        children: [
          { id: 'totalNotAttendanceCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'totalNotAttendanceRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
      {
        id: 'totalNotOnTime',
        title: boldHeader('Tổng nhân sự chấm công không đúng giờ'),
        align: 'center',
        children: [
          { id: 'notOnTimeCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'notOnTimeRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
      {
        id: 'totalEmployee',
        title: boldHeader('Tổng nhân sự'),
        align: 'center',
        children: [
          { id: 'totalEmployeeCount', title: 'Số lượng', colSpan: 1 },
          {
            id: 'totalEmployeeRate',
            title: 'Tỉ lệ',
            colSpan: 1,
            headerClassName: 'border-r border-border-2 !bg-neutral-20',
          },
        ],
      },
    ],
    []
  )

  const getCellColSpan = useCallback(
    (_row: AttendanceMethodRow, _colIdx: number): number | undefined => undefined,
    []
  )

  const getRowClassName = useCallback((row: AttendanceMethodRow): string | undefined => {
    if (row.level === 2) return undefined
    if (row.level === 1) {
      const depth = row.depth ?? 0
      const borderBelow = 'border-b border-border-1'
      // Tổng cộng (depth 0) và Phòng ban (depth 3): dùng bg-background-2 để có nền rõ, không trong suốt
      if (depth === 0) return `bg-background-1 text-action-primary-red-default ${borderBelow}`
      if (depth === 1) return `bg-red-10 text-content-dark-1 ${borderBelow}`
      if (depth === 2) return `bg-neutral-30 text-content-dark-1 ${borderBelow}`
      if (depth === 3) return `bg-background-1 text-content-dark-1 ${borderBelow}`
    }
    return undefined
  }, [])

  return (
    <TableTree
      data={rows}
      columns={columns as any}
      groupedHeaders={groupedHeaders}
      isLoading={isLoading}
      density="comfortable"
      enableColspanMerging={false}
      customLevel1RowClassName="override"
      customLevel2RowClassName="bg-background-1 text-content-dark-1"
      getCellColSpan={getCellColSpan}
      getRowClassName={getRowClassName}
      scrollContainerRef={scrollContainerRef}
    />
  )
}

export default AttendanceMethodTable
