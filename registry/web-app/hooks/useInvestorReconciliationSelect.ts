import { useCallback } from 'react'
import { getInvestorReconciliationService } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import { LoadOptionsParams, LoadOptionsResult, SelectOption } from '@/components/ui/select/Select'

export const useInvestorReconciliationSelect = () => {
  const loadReconciliationOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      const search = loadParams?.query || ''
      const page = loadParams.page || 1
      const pageSize = loadParams.pageSize || 20

      try {
        const response = await getInvestorReconciliationService().getInvestorReconciliationSheets({
          search,
          page,
          page_size: pageSize,
        })

        const results = response?.results || []
        const items = results.map((item: any) => ({
          label: item.code || `Phiếu #${item.id}`,
          value: String(item.id),
        }))

        return {
          items,
          hasNextPage: !!response?.next,
          nextPage: response?.next ? page + 1 : null,
        }
      } catch (err) {
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    []
  )

  const loadInitialReconciliationOptions = useCallback(
    async (ids: (string | number)[]): Promise<SelectOption[]> => {
      if (!ids.length) return []
      try {
        const promises = ids.map(async (id) => {
          const item = await getInvestorReconciliationService().getInvestorReconciliationSheet(
            Number(id)
          )
          return {
            label: item.code || `Phiếu #${item.id}`,
            value: String(item.id),
          }
        })
        return await Promise.all(promises)
      } catch (error) {
        console.error('Error loading initial reconciliation options:', error)
        return []
      }
    },
    []
  )

  return { loadReconciliationOptions, loadInitialReconciliationOptions }
}
