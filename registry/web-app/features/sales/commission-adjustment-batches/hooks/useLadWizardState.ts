import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LAD_VIEW, LAD_STEP_COUNT, LAD_REVIEW_STEP, type LadView } from '../constants/lad-constants'

/**
 * Sub-view router for the LAD tab, driven entirely by URL search params so reload/share works
 * (the draft batch is persisted server-side; `batch_id` in the URL restores the wizard).
 *
 * Params (alongside the page's own `tab=lad`):
 *   - `lad_view`  : 'list' | 'create' | 'detail'   (default 'list')
 *   - `batch_id`  : number   (create/detail)
 *   - `lad_step`  : 1..LAD_REVIEW_STEP   (create only; review screen = LAD_REVIEW_STEP)
 *
 * All setters MERGE the existing params (never drop `tab=lad`).
 */
export interface LadWizardState {
  view: LadView
  batchId: number | null
  step: number
  goList: () => void
  goCreate: (batchId: number, step?: number) => void
  goDetail: (batchId: number) => void
  setStep: (step: number) => void
}

function clampStep(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 1
  if (raw > LAD_REVIEW_STEP) return LAD_REVIEW_STEP
  return Math.trunc(raw)
}

export function useLadWizardState(): LadWizardState {
  const [searchParams, setSearchParams] = useSearchParams()

  const view = useMemo<LadView>(() => {
    const raw = searchParams.get('lad_view')
    if (raw === LAD_VIEW.CREATE || raw === LAD_VIEW.DETAIL) return raw
    return LAD_VIEW.LIST
  }, [searchParams])

  const batchId = useMemo(() => {
    const raw = Number(searchParams.get('batch_id'))
    return Number.isFinite(raw) && raw > 0 ? raw : null
  }, [searchParams])

  const step = useMemo(() => clampStep(Number(searchParams.get('lad_step') ?? '1')), [searchParams])

  /** Merge updates onto the current params, always keeping `tab=lad`. */
  const apply = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams)
      next.set('tab', 'lad')
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams]
  )

  const goList = useCallback(
    () => apply({ lad_view: LAD_VIEW.LIST, batch_id: null, lad_step: null }),
    [apply]
  )

  const goCreate = useCallback(
    (id: number, stepArg = 1) =>
      apply({
        lad_view: LAD_VIEW.CREATE,
        batch_id: String(id),
        lad_step: String(clampStep(stepArg)),
      }),
    [apply]
  )

  const goDetail = useCallback(
    (id: number) => apply({ lad_view: LAD_VIEW.DETAIL, batch_id: String(id), lad_step: null }),
    [apply]
  )

  const setStep = useCallback(
    (stepArg: number) => apply({ lad_step: String(clampStep(stepArg)) }),
    [apply]
  )

  return { view, batchId, step, goList, goCreate, goDetail, setStep }
}

export { LAD_STEP_COUNT, LAD_REVIEW_STEP }
export default useLadWizardState
