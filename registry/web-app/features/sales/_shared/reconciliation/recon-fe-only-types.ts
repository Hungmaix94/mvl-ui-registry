// ⚠️ FE-ONLY FIELDS — keep in sync with schema regeneration.
// Re-checked against src/api/schema.ts 2026-06-03 (second regen):
//   - `bonus_to_sale`/`deduct_to_sale` ARE now persisted as `supplementary_to_sale_amount` /
//     `fee_deduction_to_sale_amount` on `InvestorReconciliationSheetItemRequest` (the form payload) →
//     MIGRATED out of this file into investor-reconciliation-sheet-create-schema.ts (Zod item +
//     createEmpty + toPayloadItems + WritableItem + writableItemToFormValues + mapSheetToFormValues).
//   - `neg_handling` (net-negative handling, V2) is still entirely absent from the schema → stays FE-only.
//
// `verified` is a pure UI marker ("Đã xác nhận đối chiếu") that never reaches any payload.
// When BE adds `neg_handling` anywhere: run `yarn api:generate`, move it to the Zod schema, then this
// file can hold only the `verified` UI marker (or be deleted if that gets lifted too). No `as any`.

/**
 * Net âm xử lý: hoàn tiền ngay | bù trừ kỳ sau (V2, FE-only).
 * NOTE: the mockup/spec names the 2nd value `carryover` (see `_docs/period-types-spec.md` §6); SRS/plan
 * call it `offset_next`. Kept as `offset_next` here for now — ALIGN with the final BE enum value when
 * `neg_handling` is added to the schema.
 */
export type ReconNegHandling = 'refund' | 'offset_next'

export type ReconLineFeOnly = {
  /** Xử lý net âm (FE-only, BE pending, V2). */
  neg_handling: ReconNegHandling | null
  /**
   * FE-only per-card REVIEW toggle ("Xác nhận đối chiếu") — local UI marker only.
   * This is NOT the BE confirm-deal lifecycle (that happens on saved rows in the detail/approval
   * views). It does not persist and never reaches the payload; it only lets the user visually mark a
   * căn as "checked" while filling the sheet.
   */
  verified: boolean
}

export function createEmptyReconLineFeOnly(): ReconLineFeOnly {
  return { neg_handling: null, verified: false }
}
