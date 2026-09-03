import { formatCurrencyVND, formatRatePct } from '@/utils/common'
import {
  formatRateSpecEquivalent,
  formatRateSpecFraction,
  resolveRateTriple,
} from '@/utils/rate-spec'
import { F2_CATEGORIES, type F2Record } from './f2-constants'
import { F2VatBadge } from './F2VatBadge'

type F2CategoryMetricsGridProps = {
  record: F2Record | null | undefined
  compact?: boolean
}

export function F2CategoryMetricsGrid({ record, compact = false }: F2CategoryMetricsGridProps) {
  return (
    <div
      className={
        compact
          ? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
          : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
      }
    >
      {F2_CATEGORIES.map((cat) => {
        const rawPct = record?.[`pct_${cat.key}`] as string | number | null | undefined
        const rawAmt = record?.[`amt_${cat.key}`] as string | number | null | undefined
        const includeVat = cat.hasVat
          ? (record?.[`is_${cat.key}_include_vat`] as boolean | null | undefined)
          : null
        const spec = cat.key === 'f2_commission' ? record?.f2_commission_spec : null
        const fractionText = formatRateSpecFraction(spec)
        const fractionEquivalent = formatRateSpecEquivalent(spec)
        const resolved = spec ? resolveRateTriple(spec, rawPct, rawAmt) : null
        const pct = resolved ? resolved.pct : rawPct
        const amt = resolved ? resolved.amt : rawAmt
        const hasValue = fractionText != null || pct != null || amt != null

        return (
          <div
            key={cat.key}
            className="border-border-1 bg-background-2 flex h-full flex-col justify-between gap-2 rounded-lg border p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="text-content-dark-3 text-[11px] font-medium tracking-wide uppercase"
                title={cat.label}
              >
                {cat.label}
              </span>
              {cat.hasVat && hasValue && <F2VatBadge includeVat={includeVat === true} />}
            </div>
            <span
              className={
                compact
                  ? 'text-content-dark-1 text-sm font-semibold'
                  : 'text-content-dark-1 text-base font-semibold'
              }
            >
              {!hasValue ? (
                <span className="text-content-dark-3">—</span>
              ) : fractionText ? (
                <>
                  {fractionText}
                  {fractionEquivalent && (
                    <span className="text-content-dark-4 ml-1 text-xs font-normal">
                      ≈ {fractionEquivalent}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {amt != null ? `${formatCurrencyVND(Number(amt))} đ` : ''}
                  {pct != null && amt != null && amt !== '' && pct !== '' ? ' / ' : ''}
                  {pct != null ? formatRatePct(pct) : ''}
                </>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
