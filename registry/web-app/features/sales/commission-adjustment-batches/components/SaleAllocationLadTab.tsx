import { LAD_VIEW } from '../constants/lad-constants'
import { useLadWizardState } from '../hooks/useLadWizardState'
import { LadBatchListView, type LadTabSlots } from './LadBatchListView'
import { LadWizardShell } from './wizard/LadWizardShell'
import { LadBatchDetailView } from './detail/LadBatchDetailView'

export type { LadTabSlots }

interface SaleAllocationLadTabProps {
  saleAllocationId: number
  /** No `create` permission ⇒ list/detail are view-only (no "Tạo lô", no edit affordances). */
  isReadOnly?: boolean
  /** Lift the list toolbar into the host PageTitle tab (project tabs pattern). */
  setTabSlots?: (slots: LadTabSlots | null) => void
}

/**
 * Entry component for the "Lô áp dụng" tab in the Sale Allocation detail page. Internally routes
 * between LIST / CREATE-wizard / DETAIL via {@link useLadWizardState} (URL search params), so the
 * whole feature lives inside one tab while staying reload/share-safe.
 */
export function SaleAllocationLadTab({
  saleAllocationId,
  isReadOnly,
  setTabSlots,
}: SaleAllocationLadTabProps) {
  const wizard = useLadWizardState()

  if (wizard.view === LAD_VIEW.CREATE && wizard.batchId) {
    return (
      <LadWizardShell
        saleAllocationId={saleAllocationId}
        batchId={wizard.batchId}
        step={wizard.step}
        onSetStep={wizard.setStep}
        onExitToList={wizard.goList}
        onApplied={wizard.goDetail}
      />
    )
  }

  if (wizard.view === LAD_VIEW.DETAIL && wizard.batchId) {
    return (
      <LadBatchDetailView
        batchId={wizard.batchId}
        isReadOnly={isReadOnly}
        onBackToList={wizard.goList}
        onContinueEdit={wizard.goCreate}
        onCloned={wizard.goCreate}
      />
    )
  }

  return (
    <LadBatchListView
      saleAllocationId={saleAllocationId}
      isReadOnly={isReadOnly}
      onOpenBatch={wizard.goDetail}
      onCreateBatch={wizard.goCreate}
      setTabSlots={setTabSlots}
    />
  )
}

export default SaleAllocationLadTab
