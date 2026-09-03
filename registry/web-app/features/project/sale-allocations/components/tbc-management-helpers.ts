import { TBCManagementRateCategory, TBCManagementRateRole } from '@/api/schema'
import { MANAGEMENT_ROLES, TbcManagementRateValues } from './SaleAllocationTbcManagementForm'
import { formatCurrencyVND, formatPercent } from '@/utils'

export type RateColumn = {
  category: TBCManagementRateCategory
  label: string
  pctOnly: boolean
  hidden?: boolean
}

export const RATE_COLUMNS: RateColumn[] = [
  {
    category: TBCManagementRateCategory.agency_fee,
    label: 'Thưởng quản lý',
    pctOnly: true,
  },
  {
    category: TBCManagementRateCategory.project_bonus,
    label: 'Hoa hồng bổ sung (theo dự án) (%)',
    pctOnly: true,
    hidden: true,
  },
  {
    category: TBCManagementRateCategory.investor_bonus,
    label: 'Thưởng quản lý từ CDT',
    pctOnly: false,
  },
  {
    category: TBCManagementRateCategory.mv_bonus,
    label: 'Thưởng quản lý bổ sung',
    pctOnly: false,
  },
]

// Index of a (role, category) cell in the flat rates[] array.
export const cellIndex = (roleIdx: number, catIdx: number) => roleIdx * RATE_COLUMNS.length + catIdx

type IncomingRate = {
  role?: string | TBCManagementRateRole | null
  category?: string | TBCManagementRateCategory | null
  pct?: string | number | null
  amt?: string | number | null
  pct_role_total?: string | number | null
}

const toNum = (v: string | number | null | undefined): number | null => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isNaN(n) ? null : n
}

// Build a fully-seeded rates array (7 × 4 = 28 cells) from an optional API list.
export function seedRates(existing?: IncomingRate[] | null): TbcManagementRateValues[] {
  const result: TbcManagementRateValues[] = []
  for (const role of MANAGEMENT_ROLES) {
    for (const col of RATE_COLUMNS) {
      result.push({
        role: role.value,
        category: col.category,
        pct: null,
        amt: null,
        pct_role_total: null,
      })
    }
  }
  if (!existing) return result
  for (const item of existing) {
    const idx = result.findIndex((r) => r.role === item.role && r.category === item.category)
    if (idx >= 0) {
      const parsedPct = toNum(item.pct)
      result[idx].pct = parsedPct != null ? Number(parsedPct.toFixed(3)) : null
      result[idx].amt = toNum(item.amt)
      const parsedRoleTotal = toNum(item.pct_role_total)
      result[idx].pct_role_total =
        parsedRoleTotal != null ? Number(parsedRoleTotal.toFixed(3)) : null
    }
  }
  return result
}

// Strip empty rows and stringify numbers for the API payload.
export function serializeRatesForApi(rates: TbcManagementRateValues[]) {
  return rates
    .filter((r) => r.pct != null || r.amt != null)
    .map((r) => ({
      role: r.role,
      category: r.category,
      pct: r.pct != null ? String(Number(Number(r.pct).toFixed(3))) : null,
      amt: r.amt != null ? String(r.amt) : null,
      pct_role_total:
        r.pct_role_total != null ? String(Number(Number(r.pct_role_total).toFixed(3))) : null,
    }))
}

// Look up a single (role, category) pair from rates[] for display purposes.
export function findRate(
  rates: IncomingRate[] | null | undefined,
  role: TBCManagementRateRole,
  category: TBCManagementRateCategory
): { pct: number | null; amt: number | null; pctRoleTotal: number | null } {
  if (!rates) return { pct: null, amt: null, pctRoleTotal: null }
  const item = rates.find((r) => r.role === role && r.category === category)
  if (!item) return { pct: null, amt: null, pctRoleTotal: null }
  const parsedPct = toNum(item.pct)
  const parsedRoleTotal = toNum(item.pct_role_total)
  return {
    pct: parsedPct != null ? Number(parsedPct.toFixed(3)) : null,
    amt: toNum(item.amt),
    pctRoleTotal: parsedRoleTotal != null ? Number(parsedRoleTotal.toFixed(3)) : null,
  }
}

export function formatPctAmt(
  pct: number | null,
  amt: number | null,
  pctRoleTotal?: number | null
): string {
  const parts: string[] = []
  if (pct != null) parts.push(formatPercent(pct))
  if (amt != null) parts.push(`${formatCurrencyVND(amt)} VNĐ`)
  if (parts.length === 0) return '-'
  const base = parts.join(' / ')
  // Department carve (project secretary): show total + derived department slice.
  if (pctRoleTotal != null && pct != null) {
    const deptPct = Number((pctRoleTotal - pct).toFixed(3))
    return `${base} (Tổng: ${formatPercent(pctRoleTotal)} · Phòng: ${formatPercent(deptPct)})`
  }
  return base
}
