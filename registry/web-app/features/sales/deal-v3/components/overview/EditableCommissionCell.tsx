import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PenLine, Info } from 'lucide-react'
import {
  useOverrideShareRate,
  useClearShareRate,
} from '@/features/sales/deals/services/deal-service'
import type {
  CommissionSectionType,
  OverrideShareRateRequest,
} from '@/features/sales/deals/services/deal-service'
import { CurrencyInput, Button, TextArea, TextField } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import toastService from '@/services/toast-service'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { extractErrorMessage } from '@/utils/error-utils'
import { getRoleKind } from './DealSplitSection'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { CreateShareRequestRecipient_kind } from '@/api/schema'
import { cleanDecimalString } from '@/features/sales/deal-v3/utils/commission-recipient'
import { cn } from '@/utils'
import {
  getResetToPolicyButtonState,
  RESET_TO_POLICY_LABEL,
} from '@/features/sales/deal-v3/utils/commission-reset-policy'
import {
  formatRateSpecEquivalent,
  formatRateSpecFraction,
  fromRateSpec,
  toRateSpecPayload,
} from '@/utils/rate-spec'
import { RateInput, type ResolvedRateValue } from '@/components/ui/rate-input'
import { RateSpecMode } from '@/api/schema'
import {
  CommissionShare,
  CommissionRecipient,
  formatPct,
  formatAmt,
  getValidShareId,
  alignPctType,
  resolveRecipientFromShare,
  deriveComputedField,
  validateNumeric,
  DisplayValue,
} from './EditableCommissionCell.utils'

interface EditableCommissionCellProps {
  share: CommissionShare
  field: 'percentage' | 'fixed_amount' | 'contribution_percentage'
  dealId: number
  section: CommissionSectionType
  label?: string
  readonly?: boolean
  isCreate?: boolean
  pctType?: string
  recipientKind?: 'employee' | 'collaborator' | 'exchange' | 'department' | 'position'
  recipientId?: string | number
  recipientInfo?: CommissionRecipient
  recipientSubtitle?: string
  pctOnly?: boolean
  // Cho phép nhập theo phân số (RateInput: %, ₫, hoặc x/y của z). Chỉ bật cho ô
  // "Phí HH trả sale" (tên cũ "HH cơ bản") — kênh spec được BE tính tiền qua
  // resolve_amount() và lưu rate_spec.
  allowFraction?: boolean
}

export const EditableCommissionCell: React.FC<EditableCommissionCellProps> = ({
  share,
  field,
  dealId,
  section,
  label,
  readonly = false,
  isCreate = false,
  pctType,
  recipientKind,
  recipientId,
  recipientInfo,
  recipientSubtitle,
  pctOnly,
  allowFraction = false,
}) => {
  const calcAmt = share.calculated_amount ?? share.amount
  const absCalculatedAmount = calcAmt != null && calcAmt !== '' ? Math.abs(Number(calcAmt)) : null
  const pctVal = share.percentage ?? share.rate
  const amtVal = share.fixed_amount ?? absCalculatedAmount

  const pctIsZeroOrEmpty =
    pctVal == null ||
    pctVal === '' ||
    (Number(pctVal) === 0 && absCalculatedAmount != null && absCalculatedAmount > 0)
  const amtIsZeroOrEmpty = amtVal == null || amtVal === ''

  const hasPct = !pctIsZeroOrEmpty || (share.is_custom_override && amtIsZeroOrEmpty)
  const hasAmt = !amtIsZeroOrEmpty || (share.is_custom_override && pctIsZeroOrEmpty)
  const hasContrib =
    share.contribution_percentage != null &&
    share.contribution_percentage !== '' &&
    (Number(share.contribution_percentage) !== 0 || share.is_custom_override)

  const displayPct = hasPct ? formatPct(pctVal) : '—'
  const displayAmt = hasAmt ? formatAmt(amtVal) : '—'
  const displayContrib = hasContrib ? formatPct(share.contribution_percentage) : '—'
  // Khi tỷ lệ là phân số (F2 = 1/3 của 6%…), giữ "x / y của z" làm giá trị chính; % dẫn xuất
  // (`displayPct`, đã có sẵn từ cache `rate`) tụt xuống dòng mờ "≈ …".
  const fractionText = formatRateSpecFraction(share.rate_spec)
  const fractionEquivalent = formatRateSpecEquivalent(share.rate_spec)

  const currentPctType = share.pct_type || pctType
  const isPctOnlyCategory = pctOnly
  const computedField = deriveComputedField(field, share, pctType, pctOnly, hasPct, hasAmt)

  const [isOpen, setIsOpen] = useState(false)
  const [editField, setEditField] = useState<
    'percentage' | 'fixed_amount' | 'contribution_percentage'
  >(computedField)
  const [valPct, setValPct] = useState<string>(String(share.percentage ?? ''))
  const { keysMap: salesKeysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND_CHOICES],
  })

  const [valAmt, setValAmt] = useState<string | number>(
    share.fixed_amount ?? absCalculatedAmount ?? ''
  )
  const [valContrib, setValContrib] = useState<string>(String(share.contribution_percentage ?? ''))
  // Chế độ phân số: seed RateInput từ spec (nguồn sự thật) hoặc cache pct/amt.
  const rateSeed = allowFraction
    ? fromRateSpec(share.rate_spec, share.percentage, share.fixed_amount)
    : null
  const [rateValue, setRateValue] = useState<ResolvedRateValue | null>(rateSeed)
  const [reason, setReason] = useState('')
  const [resetReason, setResetReason] = useState('')
  const [fileTokens, setFileTokens] = useState<string[]>([])
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useOverrideShareRate()
  const clearMutation = useClearShareRate()

  const resetToPolicyState = getResetToPolicyButtonState({
    isCustomOverride: share.is_custom_override,
    isPending: clearMutation.isPending || mutation.isPending,
  })

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setEditField(computedField)
      setValPct(String(share.percentage ?? ''))
      setValAmt(share.fixed_amount ?? absCalculatedAmount ?? '')
      setValContrib(String(share.contribution_percentage ?? ''))
      setRateValue(
        allowFraction ? fromRateSpec(share.rate_spec, share.percentage, share.fixed_amount) : null
      )
      setReason('')
      setResetReason('')
      setShowResetConfirm(false)
      setFileTokens([])
    }
  }, [isOpen, share, computedField, absCalculatedAmount, allowFraction])

  const buildValuePayload = (): Record<string, unknown> => {
    if (allowFraction) {
      // Phân số → gửi rate_spec (BE tính tiền qua resolve_amount, lưu spec).
      // % trực tiếp → gửi percentage phẳng; ₫ trực tiếp → fixed_amount. Luôn
      // xoá các kênh còn lại để giữ ràng buộc XOR của BE.
      const parts = toRateSpecPayload(rateValue)
      if (parts.spec && parts.spec.mode === RateSpecMode.fraction) {
        return { rate_spec: parts.spec, percentage: null, fixed_amount: null }
      }
      if (parts.amt != null) {
        return { fixed_amount: String(parts.amt), percentage: null, rate_spec: null }
      }
      const pct = rateValue?.percent
      return { percentage: pct != null ? String(pct) : null, fixed_amount: null, rate_spec: null }
    }
    if (editField === 'percentage') {
      const parsedPct = valPct ? String(valPct).replace(',', '.') : null
      return {
        percentage: parsedPct || null,
        fixed_amount: null,
      }
    }
    if (editField === 'fixed_amount') {
      return {
        fixed_amount: valAmt || null,
        percentage: null,
      }
    }
    const parsedContrib = valContrib ? String(valContrib).replace(',', '.') : null
    return { contribution_percentage: parsedContrib || null }
  }

  const buildRecipientPayload = (): Record<string, unknown> => {
    if (isCreate) {
      return {
        recipient_kind: recipientKind,
        recipient_id: Number(recipientId),
      }
    }
    const recipient = resolveRecipientFromShare(share)
    return recipient ? { recipient_kind: recipient.kind, recipient_id: recipient.id } : {}
  }

  const handleSave = async () => {
    if (allowFraction) {
      if (!rateValue || rateValue.empty || !rateValue.ready || rateValue.error) {
        toastService.error(rateValue?.error || 'Vui lòng nhập tỷ lệ hợp lệ')
        return
      }
    } else if (editField === 'percentage') {
      if (
        !validateNumeric(
          valPct,
          {
            empty: 'Vui lòng nhập tỷ lệ %',
            invalid: 'Tỷ lệ % không hợp lệ',
            negative: 'Tỷ lệ % không được âm',
            max: 'Tỷ lệ % không được vượt quá 100%',
          },
          true
        )
      )
        return
    } else if (editField === 'contribution_percentage') {
      if (
        !validateNumeric(
          valContrib,
          {
            empty: 'Vui lòng nhập mức độ đóng góp',
            invalid: 'Mức độ đóng góp không hợp lệ',
            negative: 'Mức độ đóng góp không được âm',
            max: 'Mức độ đóng góp không được vượt quá 100%',
          },
          true
        )
      )
        return
    } else if (editField === 'fixed_amount') {
      if (
        !validateNumeric(
          valAmt,
          {
            empty: 'Vui lòng nhập số tiền cố định',
            invalid: 'Số tiền cố định không hợp lệ',
            negative: 'Số tiền cố định không được âm',
          },
          false
        )
      )
        return
    }

    if (!reason.trim()) {
      toastService.error('Vui lòng nhập lý do sửa')
      return
    }

    try {
      const validShareId = getValidShareId(share)
      const useExistingShare = validShareId !== null && !isCreate

      const alignedPctType = alignPctType(currentPctType, editField)
      const sharePayload = useExistingShare
        ? {
            share_id: validShareId,
            ...(alignedPctType ? { pct_type: alignedPctType } : {}),
          }
        : {
            share_id: 0,
            ...(alignedPctType ? { pct_type: alignedPctType } : {}),
            ...buildRecipientPayload(),
          }

      const payload: OverrideShareRateRequest = {
        reason: reason.trim(),
        ...sharePayload,
        ...buildValuePayload(),
        ...(fileTokens.length > 0 ? { attachments: fileTokens } : {}),
      }

      await mutation.mutateAsync({ id: dealId, section, data: payload })
      toastService.success('Đã cập nhật tỷ lệ')
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'detail', dealId] })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', 'workspace', 'commission', dealId],
      })
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', dealId, 'commission-shares'] })
      setIsOpen(false)
    } catch (e: unknown) {
      toastService.error(extractErrorMessage(e, 'Cập nhật thất bại'))
    }
  }

  const handleConfirmReset = async () => {
    if (!share.id) return
    if (!resetReason.trim()) {
      toastService.error('Vui lòng nhập lý do khôi phục')
      return
    }

    try {
      await clearMutation.mutateAsync({
        id: dealId,
        section,
        shareId: String(share.id),
        data: { reason: resetReason.trim() },
      })
      toastService.success('Đã khôi phục theo chính sách chung')
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'detail', dealId] })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', 'workspace', 'commission', dealId],
      })
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', dealId, 'commission-shares'] })
      setIsOpen(false)
    } catch (e: unknown) {
      toastService.error(extractErrorMessage(e, 'Khôi phục thất bại'))
    }
  }

  if (share.isEmpty && !isCreate) {
    return (
      <div className="flex h-full w-full items-center justify-center px-4 py-3">
        <span className="text-content-dark-3 typo-body-base">—</span>
      </div>
    )
  }

  const isChanged = isCreate
    ? editField === 'percentage'
      ? valPct !== ''
      : editField === 'fixed_amount'
        ? valAmt !== ''
        : valContrib !== ''
    : editField === 'percentage'
      ? String(valPct || '') !== String(share.percentage ?? '')
      : editField === 'fixed_amount'
        ? String(valAmt || '') !== String(share.fixed_amount ?? absCalculatedAmount ?? '')
        : String(valContrib || '') !== String(share.contribution_percentage ?? '')

  const fracReady = !!rateValue && !rateValue.empty && rateValue.ready && !rateValue.error
  const fracChanged =
    JSON.stringify(toRateSpecPayload(rateValue)) !== JSON.stringify(toRateSpecPayload(rateSeed))

  const canSave = allowFraction
    ? fracReady && fracChanged && reason.trim().length > 0
    : isChanged && reason.trim().length > 0

  const kind = getRoleKind(share, salesKeysMap)
  const rk = share.recipient_kind
  const headerKindStyle =
    rk === CreateShareRequestRecipient_kind.employee
      ? 'bg-[#FFE4B5] text-[#8B5A00] border-[#E8C879]'
      : rk === CreateShareRequestRecipient_kind.department ||
          rk === CreateShareRequestRecipient_kind.position
        ? 'bg-[#FCE7E7] text-[#9C2A2A] border-[#F4C7C7]'
        : 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]'

  const displayLabel =
    label ||
    (editField === 'percentage'
      ? 'HH CƠ BẢN'
      : editField === 'contribution_percentage'
        ? 'TỶ LỆ THAM GIA'
        : 'THƯỞNG NÓNG')

  const isReadOnly = readonly

  if (isReadOnly) {
    const tooltipText =
      field === 'percentage' && (section as string) === 'promotion'
        ? 'Tỉ lệ thực tế = tỉ lệ inhouse * mức độ đóng góp'
        : undefined

    const content = (
      <div
        className={`relative flex h-full w-full items-center justify-end py-3 pr-6 pl-4 text-right`}
      >
        <DisplayValue
          computedField={computedField}
          displayPct={displayPct}
          displayAmt={displayAmt}
          displayContrib={displayContrib}
          pctVal={pctVal}
          absCalculatedAmount={absCalculatedAmount}
          isCustomOverride={share.is_custom_override}
          fractionText={fractionText}
          fractionEquivalent={fractionEquivalent}
        />
      </div>
    )

    if (tooltipText) {
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>{tooltipText}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return content
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <div
                className={`group/edit hover:bg-action-primary-red-default/5 relative flex h-full w-full cursor-pointer items-center justify-end py-3 pr-6 pl-4 text-right transition-colors data-[state=open]:bg-[#FFF6F2]`}
              >
                {/* Dashed border inside (inset to avoid overlap with cell border) */}
                <div className="group-hover/edit:border-action-primary-red-default/30 group-data-[state=open]/edit:border-action-primary-red-default pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors group-data-[state=open]/edit:border-solid" />

                <DisplayValue
                  computedField={computedField}
                  displayPct={displayPct}
                  displayAmt={displayAmt}
                  displayContrib={displayContrib}
                  pctVal={pctVal}
                  absCalculatedAmount={absCalculatedAmount}
                  isCustomOverride={share.is_custom_override}
                  fractionText={fractionText}
                  fractionEquivalent={fractionEquivalent}
                />
                <PenLine className="text-content-dark-4 group-hover/edit:text-action-primary-red-default absolute top-1.5 right-1.5 z-10 hidden h-3.5 w-3.5 group-hover/edit:block" />
              </div>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Click để sửa</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverPrimitive.Portal>
        <PopoverContent
          className="border-border-1 w-[340px] rounded-[10px] bg-white p-0 shadow-[0_16px_40px_rgba(0,0,0,0.12),0_4px_10px_rgba(0,0,0,0.06)]"
          align="start"
        >
          <div className="border-border-1 bg-surface-secondary-default rounded-t-[10px] border-b px-[14px] pt-[10px] pb-2">
            <div className="mb-0.5 flex items-center justify-between">
              <div className="text-content-dark-3 text-[10px] font-semibold tracking-wider uppercase">
                {displayLabel}
              </div>
              {share.is_custom_override && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-data-blue-default/10 text-data-blue-default flex items-center justify-center rounded px-1 py-1">
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Giá trị đã được ghi đè</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="mt-[2px] flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${headerKindStyle}`}
              >
                {kind}
              </span>
              <span className="text-content-dark-1 text-[13px] font-semibold">
                {recipientSubtitle ||
                  (isCreate && recipientInfo
                    ? recipientInfo.exchange?.name ||
                      recipientInfo.department?.name ||
                      recipientInfo.position?.name ||
                      recipientInfo.employee?.fullname ||
                      recipientInfo.collaborator?.name ||
                      'Không xác định'
                    : share.exchange
                      ? share.exchange.name
                      : share.department?.name ||
                        share.position?.name ||
                        share.employee?.fullname ||
                        share.collaborator?.name ||
                        'Không xác định')}
              </span>
              {((isCreate && recipientInfo?.exchange?.code) ||
                (!isCreate && share.exchange?.code)) && (
                <span className="text-content-dark-3 text-[11px] font-normal">
                  ({isCreate ? recipientInfo?.exchange?.code : share.exchange?.code})
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          {showResetConfirm ? (
            <div className="flex flex-col bg-white p-[14px]">
              <div className="text-content-dark-1 mb-2 text-[13px] font-semibold">
                Xác nhận khôi phục
              </div>
              <div className="text-content-dark-3 mb-4 text-[12px]">
                Bạn có chắc chắn muốn khôi phục giá trị về mức tỷ lệ theo chính sách chung của hệ
                thống? Hành động này sẽ thay thế các chỉnh sửa hiện tại.
              </div>
              <div className="text-content-dark-3 mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                Lý do khôi phục <span className="text-data-red-default ml-0.5">*</span>
              </div>
              <TextArea
                value={resetReason}
                onChange={(newVal) => setResetReason(newVal)}
                placeholder="VD: CĐT duyệt hoàn lại mặc định..."
                rows={2}
                className="min-h-[52px]"
                autoFocus
              />
            </div>
          ) : (
            <div className="custom-scrollbar flex max-h-[360px] flex-col gap-[10px] overflow-y-auto bg-white p-[14px]">
              {allowFraction ? (
                <div>
                  <div className="text-content-dark-3 mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                    Giá trị mới
                  </div>
                  {/* RateInput hỗ trợ %, ₫, hoặc phân số "x/y của z"; seed từ spec hiện tại. */}
                  <RateInput value={rateSeed ?? undefined} capAt100 onChange={setRateValue} />
                </div>
              ) : (
                <>
                  {/* Đơn vị tabs — chỉ hiện khi không phải contribution_percentage và không bị khóa chỉ nhập % */}
                  {field !== 'contribution_percentage' && !isPctOnlyCategory && (
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-content-dark-3 text-[10px] font-semibold tracking-wider uppercase">
                          Đơn vị
                        </div>
                      </div>
                      <div className="inline-flex rounded-md bg-black/5 p-0.5" role="tablist">
                        <button
                          role="tab"
                          type="button"
                          className={`cursor-pointer rounded-[4px] border-none px-2.5 py-1 text-[11px] font-medium transition-all ${
                            editField === 'percentage'
                              ? 'text-action-primary-red-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                              : 'text-content-dark-3 hover:text-content-dark-1 bg-transparent'
                          }`}
                          onClick={() => setEditField('percentage')}
                        >
                          % tỷ lệ
                        </button>
                        <button
                          role="tab"
                          type="button"
                          className={`cursor-pointer rounded-[4px] border-none px-2.5 py-1 text-[11px] font-medium transition-all ${
                            editField === 'fixed_amount'
                              ? 'text-action-primary-red-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                              : 'text-content-dark-3 hover:text-content-dark-1 bg-transparent'
                          }`}
                          onClick={() => setEditField('fixed_amount')}
                        >
                          VND cố định
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-content-dark-3 mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                      Giá trị mới
                    </div>
                    <div className="flex items-center gap-2">
                      {editField === 'fixed_amount' ? (
                        <div className="flex-1">
                          <CurrencyInput
                            autoFocus
                            allowNegative={false}
                            value={valAmt ? Number(valAmt) : undefined}
                            onChange={(newVal) => setValAmt(newVal?.toString() || '')}
                          />
                        </div>
                      ) : editField === 'contribution_percentage' ? (
                        <div className="flex-1">
                          <TextField
                            autoFocus
                            type="text"
                            allowNegative={false}
                            value={valContrib}
                            onChange={(newVal) => {
                              setValContrib(cleanDecimalString(newVal?.toString() || ''))
                            }}
                            suffix="%"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <TextField
                            autoFocus
                            type="text"
                            allowNegative={false}
                            value={valPct}
                            onChange={(newVal) => {
                              setValPct(cleanDecimalString(newVal?.toString() || ''))
                            }}
                            suffix="%"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="text-content-dark-3 mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                  Lý do sửa <span className="text-data-red-default ml-0.5">*</span>
                </div>
                <TextArea
                  value={reason}
                  onChange={(newVal) => setReason(newVal)}
                  placeholder="VD: CĐT duyệt điều chỉnh theo email 22/04…"
                  rows={2}
                  className="min-h-[52px]"
                />
              </div>

              <div>
                <div className="text-content-dark-3 mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                  Tệp đính kèm
                </div>
                <FileUpload
                  purpose="deal"
                  multiple
                  maxFiles={5}
                  accept={['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg']}
                  maxSize={5 * 1024 * 1024}
                  onChange={(tokens: string | string[]) =>
                    setFileTokens(Array.isArray(tokens) ? tokens : [tokens])
                  }
                  hiddenLabel
                  hiddenDescription
                  className="mt-1 [&>div[onDrop]]:!h-[70px] [&>div[onDrop]]:!py-2 [&>div[onDrop]>div]:!mb-1 [&>div[onDrop]>div]:!h-6 [&>div[onDrop]>div]:!w-6"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-border-1 bg-surface-secondary-default flex justify-end gap-1.5 rounded-b-[10px] border-t px-[14px] py-[10px]">
            {showResetConfirm ? (
              <>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={clearMutation.isPending}
                >
                  Huỷ
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  className="bg-data-red-default hover:bg-data-red-hover text-white"
                  onClick={handleConfirmReset}
                  disabled={!resetReason.trim() || clearMutation.isPending}
                >
                  Xác nhận khôi phục
                </Button>
              </>
            ) : (
              // Nhãn "Khôi phục theo chính sách chung" dài hơn bề ngang popover (340px)
              // nên nó chiếm nguyên một hàng, Huỷ/Lưu xuống hàng dưới.
              <div className="flex w-full flex-col gap-1.5">
                {!isCreate && (
                  <Button
                    variant="secondary"
                    size="small"
                    className={cn(
                      'w-full',
                      !resetToPolicyState.disabled &&
                        'text-action-primary-red-default hover:bg-action-primary-red-default/10'
                    )}
                    onClick={() => setShowResetConfirm(true)}
                    {...resetToPolicyState}
                  >
                    {RESET_TO_POLICY_LABEL}
                  </Button>
                )}
                <div className="flex justify-end gap-1.5">
                  <Button variant="secondary" size="small" onClick={() => setIsOpen(false)}>
                    Huỷ
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleSave}
                    disabled={!canSave || mutation.isPending || clearMutation.isPending}
                    title="Lưu thay đổi"
                  >
                    Lưu
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </PopoverPrimitive.Portal>
    </Popover>
  )
}
