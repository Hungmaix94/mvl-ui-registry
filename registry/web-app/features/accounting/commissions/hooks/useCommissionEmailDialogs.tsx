import { useState } from 'react'
import { CommSummaryEmailDialog } from '../components/CommSummaryEmailDialog'
import { CommSummaryBulkEmailDialog } from '../components/CommSummaryBulkEmailDialog'
import type { MonthlySummaryRole } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'

type SingleTarget = { id: number; payeeName?: string }

/**
 * Wires the commission-statement email dialogs (single + bulk) into a role's summary table.
 *
 * Returns `openSingle`/`openBulk` to trigger the dialogs and a `dialogs` node the table mounts
 * once. Keeps every per-role table (sales, ctv, f2, management, hhql, employees) to a couple of
 * extra lines instead of duplicating the dialog wiring.
 */
export function useCommissionEmailDialogs(role: MonthlySummaryRole, onSent?: () => void) {
  const [single, setSingle] = useState<SingleTarget | null>(null)
  const [bulkIds, setBulkIds] = useState<number[] | null>(null)

  const openSingle = (target: SingleTarget) => setSingle(target)
  const openBulk = (ids: number[]) => setBulkIds(ids)

  const dialogs = (
    <>
      {single && (
        <CommSummaryEmailDialog
          isOpen={!!single}
          onClose={() => setSingle(null)}
          role={role}
          summaryId={single.id}
          payeeName={single.payeeName}
        />
      )}
      {bulkIds && (
        <CommSummaryBulkEmailDialog
          isOpen={!!bulkIds}
          onClose={() => setBulkIds(null)}
          role={role}
          ids={bulkIds}
          onSent={onSent}
        />
      )}
    </>
  )

  return { openSingle, openBulk, dialogs }
}
