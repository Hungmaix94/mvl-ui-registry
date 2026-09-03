import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { PenaltyTicketTable } from '@/features/payroll/penalty-ticket'
import PenaltyTicketFilterForm, {
  type PenaltyTicketFilterFormRef,
} from '@/features/payroll/penalty-ticket/_shares/components/PenaltyTicketFilterForm'
import usePenaltyTicketDelete from '@/features/payroll/penalty-ticket/_shares/hooks/usePenaltyTicketDelete'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { useDebounceValue } from 'usehooks-ts'
import { format, parse } from 'date-fns'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import {
  type PenaltyTicket,
  useBulkUpdatePenaltyTicketStatus,
  usePenaltyTickets,
} from '@/features/payroll/services/penalty-ticket-service'
import { Button } from '@/components/ui'
import { IconCheckcircle } from '@/assets/icons'
import { useBulkSubmissionDialog } from '@/features/payroll/penalty-ticket/_shares/hooks/useBulkSubmissionDialog'
import { usePenaltyTicketExport } from '@/features/payroll/penalty-ticket/_shares/hooks/usePenaltyTicketExport'

type FilterParams = {
  month?: Date
  branch_id?: number
  block_id?: number
  department_id?: number
  statuses?: PenaltyTicketStatus[]
}

const enumStatuses = Object.values(PenaltyTicketStatus) as string[]

const parseMultiEnum = (value: string | null, allowed: string[]) => {
  if (!value) return []
  return value
    .split(',')
    .map((x) => x.trim())
    .filter((x) => allowed.includes(x))
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}
  const month = searchParams.get('month')
  if (month) {
    try {
      params.month = parse(month, 'MM/yyyy', new Date())
    } catch {}
  }
  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branch_id = branchId
  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.block_id = blockId
  const deptId = parsePositiveInt(searchParams.get('department'))
  if (deptId) params.department_id = deptId
  const statuses = parseMultiEnum(searchParams.get('status'), enumStatuses)
  if (statuses.length) params.statuses = statuses as any
  return params
}

function buildApiParamsFromUrl(searchParams: URLSearchParams): Record<string, any> {
  const params: Record<string, any> = {}
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize
  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering
  const search = searchParams.get('search')
  if (search) params.search = search
  const month = searchParams.get('month')
  if (month) params.month = month
  return params
}

export default function PenaltyManagementPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<PenaltyTicketFilterFormRef>(null)
  const ability = useAbility()
  const { openDeleteDialog } = usePenaltyTicketDelete()
  const bulkUpdate = useBulkUpdatePenaltyTicketStatus()

  const [selectedRows, setSelectedRows] = useState<PenaltyTicket[]>([])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const { openBulkSubmissionDialog } = useBulkSubmissionDialog()
  const { openExportDialog: openExportPenaltyDialog } = usePenaltyTicketExport()

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  useEffect(() => {
    if (!isUrlReady) {
      const hasParams = searchParams.toString().length > 0
      if (!hasParams) {
        const defaultParams = new URLSearchParams()
        defaultParams.set('page', '1')
        defaultParams.set('page_size', String(PAGE_SIZE))
        setSearchParams(defaultParams, { replace: true })
      }
      setIsUrlReady(true)
    }
  }, [isUrlReady, searchParams, setSearchParams])

  useEffect(() => {
    if (isUrlReady) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
        newParams.set('page', '1')
      } else {
        newParams.delete('search')
        newParams.set('page', '1')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    const baseParams = buildApiParamsFromUrl(searchParams)
    const branchId = parsePositiveInt(searchParams.get('branch'))
    if (branchId) baseParams.branch = branchId
    const blockId = parsePositiveInt(searchParams.get('block'))
    if (blockId) baseParams.block = blockId
    const deptId = parsePositiveInt(searchParams.get('department'))
    if (deptId) baseParams.department = deptId
    const statuses = parseMultiEnum(searchParams.get('status'), enumStatuses)
    if (statuses.length === 1) baseParams.status = statuses[0]
    return baseParams
  }, [isUrlReady, searchParams])

  const {
    data: ticketData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = usePenaltyTickets(apiParams as any, { enabled: !!apiParams })

  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const currentOrdering = searchParams.get('ordering') || undefined

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (direction === null) newParams.delete('ordering')
      else newParams.set('ordering', direction === 'desc' ? `-${field}` : field)
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleExitBulkMode = useCallback(() => {
    setIsBulkMode(false)
    setSelectedRows([])
  }, [])

  const handleEnterBulkMode = useCallback(() => {
    setSelectedRows([])
    setIsBulkMode(true)
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))
    const search = searchParams.get('search')
    if (search) newParams.set('search', search)
    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)
    if (formData.month) newParams.set('month', format(formData.month, 'MM/yyyy'))
    if (formData.branch_id) newParams.set('branch', String(formData.branch_id))
    if (formData.block_id) newParams.set('block', String(formData.block_id))
    if (formData.department_id) newParams.set('department', String(formData.department_id))
    if (formData.statuses && formData.statuses.length > 0)
      newParams.set('status', formData.statuses.join(','))
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.PENALTY_MANAGEMENT_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleExport = useCallback(() => {
    openExportPenaltyDialog({
      month: searchParams.get('month') || undefined,
      branch: parsePositiveInt(searchParams.get('branch')),
      block: parsePositiveInt(searchParams.get('block')),
      department: parsePositiveInt(searchParams.get('department')),
      status: searchParams.get('status') as any,
      search: debouncedSearch || undefined,
    })
  }, [openExportPenaltyDialog, searchParams, debouncedSearch])

  const handleOpenSubmissionDialog = useCallback(() => {
    if (selectedRows.length === 0) return
    openBulkSubmissionDialog(selectedRows, bulkUpdate, () => {
      setIsBulkMode(false)
      setSelectedRows([])
    })
  }, [selectedRows, bulkUpdate, openBulkSubmissionDialog])

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = ticketData?.results ?? []
    const count = ticketData?.count ?? 0
    return { tableData: results, pageCount: Math.ceil(count / pageSize) || 1, totalRecords: count }
  }, [ticketData, pageSize])

  const filteredTableData = useMemo(() => {
    if (!isBulkMode) return tableData
    return tableData.filter((item) => item.status !== PenaltyTicketStatus.PAID)
  }, [isBulkMode, tableData])

  // Clear selectedRows when table data refreshes or when leaving bulk mode
  useEffect(() => {
    if (!isBulkMode && selectedRows.length > 0) {
      setSelectedRows([])
      return
    }

    if (filteredTableData.length > 0 && selectedRows.length > 0) {
      const selectedIds = new Set(selectedRows.map((r) => r.id))
      const stillExists = filteredTableData.some((t) => selectedIds.has(t.id))
      if (!stillExists) {
        setSelectedRows([])
      }
    }
  }, [filteredTableData, isBulkMode, selectedRows])

  const isTableLoading = isLoading || isFetching || isRefetching

  const formInitialValues = useMemo(
    () => ({
      month: currentFilterParams.month || undefined,
      branch_id: currentFilterParams.branch_id || undefined,
      block_id: currentFilterParams.block_id || undefined,
      department_id: currentFilterParams.department_id || undefined,
      statuses: currentFilterParams.statuses || [],
    }),
    [currentFilterParams]
  )

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo tên, mã phiếu"
        searchClassName="!w-[350px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={
          (currentFilterParams.statuses?.length ? 1 : 0) +
          (currentFilterParams.month ? 1 : 0) +
          (currentFilterParams.branch_id ? 1 : 0) +
          (currentFilterParams.block_id ? 1 : 0) +
          (currentFilterParams.department_id ? 1 : 0)
        }
        handleCreateNew={
          ability.can('create', 'payroll.penalty_ticket') ? handleCreateNew : undefined
        }
        handleExportBtnFull={
          ability.can('export', 'payroll.penalty_ticket') ? handleExport : undefined
        }
        customActions={
          ability.can('bulk_update_status', 'payroll.penalty_ticket') ? (
            isBulkMode ? (
              <div className="flex items-center gap-3">
                <span className="text-content-dark-2 text-sm">Đã chọn: {selectedRows.length}</span>
                <Button
                  variant="secondary-border"
                  leftIcon={<IconCheckcircle />}
                  onClick={handleExitBulkMode}
                >
                  Đánh dấu từng phiếu
                </Button>
                <Button leftIcon={<IconCheckcircle />} onClick={handleOpenSubmissionDialog}>
                  Xác nhận nộp phạt
                </Button>
              </div>
            ) : (
              <Button leftIcon={<IconCheckcircle />} onClick={handleEnterBulkMode}>
                Đánh dấu đã nộp hàng loạt
              </Button>
            )
          ) : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <PenaltyTicketTable
            key={isBulkMode ? 'penalty-table-bulk' : 'penalty-table-single'}
            data={filteredTableData}
            isLoading={isTableLoading}
            error={error as any}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            ordering={currentOrdering}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onClearFilter={handleClearAll}
            onDeletePenaltyTicket={openDeleteDialog}
            hasFilter={!!searchInput}
            selectedRows={isBulkMode ? selectedRows : []}
            onSelectionChange={isBulkMode ? setSelectedRows : undefined}
            enableRowSelection={isBulkMode}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<PenaltyTicketFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
