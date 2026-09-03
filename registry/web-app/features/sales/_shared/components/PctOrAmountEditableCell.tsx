import { useEffect, useState, type ChangeEvent } from 'react'
import { Flex } from '@radix-ui/themes'

import { Button } from '@/components/ui'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconPen } from '@/assets/icons/design/IconPen'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { cn } from '@/utils'

type Mode = 'percent' | 'amount'

type Props = {
  pct: number | null
  amt: number | null
  feeCalculationPrice: number
  disabled?: boolean
  label?: string
  onConfirm: (next: { pct: number | null; amt: number | null }) => void
}

function deriveInitialMode(pct: number | null, amt: number | null): Mode {
  if (amt != null) return 'amount'
  if (pct != null) return 'percent'
  return 'amount'
}

function computePctFromAmt(amt: number, base: number) {
  if (!Number.isFinite(amt) || !Number.isFinite(base) || base <= 0) return 0
  return (amt / base) * 100
}

function computeAmtFromPct(pct: number, base: number) {
  if (!Number.isFinite(pct) || !Number.isFinite(base)) return 0
  return (base * pct) / 100
}

function formatPctValue(value: number) {
  if (!Number.isFinite(value)) return '0%'
  const rounded = Math.round(value * 100) / 100
  return formatPercent(rounded)
}

const PctOrAmountEditableCell = ({
  pct,
  amt,
  feeCalculationPrice,
  disabled,
  label = 'Phí đại lý (Chưa VAT)',
  onConfirm,
}: Props) => {
  const [open, setOpen] = useState(false)

  const displayPct =
    pct != null ? pct : amt != null ? computePctFromAmt(amt, feeCalculationPrice) : 0
  const displayAmt =
    amt != null ? amt : pct != null ? computeAmtFromPct(pct, feeCalculationPrice) : 0

  const [draftMode, setDraftMode] = useState<Mode>(() => deriveInitialMode(pct, amt))
  const [draftPct, setDraftPct] = useState<number>(pct ?? displayPct)
  const [draftAmt, setDraftAmt] = useState<number>(amt ?? displayAmt)

  useEffect(() => {
    if (!open) return
    const nextMode = deriveInitialMode(pct, amt)
    setDraftMode(nextMode)
    setDraftPct(pct ?? computePctFromAmt(amt ?? 0, feeCalculationPrice))
    setDraftAmt(amt ?? computeAmtFromPct(pct ?? 0, feeCalculationPrice))
  }, [open, pct, amt, feeCalculationPrice])

  const handleCancel = () => setOpen(false)

  const handleConfirm = () => {
    if (draftMode === 'amount') {
      onConfirm({ pct: null, amt: draftAmt })
    } else {
      onConfirm({ pct: draftPct, amt: null })
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Flex direction="column" gap="2" className="w-full">
        <Flex align="center" justify="between" gap="2" className="w-full">
          <span className="typo-body-sm-medium text-content-dark-3 text-nowrap">Tỷ lệ phí</span>
          <Flex align="center" gap="1">
            <span className="typo-body-sm-medium text-content-dark-1 text-right">
              {formatPctValue(displayPct)}
            </span>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'text-content-dark-3 hover:text-action-primary-red-default inline-flex cursor-pointer items-center justify-center rounded p-0.5 transition-colors',
                  disabled && 'hover:text-content-dark-3 cursor-not-allowed opacity-50'
                )}
                title={`Chỉnh sửa ${label}`}
                aria-label={`Chỉnh sửa ${label}`}
              >
                <IconPen size={14} />
              </button>
            </PopoverTrigger>
          </Flex>
        </Flex>
        <Flex align="center" justify="between" gap="2" className="w-full">
          <span className="typo-body-sm-medium text-content-dark-3 text-nowrap">Thành tiền</span>
          <span className="typo-body-sm-medium text-content-dark-1 text-right">
            {formatCurrencyVND(displayAmt, { maximumFractionDigits: 0 })}
          </span>
        </Flex>
      </Flex>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="bg-content-light-1 border-border-1 w-80"
      >
        <Flex direction="column" gap="3">
          <span className="typo-body-base-semibold text-content-dark-1">{label}</span>

          <Flex gap="2" className="border-border-1 rounded-sm border-[1px] p-1">
            {(
              [
                { value: 'amount', label: 'Số tiền (VND)' },
                { value: 'percent', label: 'Tỷ lệ (%)' },
              ] as const
            ).map((option) => {
              const active = draftMode === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraftMode(option.value)}
                  className={cn(
                    'typo-body-sm-medium flex-1 cursor-pointer rounded-sm px-3 py-1.5 transition-colors',
                    active
                      ? 'bg-action-primary-red-default text-content-light-1'
                      : 'bg-background-2 text-content-dark-2 hover:bg-background-3'
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </Flex>

          {draftMode === 'amount' ? (
            <Flex direction="column" gap="2">
              <FullCellNumberInput
                value={draftAmt}
                isHideSuffix
                suffix="vnd"
                min={0}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDraftAmt(e.target.value === '' ? 0 : Number(e.target.value))
                }
                inputWrapperClassName="border-border-1 rounded-sm border-[1px]"
              />
              <span className="typo-body-sm-regular text-content-dark-3">
                Tỷ lệ tương ứng:{' '}
                <span className="text-content-dark-1 font-medium">
                  {formatPctValue(computePctFromAmt(draftAmt, feeCalculationPrice))}
                </span>
              </span>
            </Flex>
          ) : (
            <Flex direction="column" gap="2">
              <FullCellNumberInput
                value={draftPct}
                suffix="%"
                min={0}
                max={100}
                paddingRight={0}
                spanSuffixPosition="right-0"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDraftPct(e.target.value === '' ? 0 : Number(e.target.value))
                }
                inputWrapperClassName="border-border-1 rounded-sm border-[1px] flex-1"
              />
              <span className="typo-body-sm-regular text-content-dark-3">
                Thành tiền tương ứng:{' '}
                <span className="text-content-dark-1 font-medium">
                  {formatCurrencyVND(computeAmtFromPct(draftPct, feeCalculationPrice), {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </span>
            </Flex>
          )}

          <Flex justify="end" gap="2">
            <Button variant="secondary-border" size="small" type="button" onClick={handleCancel}>
              Huỷ
            </Button>
            <Button variant="primary" size="small" type="button" onClick={handleConfirm}>
              Xác nhận
            </Button>
          </Flex>
        </Flex>
      </PopoverContent>
    </Popover>
  )
}

export default PctOrAmountEditableCell
