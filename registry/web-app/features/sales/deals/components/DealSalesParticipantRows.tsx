import { FC } from 'react'
import DealSalesParticipantsPanel from '@/features/sales/deals/components/DealSalesParticipantsPanel'

type DealSalesParticipantRowsProps = {
  dealId: number
}

/** Full-width expanded row (for the deal list table) wrapping the participants panel. */
const DealSalesParticipantRows: FC<DealSalesParticipantRowsProps> = ({ dealId }) => (
  <tr>
    <td colSpan={30} className="bg-neutral-2 px-6 py-2">
      <DealSalesParticipantsPanel dealId={dealId} />
    </td>
  </tr>
)

export default DealSalesParticipantRows
