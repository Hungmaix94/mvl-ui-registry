import { useState, useEffect } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { TextField, Select } from '@/components/ui'
import { formatCurrencyVND } from '@/utils/common'
import { HOLD_REASON_OPTIONS } from '@/constants/commission'
type Props = {
  isOpen: boolean
  onClose: () => void
  recipientName: string
  amount: number | string
  loading?: boolean
  onConfirm: (reason: string, taxBase?: 'PRE_TAX' | 'POST_TAX') => void
  initialReason?: string
  initialTaxBase?: 'PRE_TAX' | 'POST_TAX'
  mode?: 'hold' | 'release' | 'cancel'
}

export function CommissionHoldDialog({
  isOpen,
  onClose,
  recipientName,
  amount,
  loading = false,
  onConfirm,
  initialReason = '',
  initialTaxBase = 'PRE_TAX',
  mode = 'hold',
}: Props) {
  const [reasonType, setReasonType] = useState('CARRYOVER')
  const [reasonDetail, setReasonDetail] = useState('')
  const [taxBase, setTaxBase] = useState<'PRE_TAX' | 'POST_TAX'>('PRE_TAX')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Find if initialReason matches any of our enum values
      const matched = HOLD_REASON_OPTIONS.find((opt) => opt.value === initialReason)
      if (matched) {
        setReasonType(initialReason)
        setReasonDetail('')
      } else {
        // If it's a custom text, set reasonType to OTHER and set details
        setReasonType(initialReason ? 'OTHER' : 'CARRYOVER')
        setReasonDetail(initialReason)
      }
      setTaxBase(initialTaxBase)
      setError('')
    }
  }, [isOpen, initialReason, initialTaxBase])

  const handleConfirm = () => {
    if (mode === 'hold' && reasonType === 'OTHER' && !reasonDetail.trim()) {
      setError('Vui lòng nhập chi tiết lý do')
      return
    }
    const finalReason =
      mode !== 'hold' ? reasonDetail : reasonType === 'OTHER' ? reasonDetail : reasonType
    onConfirm(finalReason, taxBase)
  }

  return (
    <AppDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={
        mode === 'release'
          ? `Mở tạm giữ hoa hồng · ${recipientName}`
          : mode === 'cancel'
            ? `Hủy tạm giữ hoa hồng · ${recipientName}`
            : `Tạm giữ hoa hồng · ${recipientName}`
      }
      variant="custom"
      isHideCancelButton={false}
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmText="Xác nhận"
      loading={loading}
      content={
        <div className="flex min-w-[400px] flex-col gap-4 py-4">
          <TextField
            label={
              mode === 'release'
                ? 'Số tiền mở tạm giữ (VND)'
                : mode === 'cancel'
                  ? 'Số tiền hủy tạm giữ (VND)'
                  : 'Số tiền tạm giữ (VND)'
            }
            value={amount != null ? formatCurrencyVND(Number(amount)) : ''}
            disabled
            suffix="VND"
          />

          {mode === 'hold' && (
            <>
              <Select
                label="Lý do tạm giữ"
                options={HOLD_REASON_OPTIONS}
                value={reasonType}
                onChange={(val) => {
                  setReasonType(val as string)
                  setError('')
                }}
              />

              {reasonType === 'OTHER' && (
                <TextField
                  label="Chi tiết lý do khác"
                  placeholder="Nhập chi tiết lý do..."
                  value={reasonDetail}
                  onChange={(val) => {
                    setReasonDetail(val)
                    if (val.trim()) {
                      setError('')
                    }
                  }}
                  error={error}
                  required
                />
              )}

              <Select
                label="Loại tạm giữ"
                options={[
                  { value: 'PRE_TAX', label: 'Tạm giữ trước thuế (giảm thu nhập tính thuế)' },
                  { value: 'POST_TAX', label: 'Tạm giữ sau thuế (khấu trừ vào thực nhận)' },
                ]}
                value={taxBase}
                onChange={(val) => setTaxBase(val as 'PRE_TAX' | 'POST_TAX')}
                clearable={false}
              />
            </>
          )}

          {mode !== 'hold' && (
            <TextField
              label="Ghi chú / Lý do"
              placeholder={
                mode === 'release' ? 'VD: Đã bổ sung CCMG...' : 'VD: Hủy do nhập nhầm...'
              }
              value={reasonDetail}
              onChange={(val) => setReasonDetail(val)}
            />
          )}
        </div>
      }
    />
  )
}
