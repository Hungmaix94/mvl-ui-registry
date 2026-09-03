import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Flex, Text } from '@radix-ui/themes'
import type { ColumnDef } from '@tanstack/react-table'
import { PageTitle, Table } from '@/components/ui'
import UncheckinFilterForm, {
  type UncheckinFilterFormRef,
} from '@/features/report/attendance/uncheckin/components/UncheckinFilterForm'
import {
  useUncheckinReport,
  useExportUncheckinReport,
  type GetUncheckinReportParams,
  type UncheckinReportItem,
} from '@/features/report/services/attendance-report-service'
import { DATE_FORMAT } from '@/constants/date-format'
import { formatDate, formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { format } from 'date-fns'
import { parsePositiveInt } from '@/utils/common'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
} from '@/hooks/useFilterEntityValidation'
import AppDialog from '@/components/dialog/AppDialog'
import { useDebounceValue } from 'usehooks-ts'
import { ExportDelivery } from '@/constants/api-schema-aliases'

function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateStr)) return false
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return false
  const [year, month, day] = dateStr.split('-').map(Number)
  return (
    parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day
  )
}

function buildApiParams(
  attendanceDate: string | undefined,
  search: string,
  branchId?: number,
  blockId?: number,
  departmentId?: number,
  positionId?: number
): GetUncheckinReportParams | undefined {
  if (!attendanceDate || !isValidDateString(attendanceDate)) return undefined
  const params: GetUncheckinReportParams = { attendance_date: attendanceDate }
  if (search.trim()) params.search = search.trim()
  if (branchId) params.branch = branchId
  if (blockId) params.block = blockId
  if (departmentId) params.department = departmentId
  if (positionId) params.position = positionId
  return params
}

const ReportAttendanceUncheckinPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const filterFormRef = useRef<UncheckinFilterFormRef>(null)
  const [isUrlReady, setIsUrlReady] = useState(false)
  const pageScrollRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  // Search input (debounced)
  const initialSearch = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Cascade validation
  const rawBranchId = parsePositiveInt(searchParams.get('branch')) ?? undefined
  const rawBlockId = parsePositiveInt(searchParams.get('block')) ?? undefined
  const rawDepartmentId = parsePositiveInt(searchParams.get('department')) ?? undefined
  const rawPositionId = parsePositiveInt(searchParams.get('position')) ?? undefined

  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data
  const blockQuery = useBlockForFilter(rawBlockId ?? 0, rawBranchId)
  const isBlockValid = isBranchValid && !!blockQuery.data && blockQuery.data.branch === rawBranchId
  const departmentQuery = useDepartmentForFilter(rawDepartmentId ?? 0, rawBranchId, rawBlockId)
  const isDepartmentValid = isBlockValid && !!departmentQuery.data
  const positionQuery = usePositionForFilter(rawPositionId ?? 0)
  const isPositionValid = !!positionQuery.data

  const validatedBranchId = isBranchValid ? rawBranchId : undefined
  const validatedBlockId = isBlockValid ? rawBlockId : undefined
  const validatedDepartmentId = isDepartmentValid ? rawDepartmentId : undefined
  const validatedPositionId = isPositionValid ? rawPositionId : undefined

  const isFilterValidationLoading = useMemo(() => {
    if (rawBranchId && branchQuery.isLoading) return true
    if (rawBlockId && isBranchValid && blockQuery.isLoading) return true
    if (rawDepartmentId && isBlockValid && departmentQuery.isLoading) return true
    if (rawPositionId && positionQuery.isLoading) return true
    return false
  }, [
    rawBranchId,
    rawBlockId,
    rawDepartmentId,
    rawPositionId,
    branchQuery.isLoading,
    blockQuery.isLoading,
    departmentQuery.isLoading,
    positionQuery.isLoading,
    isBranchValid,
    isBlockValid,
  ])

  // Initialize URL with default attendance_date = today
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const hasAttendanceDate =
      searchParams.has('attendance_date') || actualUrlParams.has('attendance_date')
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    if (!hasAttendanceDate) {
      const today = formatDateToApi(new Date())
      if (today) {
        const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
        newParams.set('attendance_date', today)
        setSearchParams(newParams, { replace: true })
      }
    }
    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync search input when URL changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || ''
    if (urlSearch !== searchInput && urlSearch !== debouncedSearch) {
      setSearchInput(urlSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return
    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) newParams.set('search', debouncedSearch)
      else newParams.delete('search')
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, isUrlReady])

  const attendanceDate = searchParams.get('attendance_date') || undefined
  const hasValidDate = !!attendanceDate && isValidDateString(attendanceDate)
  const attendanceDateObj = parseDateFromApi(attendanceDate)

  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidDate) return undefined
    return buildApiParams(
      attendanceDate,
      debouncedSearch,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      validatedPositionId
    )
  }, [
    isUrlReady,
    isFilterValidationLoading,
    hasValidDate,
    attendanceDate,
    debouncedSearch,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedPositionId,
  ])

  const { data, isLoading } = useUncheckinReport(apiParams, { enabled: !!apiParams })
  const reportData = data
  const items: UncheckinReportItem[] = useMemo(() => reportData?.items ?? [], [reportData])
  const total = reportData?.total ?? 0

  const { openExportDialog: openExportUncheckinDialog } = useExportUncheckinReport()

  const handleExport = useCallback(() => {
    if (!apiParams) return
    openExportUncheckinDialog({
      ...apiParams,
      delivery: ExportDelivery.link,
      async: true,
    })
  }, [apiParams, openExportUncheckinDialog])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData || !formData.attendanceDate) return
    const apiDate = formatDateToApi(formData.attendanceDate)
    if (!apiDate) return

    const newParams = new URLSearchParams()
    newParams.set('attendance_date', apiDate)
    if (debouncedSearch) newParams.set('search', debouncedSearch)
    if (formData.branch) newParams.set('branch', formData.branch)
    if (formData.block) newParams.set('block', formData.block)
    if (formData.department) newParams.set('department', formData.department)
    if (formData.position) newParams.set('position', formData.position)

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [setSearchParams, debouncedSearch])

  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
    setIsFormValid(false)
  }, [])

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (attendanceDateObj) count++
    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    if (validatedPositionId) count++
    return count
  }, [
    attendanceDateObj,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedPositionId,
  ])

  const filterDateText = useMemo(() => {
    if (!attendanceDateObj) return '-'
    return format(attendanceDateObj, DATE_FORMAT)
  }, [attendanceDateObj])

  const filterOrgText = useMemo(() => {
    const parts: string[] = []
    if (validatedBranchId && branchQuery.data?.name)
      parts.push(`Chi nhánh ${branchQuery.data.name}`)
    if (validatedBlockId && blockQuery.data?.name) parts.push(`Khối ${blockQuery.data.name}`)
    if (validatedDepartmentId && departmentQuery.data?.name) {
      parts.push(`Phòng ban ${departmentQuery.data.name}`)
    }
    if (validatedPositionId && positionQuery.data?.name) {
      parts.push(`Chức vụ ${positionQuery.data.name}`)
    }
    return parts.length ? parts.join(' - ') : 'Toàn công ty'
  }, [
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedPositionId,
    branchQuery.data?.name,
    blockQuery.data?.name,
    departmentQuery.data?.name,
    positionQuery.data?.name,
  ])

  const formInitialValues = useMemo(
    () => ({
      attendanceDate: attendanceDateObj ? format(attendanceDateObj, DATE_FORMAT) : '',
      branch: validatedBranchId ? String(validatedBranchId) : undefined,
      block: validatedBlockId ? String(validatedBlockId) : undefined,
      department: validatedDepartmentId ? String(validatedDepartmentId) : undefined,
      position: validatedPositionId ? String(validatedPositionId) : undefined,
    }),
    [
      attendanceDateObj,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      validatedPositionId,
    ]
  )

  const columns: ColumnDef<UncheckinReportItem>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã NV',
        meta: { width: 'w-[120px]' },
        cell: ({ getValue }) => {
          const v = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={v}>
              {v || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'full_name',
        header: 'Tên nhân viên',
        meta: { width: 'flex-1' },
        cell: ({ getValue }) => {
          const v = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={v}>
              {v || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'position',
        header: 'Chức vụ',
        meta: { width: 'w-[180px]' },
        cell: ({ getValue }) => {
          const v = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={v}>
              {v || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'branch',
        header: 'Chi nhánh',
        meta: { width: 'w-[180px]' },
        cell: ({ getValue }) => {
          const v = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={v}>
              {v || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'block',
        header: 'Khối',
        meta: { width: 'w-[160px]' },
        cell: ({ getValue }) => {
          const v = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={v}>
              {v || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        meta: { width: 'w-[200px]' },
        cell: ({ getValue }) => {
          const v = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={v}>
              {v || '-'}
            </span>
          )
        },
      },
    ],
    []
  )

  useLayoutEffect(() => {
    const tableRoot = tableWrapperRef.current
    if (!tableRoot) return

    const table = tableRoot.querySelector('table') as HTMLElement | null
    if (!table) return

    const thead = table.querySelector('thead') as HTMLElement | null
    if (!thead) return

    const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
    if (!navBar) return

    const scrollContainer = pageScrollRef.current
    if (!scrollContainer) return

    let frameId: number | null = null
    let lastTranslateOffset = -1

    const applyStickyTop = () => {
      frameId = null
      const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
      const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
      const nextTranslateOffset =
        scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0

      if (nextTranslateOffset === lastTranslateOffset) return

      lastTranslateOffset = nextTranslateOffset
      thead.style.transform =
        nextTranslateOffset > 0 ? `translateY(${nextTranslateOffset}px)` : 'translateY(0px)'
    }

    const requestStickyTopUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(applyStickyTop)
    }

    requestStickyTopUpdate()
    thead.style.willChange = 'transform'
    window.addEventListener('resize', requestStickyTopUpdate)
    window.addEventListener('scroll', requestStickyTopUpdate, { passive: true })
    scrollContainer.addEventListener('scroll', requestStickyTopUpdate, { passive: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener('resize', requestStickyTopUpdate)
      window.removeEventListener('scroll', requestStickyTopUpdate)
      scrollContainer.removeEventListener('scroll', requestStickyTopUpdate)
      thead.style.transform = 'translateY(0px)'
      thead.style.willChange = ''
    }
  }, [items.length, isLoading])

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo mã, tên nhân viên"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleSearch={(q: string) => setSearchInput(q)}
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={handleExport}
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="px-10 pb-6">
        <Box className="mb-4">
          <Text size="2" className="text-content-dark-2">
            Báo cáo ngày: <span className="font-semibold">{filterDateText}</span> — {filterOrgText}
          </Text>
          <br />
          <Text size="2" className="text-content-dark-3">
            Tổng số nhân viên chưa chấm công: <span className="font-semibold">{total}</span>
          </Text>
        </Box>

        <div ref={pageScrollRef} className="flex-1 overflow-x-auto overflow-y-auto pt-0 pb-10">
          <div ref={tableWrapperRef}>
            <Table
              data={items}
              columns={columns}
              isLoading={isLoading}
              showSTT
              showActions={false}
              enablePagination={false}
              enableSorting={false}
              emptyMessage={
                hasValidDate
                  ? `Không có nhân viên nào chưa chấm công ngày ${formatDate(attendanceDate)}`
                  : 'Vui lòng chọn ngày'
              }
              className={'px-0'}
            />
          </div>
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        content={
          <UncheckinFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onValidationChange={setIsFormValid}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={isFormValid ? handleApplyFilter : () => {}}
        onCancel={() => setIsFilterOpen(false)}
      />
    </>
  )
}

export default ReportAttendanceUncheckinPage
