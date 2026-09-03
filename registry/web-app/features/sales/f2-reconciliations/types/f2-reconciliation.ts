import type { components } from '@/api/schema'

// Backend returns `product_inventory: number` (FK id) and
// `product_inventory_detail: ProductInventoryNested` on F2 reconciliation rows,
// but OpenAPI codegen mistypes both as `string`. Patch the types here so all
// consumers see the real runtime shape. Drop the override once schema.ts is
// regenerated from a corrected OpenAPI spec.
type RawF2Reconciliation = components['schemas']['F2Reconciliation']
type RawF2ReconciliationSheet = components['schemas']['F2ReconciliationSheet']

export type F2Reconciliation = Omit<
  RawF2Reconciliation,
  'product_inventory' | 'product_inventory_detail'
> & {
  readonly product_inventory: number
  readonly product_inventory_detail: components['schemas']['ProductInventoryNested']
}

/**
 * Dòng nhập tay (writable) BE echo lại trên sheet ở trạng thái draft — các số là chuỗi decimal API.
 * OpenAPI codegen KHÔNG khai báo field `items` này (chỉ có `reconciliations` read-only), nên ta bổ
 * sung vào type response để đọc trực tiếp `sheet.items` mà KHÔNG phải ép kiểu. Bỏ override khi
 * schema.ts được regen từ OpenAPI có `items`.
 */
export type F2ReconciliationSheetWritableItem = {
  readonly product_inventory_id: number
  readonly reconciliation_type?: RawF2Reconciliation['reconciliation_type']
  readonly fee_calculation_price?: string
  readonly pct_commission?: string
  readonly amt_agency_fee?: string | null
  readonly amt_payment_this_period?: string
  readonly shared_bonus_amount?: string
  readonly fee_deduction?: string
  readonly extra_bonus_pct?: string | null
  readonly extra_bonus_amount?: string | null
  readonly note?: string
}

export type F2ReconciliationSheet = Omit<RawF2ReconciliationSheet, 'reconciliations'> & {
  readonly reconciliations: F2Reconciliation[]
  readonly items?: F2ReconciliationSheetWritableItem[]
}
