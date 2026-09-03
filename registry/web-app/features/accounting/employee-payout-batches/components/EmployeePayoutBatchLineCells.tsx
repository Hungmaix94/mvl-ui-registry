import { useCallback, useEffect, useState } from 'react'
import { FullCellNumberInput } from '@/components/commons'
import type { components } from '@/api/schema'
import type { PayoutBatchLinePatch } from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'

type EmployeeCommissionPayoutBatchLine = components['schemas']['EmployeeCommissionPayoutBatchLine']

/** Commit one field of a line. Rejects (and the cell reverts) when the BE refuses the edit. */
export type SaveLinePatch = (lineId: number, patch: PayoutBatchLinePatch) => Promise<void>

/**
 * Editable "Thực nhận" (net = disbursed amount) cell for DRAFT batches. Commits on blur only when
 * the value actually changed; reverts to the server value if the update is rejected (e.g. 409 when
 * the amount exceeds the wave's remaining available).
 *
 * The payee's bank details are edited elsewhere — through `EditPayoutLineBankDialog`, opened by the
 * row's pencil button (CR STT13). They stay out of the grid on purpose: the two fields are saved as
 * one PATCH behind an explicit Save.
 */
export function EditableNetCell({
  line,
  onSave,
}: {
  line: Pick<EmployeeCommissionPayoutBatchLine, 'id' | 'amount'>
  onSave: SaveLinePatch
}) {
  const serverNet = Number(line.amount || 0)
  const [value, setValue] = useState<string>(String(serverNet))
  const [isSaving, setIsSaving] = useState(false)

  // Re-sync when the batch is refetched after a save/recalculate.
  useEffect(() => {
    setValue(String(serverNet))
  }, [serverNet])

  const handleBlur = useCallback(async () => {
    const digits = value.replace(/\D/g, '')
    if (!digits || Number(digits) === serverNet) {
      setValue(String(serverNet))
      return
    }
    setIsSaving(true)
    try {
      await onSave(line.id, { amount: digits })
    } catch {
      setValue(String(serverNet))
    } finally {
      setIsSaving(false)
    }
  }, [value, serverNet, onSave, line.id])

  return (
    <FullCellNumberInput
      variant="editable"
      suffix="VNĐ"
      isHideSuffix
      min={0}
      value={value}
      disabled={isSaving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className="font-bold text-green-700"
    />
  )
}
