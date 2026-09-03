export type LadUnit = 'pct' | 'amt'

interface LadUnitToggleProps {
  value: LadUnit
  onChange: (unit: LadUnit) => void
  disabled?: boolean
}

/** Segmented "% / đ" unit toggle — picks whether the config row writes pct_* or amt_*. */
export function LadUnitToggle({ value, onChange, disabled }: LadUnitToggleProps) {
  return (
    <div className="border-border-1 inline-flex overflow-hidden rounded-md border text-xs">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('pct')}
        className={`px-2.5 py-1 transition-colors disabled:opacity-50 ${
          value === 'pct'
            ? 'bg-content-dark-1 text-white'
            : 'text-content-dark-3 hover:bg-surface-secondary-2'
        }`}
      >
        %
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('amt')}
        className={`px-2.5 py-1 transition-colors disabled:opacity-50 ${
          value === 'amt'
            ? 'bg-content-dark-1 text-white'
            : 'text-content-dark-3 hover:bg-surface-secondary-2'
        }`}
      >
        đ
      </button>
    </div>
  )
}

export default LadUnitToggle
