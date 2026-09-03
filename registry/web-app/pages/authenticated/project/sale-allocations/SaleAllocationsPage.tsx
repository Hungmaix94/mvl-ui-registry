import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import debounce from 'lodash/debounce'
import { Flex } from '@radix-ui/themes'

import AppDialog from '@/components/dialog/AppDialog.tsx'
import { PageTitle } from '@/components/ui'
import { PAGE_SIZE } from '@/constants/table'
import {
  useDeleteSalesAllocation,
  useSalesAllocations,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import type { SalesAllocation } from '@/features/project/sale-allocations/types/sales-allocation'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'

import SaleAllocationFilter, {
  type SaleAllocationFilterFormData,
  type SaleAllocationFilterRef,
} from './components/SaleAllocationFilter'
import SaleAllocationListTable from './components/SaleAllocationListTable'

const SaleAllocationsPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const formRef = useRef<SaleAllocationFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Modal states
  const [deleteModalProduct, setDeleteModalProduct] = useState<SalesAllocation | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

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

  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('page_size')) || PAGE_SIZE

  const currentFilters: SaleAllocationFilterFormData & Record<string, any> = useMemo(() => {
    const filterData: any = {}
    Array.from(searchParams.entries()).forEach(([key, value]) => {
      if (!['page', 'page_size', 'ordering'].includes(key)) {
        filterData[key] = value
      }
    })
    return filterData
  }, [searchParams])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useSalesAllocations(
    {
      page,
      page_size: pageSize,
      ...currentFilters,
    },
    { enabled: isUrlReady }
  )

  const deleteMutation = useDeleteSalesAllocation()

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      newParams.delete('project')
      newParams.delete('phase')
      newParams.delete('source_type')
      newParams.delete('source_exchange')
      newParams.delete('project_secretary')
      newParams.delete('project_director')
      newParams.set('page', '1')
      return newParams
    })
    setIsFilterDialogOpen(false)
  }, [setSearchParams])

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '')
  }, [searchParams])

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev)
          if (value) {
            newParams.set('search', value)
          } else {
            newParams.delete('search')
          }
          newParams.set('page', '1')
          return newParams
        })
      }, 500),
    [setSearchParams]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value)
      debouncedSearch(value)
    },
    [debouncedSearch]
  )

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

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.PROJECT_SALE_ALLOCATIONS_CREATE)
  }, [navigate])

  const handleDeleteProduct = useCallback((product: SalesAllocation) => {
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

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilters.project) count++
    if (currentFilters.phase) count++
    if (currentFilters.source_type) count++
    if (currentFilters.source_exchange) count++
    if (currentFilters.project_secretary) count++
    if (currentFilters.project_director) count++
    return count
  }, [currentFilters])

  return (
    <>
      <PageTitle
        title="Quản lý thông tin bán hàng"
        handleSearch={handleSearchChange}
        searchPlaceholder="Tìm kiếm theo mã, tên"
        searchValue={searchTerm}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'project') ? handleCreateNew : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <SaleAllocationListTable
          data={listResponse?.results ?? []}
          isLoading={isLoading}
          error={error}
          pageCount={listResponse?.count ? Math.ceil(listResponse.count / pageSize) : 1}
          totalRecords={listResponse?.count || 0}
          pageSize={pageSize}
          currentPage={page}
          onPaginationChange={(newPage, newPageSize) => {
            setSearchParams((prev) => {
              const newParams = new URLSearchParams(prev)
              newParams.set('page', String(newPage))
              if (newPageSize) newParams.set('page_size', String(newPageSize))
              return newParams
            })
          }}
          onDelete={handleDeleteProduct}
        />
      </Flex>

      {/* Modals */}
      <AppDialog
        variant="alert"
        title="Xóa Thông tin bán hàng"
        titleDescription={`Bạn có chắc chắn muốn xóa thông tin bán hàng ${deleteModalProduct?.code}? Hành động này không thể hoàn tác.`}
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
          <SaleAllocationFilter
            ref={formRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default SaleAllocationsPage
