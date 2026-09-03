/* ────────────────────────────────────────────────────────────────
 * RateInput — ô nhập tỷ lệ (2 chế độ: % trực tiếp / Phân số)
 *
 * Port của mockup CommissionRateInput.jsx sang design system dự án:
 * dùng token Tailwind (neutral-*, data-*, action-primary-red-*), tái dùng
 * Tooltip + IconInfo/IconWarning, không hardcode hex/inline-style.
 *
 * Khác mockup: KHÔNG render khối preview "≈ X%". Giá trị tương đương vẫn
 * được tính và trả qua onChange (percent / fixedAmount) để lưu BE.
 *
 * Hợp đồng dữ liệu — drop-in cho FormController (nhận value/onChange/error):
 *   onChange(resolved: ResolvedRateValue)
 *   value: RateInputValue  (có thể là object resolved của lần lưu trước)
 *
 * Lưu ý: component khởi tạo state nội bộ TỪ `value` một lần khi mount
 * (uncontrolled-after-mount). Với màn edit/hydrate bất đồng bộ, hãy remount
 * bằng `key` (vd key={record.id + record.updated_at}) để nạp lại giá trị mới.
 * ──────────────────────────────────────────────────────────────── */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconInfo } from '@/assets/icons/security-warnings/IconInfo'
import { IconWarning } from '@/assets/icons/security-warnings/IconWarning'

export type RateInputMode = 'percent' | 'fraction'
export type RateInputUnit = '%' | 'đ'

/**
 * Hình dạng giá trị đầu vào. Mọi field optional để nhận cả object resolved của
 * lần lưu trước (ResolvedRateValue là superset hợp lệ của type này).
 */
export interface RateInputValue {
  mode?: RateInputMode
  directUnit?: RateInputUnit
  directAmount?: number | null
  numerator?: number | null
  denominator?: number | null
  base?: number | null
  baseUnit?: RateInputUnit
  percent?: number | null
  fixedAmount?: number | null
}

/** Giá trị resolved trả ra qua onChange — đầy đủ metadata để lưu BE. */
export interface ResolvedRateValue extends RateInputValue {
  valid: boolean
  error: string | null
  empty: boolean
  ready: boolean
}

export interface RateInputProps {
  label?: string
  tooltip?: string
  /** Dòng ghi chú nhỏ/nhạt dưới nhãn (cùng style FieldLabelWithNote). Truyền spacer ẩn để căn cao với field kế bên. */
  note?: React.ReactNode
  required?: boolean
  value?: RateInputValue
  onChange?: (resolved: ResolvedRateValue) => void
  /** Lỗi ngoài (vd từ RHF qua FormController) — ưu tiên hiển thị hơn lỗi nội bộ. */
  error?: string
  /** Chặn tử số > mẫu số (tỷ lệ không vượt 100%). */
  capAt100?: boolean
  readOnly?: boolean
  disabled?: boolean
  maxDenomDigits?: number
  /** Nội dung gắn ở CUỐI hàng input (vd công tắc VAT) — căn giữa theo chiều cao ô (h-10). */
  trailing?: React.ReactNode
  className?: string
}

/* ─── helpers (display-only, thuần) ─── */
const isPosInt = (s: string) => /^\d+$/.test(s) && parseInt(s, 10) >= 1

const groupThousands = (digits: string) =>
  !digits ? '' : digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const formatMoney = (n: number | null | undefined) =>
  n == null || isNaN(n) ? '—' : Math.round(n).toLocaleString('vi-VN')

const formatPercent = (n: number | null | undefined) =>
  n == null || isNaN(n)
    ? '—'
    : n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatPercent4 = (n: number | null | undefined) =>
  n == null || isNaN(n)
    ? '—'
    : n.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

/* ─── label + tooltip ─── */
interface FieldLabelProps {
  label?: string
  required?: boolean
  tooltip?: string
  htmlFor?: string
}

function FieldLabel({ label, required, tooltip, htmlFor }: FieldLabelProps) {
  // Spacer giữ layout justify-between (toggle dồn phải) khi không có label.
  if (!label) return <span />
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="typo-body-base-semibold text-neutral-90">
        {label}
        {required && <span className="text-action-primary-red-default ml-0.5">*</span>}
      </label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Giải thích: ${label}`}
              className="text-neutral-80 inline-flex cursor-help items-center focus:outline-none"
            >
              <IconInfo size={14} className="shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="max-w-[220px]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/* ─── segmented control (radiogroup, điều hướng bằng phím) ─── */
interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  disabled?: boolean
  /** 'embedded' = công tắc gắn TRONG ô input (full-height, không nền/viền/bo bao ngoài). */
  variant?: 'default' | 'embedded'
}

// Generic theo T extends string → onChange narrow đúng union ngay tại call site,
// không cần ép kiểu `as` (xem rule no-as-casting).
function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  variant = 'default',
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const idx = options.findIndex((o) => o.value === value)
  const embedded = variant === 'embedded'

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (idx - 1 + options.length) % options.length
    else return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex overflow-hidden',
        embedded
          ? 'border-neutral-60 shrink-0 self-stretch border-l'
          : 'border-neutral-60 bg-data-light-grey-default rounded border',
        disabled && 'opacity-60'
      )}
    >
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={disabled ? -1 : on ? 0 : -1}
            disabled={disabled}
            onClick={() => !disabled && onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center font-medium transition-colors',
              embedded ? 'w-9 text-sm' : 'min-w-8 px-2.5 py-1 text-xs',
              i > 0 && 'border-neutral-60 border-l',
              on
                ? 'bg-action-primary-red-default text-white'
                : 'text-neutral-80 hover:text-neutral-90',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── ô nhập số (mirror token container của TextField) ─── */
interface NumberCellProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  suffix?: string
  align?: 'left' | 'center' | 'right'
  invalid?: boolean
  disabled?: boolean
  widthClass?: string
  grow?: boolean
  inputMode?: 'numeric' | 'decimal' | 'text'
  /** Công tắc đơn vị [đ | %] gắn trong ô (thay cho suffix tĩnh) — look giống MoneyPercentInput. */
  unitToggle?: {
    value: RateInputUnit
    onChange: (unit: RateInputUnit) => void
    ariaLabel: string
  }
}

function NumberCell({
  value,
  onChange,
  ariaLabel,
  placeholder,
  suffix,
  align = 'left',
  invalid,
  disabled,
  widthClass,
  grow,
  inputMode = 'numeric',
  unitToggle,
}: NumberCellProps) {
  return (
    <div
      className={cn(
        'bg-data-light-grey-default relative flex h-10 items-center rounded border',
        'border-neutral-60 hover:border-neutral-80 focus-within:!border-neutral-100',
        // Có công tắc đơn vị: ghim mép phải (bỏ padding phải + dọc), bo góc clip nền đỏ.
        unitToggle ? 'overflow-hidden pl-3' : 'gap-2 px-3 py-2.5',
        invalid &&
          'border-data-red-default hover:border-data-red-default focus-within:!border-data-red-default',
        disabled &&
          'border-neutral-60 bg-data-light-grey-disabled hover:border-neutral-60 cursor-not-allowed',
        // grow: dùng w-full (KHÔNG flex-1) — cell nằm trong CellWithCaption (flex-col) nên flex-1 sẽ
        // bóp chiều cao theo trục dọc; w-full chỉ dãn bề ngang, giữ nguyên h-10.
        grow ? cn('w-full', widthClass) : widthClass
      )}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        inputMode={inputMode}
        disabled={disabled}
        className={cn(
          'min-w-0 flex-1 border-none bg-transparent text-sm font-medium outline-none',
          'placeholder:text-neutral-80 placeholder:font-normal',
          disabled
            ? 'text-content-dark-4 cursor-not-allowed'
            : value
              ? 'text-neutral-90'
              : 'text-neutral-80',
          align === 'right' && 'text-right',
          align === 'center' && 'text-center',
          unitToggle && 'pr-2'
        )}
      />
      {unitToggle ? (
        <Segmented
          variant="embedded"
          ariaLabel={unitToggle.ariaLabel}
          disabled={disabled}
          value={unitToggle.value}
          onChange={unitToggle.onChange}
          options={[
            { value: 'đ', label: 'đ' },
            { value: '%', label: '%' },
          ]}
        />
      ) : suffix ? (
        <span
          className={cn(
            'text-neutral-80 shrink-0 text-sm font-semibold',
            disabled && 'text-content-dark-4'
          )}
        >
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

/* ─── ô + caption nhỏ bên dưới ─── */
function CellWithCaption({
  caption,
  grow,
  children,
}: {
  caption?: string
  grow?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1', grow && 'min-w-[140px] flex-1')}>
      {children}
      {caption && (
        <span className="text-neutral-80 text-center text-[11px] tracking-wide">{caption}</span>
      )}
    </div>
  )
}

/* ════════════════════ component chính ════════════════════ */
export function RateInput({
  label = 'Tỷ lệ',
  tooltip,
  note,
  required,
  value,
  onChange,
  error,
  capAt100 = false,
  readOnly = false,
  disabled = false,
  maxDenomDigits = 4,
  trailing,
  className,
}: RateInputProps) {
  const v: RateInputValue = value ?? {}

  const initialDirectUnit: RateInputUnit =
    v.directUnit ?? (v.mode !== 'fraction' && v.fixedAmount != null ? 'đ' : '%')

  const [mode, setMode] = useState<RateInputMode>(v.mode ?? 'percent')
  const [directUnit, setDirectUnit] = useState<RateInputUnit>(initialDirectUnit)
  const [pct, setPct] = useState(
    v.mode !== 'fraction' && initialDirectUnit === '%' && v.percent != null ? String(v.percent) : ''
  )
  const [directAmt, setDirectAmt] = useState(
    v.directAmount != null
      ? String(v.directAmount)
      : v.mode !== 'fraction' && v.fixedAmount != null
        ? String(v.fixedAmount)
        : ''
  )
  const [num, setNum] = useState(v.numerator != null ? String(v.numerator) : '')
  const [den, setDen] = useState(v.denominator != null ? String(v.denominator) : '')
  const [baseUnit, setBaseUnit] = useState<RateInputUnit>(v.baseUnit ?? '%')
  const [base, setBase] = useState(v.base != null ? String(v.base) : '')

  /* ── sanitize đầu vào ── */
  // 3 chữ số thập phân, không phải 2: rate cụm F2 (HH sàn liên kết, thưởng F2, tỷ lệ
  // giữ giỏ hàng) lưu ở numeric(6,3) từ 12/08/2026. Cắt (không làm tròn) chữ số thứ 4
  // — cùng cách hành xử với bản 2dp trước đây.
  const handlePct = (s: string) => {
    const normalized = s.replace(/[^\d.,]/g, '').replace(',', '.')
    const m = normalized.match(/^(\d{0,3})(\.\d{0,3})?/)
    setPct(m ? m[0] : '')
  }
  const handleDirectAmt = (s: string) =>
    setDirectAmt(s.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, ''))
  const handleNum = (s: string) => setNum(s.replace(/[^\d]/g, '').slice(0, 4))
  const handleDen = (s: string) => setDen(s.replace(/[^\d]/g, '').slice(0, maxDenomDigits))
  const handleBase = (s: string) => {
    if (baseUnit === 'đ') {
      setBase(s.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, ''))
    } else {
      const normalized = s.replace(/[^\d.,]/g, '').replace(',', '.')
      const m = normalized.match(/^(\d{0,4})(\.\d{0,3})?/)
      setBase(m ? m[0] : '')
    }
  }
  const switchBaseUnit = (u: RateInputUnit) => {
    if (u === baseUnit) return
    setBase('')
    setBaseUnit(u)
  }

  /* ── tính resolved + validate ── */
  const resolved = useMemo<ResolvedRateValue>(() => {
    if (mode === 'percent') {
      if (directUnit === 'đ') {
        const a = directAmt === '' ? null : parseInt(directAmt, 10)
        return {
          mode,
          directUnit,
          directAmount: a,
          percent: null,
          fixedAmount: a,
          numerator: null,
          denominator: null,
          base: null,
          baseUnit,
          valid: true,
          error: null,
          empty: directAmt === '',
          ready: a != null,
        }
      }
      const parsedPct = parseFloat(pct)
      const p = pct === '' || Number.isNaN(parsedPct) ? null : parsedPct
      return {
        mode,
        directUnit,
        directAmount: null,
        percent: p,
        fixedAmount: null,
        numerator: null,
        denominator: null,
        base: null,
        baseUnit,
        valid: true,
        error: null,
        empty: pct === '',
        ready: p != null,
      }
    }

    // fraction
    const empty = num === '' && den === '' && base === ''
    let validationError: string | null = null
    if (!empty) {
      if (den === '' || /^0+$/.test(den)) validationError = 'Mẫu số phải lớn hơn 0'
      else if ((num !== '' && !isPosInt(num)) || !isPosInt(den))
        validationError = 'Chỉ nhập số nguyên'
      else if (base !== '' && parseFloat(base) < 0) validationError = 'Số gốc không hợp lệ'
      else if (capAt100 && num !== '' && parseInt(num, 10) > parseInt(den, 10))
        validationError = 'Tỷ lệ không vượt quá 100%'
    }

    const parsedBase = parseFloat(base)
    const n = num === '' ? null : parseInt(num, 10)
    const d = den === '' ? null : parseInt(den, 10)
    const b = base === '' || Number.isNaN(parsedBase) ? null : parsedBase

    // Tính trong điều kiện này để TS narrow n/d/b về number (không cast).
    let percent: number | null = null
    let fixedAmount: number | null = null
    if (!validationError && n != null && d != null && d >= 1 && b != null) {
      if (baseUnit === '%') percent = (n / d) * b
      else fixedAmount = (n / d) * b
    }
    const ready = percent != null || fixedAmount != null

    return {
      mode,
      directUnit,
      directAmount: null,
      numerator: n,
      denominator: d,
      base: b,
      baseUnit,
      percent,
      fixedAmount,
      valid: !validationError,
      error: validationError,
      empty,
      ready,
    }
  }, [mode, pct, directUnit, directAmt, num, den, base, baseUnit, capAt100])

  /* ── emit onChange sau render; bỏ qua lần mount để không đánh dấu form dirty ── */
  // Giữ onChange qua ref để effect chỉ phụ thuộc `resolved` — tránh chạy lại mỗi
  // khi form cha render đổi identity của field.onChange (RHF/FormController).
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const lastSent = useRef<string | null>(null)
  const didInit = useRef(false)
  useEffect(() => {
    const sig = JSON.stringify(resolved)
    if (!didInit.current) {
      didInit.current = true
      lastSent.current = sig
      return
    }
    if (sig !== lastSent.current) {
      lastSent.current = sig
      onChangeRef.current?.(resolved)
    }
  }, [resolved])

  /* ════ READ-ONLY: text gọn ════ */
  if (readOnly) {
    const isFraction = (value?.mode ?? mode) === 'fraction'
    let text: string
    if (isFraction && resolved.numerator != null && resolved.denominator != null) {
      const baseTxt =
        baseUnit === '%' ? `${formatPercent(resolved.base)}%` : `${formatMoney(resolved.base)} ₫`
      const tail =
        baseUnit === '%'
          ? resolved.percent != null
            ? ` (≈ ${formatPercent4(resolved.percent)}%)`
            : ''
          : resolved.fixedAmount != null
            ? ` (= ${formatMoney(resolved.fixedAmount)} ₫)`
            : ''
      text = `${resolved.numerator}/${resolved.denominator} của ${baseTxt}${tail}`
    } else if (resolved.fixedAmount != null) {
      text = `${formatMoney(resolved.fixedAmount)} ₫`
    } else {
      text = resolved.percent != null ? `${formatPercent(resolved.percent)} %` : '—'
    }

    return (
      <div className={cn('flex w-full flex-col gap-2', className)}>
        <FieldLabel label={label} required={required} tooltip={tooltip} />
        <div className="bg-background-3 border-border-1 text-neutral-90 inline-flex w-fit items-center gap-2 rounded border px-3 py-2 text-sm font-semibold">
          {text}
          <span className="text-neutral-80 rounded bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
            KHOÁ
          </span>
        </div>
      </div>
    )
  }

  const internalError = resolved.error
  const displayError = error ?? internalError ?? undefined
  const numInvalid =
    internalError === 'Chỉ nhập số nguyên' || internalError === 'Tỷ lệ không vượt quá 100%'
  const denInvalid =
    internalError === 'Mẫu số phải lớn hơn 0' ||
    internalError === 'Chỉ nhập số nguyên' ||
    internalError === 'Tỷ lệ không vượt quá 100%'

  return (
    <div
      className={cn('flex w-full flex-col gap-2', disabled && 'opacity-60', className)}
      aria-disabled={disabled || undefined}
    >
      {/* label + mode toggle (+ note phụ căn cao theo field kế bên) */}
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FieldLabel label={label} required={required} tooltip={tooltip} />
          <Segmented
            ariaLabel={`${label} — chế độ nhập`}
            disabled={disabled}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'percent', label: '%' },
              { value: 'fraction', label: 'Phân số' },
            ]}
          />
        </div>
        {note != null && (
          <span className="typo-body-sm-regular text-content-dark-3 font-normal">{note}</span>
        )}
      </div>

      {/* hàng input + trailing (vd công tắc VAT) — ô input dãn flex-1, trailing ghim cuối */}
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* MODE 1: % trực tiếp / số tiền cố định (₫) */}
          {mode === 'percent' && (
            <>
              {directUnit === 'đ' ? (
                <NumberCell
                  value={groupThousands(directAmt)}
                  onChange={handleDirectAmt}
                  ariaLabel={`${label} — số tiền`}
                  placeholder="Nhập số tiền"
                  align="right"
                  inputMode="numeric"
                  disabled={disabled}
                  grow
                  unitToggle={{
                    value: directUnit,
                    onChange: setDirectUnit,
                    ariaLabel: `${label} — đơn vị`,
                  }}
                />
              ) : (
                <NumberCell
                  value={pct}
                  onChange={handlePct}
                  ariaLabel={`${label} — phần trăm`}
                  placeholder="Nhập tỷ lệ"
                  align="right"
                  inputMode="decimal"
                  disabled={disabled}
                  grow
                  unitToggle={{
                    value: directUnit,
                    onChange: setDirectUnit,
                    ariaLabel: `${label} — đơn vị`,
                  }}
                />
              )}
            </>
          )}

          {/* MODE 2: phân số */}
          {mode === 'fraction' && (
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex items-start gap-2">
                <CellWithCaption>
                  <NumberCell
                    value={num}
                    onChange={handleNum}
                    ariaLabel={`${label} — tử số`}
                    placeholder="tử số"
                    widthClass="w-[88px]"
                    align="center"
                    invalid={numInvalid}
                    disabled={disabled}
                  />
                </CellWithCaption>
                <span className="text-neutral-80 pt-2 text-xl leading-none" aria-hidden="true">
                  /
                </span>
                <CellWithCaption>
                  <NumberCell
                    value={den}
                    onChange={handleDen}
                    ariaLabel={`${label} — mẫu số`}
                    placeholder="mẫu số"
                    widthClass="w-[88px]"
                    align="center"
                    invalid={denInvalid}
                    disabled={disabled}
                  />
                </CellWithCaption>
              </div>
              <span className="text-neutral-90 pt-2.5 text-sm">của</span>
              <CellWithCaption grow>
                <NumberCell
                  value={baseUnit === 'đ' ? groupThousands(base) : base}
                  onChange={handleBase}
                  ariaLabel={`${label} — số gốc`}
                  placeholder="số gốc"
                  align="right"
                  widthClass={baseUnit === 'đ' ? 'min-w-[200px]' : 'min-w-[160px]'}
                  inputMode={baseUnit === 'đ' ? 'numeric' : 'decimal'}
                  invalid={internalError === 'Số gốc không hợp lệ'}
                  disabled={disabled}
                  grow
                  unitToggle={{
                    value: baseUnit,
                    onChange: switchBaseUnit,
                    ariaLabel: `${label} — đơn vị số gốc`,
                  }}
                />
              </CellWithCaption>
            </div>
          )}
        </div>

        {trailing && <div className="flex h-10 shrink-0 items-center">{trailing}</div>}
      </div>

      {/* dòng lỗi */}
      {displayError && (
        <div
          role="alert"
          className="text-data-red-default flex items-center gap-1.5 text-xs font-medium"
        >
          <IconWarning size={14} className="shrink-0" />
          {displayError}
        </div>
      )}
    </div>
  )
}

export default RateInput
