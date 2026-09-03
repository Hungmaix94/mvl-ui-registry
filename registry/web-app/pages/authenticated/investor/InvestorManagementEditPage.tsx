import { useCallback, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { InvestorForm } from '@/features/investor/_shares/components/InvestorForm.tsx'
import { InvestorFormValues } from '@/features/investor/_shares/types/investor-form-types.ts'
import { APP_PATH } from '@/routes'
import { useInvestor, usePartialUpdateInvestor } from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

export const InvestorManagementEditPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { data: investorResponse, isLoading, error } = useInvestor(Number(id))
  const investor = useMemo(() => investorResponse, [investorResponse])
  const updateInvestorMutation = usePartialUpdateInvestor()
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !investor
  }, [isLoading, error, investor])

  const hasPermission = ability.can('update', 'investor')

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
      const { attachment_tokens, attachment_keep_ids, ...rest } = values
      const payload = {
        ...rest,
        attachment_ids: attachment_keep_ids ?? [],
        ...(attachment_tokens.length > 0 && {
          files: { attachments: attachment_tokens },
        }),
      }
      await updateInvestorMutation.mutateAsync({
        id: Number(id),
        data: payload as any,
      })
      toastService.success('Cập nhật chủ đầu tư thành công')
      handleSuccess()
    },
    [handleSuccess, id, updateInvestorMutation]
  )

  return (
    <>
      <PageTitle title="Chỉnh sửa thông tin chủ đầu tư" enableBackButton idLabel={investor?.name} />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        hasPermission={hasPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <InvestorForm
            initialData={investor}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={updateInvestorMutation.isPending}
            isEdit
          />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default InvestorManagementEditPage
