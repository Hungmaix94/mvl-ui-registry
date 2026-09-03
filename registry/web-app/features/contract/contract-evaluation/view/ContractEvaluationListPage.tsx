import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility, parsePermissionCode } from '@/lib/ability'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi } from '@/utils/date-utils'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format'
import ContractEvaluationTable from './ContractEvaluationTable'
import ContractEvaluationFilterForm, {
  type ContractEvaluationFilterFormRef,
  type ContractEvaluationFilterFormValues,
} from '../_shares/components/ContractEvaluationFilterForm'
import type { GetContractEvaluationsHrParams } from '@/features/contract/services/contract-evaluation-hr-service'
import { useContractEvaluationsByRole } from '../_shares/hooks/useContractEvaluationByRole'
import {
  CONTRACT_EVALUATION_PERMISSIONS,
  CONTRACT_EVALUATION_ROLE,
  type ContractEvaluationRole,
} from '../_shares/constants/contract-evaluation-constants'
import { getEvaluationRoutePaths } from '../_shares/utils/contract-evaluation-route-utils'
import {
  ContractEvaluationFormType as ContractEvaluationFormType,
  ContractEvaluationDisplayStatus as ContractEvaluationDisplayStatus,
} from '@/constants/api-schema-aliases'

type ContractEvaluationListPageProps = {
  role: ContractEvaluationRole
  title: string
}

// HR mặc định chỉ xem các phiếu chưa hoàn tất (mọi trạng thái "waiting_*") khi vào màn
// hình lần đầu — loại trừ completed/rejected/cancelled.
const DEFAULT_PENDING_DISPLAY_STATUSES = [
  ContractEvaluationDisplayStatus.waiting_evaluation,
  ContractEvaluationDisplayStatus.waiting_manager,
  ContractEvaluationDisplayStatus.waiting_hr,
  ContractEvaluationDisplayStatus.waiting_block_director,
]

const parseFilterParamsFromUrl = (
  searchParams: URLSearchParams
): Partial<ContractEvaluationFilterFormValues> => {
  const params: Partial<ContractEvaluationFilterFormValues> = {}

  const deadlineFrom = searchParams.get('deadline_from')
  const deadlineTo = searchParams.get('deadline_to')
  if (deadlineFrom || deadlineTo) {
    try {
      params.deadline_range = {
        from: deadlineFrom ? parse(deadlineFrom, DATE_SERVER_FORMAT, new Date()) : undefined,
        to: deadlineTo ? parse(deadlineTo, DATE_SERVER_FORMAT, new Date()) : undefined,
      }
    } catch {
      // ignore parse errors
    }
  }

  const branch = parsePositiveInt(searchParams.get('branch'))
  if (branch) params.branch_id = branch
  const block = parsePositiveInt(searchParams.get('block'))
  if (block) params.block_id = block
  const department = parsePositiveInt(searchParams.get('department'))
  if (department) params.department_id = department
  const employee = parsePositiveInt(searchParams.get('employee'))
  if (employee) params.employee_id = employee

  const formTypes = searchParams.getAll('form_type')
  if (formTypes.length > 0) params.form_type = formTypes

  const displayStatuses = searchParams.getAll('display_status')
  if (displayStatuses.length > 0) params.display_status = displayStatuses

  return params
}

const ContractEvaluationListPage = ({ role, title }: ContractEvaluationListPageProps) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const formRef = useRef<ContractEvaluationFilterFormRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Seeds the default "chờ duyệt" filter into the URL on first mount only (HR scope, and
  // only when the user hasn't already specified a display_status — e.g. via a deep link).
  // Gating the query on this (see `useContractEvaluationsByRole` call below) avoids an
  // extra unfiltered fetch before the default lands. Doesn't re-fire on "Xóa bộ lọc" since
  // the effect only runs once per mount.
  const [isDefaultFilterReady, setIsDefaultFilterReady] = useState(
    () => role !== CONTRACT_EVALUATION_ROLE.HR || searchParams.has('display_status')
  )

  useEffect(() => {
    if (isDefaultFilterReady) return

    const next = new URLSearchParams(searchParams)
    DEFAULT_PENDING_DISPLAY_STATUSES.forEach((status) => next.append('display_status', status))
    setSearchParams(next, { replace: true })
    setIsDefaultFilterReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const can = useCallback(
    (code: string) => {
      const parsed = parsePermissionCode(code)
      return parsed ? ability.can(parsed.action, parsed.subject) : false
    },
    [ability]
  )

  // Local search input — debounced into URL.
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  useEffect(() => {
    const current = searchParams.get('search') ?? ''
    if (debouncedSearch !== current) {
      const next = new URLSearchParams(searchParams)
      if (debouncedSearch) next.set('search', debouncedSearch)
      else next.delete('search')
      next.set('page', '1')
      setSearchParams(next, { replace: true })
    }
  }, [debouncedSearch, searchParams, setSearchParams])

  const page = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const search = searchParams.get('search') ?? undefined
  const displayStatusFilters = useMemo(() => searchParams.getAll('display_status'), [searchParams])
  const formTypeFilters = useMemo(() => searchParams.getAll('form_type'), [searchParams])
  const branchId = parsePositiveInt(searchParams.get('branch'))
  const blockId = parsePositiveInt(searchParams.get('block'))
  const departmentId = parsePositiveInt(searchParams.get('department'))
  const employeeId = parsePositiveInt(searchParams.get('employee'))
  const deadlineFrom = searchParams.get('deadline_from') ?? undefined
  const deadlineTo = searchParams.get('deadline_to') ?? undefined
  const ordering = searchParams.get('ordering') ?? undefined

  // Chỉ gửi các tham số API thực sự hỗ trợ (khớp schema HR/Manager). baseParams
  // được type đúng nên không cần `as` — mọi key sai schema sẽ báo lỗi biên dịch.
  // Phòng ban lọc theo `department_snapshot`. `recommendation` không có trong
  // schema nên đã bỏ khỏi bộ lọc.
  const baseParams = useMemo<GetContractEvaluationsHrParams>(() => {
    const params: GetContractEvaluationsHrParams = {
      page,
      page_size: pageSize,
      ordering,
      search,
    }
    const formTypes = formTypeFilters.filter((v): v is ContractEvaluationFormType =>
      Object.values(ContractEvaluationFormType).some((option) => option === v)
    )
    if (formTypes.length > 0) params.form_type = formTypes

    const displayStatuses = displayStatusFilters.filter((v): v is ContractEvaluationDisplayStatus =>
      Object.values(ContractEvaluationDisplayStatus).some((option) => option === v)
    )
    if (displayStatuses.length > 0) params.display_status = displayStatuses

    if (branchId) params.branch = branchId
    if (blockId) params.block = blockId
    if (departmentId) params.department_snapshot = departmentId
    if (employeeId) params.employee = employeeId
    if (deadlineFrom) params.deadline_from = deadlineFrom
    if (deadlineTo) params.deadline_to = deadlineTo
    return params
  }, [
    page,
    pageSize,
    ordering,
    search,
    formTypeFilters,
    displayStatusFilters,
    branchId,
    blockId,
    departmentId,
    employeeId,
    deadlineFrom,
    deadlineTo,
  ])

  const query = useContractEvaluationsByRole(role, baseParams, isDefaultFilterReady)

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const next = new URLSearchParams(searchParams)
      next.set('page', String(pageIndex + 1))
      next.set('page_size', String(newPageSize))
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const next = new URLSearchParams(searchParams)
      if (!field || !direction) {
        next.delete('ordering')
      } else {
        next.set('ordering', direction === 'desc' ? `-${field}` : field)
      }
      next.set('page', '1')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const routePaths = useMemo(() => getEvaluationRoutePaths(role), [role])

  const handleCreateNew = useCallback(() => {
    if (!routePaths.create) return
    navigate(routePaths.create)
  }, [navigate, routePaths.create])

  const formInitialValues = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])
  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const next = new URLSearchParams()
    next.set('page', '1')
    next.set('page_size', String(pageSize))

    const currentSearch = searchParams.get('search')
    if (currentSearch) next.set('search', currentSearch)
    const currentOrdering = searchParams.get('ordering')
    if (currentOrdering) next.set('ordering', currentOrdering)

    if (formData.deadline_range?.from) {
      next.set('deadline_from', formatDateToApi(formData.deadline_range.from))
    }
    if (formData.deadline_range?.to) {
      next.set('deadline_to', formatDateToApi(formData.deadline_range.to))
    }
    if (formData.branch_id) next.set('branch', String(formData.branch_id))
    if (formData.block_id) next.set('block', String(formData.block_id))
    if (formData.department_id) next.set('department', String(formData.department_id))
    if (formData.employee_id) next.set('employee', String(formData.employee_id))
    if (formData.form_type && formData.form_type.length > 0) {
      formData.form_type.forEach((v) => next.append('form_type', v))
    }
    if (formData.display_status && formData.display_status.length > 0) {
      formData.display_status.forEach((s) => next.append('display_status', s))
    }

    setSearchParams(next, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const next = new URLSearchParams()
    next.set('page', '1')
    next.set('page_size', String(PAGE_SIZE))
    setSearchParams(next, { replace: true })
  }, [setSearchParams])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (deadlineFrom || deadlineTo) count += 1
    if (branchId) count += 1
    if (blockId) count += 1
    if (departmentId) count += 1
    if (employeeId) count += 1
    if (formTypeFilters.length > 0) count += 1
    if (displayStatusFilters.length > 0) count += 1
    return count
  }, [
    deadlineFrom,
    deadlineTo,
    branchId,
    blockId,
    departmentId,
    employeeId,
    formTypeFilters,
    displayStatusFilters,
  ])

  const data = query.data?.results ?? []
  const totalRecords = query.data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize))
  const hasFilter = !!searchInput || activeFilterCount > 0

  // Phiếu được hệ thống auto-tạo (Celery 06:00). HR là role duy nhất có thể tạo
  // thủ công thông qua endpoint `force_create` — render dưới dạng "Tạo phiếu thủ công".
  const canForceCreate =
    role === CONTRACT_EVALUATION_ROLE.HR && can(CONTRACT_EVALUATION_PERMISSIONS.HR.FORCE_CREATE)

  return (
    <>
      <PageTitle
        title={title}
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã phiếu, mã NV, tên nhân viên..."
        searchClassName="!w-[356px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={canForceCreate ? handleCreateNew : undefined}
        titleCreateNew="Tạo phiếu thủ công"
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <ContractEvaluationTable
            data={data}
            isLoading={query.isLoading}
            error={query.error}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={page}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            role={role}
            onClearFilter={hasFilter ? handleClearAll : undefined}
            hasFilter={hasFilter}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<ContractEvaluationFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default ContractEvaluationListPage
