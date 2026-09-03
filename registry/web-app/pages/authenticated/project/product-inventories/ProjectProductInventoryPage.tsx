import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import type { SortingState } from '@tanstack/react-table'

import AppDialog from '@/components/dialog/AppDialog.tsx'
import { PageTitle, Select } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useBookingContractLoadOptions } from '@/features/project/booking-contract/services/useBookingContractLoadOptions'
import { PAGE_SIZE } from '@/constants/table'

import { useDeleteProductInventory, useProductInventories } from '@/services/realestate-service'

import ProductInventoryFilter, {
  type ProductInventoryFilterRef,
} from './components/ProductInventoryFilter'
import ProductInventoryTable from './components/ProductInventoryTable'

export const ProjectProductInventoryPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()

  const [isUrlReady, setIsUrlReady] = useState(false)

  const formRef = useRef<ProductInventoryFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Search input state
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Modal states
  const [deleteModalProduct, setDeleteModalProduct] = useState<any>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isSaDialogOpen, setIsSaDialogOpen] = useState(false)
  const [selectedSaId, setSelectedSaId] = useState<number | null>(null)

  const { loadSalesAllocationOptions, loadInitialSalesAllocationOptions } =
    useBookingContractLoadOptions()

  useEffect(() => {
    const defaultParams = new URLSearchParams(searchParams)
    let isModified = false

    if (!defaultParams.has('page')) {
      defaultParams.set('page', '1')
      isModified = true
    }

    if (isModified) {
      setSearchParams(defaultParams, { replace: true })
    }

    setIsUrlReady(true)
  }, [searchParams, setSearchParams])

  // Sync search input when URL changes externally
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return
    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('page_size')) || PAGE_SIZE

  // Map URL params (project_id / sales_allocation_id) → API params (project / sales_allocation).
  const currentFilters = useMemo(() => {
    const filters: {
      search?: string
      status?: string
      project?: number
      sales_allocation?: number
      ordering?: string
    } = {}
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')
    const salesAllocationId = searchParams.get('sales_allocation_id')
    const ordering = searchParams.get('ordering')
    if (search) filters.search = search
    if (status) filters.status = status
    if (projectId) filters.project = Number(projectId)
    if (salesAllocationId) filters.sales_allocation = Number(salesAllocationId)
    if (ordering) filters.ordering = ordering
    return filters
  }, [searchParams])

  // Controlled sorting derived from the URL `ordering` param so header carets
  // reflect server-side ordering on first load and after navigation.
  const sortingState = useMemo<SortingState>(() => {
    const ordering = searchParams.get('ordering')
    if (!ordering) return []
    const desc = ordering.startsWith('-')
    return [{ id: desc ? ordering.slice(1) : ordering, desc }]
  }, [searchParams])

  const filterInitialValues = useMemo(() => {
    return {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      project_id: searchParams.has('project_id')
        ? Number(searchParams.get('project_id'))
        : undefined,
      sales_allocation_id: searchParams.has('sales_allocation_id')
        ? Number(searchParams.get('sales_allocation_id'))
        : undefined,
    }
  }, [searchParams])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useProductInventories(
    {
      page,
      page_size: pageSize,
      ...currentFilters,
    },
    { enabled: isUrlReady }
  )

  const deleteMutation = useDeleteProductInventory()

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      newParams.delete('project_id')
      newParams.delete('sales_allocation_id')
      newParams.delete('status')
      newParams.delete('search')
      newParams.set('page', '1')
      return newParams
    })
    setIsFilterDialogOpen(false)
  }, [setSearchParams])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, String(value))
        } else {
          newParams.delete(key)
        }
      })
      newParams.set('page', '1')
      return newParams
    })
    setIsFilterDialogOpen(false)
  }, [setSearchParams])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleDeleteProduct = useCallback((product: any) => {
    setDeleteModalProduct(product)
    setDeleteModalOpen(true)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!deleteModalProduct) return
    deleteMutation.mutate(deleteModalProduct.id, {
      onSuccess: () => {
        setDeleteModalOpen(false)
        setDeleteModalProduct(null)
      },
    })
  }, [deleteModalProduct, deleteMutation])

  const handleConfirmCreate = useCallback(() => {
    if (!selectedSaId) return
    setIsSaDialogOpen(false)
    navigate(`${APP_PATH.PROJECT_PRODUCT_INVENTORIES_CREATE}?saId=${selectedSaId}`)
    setSelectedSaId(null)
  }, [selectedSaId, navigate])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilters.project) count++
    if (currentFilters.sales_allocation) count++
    if (currentFilters.status) count++
    return count
  }, [currentFilters])

  return (
    // Khung chuẩn của trang danh sách (AGENTS.md): `h-full` + `overflow-hidden` để chiều cao bị
    // CHẶN, nhờ đó div bọc bảng bên dưới mới có scrollport riêng — `sticky top-0` của hàng tiêu
    // đề chỉ bám theo scrollport gần nhất, không có nó thì cả trang cuộn và tiêu đề trôi mất.
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Quản lý Bất động sản"
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã bất động sản, tên dự án..."
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={
          ability.can('create', 'project') ? () => setIsSaDialogOpen(true) : undefined
        }
        titleCreateNew="Tạo mới"
      />
      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        {/*
          Khung cuộn thật: `flex-1` + `overflow-*-auto`. `Table` phải tắt overflow bên trong
          (`disableInnerOverflow`) để không sinh khung cuộn thứ hai lồng vào.
        */}
        <div className="flex-1 overflow-x-auto overflow-y-auto pt-0 pb-0">
          <ProductInventoryTable
            // Bảng rộng hơn khung nên BẮT BUỘC `static`: chỉ nhánh đó mới dựng
            // `HorizontalScrollBar` + phân trang ghim đáy màn hình.
            paginationPosition="static"
            disableInnerOverflow
            stickyHeader
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            pageCount={listResponse?.count ? Math.ceil(listResponse.count / pageSize) : 1}
            currentPage={page}
            pageSize={pageSize}
            totalRecords={listResponse?.count || 0}
            sortingState={sortingState}
            onPaginationChange={(newPage, newPageSize) => {
              setSearchParams((prev) => {
                const newParams = new URLSearchParams(prev)
                newParams.set('page', String(newPage + 1))
                if (newPageSize) newParams.set('page_size', String(newPageSize))
                return newParams
              })
            }}
            onSortingChange={(field, direction) => {
              setSearchParams((prev) => {
                const newParams = new URLSearchParams(prev)
                if (direction) {
                  newParams.set('ordering', direction === 'desc' ? `-${field}` : field)
                } else {
                  newParams.delete('ordering')
                }
                newParams.set('page', '1')
                return newParams
              })
            }}
            onDelete={handleDeleteProduct}
          />
        </div>
      </div>

      {/* Modals */}
      <AppDialog
        variant="alert"
        title="Xóa Bất động sản"
        titleDescription={`Bạn có chắc chắn muốn xóa Bất động sản ${deleteModalProduct?.unit_number}? Hành động này không thể hoàn tác.`}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        content={null}
      />

      {/* Filter Dialog */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <ProductInventoryFilter
            ref={formRef}
            initialValues={filterInitialValues}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />

      {/* SA Selection Dialog */}
      <AppDialog
        open={isSaDialogOpen}
        onOpenChange={setIsSaDialogOpen}
        onCancel={() => {
          setIsSaDialogOpen(false)
          setSelectedSaId(null)
        }}
        title="Chọn Thông tin bán hàng"
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleConfirmCreate}
        confirmText="Xác nhận"
        disableConfirm={!selectedSaId}
        content={
          <div className="py-4">
            <Select
              label="Thông tin bán hàng (SA)"
              placeholder="Chọn thông tin bán hàng"
              value={selectedSaId ?? ''}
              onChange={(val) => setSelectedSaId(val ? Number(val) : null)}
              loadOptions={loadSalesAllocationOptions}
              loadInitialOptions={loadInitialSalesAllocationOptions}
              enableSearch
              clearable
            />
          </div>
        }
      />
    </div>
  )
}

export default ProjectProductInventoryPage
