import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PenaltyTicketForm } from '@/features/payroll/penalty-ticket'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { usePenaltyTicket } from '@/features/payroll/services/penalty-ticket-service'
import { PageTitle } from '@/components/ui'
import { usePenaltyManagementDetail } from '@/hooks/usePenaltyManagementDetail.ts'

export default function PenaltyManagementEditPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const { penaltyTicket, penaltyTicketId } = usePenaltyManagementDetail()

  if (!ability.can('update', 'payroll.penalty_ticket')) {
    navigate(APP_PATH.UNAUTHORIZED)
    return null
  }

  const { data } = usePenaltyTicket(penaltyTicketId, { enabled: !!penaltyTicketId })
  if (!data) return null

  return (
    <>
      <PageTitle idLabel={penaltyTicket?.code} enableBackButton title="Chỉnh sửa" />
      <Flex direction="column" gap="4" className="w-full">
        <PenaltyTicketForm
          initialData={data}
          onSuccess={() => navigate(APP_PATH.PENALTY_MANAGEMENT)}
        />
      </Flex>
    </>
  )
}
