import { useCallback, useMemo } from 'react'

import { useExchangeDropdown, getRealEstateService } from '@/services/realestate-service'
import { ExchangeDropdown } from '@/services/realestate-service'
import { SelectOption, LoadOptionsParams, LoadOptionsResult } from '@/components/ui/select/Select'

type UseExchangeSelectProps = {
  valueType?: 'id' | 'object'
  enabled?: boolean
  params?: Record<string, any>
}

export const useExchangeSelect = ({
  valueType = 'id',
  enabled = true,
  params = {},
}: UseExchangeSelectProps = {}) => {
  // Fetch active exchanges using dropdown endpoint to support roles with limited permissions (e.g. project secretary)
  const { data: exchangesData, isLoading } = useExchangeDropdown(
    { page_size: 100, ...params },
    { enabled }
  )

  const exchangeOptions = useMemo<SelectOption[]>(() => {
    if (!exchangesData?.results) return []
    return exchangesData.results.map((exchange: ExchangeDropdown) => ({
      label: exchange.name,
      value: (valueType === 'id' ? exchange.id : exchange) as any,
    }))
  }, [exchangesData?.results, valueType])

  const loadExchangeOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      const search = loadParams?.query || ''
      const page = loadParams.page || 1
      const pageSize = loadParams.pageSize || 20

      try {
        const response = await getRealEstateService().getExchangeDropdown({
          ...params,
          search,
          page,
          page_size: pageSize,
        })

        const results = response?.results || []
        const filtered = results.map((exchange: ExchangeDropdown) => ({
          label: exchange.name,
          value: String(exchange.id),
        }))

        return {
          items: filtered,
          hasNextPage: !!response?.next,
          nextPage: response?.next ? page + 1 : null,
        }
      } catch (err) {
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    [valueType, params]
  )

  const loadInitialExchangeOptions = useCallback(
    async (ids: (string | number)[]): Promise<SelectOption[]> => {
      if (!ids.length) return []
      if (exchangesData?.results) {
        const numIds = ids.map(Number)
        const matched = exchangesData.results
          .filter((ex: ExchangeDropdown) => numIds.includes(ex.id))
          .map((exchange: ExchangeDropdown) => ({
            label: exchange.name,
            value: String(exchange.id),
          }))
        if (matched.length === ids.length) {
          return matched
        }
      }
      try {
        const promises = ids.map(async (id) => {
          const ex = await getRealEstateService().getExchange(Number(id))
          return {
            label: ex.name,
            value: String(ex.id),
          }
        })
        return await Promise.all(promises)
      } catch (error) {
        console.error('Error loading initial exchange options:', error)
        return []
      }
    },
    [exchangesData?.results, valueType]
  )

  return {
    exchangeOptions,
    isLoading,
    loadExchangeOptions,
    loadInitialExchangeOptions,
  }
}
