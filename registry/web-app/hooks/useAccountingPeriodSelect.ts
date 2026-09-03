import { useCallback } from 'react'
import { getAccountingPeriodService } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { PAGE_SIZE } from '../constants/table'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select'

function formatPeriodLabel(year: number, month: number): string {
  return `${year}/${String(month).padStart(2, '0')}`
}

export function useAccountingPeriodSelect() {
  const loadAccountingPeriodOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      try {
        const response = await getAccountingPeriodService().getAccountingPeriods({
          page: params.page,
          page_size: params.pageSize || PAGE_SIZE,
          ordering: '-year,-month',
        })
        const items = (response?.results ?? []).map((p) => ({
          label: formatPeriodLabel(p.year, p.month),
          value: p.id,
        }))
        return {
          items,
          hasNextPage: !!response?.next,
          nextPage: response?.next ? params.page + 1 : null,
        }
      } catch {
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    []
  )

  const loadInitialAccountingPeriodOptions = useCallback(
    async (ids: (string | number)[]): Promise<SelectOption[]> => {
      if (!ids?.length) return []
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const p = await getAccountingPeriodService().getAccountingPeriod(Number(id))
            return { label: formatPeriodLabel(p.year, p.month), value: p.id }
          } catch {
            return null
          }
        })
      )
      return results.filter(Boolean) as SelectOption[]
    },
    []
  )

  return { loadAccountingPeriodOptions, loadInitialAccountingPeriodOptions }
}
