import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/constants'
import { getRealEstateService, type ProductInventory } from '@/services/realestate-service'

export function useProductInventoriesByIds(ids: number[]) {
  const distinctIds = useMemo(() => Array.from(new Set(ids.filter((id) => id > 0))), [ids])

  const queries = useQueries({
    queries: distinctIds.map((id) => ({
      queryKey: QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.DETAIL(id),
      queryFn: () => getRealEstateService().getProductInventory(id),
      staleTime: 1000 * 60 * 5,
    })),
  })

  const detailById = useMemo(() => {
    const map: Record<number, ProductInventory> = {}
    distinctIds.forEach((id, index) => {
      const data = queries[index]?.data
      if (data) map[id] = data
    })
    return map
  }, [distinctIds, queries])

  const isLoading = queries.some((q) => q.isLoading)

  return { detailById, isLoading }
}
