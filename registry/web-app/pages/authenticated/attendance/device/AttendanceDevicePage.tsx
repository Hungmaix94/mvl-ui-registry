import { useCallback, useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { useAttendanceDeviceDelete } from '@/features/attendance/device/_shares/hooks/useAttendanceDeviceDelete'
import AttendanceDeviceTable from '@/features/attendance/device/view/AttendanceDeviceTable'
import { APP_PATH } from '@/routes'
import {
  useCheckAttendanceDeviceConnection,
  type AttendanceDevice,
  type GetAttendanceDevicesParams,
  useAttendanceDevices,
} from '@/features/attendance/services/attendance-device-service'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { QUERY_KEYS } from '@/constants'
import { useQueryClient } from '@tanstack/react-query'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { extractErrorMessage } from '@/utils/error-utils'

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetAttendanceDevicesParams> {
  const params: NonNullable<GetAttendanceDevicesParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering - URL format: -field for desc, field for asc
  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  return params
}

const AttendanceDevicePage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const ability = useAbility()
  const queryClient = useQueryClient()

  const checkConnectionMutation = useCheckAttendanceDeviceConnection()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useAttendanceDeviceDelete()

  // Initialize URL with defaults if empty
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    // Always apply defaults if URL is completely empty
    // When navigating back from detail, we use location.state.from which already has full query params,
    // so we won't hit isUrlEmpty in that case
    if (isUrlEmpty) {
      const newParams = new URLSearchParams()

      // Set defaults: pagination only (no filters)
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))

      setSearchParams(newParams, { replace: true })
    } else {
      // URL has some params - only ensure page and page_size exist
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
        }

        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
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
      // Reset to page 1 when search changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Call API with params derived from URL
  const {
    data: devicesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useAttendanceDevices(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = devicesData?.results ?? []
    const count = devicesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [devicesData, pageSize])

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      // Reset to page 1 when sorting changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle clear all (search + filters) - reset to defaults (no filters)
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.ATTENDANCE_DEVICE_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteDevice = useCallback(
    (device: AttendanceDevice) => {
      openDeleteDialog(device)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    console.log('TODO: Export attendance devices')
  }, [])

  const handleCheckConnect = useCallback(
    async (device: AttendanceDevice) => {
      if (!device?.id) {
        toastService.error('Không tìm thấy thiết bị')
        return
      }

      try {
        const res = await checkConnectionMutation.mutateAsync(Number(device.id))

        if (res.is_connected) {
          toastService.success('Kết nối lại thiết bị thành công')
        } else {
          toastService.error('Kết nối lại thiết bị thất bại')
        }

        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.ATTENDANCE_DEVICES.DETAIL(Number(device.id)),
        })
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.ATTENDANCE_DEVICES.LIST({}),
        })
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [checkConnectionMutation, queryClient]
  )

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput && searchInput.trim() !== ''

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm theo mã máy, tên máy"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleCreateNew={ability.can('create', 'attendance_device') ? handleCreateNew : undefined}
        // handleExportBtnFull={ability.can('export', 'attendance_device') ? handleExport : undefined}
        handleExportBtnFull={handleExport}
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <AttendanceDeviceTable
            data={tableData}
            isLoading={isTableLoading}
            error={error}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onDeleteDevice={handleDeleteDevice}
            onClearFilter={handleClearAll}
            onCheckConnect={handleCheckConnect}
            hasFilter={hasFilter}
          />
        </div>
      </Flex>
    </>
  )
}

export default AttendanceDevicePage
