import type { RefObject } from 'react'

import type { F2ReconciliationSheet } from '@/features/sales/f2-reconciliations/types/f2-reconciliation'
import F2ReconciliationForm from './F2ReconciliationForm'

type Props = {
  data: F2ReconciliationSheet
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

/**
 * F2 reconciliation detail = `F2ReconciliationForm` in `view` mode (read-only sheet info + the
 * canonical card tree + per-line F2 actions). Kept as a thin wrapper so the detail page import is
 * unchanged while the rendering reuses the same component tree as the investor (CĐT) screens.
 */
const F2ReconciliationDetail = ({ data, scrollContainerRef }: Props) => (
  <F2ReconciliationForm mode="view" initialData={data} scrollContainerRef={scrollContainerRef} />
)

export default F2ReconciliationDetail
