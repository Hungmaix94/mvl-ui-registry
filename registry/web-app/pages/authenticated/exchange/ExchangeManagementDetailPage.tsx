import { useCallback, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import ExchangeDetailWrapper from '@/features/exchange/view-details/ExchangeDetailWrapper.tsx'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useExchangeDelete } from '@/features/exchange/_shares/hooks/useExchangeDelete.tsx'
import { useExchange, useSourceExchange } from '@/services/realestate-service.ts'
import { isNotFoundError } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

export const ExchangeManagementDetailPage = ({ type = 'f2' }: { type?: 'f0' | 'f2' }) => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const viewType = type

  const {
    data: exchangeF2,
    isLoading: f2Loading,
    error: f2Error,
  } = useExchange(Number(id), { enabled: viewType === 'f2' })

  const {
    data: exchangeF0,
    isLoading: f0Loading,
    error: f0Error,
  } = useSourceExchange(Number(id), { enabled: viewType === 'f0' })

  const exchangeResponse = viewType === 'f0' ? exchangeF0 : exchangeF2
  const isLoading = viewType === 'f0' ? f0Loading : f2Loading
  const error = viewType === 'f0' ? f0Error : f2Error

  const exchange = exchangeResponse
  const exchangeName = useMemo(
    () => exchange?.name || (viewType === 'f0' ? 'Chi tiết nguồn sàn' : 'Chi tiết sàn liên kết'),
    [exchange?.name, viewType]
  )
  const navigate = useNavigate()

  const { openDeleteDialog } = useExchangeDelete(viewType as 'f0' | 'f2', () => {
    // Preserve query params when navigating back after delete
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(
        viewType === 'f0' ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT : APP_PATH.EXCHANGE_MANAGEMENT
      )
    }
  })
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !exchange
  }, [isLoading, error, exchange])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'exchange')

  const handleEdit = useCallback(() => {
    if (id) {
      const path =
        viewType === 'f0'
          ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_EDIT
          : APP_PATH.EXCHANGE_MANAGEMENT_EDIT
      const finalPath = path.replace(':id', id)
      navigate(finalPath, { state: { ...location.state, type: viewType } })
    }
  }, [navigate, id, location.state, viewType])

  const handleDelete = useCallback(() => {
    if (exchange) {
      openDeleteDialog(exchange)
    }
  }, [openDeleteDialog, exchange])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.EXCHANGE_MANAGEMENT_HISTORY.replace(':id', id)
      navigate(path, { state: { ...location.state, type: viewType } })
    }
  }, [navigate, id, location.state, viewType])

  return (
    <>
      <PageTitle
        title={exchangeName}
        handleEdit={ability.can('update', 'exchange') ? handleEdit : undefined}
        enableBackButton={true}
        handleDelete={ability.can('destroy', 'exchange') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'exchange') ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasReadPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <ExchangeDetailWrapper exchange={exchange!} />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default ExchangeManagementDetailPage
