import { useAbility } from '@/lib/ability'

/**
 * Returns per-tab view permission flags for SaleAllocationDetailPage.
 *
 * Permission codes are derived from the API schema (src/api/schema.ts).
 * Each flag maps to the minimum permission required to *see* that tab.
 *
 * | Tab value             | Permission checked                   |
 * |-----------------------|--------------------------------------|
 * | general               | sales_allocation.retrieve            |
 * | inventory             | product_inventory.list               |
 * | transactions          | deal.list                            |
 * | tbc                   | sa_tbc.list                          |
 * | f2                    | sa_tbc_f2.list                       |
 * | targets               | sa_tbc_management.list               |
 * | deposits              | sales_allocation.retrieve (fallback) |
 * */
export function useSaleAllocationTabPermissions() {
  const ability = useAbility()

  return {
    canViewGeneral: ability.can('retrieve', 'sales_allocation'),
    canViewInventory: ability.can('list', 'product_inventory'),
    canViewTransactions: ability.can('list', 'deal'),
    canViewTbc: ability.can('list', 'sa_tbc'),
    canViewF2: ability.can('list', 'sa_tbc_f2'),
    canViewTargets: ability.can('list', 'sa_tbc_management'),
    // Deposits tab has no dedicated permission yet — gate behind retrieve
    canViewDeposits: ability.can('retrieve', 'sales_allocation'),
    // LAD — Lô áp dụng (Điều chỉnh hoa hồng theo lô)
    canViewLad: ability.can('list', 'deal_commission_adjustment_batch'),
  } as const
}

/** Ordered list used to compute fallback tab navigation */
export const SA_TAB_ORDER = [
  { value: 'general', canViewKey: 'canViewGeneral' },
  { value: 'inventory', canViewKey: 'canViewInventory' },
  { value: 'tbc', canViewKey: 'canViewTbc' },
  { value: 'f2', canViewKey: 'canViewF2' },
  { value: 'targets', canViewKey: 'canViewTargets' },
  { value: 'deposits', canViewKey: 'canViewDeposits' },
  { value: 'transactions', canViewKey: 'canViewTransactions' },
  { value: 'lad', canViewKey: 'canViewLad' },
] as const satisfies ReadonlyArray<{
  value: string
  canViewKey: keyof ReturnType<typeof useSaleAllocationTabPermissions>
}>
