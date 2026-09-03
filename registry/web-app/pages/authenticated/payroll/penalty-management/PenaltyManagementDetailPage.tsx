import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PenaltyTicketDetail } from '@/features/payroll/penalty-ticket'
import usePenaltyTicketDelete from '@/features/payroll/penalty-ticket/_shares/hooks/usePenaltyTicketDelete'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { PageTitle } from '@/components/ui'
import { usePenaltyManagementDetail } from '@/hooks/usePenaltyManagementDetail.ts'
import { useCallback, useMemo } from 'react'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

export default function PenaltyManagementDetailPage() {
  const navigate = useNavigate()
  const { openDeleteDialog } = usePenaltyTicketDelete()
  const { penaltyTicket, isLoading, isNotFound, isError, penaltyTicketId } =
    usePenaltyManagementDetail()
  const ability = useAbility()

  // Check for invalid ID
  const isInvalidId = !penaltyTicketId || Number.isNaN(penaltyTicketId)

  const handleEdit = useCallback(
    () => navigate(APP_PATH.PENALTY_MANAGEMENT_EDIT.replace(':id', penaltyTicketId.toString())),
    [navigate, penaltyTicketId]
  )

  const handleDelete = useCallback(() => {
    if (penaltyTicket) {
      openDeleteDialog(penaltyTicket)
    }
  }, [openDeleteDialog, penaltyTicket])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.PENALTY_MANAGEMENT_HISTORY.replace(':id', penaltyTicketId.toString())
    navigate(path)
  }, [navigate, penaltyTicketId])

  const isUnpaid = useMemo(
    () => penaltyTicket?.status === PenaltyTicketStatus.UNPAID,
    [penaltyTicket?.status]
  )

  return (
    <>
      <PageTitle
        idLabel={penaltyTicket?.code}
        enableBackButton
        title={penaltyTicket?.code}
        handleEdit={
          ability.can('update', 'payroll.penalty_ticket') && isUnpaid ? handleEdit : undefined
        }
        handleDelete={
          ability.can('destroy', 'payroll.penalty_ticket') && isUnpaid ? handleDelete : undefined
        }
        handleShowHistory={
          ability.can('histories', 'payroll.penalty_ticket') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound || isInvalidId}
        isError={isError}
        hasPermission={ability.can('retrieve', 'payroll.penalty_ticket')}
      >
        {penaltyTicket && (
          <Flex direction="column" gap="4" className="w-full">
            <PenaltyTicketDetail ticket={penaltyTicket} />
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}
