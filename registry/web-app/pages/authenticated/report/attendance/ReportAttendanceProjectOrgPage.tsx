import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Flex, Text } from '@radix-ui/themes'
import { format } from 'date-fns'
import { PageTitle } from '@/components/ui'
import AttendanceProjectOrgTable from '@/features/report/attendance/project-org/view/AttendanceProjectOrgTable'
import AttendanceProjectOrgFilterForm, {
  type AttendanceProjectOrgFilterFormRef,
} from '@/features/report/attendance/project-org/components/AttendanceProjectOrgFilterForm'
import { DATE_FORMAT } from '@/constants/date-format'
import exportExcel, { type GroupedHeaderDef } from '@/utils/excel'
import type {
  AttendanceProjectOrgReportAggregration,
  GetAttendanceByProjectOrganizationReportParams,
} from '@/features/report/services/attendance-report-service'
import { getAttendanceReportService } from '@/features/report/services/attendance-report-service'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import { formatDateToApi } from '@/utils/date-utils'
import { useProject } from '@/services/realestate-service'
import romansLib from 'romans'

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false
  // Check format YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateStr)) return false
  // Parse and validate
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return false
  // Ensure the parsed date matches the input string (prevents invalid dates like 2025-12-32)
  const [year, month, day] = dateStr.split('-').map(Number)
  return (
    parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day
  )
}

/**
 * Parse filter params from URL for form display
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams) {
  const params: {
    attendanceDate?: Date
    projectId?: number
  } = {}

  // Attendance date - only parse if valid format
  const attendanceDate = searchParams.get('attendance_date')
  if (attendanceDate) {
    // Validate format YYYY-MM-DD before parsing
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (datePattern.test(attendanceDate)) {
      const parsed = new Date(attendanceDate)
      if (!isNaN(parsed.getTime())) {
        // Double check parsed date matches input
        const [year, month, day] = attendanceDate.split('-').map(Number)
        if (
          parsed.getFullYear() === year &&
          parsed.getMonth() + 1 === month &&
          parsed.getDate() === day
        ) {
          params.attendanceDate = parsed
        }
      }
    }
  }

  // Project ID
  params.projectId = parsePositiveInt(searchParams.get('project')) ?? undefined

  return params
}

/**
 * Build API params from URL
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedProjectId?: number
): GetAttendanceByProjectOrganizationReportParams | undefined {
  // Attendance date is required
  const attendanceDate = searchParams.get('attendance_date')
  if (!attendanceDate || !isValidDateString(attendanceDate)) {
    return undefined
  }

  const params: GetAttendanceByProjectOrganizationReportParams = {
    attendance_date: attendanceDate,
  }

  // Project ID (validated)
  if (validatedProjectId) params.project = validatedProjectId

  return params
}

const ReportAttendanceProjectOrgPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<AttendanceProjectOrgFilterFormRef>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  const [reportData, setReportData] = useState<AttendanceProjectOrgReportAggregration>()
  const [isFormValid, setIsFormValid] = useState(false)

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults if empty
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check if attendance_date exists (required for this report)
    const hasAttendanceDate =
      searchParams.has('attendance_date') || actualUrlParams.has('attendance_date')

    // attendance_date is REQUIRED for this report - always set default if missing
    // regardless of navigate back status (because report cannot work without it)
    if (!hasAttendanceDate) {
      const today = new Date()
      const attendanceDate = formatDateToApi(today)
      if (attendanceDate) {
        const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
        // Set default attendance_date to today
        newParams.set('attendance_date', attendanceDate)
        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, [])

  // === PROJECT VALIDATION ===
  const rawProjectId = urlParams.projectId

  // Project validation
  const projectQuery = useProject(rawProjectId ?? 0)
  const isProjectValid = !!projectQuery.data

  // Get validated project ID
  const validatedProjectId = isProjectValid ? rawProjectId : undefined

  // Check if validation is loading
  const isFilterValidationLoading = useMemo(() => {
    if (rawProjectId && projectQuery.isLoading) return true
    return false
  }, [rawProjectId, projectQuery.isLoading])

  // Check if attendance_date is valid (required for this report)
  const hasValidAttendanceDate = !!urlParams.attendanceDate

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidAttendanceDate) return undefined
    return buildApiParamsFromUrl(searchParams, validatedProjectId)
  }, [
    searchParams,
    isUrlReady,
    isFilterValidationLoading,
    hasValidAttendanceDate,
    validatedProjectId,
  ])

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData || !formData.attendanceDate) return

    // attendanceDate is a string in DD/MM/YYYY format from DatePicker
    const attendance_date = formatDateToApi(formData.attendanceDate)
    if (!attendance_date) return

    const newParams = new URLSearchParams()

    // Attendance date (required)
    newParams.set('attendance_date', attendance_date)

    // Project
    if (formData.project) {
      newParams.set('project', String(formData.project))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm('')
    // Reset validation state when clearing
    setIsFormValid(false)
  }, [])

  // Filter count - only count valid filters that are actually used in API
  const filterBadgeCount = useMemo(() => {
    let count = 0
    // Only count attendance_date if valid and parsed
    if (urlParams.attendanceDate) count++
    // Only count project if valid
    if (validatedProjectId) count++
    return count
  }, [urlParams.attendanceDate, validatedProjectId])

  const filterDateText = useMemo(() => {
    if (!urlParams.attendanceDate) return '-'
    return format(urlParams.attendanceDate, DATE_FORMAT)
  }, [urlParams.attendanceDate])

  const reportTitle = useMemo(() => {
    const base = 'Báo cáo Thống kê chấm công theo đơn vị trên từng dự án'
    const parts: string[] = []
    if (projectQuery.data?.name && isProjectValid) {
      const projectLabel = projectQuery.data.code
        ? `${projectQuery.data.code} - ${projectQuery.data.name}`
        : projectQuery.data.name
      parts.push(`Dự án ${projectLabel}`)
    }
    if (!parts.length) return `${base} - Toàn công ty`
    return `${base} - ${parts.join(' - ')}`
  }, [projectQuery.data, isProjectValid])

  const flattenRowsForExport = useCallback(() => {
    const rows: Array<{ stt: number | string; name: string; count: number }> = []

    reportData?.children?.forEach((branchNode) => {
      rows.push({
        stt: '',
        name: branchNode.name,
        count: branchNode.count ?? 0,
      })

      let blockCounter = 0
      branchNode.children?.forEach((blockNode) => {
        blockCounter += 1
        const roman = (romansLib as any)?.romanize
          ? (romansLib as any).romanize(blockCounter) + '.'
          : String(blockCounter)

        rows.push({
          stt: roman,
          name: blockNode.name,
          count: blockNode.count ?? 0,
        })

        let deptCounter = 0
        blockNode.children?.forEach((deptNode) => {
          deptCounter += 1
          rows.push({
            stt: deptCounter,
            name: deptNode.name,
            count: deptNode.count ?? 0,
          })
        })
      })
    })

    rows.push({
      stt: '',
      name: 'Tổng',
      count: reportData?.total ?? 0,
    })

    return rows
  }, [reportData])

  const handleExport = useCallback(async () => {
    if (!apiParams) return

    try {
      const data =
        await getAttendanceReportService().getAttendanceByProjectOrganizationReport(apiParams)

      if (!data) return

      const rows = flattenRowsForExport()

      const columns = [
        { key: 'stt', header: 'STT' },
        { key: 'name', header: 'Phòng ban' },
        { key: 'count', header: 'Số lượng' },
      ]

      const groupedHeaders: GroupedHeaderDef[] = [
        { title: 'STT', colSpan: 1 },
        { title: 'Phòng ban', colSpan: 1 },
        { title: 'Số lượng', colSpan: 1 },
      ]

      const titleParts = [`Ngày ${filterDateText}`]
      if (projectQuery.data?.name && isProjectValid) {
        const projectLabel = projectQuery.data.code
          ? `${projectQuery.data.code} - ${projectQuery.data.name}`
          : projectQuery.data.name
        titleParts.push(`Dự án ${projectLabel}`)
      }

      const fileName = `Báo cáo thống kê chấm công theo đơn vị trên từng dự án - ${titleParts.join(' - ')}`

      exportExcel({
        fileName,
        sheets: [
          {
            name: 'Sheet 1',
            data: rows,
            columns,
            groupedHeaders,
          },
        ],
      })
    } catch (_e) {
      // ignore
    }
  }, [apiParams, filterDateText, projectQuery.data, isProjectValid, flattenRowsForExport])

  // Form initial values
  const formInitialValues = useMemo(() => {
    const projectName =
      projectQuery.data?.code && projectQuery.data?.name
        ? `${projectQuery.data.code} - ${projectQuery.data.name}`
        : projectQuery.data?.name

    return {
      attendanceDate: urlParams.attendanceDate ? format(urlParams.attendanceDate, DATE_FORMAT) : '',
      project: validatedProjectId,
      projectName: projectName,
    }
  }, [urlParams.attendanceDate, validatedProjectId, projectQuery.data])

  return (
    <>
      <PageTitle
        title="Thống kê chấm công theo đơn vị trên từng dự án"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={handleExport}
      />

      <Box pb="6">
        <Box className="px-10 pb-4">
          <Flex direction="column" gap="1">
            <Text className="typo-body-xl-semibold text-content-dark-1">{reportTitle}</Text>
            <Text className="typo-body-base-medium text-content-dark-3">{filterDateText}</Text>
          </Flex>
        </Box>
        {apiParams && (
          <AttendanceProjectOrgTable filters={apiParams} onDataLoaded={setReportData} />
        )}
      </Box>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={(open) => {
          setIsFilterOpen(open)
          // Reset validation state when dialog opens
          if (open) {
            setIsFormValid(!!formInitialValues.attendanceDate)
          }
        }}
        title="Bộ lọc"
        content={
          <AttendanceProjectOrgFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onValidationChange={setIsFormValid}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
        disableConfirm={!isFormValid}
      />
    </>
  )
}

export default ReportAttendanceProjectOrgPage
