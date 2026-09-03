import { useCallback } from 'react'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { getRealEstateService } from '@/services/realestate-service'
import { getSaleService } from '@/services/sales-service'
import { PAGE_SIZE } from '@/constants/table'
import { formatCodeNameLabel } from '@/utils/string-utils'
import { ProductStatus } from '@/features/project/sale-allocations/types/product'

/**
 * Generic helper for paginated API fetchLoad
 */
function buildLoadOptions(
  fetcher: (params: any) => Promise<any>,
  labelMapper?: (item: any) => string
) {
  return async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
    try {
      const paginatedData = await fetcher({
        search: params.query || undefined,
        page: params.page,
        page_size: params.pageSize || PAGE_SIZE,
      })

      if (!paginatedData?.results) {
        return { items: [], nextPage: null, hasNextPage: false }
      }

      const items: (SelectOption & { item?: any })[] = paginatedData.results.map((r: any) => ({
        value: r.id,
        label: labelMapper ? labelMapper(r) : (r.name ?? r.code ?? String(r.id)),
        item: r, // Keep full object for selection
      }))

      let nextPage: number | null = null
      const hasNext = !!paginatedData.next
      if (hasNext && paginatedData.next) {
        try {
          const nextUrl = paginatedData.next.startsWith('http')
            ? new URL(paginatedData.next)
            : new URL(paginatedData.next, window.location.origin)
          const nextPageParam = nextUrl.searchParams.get('page')
          if (nextPageParam) nextPage = Number(nextPageParam)
        } catch {
          const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
          nextPage = pageMatch ? Number(pageMatch[1]) : params.page + 1
        }
      }

      return { items, nextPage, nextCursor: nextPage, hasNextPage: hasNext } as unknown as any
    } catch {
      return { items: [], nextPage: null, hasNextPage: false }
    }
  }
}

type UseBookingContractLoadOptionsParams = {
  investorId?: number | null
  projectId?: number | null
  customerId?: number | null
  exchangeId?: number | null
  allowedProductIds?: number[]
}

export function useBookingContractLoadOptions({
  investorId,
  projectId,
  customerId,
  exchangeId,
  allowedProductIds,
}: UseBookingContractLoadOptionsParams = {}) {
  const loadProjectOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      return buildLoadOptions((p) =>
        getRealEstateService().getProjectDropdown({
          ...p,
          investor: investorId ?? undefined,
          exchange: exchangeId ?? undefined,
          is_active: true,
        } as any)
      )(params)
    },
    [investorId, exchangeId]
  )

  const loadProductInventoryOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      const res = await buildLoadOptions(
        (p) =>
          getRealEstateService().getProductInventoryDropdown({
            ...p,
            project: projectId ?? undefined,
            investor: investorId ?? undefined,
            distribution_exchange: exchangeId ?? undefined,
            status__in: [ProductStatus.AVAILABLE, ProductStatus.RESERVED].join(','),
          }),
        (item) => item.unit_number || item.code || String(item.id)
      )(params)

      // Parallel query to fetch specific allowed product IDs regardless of status, merging them on the first page
      if (params.page === 1 && allowedProductIds && allowedProductIds.length > 0) {
        try {
          const allowedRes = await getRealEstateService().getProductInventoryDropdown({
            id__in: allowedProductIds,
            page_size: allowedProductIds.length,
          })
          const allowedItems: SelectOption[] = (allowedRes?.results || []).map((r: any) => ({
            value: r.id,
            label: r.unit_number || r.code || String(r.id),
            item: r,
          }))

          const existingIds = new Set(res.items.map((item) => item.value))
          const newItems = [...res.items]

          allowedItems.forEach((item) => {
            if (!existingIds.has(item.value)) {
              newItems.unshift(item) // Prepend at the top of the list
              existingIds.add(item.value)
            }
          })
          res.items = newItems
        } catch (e) {
          console.error('Failed to load allowed product inventories', e)
        }
      }

      return res
    },
    [projectId, investorId, exchangeId, allowedProductIds]
  )

  const loadSalesAllocationOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      return buildLoadOptions(
        (p) =>
          getRealEstateService().getSalesAllocationsDropdown({
            ...p,
            project: projectId ?? undefined,
            exchange: exchangeId ?? undefined,
          }),
        // `Mã - Tên`: BE đã cho `search` khớp cả mã, nhưng người dùng không gõ được mã
        // họ không nhìn thấy (ClickUp 86eyqwr9u).
        (item) => formatCodeNameLabel(item.code, item.name, String(item.id))
      )(params)
    },
    [projectId, exchangeId]
  )

  const loadCustomerOptions = useCallback(
    buildLoadOptions(
      // @ts-ignore API schema does not currently define query parameters for this endpoint
      (params) => getSaleService().getCustomerDropdown(params),
      (item) => `${item.id_number} - ${item.name || item.full_name}`
    ),
    []
  )

  const loadBookingOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      return buildLoadOptions(
        (p) => {
          const apiParams = { ...p }
          return getSaleService().getBookings({
            ...apiParams,
            project: projectId ?? undefined,
            customer: customerId ?? undefined,
            booking_status: 'booked',
            can_convert: true,
          })
        },
        (booking: any) => {
          const customerName =
            booking.customer_detail?.name || booking.customer_detail?.business_name || ''
          const projectName = booking.project_detail?.name || ''
          const parts = [booking.code, customerName, projectName].filter(Boolean)
          return parts.join(' - ')
        }
      )(params)
    },
    [projectId, customerId]
  )

  const loadBusinessCustomerOptions = useCallback(
    buildLoadOptions((params) =>
      getSaleService().getCustomerDropdown({ ...params, customer_type: 'business' })
    ),
    []
  )

  const loadInitialProjectOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) return []
      try {
        const ids = values.map(Number).filter(Boolean)
        const data = await getRealEstateService().getProjectDropdown({
          id__in: ids,
          page_size: ids.length || 1,
        })
        return (
          data?.results?.map((p) => ({
            label: p.name || p.code || String(p.id),
            value: p.id,
          })) ?? []
        )
      } catch {
        return []
      }
    },
    []
  )

  const loadInitialProductInventoryOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) return []
      try {
        const ids = values.map(Number).filter(Boolean)
        const data = await getRealEstateService().getProductInventoryDropdown({
          id__in: ids,
          page_size: ids.length || 1,
        })
        return (
          data?.results?.map((p) => ({
            label: p.unit_number || p.code || String(p.id),
            value: p.id,
          })) ?? []
        )
      } catch {
        return []
      }
    },
    []
  )

  const loadInitialBookingOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) return []
      try {
        const fetchPromises = values.map(async (id) => {
          try {
            const booking = await getSaleService().getBooking(Number(id))
            const customerName =
              booking.cust_business_name ||
              booking.cust_full_name ||
              booking.customer_detail?.name ||
              ''
            const projectName = booking.project_detail?.name || ''
            const parts = [booking.code, customerName, projectName].filter(Boolean)

            return {
              label: parts.length > 0 ? parts.join(' - ') : String(id), // Display extended booking signature
              value: booking.id,
              item: booking,
            } as SelectOption
          } catch {
            return null
          }
        })
        const results = await Promise.all(fetchPromises)
        return results.filter((item): item is SelectOption => item !== null)
      } catch {
        return []
      }
    },
    []
  )

  const loadInitialSalesAllocationOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) return []
      try {
        const ids = values.map(Number).filter(Boolean)
        const data = await getRealEstateService().getSalesAllocationsDropdown({
          id__in: ids,
          page_size: ids.length || 1,
        } as any)
        return (
          data?.results?.map((p) => ({
            label: formatCodeNameLabel(p.code, p.name, String(p.id)),
            value: p.id,
          })) ?? []
        )
      } catch {
        return []
      }
    },
    []
  )

  return {
    loadProjectOptions,
    loadProductInventoryOptions,
    loadSalesAllocationOptions,
    loadCustomerOptions,
    loadBookingOptions,
    loadBusinessCustomerOptions,
    loadInitialProjectOptions,
    loadInitialProductInventoryOptions,
    loadInitialSalesAllocationOptions,
    loadInitialBookingOptions,
  }
}
