import { useCallback, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import InvestorDetailWrapper from '@/features/investor/view-details/InvestorDetailWrapper.tsx'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useInvestorDelete } from '@/features/investor/_shares/hooks/useInvestorDelete.tsx'
import { useInvestor } from '@/services/realestate-service.ts'
import { isNotFoundError } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

export const InvestorManagementDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: investorResponse, isLoading, error } = useInvestor(Number(id))
  const investor = investorResponse
  const investorName = useMemo(() => investor?.name || 'Chi tiết chủ đầu tư', [investor?.name])
  const navigate = useNavigate()
  const location = useLocation()
  const { openDeleteDialog } = useInvestorDelete(() => {
    // Preserve query params when navigating back after delete
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.INVESTOR_MANAGEMENT)
    }
  })
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !investor
  }, [isLoading, error, investor])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'investor')

  const handleEdit = useCallback(() => {
    if (id) {
      const path = APP_PATH.INVESTOR_MANAGEMENT_EDIT.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (investor) {
      openDeleteDialog(investor)
    }
  }, [openDeleteDialog, investor])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.INVESTOR_MANAGEMENT_HISTORY.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  return (
    <>
      <PageTitle
        title={investorName}
        handleEdit={ability.can('update', 'investor') ? handleEdit : undefined}
        enableBackButton={true}
        handleDelete={ability.can('destroy', 'investor') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'investor') ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasReadPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <InvestorDetailWrapper investor={investor!} />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default InvestorManagementDetailPage
