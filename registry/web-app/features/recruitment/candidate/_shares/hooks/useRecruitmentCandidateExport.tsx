import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getExportService,
  type GetHrmRecruitmentCandidatesExportParams,
} from '@/services/export-service.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type ExportParams = NonNullable<GetHrmRecruitmentCandidatesExportParams>
type StatusArray = NonNullable<ExportParams['status__in']>
type EmployeeTypeArray = NonNullable<ExportParams['employee_type__in']>

type RecruitmentCandidateFilterParams = {
  /** Khoảng thời gian nộp đơn (từ page/URL). Nếu có thì dùng thay submitted_date_from/to. */
  dateRange?: { from?: Date; to?: Date } | null
  submitted_date_from?: string
  submitted_date_to?: string
  onboardDateRange?: { from?: Date; to?: Date } | null
  status?: StatusArray[number] | StatusArray
  statuses?: StatusArray
  employee_type?: EmployeeTypeArray[number] | EmployeeTypeArray
  employee_types?: EmployeeTypeArray
  recruitment_request?: number | string | null
  branch?: number
  block?: number
  department?: number
  recruitment_source?: number
  recruitment_channel?: number
  is_return_candidate?: boolean | 'true' | 'false' | null
  is_employee_created?: boolean | 'true' | 'false' | null
}

export function useRecruitmentCandidateExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetHrmRecruitmentCandidatesExportParams>
  >({
    exportFunction: (params) => getExportService().getHrmRecruitmentCandidatesExport(params),
    defaultFilename: 'recruitment-candidates.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery: string, filterParams: RecruitmentCandidateFilterParams) => {
      const exportParams: GetHrmRecruitmentCandidatesExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Map search query - Export API supports 'search' field (same as list API)
      if (searchQuery && searchQuery.trim() !== '') {
        exportParams.search = searchQuery.trim()
      }

      // Map date range filters - use same field names as list API
      if (filterParams?.dateRange?.from) {
        exportParams.submitted_date__gte = formatDateToApi(filterParams.dateRange.from)
      } else if (filterParams?.submitted_date_from) {
        exportParams.submitted_date__gte = filterParams.submitted_date_from
      }
      if (filterParams?.dateRange?.to) {
        exportParams.submitted_date__lte = formatDateToApi(filterParams.dateRange.to)
      } else if (filterParams?.submitted_date_to) {
        exportParams.submitted_date__lte = filterParams.submitted_date_to
      }
      if (filterParams?.onboardDateRange?.from) {
        exportParams.onboard_date__gte = formatDateToApi(filterParams.onboardDateRange.from)
      }
      if (filterParams?.onboardDateRange?.to) {
        exportParams.onboard_date__lte = formatDateToApi(filterParams.onboardDateRange.to)
      }

      // Map status filter - use same format as list API (array)
      const explicitStatuses = filterParams.statuses
      const statusValue = filterParams.status

      let statuses: StatusArray = []

      if (explicitStatuses && explicitStatuses.length > 0) {
        statuses = explicitStatuses
      } else if (Array.isArray(statusValue) && statusValue.length > 0) {
        statuses = statusValue
      } else if (typeof statusValue !== 'undefined' && statusValue !== null) {
        statuses = [statusValue as StatusArray[number]]
      }

      if (statuses.length === 1) {
        exportParams.status = statuses[0]
      } else if (statuses.length > 1) {
        exportParams.status__in = statuses
      }

      const explicitEmployeeTypes = filterParams.employee_types
      const employeeTypeValue = filterParams.employee_type
      let employeeTypes: EmployeeTypeArray = []

      if (explicitEmployeeTypes && explicitEmployeeTypes.length > 0) {
        employeeTypes = explicitEmployeeTypes
      } else if (Array.isArray(employeeTypeValue) && employeeTypeValue.length > 0) {
        employeeTypes = employeeTypeValue
      } else if (typeof employeeTypeValue !== 'undefined' && employeeTypeValue !== null) {
        employeeTypes = [employeeTypeValue as EmployeeTypeArray[number]]
      }

      if (employeeTypes.length === 1) {
        exportParams.employee_type = employeeTypes[0]
      } else if (employeeTypes.length > 1) {
        exportParams.employee_type__in = employeeTypes
      }

      // Map recruitment request filter - use same format as list API
      if (filterParams?.recruitment_request) {
        if (typeof filterParams.recruitment_request === 'number') {
          exportParams.recruitment_request = String(filterParams.recruitment_request)
        } else if (typeof filterParams.recruitment_request === 'string') {
          exportParams.recruitment_request = filterParams.recruitment_request
        }
      }

      // Map branch, block, department, recruitment_source, recruitment_channel (export API accepts string)
      if (filterParams?.branch) {
        exportParams.branch = String(filterParams.branch)
      }
      if (filterParams?.block) {
        exportParams.block = String(filterParams.block)
      }
      if (filterParams?.department) {
        exportParams.department = String(filterParams.department)
      }
      if (filterParams?.recruitment_source) {
        exportParams.recruitment_source = String(filterParams.recruitment_source)
      }
      if (filterParams?.recruitment_channel) {
        exportParams.recruitment_channel = String(filterParams.recruitment_channel)
      }

      // Map boolean filters - URL/page provides 'true'/'false' strings, export API expects boolean
      if (
        filterParams?.is_return_candidate === true ||
        filterParams?.is_return_candidate === 'true'
      ) {
        exportParams.is_return_candidate = true
      } else if (
        filterParams?.is_return_candidate === false ||
        filterParams?.is_return_candidate === 'false'
      ) {
        exportParams.is_return_candidate = false
      }

      if (
        filterParams?.is_employee_created === true ||
        filterParams?.is_employee_created === 'true'
      ) {
        exportParams.is_employee_created = true
      } else if (
        filterParams?.is_employee_created === false ||
        filterParams?.is_employee_created === 'false'
      ) {
        exportParams.is_employee_created = false
      }

      await baseOpenExportDialog(exportParams)
    },
    [baseOpenExportDialog]
  )

  return {
    openExportDialog,
    isExporting,
  }
}
