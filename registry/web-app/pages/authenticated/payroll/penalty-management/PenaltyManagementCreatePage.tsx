import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PenaltyTicketForm } from '@/features/payroll/penalty-ticket'
import { APP_PATH } from '@/routes'
import { PageTitle } from '@/components/ui'
import { useAbility } from '@/lib/ability'

export default function PenaltyManagementCreatePage() {
  const navigate = useNavigate()
  const ability = useAbility()

  if (!ability.can('create', 'payroll.penalty_ticket')) {
    navigate(APP_PATH.UNAUTHORIZED)
    return null
  }

  return (
    <>
      <PageTitle enableBackButton title="Tạo mới phiếu phạt" />
      <Flex direction="column" gap="4" className="w-full">
        <PenaltyTicketForm onSuccess={() => navigate(APP_PATH.PENALTY_MANAGEMENT)} />
      </Flex>
    </>
  )
}
