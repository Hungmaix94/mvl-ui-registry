import type { components } from '@/api/schema'

// Backend returns `product_inventory: number` (FK id) and
// `product_inventory_detail: ProductInventoryNested` on CTV reconciliation
// rows, but OpenAPI codegen mistypes both as `string`. Patch the types here so
// all consumers see the real runtime shape. Drop the override once schema.ts
// is regenerated from a corrected OpenAPI spec.
type RawCTVReconciliation = components['schemas']['CTVReconciliation']

export type CTVReconciliation = Omit<
  RawCTVReconciliation,
  'product_inventory' | 'product_inventory_detail'
> & {
  readonly product_inventory: number
  readonly product_inventory_detail: components['schemas']['ProductInventoryNested']
}

export type CTVReconciliationList = components['schemas']['CTVReconciliationList']
export type CTVReconciliationRequest = components['schemas']['CTVReconciliationRequest']
export type PatchedCTVReconciliationRequest =
  components['schemas']['PatchedCTVReconciliationRequest']
