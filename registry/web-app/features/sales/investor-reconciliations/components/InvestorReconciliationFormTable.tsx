import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { useFormContext } from 'react-hook-form'

import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { ReconServerComputed } from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import type { ReconCheck } from '@/features/sales/_shared/reconciliation/recon-server-check'

import type { ReconLineSaveState } from './InvestorReconciliationForm'
import type { useReconDealSelect } from '@/features/sales/_shared/reconciliation/useReconDealSelect'

import InvestorReconciliationLineCard from './InvestorReconciliationLineCard'

/** Deal-select surface lifted to InvestorReconciliationForm (shared deal cache). */
type ReconDealSelectApi = ReturnType<typeof useReconDealSelect>

type InvestorReconciliationFormTableProps = {
  fields: { id: string }[]
  watchedItems: InvestorReconciliationSheetCreateItemValues[]
  /** Per-row deal option loader factory (from the lifted useReconDealSelect). */
  getLoadDealOptionsByRow: ReconDealSelectApi['getLoadDealOptionsByRow']
  /** Edit/view-mode initial deal-option resolver (from the lifted useReconDealSelect). */
  loadInitialDealOptions: ReconDealSelectApi['loadInitialDealOptions']
  /** Resolve a cached deal by product_inventory_id (header chips + auto-fill + MV reference). */
  getSelectedDeal: ReconDealSelectApi['getSelectedDeal']
  isSubmitting?: boolean
  isMetaEnabled: boolean
  remove: (index: number) => void
  /** Per-căn draft autosave (sheet-first). Absent → no "Lưu căn" action shown. */
  onSaveLine?: (index: number) => void
  getLineSaveState?: (index: number) => ReconLineSaveState
  /** BE-computed totals + recon_check per product_inventory_id (saved cards). */
  serverComputedByProductId?: Record<number, ReconServerComputed>
  reconCheckByProductId?: Record<number, ReconCheck>
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  excludeInvestorSheetId?: number | null
}

const InvestorReconciliationFormTable = ({
  fields,
  watchedItems,
  getLoadDealOptionsByRow,
  loadInitialDealOptions,
  getSelectedDeal,
  isSubmitting,
  isMetaEnabled,
  remove,
  onSaveLine,
  getLineSaveState,
  serverComputedByProductId,
  reconCheckByProductId,
  scrollContainerRef,
  excludeInvestorSheetId,
}: InvestorReconciliationFormTableProps) => {
  const { setValue } = useFormContext<InvestorReconciliationSheetCreateValues>()

  // Latest items snapshot for the dedup getter (read at fetch time, not render time) so the per-row
  // option loaders stay stable across renders without re-triggering the Select.
  const watchedItemsRef = useRef(watchedItems)
  useEffect(() => {
    watchedItemsRef.current = watchedItems
  }, [watchedItems])

  const getExcludedProductInventoryIdsForRow = useCallback(
    (rowIndex: number) => (): Set<number> =>
      new Set<number>(
        watchedItemsRef.current
          .map((other, otherIndex) =>
            otherIndex === rowIndex ? undefined : Number(other?.product_inventory_id)
          )
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)
      ),
    []
  )

  /**
   * Auto-fill price + %HH from the selected deal (mirrors the old handleInventorySelect intent, now
   * sourced from the deal cache instead of a product-inventory fetch). The Select stores
   * `product_inventory_id`, so the payload field is unchanged.
   */
  const handleSelectDeal = useCallback(
    (rowIndex: number, productInventoryId: number | undefined) => {
      // Đổi căn ⇒ xoá input đợt này + tiến độ BE-readonly của căn cũ.
      setValue(`items.${rowIndex}.progress_from_pct`, null, { shouldDirty: true })
      setValue(`items.${rowIndex}.progress_to_pct`, null, { shouldDirty: true })
      setValue(`items.${rowIndex}.pct_period_commission`, null, { shouldDirty: true })
      setValue(`items.${rowIndex}.amt_period_commission`, null, { shouldDirty: true })
      setValue(`items.${rowIndex}.extra_bonus_progress_from_pct`, null, { shouldDirty: true })
      setValue(`items.${rowIndex}.extra_bonus_progress_to_pct`, null, { shouldDirty: true })

      if (!productInventoryId) {
        setValue(`items.${rowIndex}.fee_calculation_price`, null, { shouldDirty: true })
        setValue(
          `items.${rowIndex}.pct_agency_fee`,
          INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT,
          { shouldDirty: true }
        )
        setValue(`items.${rowIndex}.amt_agency_fee`, null, { shouldDirty: true })
        return
      }

      const deal = getSelectedDeal(productInventoryId)
      if (!deal) return // User can fill manually; cache may not yet hold an edit-mode resolved căn.

      if (deal.feeCalculationPrice != null) {
        setValue(`items.${rowIndex}.fee_calculation_price`, deal.feeCalculationPrice, {
          shouldDirty: true,
        })
      }
      if (deal.agencyFeeRate != null) {
        setValue(`items.${rowIndex}.pct_agency_fee`, deal.agencyFeeRate, { shouldDirty: true })
        setValue(`items.${rowIndex}.amt_agency_fee`, null, { shouldDirty: true })
      }
    },
    [getSelectedDeal, setValue]
  )

  // Every card is removable now (no forced blank record) — removing the last one shows the
  // empty-state placeholder below.
  const canRemove = fields.length > 0

  return (
    <div className="space-y-4">
      <div ref={scrollContainerRef} className="space-y-4">
        {fields.length === 0 && (
          <div className="border-border-1 rounded-md border border-dashed p-8 text-center">
            <span className="typo-body-sm-regular text-content-dark-3">
              Chưa có căn nào trong phiếu. Bấm “+ Thêm căn” để thêm căn.
            </span>
          </div>
        )}
        {fields.map((field, index) => {
          const item = watchedItems[index]
          // `fields` (useFieldArray) and `watchedItems` (useWatch) desync for one render right after
          // append/remove — skip this index until the watched value catches up, so no child ever
          // receives an undefined item.
          if (!item) return null
          const inventoryId = item?.product_inventory_id

          return (
            <InvestorReconciliationLineCard
              key={field.id}
              index={index}
              item={item}
              selectedDeal={getSelectedDeal(inventoryId)}
              isSubmitting={isSubmitting}
              isMetaEnabled={isMetaEnabled}
              loadDealOptions={getLoadDealOptionsByRow(getExcludedProductInventoryIdsForRow(index))}
              loadInitialDealOptions={loadInitialDealOptions}
              onSelectDeal={handleSelectDeal}
              onRemove={() => remove(index)}
              canRemove={canRemove}
              onSave={onSaveLine ? () => onSaveLine(index) : undefined}
              saveState={getLineSaveState?.(index)}
              serverComputed={
                Number(inventoryId) > 0
                  ? serverComputedByProductId?.[Number(inventoryId)]
                  : undefined
              }
              reconCheck={
                Number(inventoryId) > 0 ? reconCheckByProductId?.[Number(inventoryId)] : undefined
              }
              excludeInvestorSheetId={excludeInvestorSheetId}
            />
          )
        })}
      </div>
    </div>
  )
}

export default InvestorReconciliationFormTable
