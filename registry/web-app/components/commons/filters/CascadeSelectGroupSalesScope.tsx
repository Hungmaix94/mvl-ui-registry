import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import { PAGE_SIZE } from '@/constants/table'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useSourceExchangeSelect } from '@/hooks/useSourceExchangeSelect'
import { useSalesAllocationsDropdownSelect } from '@/hooks/useSalesAllocationsDropdownSelect'

/**
 * Real-estate scope filter group: Dự án, Nguồn hàng/CĐT, Thông tin bán hàng.
 *
 * Data model (SalesAllocation in the OpenAPI schema) holds TWO independent foreign
 * keys — `project` and `source_exchange` — so Dự án and Nguồn hàng are SIBLINGS,
 * not a parent→child chain. Thông tin bán hàng (sales allocation) is the shared
 * leaf, scoped by whichever parent(s) are set.
 *
 * Behaviour:
 *  - Dự án: independent, always enabled.
 *  - Nguồn hàng: independent, always enabled; its option list is narrowed by the
 *    chosen project when present (soft convenience via the dropdown's `project`
 *    param, never a hard gate) — so changing Dự án does NOT reset Nguồn hàng.
 *  - Thông tin bán hàng: enabled once AT LEAST ONE parent is set; narrowed by both;
 *    reset whenever either parent changes so it can never hold an out-of-scope value.
 *
 * Controlled component: the parent (typically a RHF filter form) owns the value and
 * receives the fully-resolved next state — including the reset — via onChange.
 * Companion to {@link ./CascadeSelectGroupOrganization} (a strict linear cascade).
 */

export type SalesScopeCascadeValue = {
  project?: number | null
  exchange?: number | null
  sales_allocation?: number | null
}

export type CascadeSelectGroupSalesScopeProps = {
  value: SalesScopeCascadeValue
  onChange: (next: SalesScopeCascadeValue) => void
  /** Render the Thông tin bán hàng (sales allocation) level. Default: true. */
  showSalesAllocation?: boolean
  disabled?: boolean
  className?: string
  labels?: {
    project?: string
    exchange?: string
    salesAllocation?: string
  }
}

const toId = (raw: number | null | undefined): number | undefined => {
  if (raw === null || raw === undefined) return undefined
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const toValue = (next: string | number | (string | number)[] | null): number | null => {
  if (next === null || next === undefined || Array.isArray(next)) return null
  const n = Number(next)
  return Number.isFinite(n) && n > 0 ? n : null
}

const CascadeSelectGroupSalesScope = ({
  value,
  onChange,
  showSalesAllocation = true,
  disabled = false,
  className,
  labels,
}: CascadeSelectGroupSalesScopeProps) => {
  const projectId = toId(value.project)
  const exchangeId = toId(value.exchange)
  const hasProject = !!projectId
  const hasExchange = !!exchangeId
  const canPickSalesAllocation = hasProject || hasExchange

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadSourceExchangeOptions, loadInitialSourceExchangeOptions } = useSourceExchangeSelect({
    project: hasProject ? projectId : undefined,
  })
  const { loadSalesAllocationsDropdownOptions, loadInitialSalesAllocationsDropdownOptions } =
    useSalesAllocationsDropdownSelect({
      project: hasProject ? projectId : undefined,
      exchange: hasExchange ? exchangeId : undefined,
    })

  // Dự án and Nguồn hàng are siblings — changing one does NOT reset the other, only
  // the shared leaf (Thông tin bán hàng), which may fall out of scope. Select's
  // single-select onChange fires only on a real user pick/clear, so URL-hydrated
  // values survive the initial mount.
  const handleProjectChange = (next: string | number | (string | number)[] | null) => {
    onChange({ ...value, project: toValue(next), sales_allocation: null })
  }
  const handleExchangeChange = (next: string | number | (string | number)[] | null) => {
    onChange({ ...value, exchange: toValue(next), sales_allocation: null })
  }
  const handleSalesAllocationChange = (next: string | number | (string | number)[] | null) => {
    onChange({ ...value, sales_allocation: toValue(next) })
  }

  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-start', className)}>
      <div className="min-w-0 flex-1">
        <Select
          label={labels?.project ?? 'Dự án'}
          placeholder="Chọn dự án"
          value={value.project ?? null}
          onChange={handleProjectChange}
          loadOptions={loadProjectOptions}
          loadInitialOptions={loadInitialProjectOptions}
          enableSearch
          searchPlaceholder="Tìm kiếm dự án..."
          pageSize={PAGE_SIZE}
          disabled={disabled}
        />
      </div>
      <div className="min-w-0 flex-1">
        <Select
          label={labels?.exchange ?? 'Nguồn hàng/CĐT'}
          placeholder="Chọn nguồn hàng/CĐT"
          value={value.exchange ?? null}
          onChange={handleExchangeChange}
          loadOptions={loadSourceExchangeOptions}
          loadInitialOptions={loadInitialSourceExchangeOptions}
          enableSearch
          searchPlaceholder="Tìm kiếm nguồn hàng..."
          pageSize={PAGE_SIZE}
          disabled={disabled}
        />
      </div>
      {showSalesAllocation && (
        <div className="min-w-0 flex-1">
          <Select
            label={labels?.salesAllocation ?? 'Thông tin bán hàng'}
            placeholder={
              canPickSalesAllocation ? 'Chọn thông tin bán hàng' : 'Chọn d.án, ng.hàng trước'
            }
            value={value.sales_allocation ?? null}
            onChange={handleSalesAllocationChange}
            loadOptions={loadSalesAllocationsDropdownOptions}
            loadInitialOptions={loadInitialSalesAllocationsDropdownOptions}
            enableSearch
            searchPlaceholder="Tìm kiếm thông tin bán hàng..."
            pageSize={PAGE_SIZE}
            disabled={disabled || !canPickSalesAllocation}
          />
        </div>
      )}
    </div>
  )
}

export default CascadeSelectGroupSalesScope
