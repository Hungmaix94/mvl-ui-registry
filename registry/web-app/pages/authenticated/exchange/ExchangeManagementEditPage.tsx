import { useCallback, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { ExchangeForm } from '@/features/exchange/_shares/components/ExchangeForm.tsx'
import { ExchangeFormValues } from '@/features/exchange/_shares/types/exchange-form-types.ts'
import { APP_PATH } from '@/routes'
import {
  useExchange,
  usePartialUpdateExchange,
  useSourceExchange,
  usePartialUpdateSourceExchange,
} from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

export const ExchangeManagementEditPage = ({ type = 'f2' }: { type?: 'f0' | 'f2' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const viewType = type
  const { id } = useParams<{ id: string }>()

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

  const exchange = useMemo(() => exchangeResponse, [exchangeResponse])

  const updateF2 = usePartialUpdateExchange()
  const updateF0 = usePartialUpdateSourceExchange()
  const updateExchangeMutation = viewType === 'f0' ? updateF0 : updateF2
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !exchange
  }, [isLoading, error, exchange])

  const hasPermission = ability.can('update', 'exchange')

  const handleSuccess = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(
        viewType === 'f0' ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT : APP_PATH.EXCHANGE_MANAGEMENT
      )
    }
  }, [navigate, location.state, viewType])

  const handleCancel = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(
        viewType === 'f0' ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT : APP_PATH.EXCHANGE_MANAGEMENT
      )
    }
  }, [navigate, location.state, viewType])

  const handleSubmit = useCallback(
    async (values: ExchangeFormValues) => {
      const { attachment_tokens, ...rest } = values
      const payload = {
        ...rest,
        ...(attachment_tokens &&
          attachment_tokens.length > 0 && {
            files: {
              attachments: attachment_tokens,
            },
          }),
      }
      await updateExchangeMutation.mutateAsync({
        id: Number(id),
        data: payload as any,
      })
      toastService.success(
        viewType === 'f0' ? 'Cập nhật nguồn sàn thành công' : 'Cập nhật sàn liên kết thành công'
      )
      handleSuccess()
    },
    [handleSuccess, id, updateExchangeMutation]
  )

  return (
    <>
      <PageTitle enableBackButton idLabel={exchange?.name} />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        hasPermission={hasPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <ExchangeForm
            initialData={exchange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={updateExchangeMutation.isPending}
            isEdit
          />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default ExchangeManagementEditPage
