import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { InvestorForm } from '@/features/investor/_shares/components/InvestorForm.tsx'
import { InvestorFormValues } from '@/features/investor/_shares/types/investor-form-types.ts'
import { APP_PATH } from '@/routes'
import { useCreateInvestor } from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

export const InvestorManagementCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const createInvestorMutation = useCreateInvestor()

  const handleSuccess = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.INVESTOR_MANAGEMENT)
    }
  }, [navigate, location.state])

  const handleCancel = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(withRememberedSearch(APP_PATH.INVESTOR_MANAGEMENT))
    }
  }, [navigate, location.state])

  const handleSubmit = useCallback(
    async (values: InvestorFormValues) => {
      const { attachment_tokens, attachment_keep_ids: _keep, ...rest } = values
      const payload = {
        ...rest,
        ...(attachment_tokens.length > 0 && {
          files: { attachments: attachment_tokens },
        }),
      }
      await createInvestorMutation.mutateAsync(payload as any)
      toastService.success('Tạo chủ đầu tư thành công')
      handleSuccess()
    },
    [createInvestorMutation, handleSuccess]
  )

  return (
    <>
      <PageTitle title="Tạo mới chủ đầu tư" enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <InvestorForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createInvestorMutation.isPending}
        />
      </Flex>
    </>
  )
}

export default InvestorManagementCreatePage
