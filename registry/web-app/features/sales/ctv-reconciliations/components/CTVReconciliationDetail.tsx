import type { RefObject } from 'react'

import type { CTVReconciliationSheet } from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'
import CTVReconciliationForm from './CTVReconciliationForm'

type Props = {
  data: CTVReconciliationSheet
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

/**
 * CTV reconciliation detail = `CTVReconciliationForm` in `view` mode (read-only sheet info + the
 * canonical card tree, single "MV ghi nhận" column). Thin wrapper so the detail page import is
 * unchanged while the rendering reuses the same component tree as the F2 / investor (CĐT) screens.
 */
const CTVReconciliationDetail = ({ data, scrollContainerRef }: Props) => (
  <CTVReconciliationForm mode="view" initialData={data} scrollContainerRef={scrollContainerRef} />
)

export default CTVReconciliationDetail
