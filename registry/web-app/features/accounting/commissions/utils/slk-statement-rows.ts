import type { components } from '@/api/schema'

/** A pool entry (`sources.slk.ceo`) or a department-pool split row (`sources.slk.splits`).
 *  Both land in the same SLK line list on the manager statement.
 *
 *  The split row is `_DeptPoolSplitSource`, not an SLK-specific type: since CR 86eykq956 the
 *  backoffice bucket (`sources.backoffice.splits`) carries the same shape, so the backend
 *  serializer is shared between the two. */
type SlkSourceInfo =
  | components['schemas']['_SlkCeoSource']
  | components['schemas']['_DeptPoolSplitSource']

/** One flattened SLK line off `getMonthlySummaryLines` — the input this module reads. */
export type SlkStatementLine = {
  amount?: string | number | null
  source_info?: SlkSourceInfo
}

export type SlkStatementRow = {
  /** Raw source entry — the table still reads `department` / `position` off it. */
  info: SlkSourceInfo
  /** F2 source of the pool (`linked` | `company` | `director`); null on split rows. */
  sourceKey: string | null
  /** Whose pool, for DIRECTOR sources — several pools can pay the same person. */
  director: components['schemas']['_EmployeeRef'] | null
  /** Revenue of THIS pool. Null when the source does not carry one (split rows). */
  revenue: string | null
  pctOfPool: string | null
  amount: number
}

/**
 * One statement row per SLK source line.
 *
 * Deliberately a 1:1 map with no arithmetic: the BE emits one entry per source pool and
 * owns every number on the row (CR 86eykqk16). The previous version split a single line
 * into linked/company rows by revenue ratio, which silently produced "0 đ" revenue and no
 * percentage for money coming from a business-director pool — the only pool kind most
 * periods actually have.
 */
export function buildSlkStatementRows(lines: readonly SlkStatementLine[]): SlkStatementRow[] {
  return lines.map((line) => {
    const info = (line.source_info ?? {}) as SlkSourceInfo
    return {
      info,
      sourceKey: 'f2_source' in info ? (info.f2_source ?? null) : null,
      director: 'director' in info ? (info.director ?? null) : null,
      revenue: 'pool_revenue' in info ? (info.pool_revenue ?? null) : null,
      pctOfPool: info.pct_of_pool ?? null,
      amount: Number(line.amount || 0),
    }
  })
}

/** Σ of the rows — the section's "TỔNG NHÓM", which must equal `slk_total` on the card above. */
export function sumSlkStatementRows(rows: readonly SlkStatementRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
}
