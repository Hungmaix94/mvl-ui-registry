import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { format } from 'date-fns'

import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { PageTitle, Button } from '@/components/ui'
import { IconPlus } from '@/assets/icons'
import AppDialog from '@/components/dialog/AppDialog.tsx'

import CollaboratorContractTable from '@/features/accounting/collaborator-contracts/view/CollaboratorContractTable'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import CollaboratorContractFilterForm, {
  type CollaboratorContractFilterFormRef,
} from '@/features/accounting/collaborator-contracts/_shares/components/CollaboratorContractFilterForm'
import CollaboratorContractCreateForm, {
  type CollaboratorContractCreateFormRef,
} from '@/features/accounting/collaborator-contracts/_shares/components/CollaboratorContractCreateForm'
import { useCollaboratorContractMarkSigned } from '@/features/accounting/collaborator-contracts/_shares/hooks/useCollaboratorContractMarkSigned'
import { useCollaboratorContractCancel } from '@/features/accounting/collaborator-contracts/_shares/hooks/useCollaboratorContractCancel'
import {
  type GetCollaboratorContractsParams,
  useCollaboratorContracts,
} from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import {
  ContractStatus,
  type CollaboratorContractFilterValues,
} from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'
import { CollaboratorContractStatus } from '@/constants/api-schema-aliases'

type FilterParams = {
  status?: string | null
  collaborator?: string | null
  signed_date_from?: string | null
  signed_date_to?: string | null
}

const ALLOWED_STATUSES = new Set<string>(Object.values(ContractStatus))

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetCollaboratorContractsParams {
  const params: GetCollaboratorContractsParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const search = searchParams.get('search')
  if (search) params.search = search

  const status = searchParams.get('status')
  if (status && ALLOWED_STATUSES.has(status)) {
    params.status = status as CollaboratorContractStatus
  }

  const collaborator = searchParams.get('collaborator')
  if (collaborator) {
    const n = Number(collaborator)
    if (!Number.isNaN(n)) params.collaborator = n
  }

  const signedFrom = searchParams.get('signed_date_from')
  if (signedFrom) params.signed_date_from = signedFrom
  const signedTo = searchParams.get('signed_date_to')
  if (signedTo) params.signed_date_to = signedTo

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  return params
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  return {
    status: searchParams.get('status'),
    collaborator: searchParams.get('collaborator'),
    signed_date_from: searchParams.get('signed_date_from'),
    signed_date_to: searchParams.get('signed_date_to'),
  }
}

const formatDateToApi = (value: Date | string | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) {
    return format(value, DATE_SERVER_FORMAT)
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return format(d, DATE_SERVER_FORMAT)
  }
  return null
}

export default function CollaboratorContractPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<CollaboratorContractFilterFormRef>(null)
  const createFormRef = useRef<CollaboratorContractCreateFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openMarkSignedDialog } = useCollaboratorContractMarkSigned()
  const { openCancelDialog } = useCollaboratorContractCancel()

  // Initialize URL defaults
  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync search input from URL
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
    const currentSearch = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearch) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, isUrlReady])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const { data, isLoading, error, isFetching, isRefetching } = useCollaboratorContracts(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const { openExportDialog } = useAccountingListExport(
    '/api/sales/collaborator-contracts/export/',
    'hop-dong-cong-tac-vien.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [data, pageSize])

  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.status) count++
    if (currentFilterParams.collaborator) count++
    if (currentFilterParams.signed_date_from || currentFilterParams.signed_date_to) count++
    return count
  }, [currentFilterParams])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // PHẢI trả nguyên promise (kể cả khi nó reject) cho `AppDialog`: `handleConfirm` bên trong
  // `AppDialog` await lời hứa này rồi ĐÓNG dialog nếu nó resolve, và chỉ giữ dialog mở khi nó
  // reject. Bọc `try/catch` ở đây là biến thất bại thành "thành công" ⇒ dialog đóng mất và người
  // dùng mất trắng dữ liệu vừa nhập. Lý do thất bại được báo bằng toast trong chính form
  // (ClickUp 86eypf62k) — `AppDialog` nuốt lỗi im lặng nên không nơi nào khác báo hộ.
  const handleConfirmCreate = useCallback(() => {
    return createFormRef.current?.submitForm()
  }, [])

  const handleSuccessCreate = useCallback(() => {
    setIsCreateDialogOpen(false)
  }, [])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)

    if (formData.status) newParams.set('status', String(formData.status))
    if (formData.collaborator) newParams.set('collaborator', String(formData.collaborator))

    const fromApi = formatDateToApi(formData.signed_date_from as Date | string | null | undefined)
    if (fromApi) newParams.set('signed_date_from', fromApi)

    const toApi = formatDateToApi(formData.signed_date_to as Date | string | null | undefined)
    if (toApi) newParams.set('signed_date_to', toApi)

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  const formInitialValues: Partial<CollaboratorContractFilterValues> = useMemo(() => {
    const collaboratorNum = currentFilterParams.collaborator
      ? Number(currentFilterParams.collaborator)
      : null
    return {
      status:
        currentFilterParams.status && ALLOWED_STATUSES.has(currentFilterParams.status)
          ? (currentFilterParams.status as ContractStatus)
          : null,
      collaborator: collaboratorNum && !Number.isNaN(collaboratorNum) ? collaboratorNum : null,
      signed_date_from: currentFilterParams.signed_date_from || null,
      signed_date_to: currentFilterParams.signed_date_to || null,
    }
  }, [currentFilterParams])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput || filterBadgeCount > 0

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  return (
    <>
      <PageTitle
        title="Hợp đồng Cộng tác viên"
        handleSearch={handleSearch}
        searchPlaceholder="Tìm theo mã HĐ, số HĐ, tên CTV..."
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterBadgeCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        customActions={
          <Button
            variant="primary"
            size="small"
            leftIcon={<IconPlus />}
            onClick={() => setIsCreateDialogOpen(true)}
            className="typo-body-sm-medium"
            title="Tạo mới"
          >
            Tạo mới
          </Button>
        }
      />
      <Flex flexGrow="1" direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <CollaboratorContractTable
            data={tableData}
            isLoading={isTableLoading}
            error={error as Error | null}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onMarkSigned={openMarkSignedDialog}
            onCancel={openCancelDialog}
            onClearFilter={handleClearAll}
            hasFilter={hasFilter}
            isShowTableColumnConfig={shouldShowConfig}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <CollaboratorContractFilterForm ref={filterFormRef} initialValues={formInitialValues} />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />

      <AppDialog
        variant="custom"
        // Form có bảng chia 6 cột; ở nấc `2xl` (672px < min-w 732px của DialogContent) các cột bị
        // bóp đến mức nhãn cột xuống dòng từng chữ.
        size="4xl"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Tạo mới hợp đồng CTV"
        content={
          <CollaboratorContractCreateForm ref={createFormRef} onSuccess={handleSuccessCreate} />
        }
        onCancel={() => setIsCreateDialogOpen(false)}
        onConfirm={handleConfirmCreate}
        isHideCancelButton={false}
      />
    </>
  )
}
