import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { ExchangeForm } from '@/features/exchange/_shares/components/ExchangeForm.tsx'
import { ExchangeFormValues } from '@/features/exchange/_shares/types/exchange-form-types.ts'
import { APP_PATH } from '@/routes'
import { useCreateExchange, useCreateSourceExchange } from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'

export const ExchangeManagementCreatePage = ({ type = 'f2' }: { type?: 'f0' | 'f2' }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const formType = type
  const createF2 = useCreateExchange()
  const createF0 = useCreateSourceExchange()
  const createExchangeMutation = formType === 'f0' ? createF0 : createF2

  const handleSuccess = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(
        formType === 'f0' ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT : APP_PATH.EXCHANGE_MANAGEMENT
      )
    }
  }, [navigate, location.state, formType])

  const handleCancel = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(
        formType === 'f0' ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT : APP_PATH.EXCHANGE_MANAGEMENT
      )
    }
  }, [navigate, location.state, formType])

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
      await createExchangeMutation.mutateAsync(payload as any)
      toastService.success(
        formType === 'f0' ? 'Tạo nguồn sàn thành công' : 'Tạo sàn liên kết thành công'
      )
      handleSuccess()
    },
    [createExchangeMutation, handleSuccess]
  )

  return (
    <>
      <PageTitle title={formType === 'f0' ? 'Tạo mới nguồn sàn' : 'Tạo mới SLK'} enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <ExchangeForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createExchangeMutation.isPending}
        />
      </Flex>
    </>
  )
}

export default ExchangeManagementCreatePage
