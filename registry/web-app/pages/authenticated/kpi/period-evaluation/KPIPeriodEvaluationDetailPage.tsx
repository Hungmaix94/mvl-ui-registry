import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import {
  usePayrollKPIPeriod,
  usePayrollKPIAssessmentsEmployees,
} from '@/features/kpi/services/kpi-assessment-service'
import { KPIPeriodEvaluationDetailTable } from '@/features/kpi/period-evaluation/view'
import { useMemo, useState, useRef, useEffect } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { resolvePageSize, SEARCH_DEBOUNCE_MS } from '@/utils/table/pagination'
import { APP_PATH } from '@/routes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import KPIPeriodEvaluationFilterForm, {
  type KPIPeriodEvaluationFilterFormRef,
} from '@/features/kpi/period-evaluation/_shares/components/KPIPeriodEvaluationFilterForm'
import { parsePositiveInt } from '@/utils/common'
import { useAbility } from '@/lib/ability'
import { useKPIPeriodEvaluationExport } from '@/features/kpi/period-evaluation/_shares/hooks/useKPIPeriodEvaluationExport'
import { isNotFoundError } from '@/utils/error-utils'
import { parseAssessedToBoolean } from '@/features/kpi/period-evaluation/_shares/constants/period-evaluation-constants'
import { withRememberedSearch } from '@/utils/list-url-memory'

const KPIPeriodEvaluationDetailPage = () => {
  const ability = useAbility()
  const canView = ability.can('retrieve', 'kpi_assessment_period')
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const periodId = parseInt(id || '0')
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<KPIPeriodEvaluationFilterFormRef>(null)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // URL State — key phân trang là `page_size` (snake_case) như 130 màn còn lại của repo.
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = resolvePageSize(searchParams.get('page_size'))
  const search = searchParams.get('search') || ''
  const ordering =
    searchParams.get('ordering') ||
    'employee__branch__name,employee__block__name,employee__department__name'

  // Org Filters
  const month = searchParams.get('month')
  const branchId = parsePositiveInt(searchParams.get('branch'))
  const blockId = parsePositiveInt(searchParams.get('block'))
  const departmentId = parsePositiveInt(searchParams.get('department'))
  const positionId = parsePositiveInt(searchParams.get('position'))
  const gradeManager = searchParams.get('grade_manager')?.split(',').filter(Boolean) || []
  const gradeHrm = searchParams.get('grade_hrm')?.split(',').filter(Boolean) || []
  const status = searchParams.get('status') || ''
  const employeeAssessed = searchParams.get('employee_assessed') || ''
  const managerAssessed = searchParams.get('manager_assessed') || ''
  const hrmAssessed = searchParams.get('hrm_assessed') || ''

  const {
    data: periodData,
    isLoading: isPeriodLoading,
    error: periodError,
  } = usePayrollKPIPeriod(periodId)

  const {
    data: assessmentsData,
    isLoading: isAssessmentsLoading,
    error: assessmentsError,
    refetch: refetchAssessments,
  } = usePayrollKPIAssessmentsEmployees({
    period: periodId,
    page: page,
    page_size: pageSize,
    search: search || undefined,
    ordering: ordering,
    grade_manager: gradeManager.join(',') || undefined,
    grade_hrm: gradeHrm.join(',') || undefined,
    month: month || undefined,
    branch: branchId || undefined,
    block: blockId || undefined,
    department: departmentId || undefined,
    position: positionId || undefined,
    status: status || undefined,
    employee_assessed: parseAssessedToBoolean(employeeAssessed),
    manager_assessed: parseAssessedToBoolean(managerAssessed),
    hrm_assessed: parseAssessedToBoolean(hrmAssessed),
  })

  const [searchInput, setSearchInput] = useState(search)
  const [debouncedSearch] = useDebounceValue(searchInput, SEARCH_DEBOUNCE_MS)

  // Di trú URL cũ dùng `pageSize` (camelCase) sang key chuẩn.
  useEffect(() => {
    if (!searchParams.has('pageSize')) return
    const legacyPageSize = searchParams.get('pageSize')
    const next = new URLSearchParams(searchParams)
    next.delete('pageSize')
    if (legacyPageSize) next.set('page_size', legacyPageSize)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // URL → ô tìm kiếm (back/forward, hoặc mở link đã có sẵn `search`).
  useEffect(() => {
    if (search !== searchInput && search !== debouncedSearch) setSearchInput(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Ô tìm kiếm → URL, chỉ sau khi ngừng gõ. Trước đây mỗi ký tự là 1 request + 1 entry history.
  useEffect(() => {
    const trimmedSearch = debouncedSearch.trim()
    if (trimmedSearch === search.trim()) return

    const next = new URLSearchParams(searchParams)
    if (trimmedSearch) next.set('search', trimmedSearch)
    else next.delete('search')
    next.set('page', '1')
    setSearchParams(next, { replace: true })
  }, [debouncedSearch, search, searchParams, setSearchParams])

  const handlePaginationChange = (newPageIndex: number, newPageSize: number) => {
    const effectivePageSize = resolvePageSize(newPageSize)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        // Đổi số dòng/trang phải về trang 1, nếu không trang hiện tại có thể vượt tổng số trang mới.
        next.set('page', effectivePageSize === pageSize ? (newPageIndex + 1).toString() : '1')
        next.set('page_size', effectivePageSize.toString())
        return next
      },
      { replace: true }
    )
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  const handleSortingChange = (field: string, direction: 'asc' | 'desc' | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!field || !direction) {
          next.delete('ordering')
        } else {
          const ordering = direction === 'desc' ? `-${field}` : field
          next.set('ordering', ordering)
        }
        next.set('page', '1')
        return next
      },
      { replace: true }
    )
  }

  const handleOpenFilter = () => setIsFilterDialogOpen(true)
  const handleCloseFilter = () => setIsFilterDialogOpen(false)

  const handleApplyFilter = () => {
    const values = filterFormRef.current?.getValues()
    if (!values) return

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)

        if (values.branch_id) next.set('branch', values.branch_id.toString())
        else next.delete('branch')

        if (values.block_id) next.set('block', values.block_id.toString())
        else next.delete('block')

        if (values.department_id) next.set('department', values.department_id.toString())
        else next.delete('department')

        if (values.position_id) next.set('position', values.position_id.toString())
        else next.delete('position')

        if (values.grade_manager?.length) next.set('grade_manager', values.grade_manager.join(','))
        else next.delete('grade_manager')

        if (values.grade_hrm?.length) next.set('grade_hrm', values.grade_hrm.join(','))
        else next.delete('grade_hrm')

        if (values.status) next.set('status', values.status)
        else next.delete('status')

        if (values.employee_assessed) next.set('employee_assessed', values.employee_assessed)
        else next.delete('employee_assessed')

        if (values.manager_assessed) next.set('manager_assessed', values.manager_assessed)
        else next.delete('manager_assessed')

        if (values.hrm_assessed) next.set('hrm_assessed', values.hrm_assessed)
        else next.delete('hrm_assessed')

        next.set('page', '1')
        return next
      },
      { replace: true }
    )
    handleCloseFilter()
  }

  const handleClearFilter = () => {
    filterFormRef.current?.clearForm()
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (month) count++
    if (branchId) count++
    if (blockId) count++
    if (departmentId) count++
    if (positionId) count++
    if (gradeManager.length) count++
    if (gradeHrm.length) count++
    if (status) count++
    if (employeeAssessed) count++
    if (managerAssessed) count++
    if (hrmAssessed) count++
    return count
  }, [
    month,
    branchId,
    blockId,
    departmentId,
    positionId,
    gradeManager,
    gradeHrm,
    status,
    employeeAssessed,
    managerAssessed,
    hrmAssessed,
  ])

  const isLoading = isPeriodLoading || isAssessmentsLoading
  const period = periodData

  const isNotFound = useMemo(() => {
    if (isPeriodLoading) return false
    if (periodError && isNotFoundError(periodError)) return true
    return !period
  }, [isPeriodLoading, periodError, period])

  const isError = useMemo(() => {
    if (isPeriodLoading) return false
    if (periodError && !isNotFoundError(periodError)) return true
    if (assessmentsError) return true
    return false
  }, [isPeriodLoading, periodError, assessmentsError])

  const breadcrumb = useMemo(
    () => [
      { label: 'Dashboard', href: APP_PATH.HOME },
      { label: 'Đánh giá KPI', href: APP_PATH.KPI_PERIOD_EVALUATION },
      { label: 'Phiếu đánh giá KPI theo kỳ', href: APP_PATH.KPI_PERIOD_EVALUATION },
      { label: `Kỳ đánh giá ${period?.month || ''}`, isCurrentPage: true },
    ],
    [period?.month]
  )

  const filterInitialValues = useMemo(() => {
    return {
      branch_id: branchId,
      block_id: blockId,
      department_id: departmentId,
      position_id: positionId,
      grade_manager: gradeManager,
      grade_hrm: gradeHrm,
      status,
      employee_assessed: employeeAssessed || null,
      manager_assessed: managerAssessed || null,
      hrm_assessed: hrmAssessed || null,
    }
  }, [
    branchId,
    blockId,
    departmentId,
    positionId,
    gradeManager,
    gradeHrm,
    status,
    employeeAssessed,
    managerAssessed,
    hrmAssessed,
  ])

  const { openExportDialog } = useKPIPeriodEvaluationExport()

  const handleExport = async () => {
    await openExportDialog({
      period: periodId,
      search: search || undefined,
      grade_manager: gradeManager.join(',') || undefined,
      grade_hrm: gradeHrm.join(',') || undefined,
      month: month || undefined,
      branch: branchId || undefined,
      block: blockId || undefined,
      department: departmentId || undefined,
      position: positionId || undefined,
      status: status || undefined,
      employee_assessed: parseAssessedToBoolean(employeeAssessed),
      manager_assessed: parseAssessedToBoolean(managerAssessed),
      hrm_assessed: parseAssessedToBoolean(hrmAssessed),
    })
  }

  return (
    <div className="bg-background-1 flex h-full flex-col">
      <PageTitle
        title={`Kỳ đánh giá ${period?.month || ''}`}
        breadcrumb={breadcrumb}
        enableBackButton
        handleBackButton={() => navigate(withRememberedSearch(APP_PATH.KPI_PERIOD_EVALUATION))}
        handleSearch={handleSearchChange}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm nhân viên"
        handleFilter={handleOpenFilter}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
      />
      <div className="flex-1 overflow-hidden">
        <DetailPageWrapper
          isLoading={isLoading}
          isError={isError}
          isNotFound={isNotFound}
          hasPermission={canView}
        >
          <KPIPeriodEvaluationDetailTable
            data={assessmentsData?.results || []}
            pageCount={Math.ceil((assessmentsData?.count || 0) / pageSize)}
            isLoading={isAssessmentsLoading}
            refetch={refetchAssessments}
            totalRecords={assessmentsData?.count || 0}
            currentPage={page - 1}
            pageSize={pageSize}
            onPaginationChange={handlePaginationChange}
            onSearch={handleSearchChange}
            onSortingChange={handleSortingChange}
          />
        </DetailPageWrapper>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        content={
          <KPIPeriodEvaluationFilterForm ref={filterFormRef} initialValues={filterInitialValues} />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilter}
      />
    </div>
  )
}

export default KPIPeriodEvaluationDetailPage
