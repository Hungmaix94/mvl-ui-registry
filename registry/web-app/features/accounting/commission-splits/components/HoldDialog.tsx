import { type ComponentProps, useCallback, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { IconX } from '@/assets/icons'
import { Button, Select } from '@/components/ui'
import { HOLD_REASON_OPTIONS } from '@/constants/commission'
import toastService from '@/services/toast-service'
import { formatCurrencyVND } from '@/utils/common'
import { extractErrorMessage } from '@/utils/error-utils'

import { useHoldShare, useReleaseShareHold } from '../services/commission-splits-service'
import { isDeductionType } from '../utils/payout-math'
import { payeeRefFromIdentityKey } from '../utils/share-payee-ref'

import {
  buildPayeeRows,
  identityKey,
  type PooledBand,
  type RecipientPayoutTable,
} from './RecipientPayoutTable'

type PayoutGroups = ComponentProps<typeof RecipientPayoutTable>['groups']

/**
 * Sentinel group code for holding the POOLED payee — their cut spans every share they
 * were carved from, so the hold targets positions across ALL groups (not one band).
 */
const POOLED_HOLD_GROUP = '__pooled__'

interface UseHoldDialogArgs {
  groups: PayoutGroups
  pbtvId?: number | string | null
  isCommissionType: ComponentProps<typeof RecipientPayoutTable>['isCommissionType']
  onRefresh?: () => void
}

/**
 * Tạm giữ / mở tạm giữ hoa hồng của một người nhận trong Mục ④.
 *
 * Hai lối vào: giữ theo NHÓM người đứng tên (`openGroupHold`) và giữ người nhận GỘP
 * (`openPooledHold`) — người gộp cắt ngang mọi phần chia nên phải nhắm tới position ở tất
 * cả các nhóm, đó là lý do có sentinel `__pooled__` thay vì một mã nhóm thật.
 */
export function useHoldDialog({ groups, pbtvId, isCommissionType, onRefresh }: UseHoldDialogArgs) {
  const { mutateAsync: holdShare } = useHoldShare()
  const { mutateAsync: releaseShareHold } = useReleaseShareHold()

  const [holdGroupCode, setHoldGroupCode] = useState<string | null>(null)
  const [holdRowKey, setHoldRowKey] = useState<string | null>(null)
  const [holdScope, setHoldScope] = useState<'fee' | 'bonus' | 'all'>('all')
  const [holdReason, setHoldReason] = useState('')
  const [holdMode, setHoldMode] = useState<'hold' | 'release'>('hold')
  const [holdSaving, setHoldSaving] = useState(false)
  const [holdTaxBase, setHoldTaxBase] = useState<'PRE_TAX' | 'POST_TAX'>('PRE_TAX')
  const [holdReasonType, setHoldReasonType] = useState('CARRYOVER')

  const resetHoldForm = () => {
    setHoldScope('all')
    setHoldReasonType('CARRYOVER')
    setHoldReason('')
    setHoldTaxBase('PRE_TAX')
  }

  const openPooledHold = (band: PooledBand) => {
    setHoldRowKey(band.payeeKey)
    // Release mode only for MANUAL holds (mirror openGroupHold): the auto cert hold is
    // not releasable from this action — it lifts via a valid CCMG. Read BOTH hold sources
    // like buildPayeeRows does: the WS2 directive AND a hold parked on the pooled row.
    const isManual = groups.some((g) =>
      g.positions.some(
        (p) =>
          (p.posData.payee_holds || []).some(
            (ph) => `${ph.payee_type}-${ph.payee_id}` === band.payeeKey && ph.origin !== 'auto_cert'
          ) ||
          (p.posData.recipients || []).some(
            (r) =>
              identityKey(r) === band.payeeKey &&
              r.pooled_allocation_id != null &&
              (r.is_held || Number(r.hold_amount || 0) > 0)
          )
      )
    )
    setHoldMode(isManual ? 'release' : 'hold')
    resetHoldForm()
    setHoldGroupCode(POOLED_HOLD_GROUP)
  }

  // Hold modal: hold a stand person's or individual payee row's fee / bonus / all shares this period.
  const openGroupHold = (code: string, rowKey?: string) => {
    const group = groups.find((g) => g.code === code)
    setHoldRowKey(rowKey || null)
    let isHeld = false
    if (rowKey && group) {
      const rows = buildPayeeRows(group.positions, {
        isCommissionType,
        ownerType: group.recipient_type,
        ownerId: group.recipient_id,
        participationPct: group.participationPct,
      })
      const targetRow = rows.find((r) => r.key === rowKey)
      // Release mode only for MANUAL holds — an auto cert hold is not releasable from
      // this action (it lifts via a valid CCMG); a row with only a cert hold opens in
      // HOLD mode ("giu them phan con lai").
      isHeld = !!targetRow?.holdManual
    } else {
      isHeld =
        group?.positions.some(
          (p) => !!p.posData?.is_held || (p.posData.recipients || []).some((r) => !!r.is_held)
        ) || false
    }

    setHoldMode(isHeld ? 'release' : 'hold')
    resetHoldForm()
    setHoldGroupCode(code)
  }

  // Target shares by scope and optional rowKey — dùng chung cho preview trong dialog
  // và saveGroupHold để hai nơi không lệch nhau. A payee whose hold was already
  // MATERIALIZED has its splits voided (gone from recipients[]) — match via
  // payee_holds too so the release action can still find the share.
  const resolveHoldTargets = useCallback(
    (scope: 'fee' | 'bonus' | 'all', rowKey: string | null, groupCode: string | null) => {
      if (!groupCode) return []
      const isPooledHold = groupCode === POOLED_HOLD_GROUP
      const group = groups.find((g) => g.code === groupCode)
      if (!group && !isPooledHold) return []
      // Pooled payee: their cut spans shares across EVERY group — sweep all positions.
      const positionsPool = isPooledHold ? groups.flatMap((g) => g.positions) : group!.positions
      return positionsPool.filter((p) => {
        // A giảm-trừ share is neither "phí" nor "thưởng" — it is negative money attached to the
        // fee. `isCommissionType` only matches the 4 F1/F2 sale values, so without this branch a
        // deduction share fell into the `!isFee` bucket and a scope="bonus" hold silently swept
        // it in (and the preview below counted it as an extra Thưởng lệnh at a negative amount).
        // It belongs only to scope="all", where the whole-person hold nets it as the BE does.
        const isDeduction = isDeductionType(p.posData)
        if (isDeduction && scope !== 'all') return false
        const isFee = isCommissionType(p.posData.pct_type || '')
        const scopeMatch = scope === 'all' || (scope === 'fee' ? isFee : !isFee)
        if (!scopeMatch) return false
        if (rowKey) {
          return (
            (p.posData.recipients || []).some((r) => identityKey(r) === rowKey) ||
            (p.posData.payee_holds || []).some((ph) => `${ph.payee_type}-${ph.payee_id}` === rowKey)
          )
        }
        return true
      })
    },
    [groups, isCommissionType]
  )

  // Preview cho dialog hold: mỗi share khớp lựa chọn = 1 lệnh giữ (row CommissionHold)
  // sẽ được tạo khi duyệt phiếu — nói rõ trước khi user xác nhận "giữ toàn bộ" để họ
  // không bất ngờ khi list tạm giữ hiện 2 lệnh (phí + thưởng) cho cùng một người.
  const holdPreview = useMemo(() => {
    if (!holdGroupCode || holdMode !== 'hold') return null
    let feeCount = 0
    let bonusCount = 0
    let deductionCount = 0
    let feeAmount = 0
    let bonusAmount = 0
    let deductionAmount = 0
    for (const p of resolveHoldTargets(holdScope, holdRowKey, holdGroupCode)) {
      if (p.posData.commission_share_id == null) continue
      let amount = Number(p.posData.expected_amount || 0)
      if (holdRowKey) {
        const recipient = (p.posData.recipients || []).find((r) => identityKey(r) === holdRowKey)
        if (recipient) amount = Number(recipient.amount || 0)
      }
      // Deduction shares carry NEGATIVE money; keep them in their own bucket (sign intact) so
      // the dialog does not advertise an inflated "Thưởng: N lệnh" at a quietly reduced total.
      if (isDeductionType(p.posData)) {
        deductionCount += 1
        deductionAmount += amount
      } else if (isCommissionType(p.posData.pct_type || '')) {
        feeCount += 1
        feeAmount += amount
      } else {
        bonusCount += 1
        bonusAmount += amount
      }
    }
    return {
      count: feeCount + bonusCount + deductionCount,
      feeCount,
      bonusCount,
      deductionCount,
      feeAmount,
      bonusAmount,
      deductionAmount,
    }
  }, [holdGroupCode, holdMode, holdScope, holdRowKey, resolveHoldTargets, isCommissionType])

  const saveGroupHold = async () => {
    const isPooledHold = holdGroupCode === POOLED_HOLD_GROUP
    const group = groups.find((g) => g.code === holdGroupCode)
    const pbtv_id = Number(pbtvId)
    if ((!group && !isPooledHold) || !pbtv_id) {
      toastService.error('Không tìm thấy ID phân bổ thực nhận')
      return
    }
    const targets = resolveHoldTargets(holdScope, holdRowKey, holdGroupCode)
    const shareIds = targets
      .map((p) => p.posData.commission_share_id)
      .filter((id): id is number => id != null)

    if (shareIds.length === 0) {
      toastService.error('Không có khoản để thao tác theo lựa chọn này')
      return
    }
    // Hold theo TỪNG NGƯỜI NHẬN (WS2): khi thao tác trên một dòng payee cụ thể (kể cả
    // người nhận hộ), gửi kèm `payees` để BE giữ đúng phần của người đó — nếu chỉ gửi
    // commission_share_ids, BE áp hold CẢ share và số tiền treo vào người đứng tên gốc.
    const payeeRef = payeeRefFromIdentityKey(holdRowKey)
    if (holdRowKey && !payeeRef) {
      toastService.error('Không xác định được người nhận của dòng này để tạm giữ theo người')
      return
    }
    if (holdMode === 'hold' && holdReasonType === 'OTHER' && !holdReason.trim()) {
      toastService.error('Vui lòng nhập chi tiết lý do khác')
      return
    }
    try {
      setHoldSaving(true)
      if (holdMode === 'release') {
        await releaseShareHold({
          id: pbtv_id,
          data: {
            commission_share_ids: shareIds,
            reason: holdReason,
            ...(payeeRef ? { payees: [payeeRef] } : {}),
          },
        })
        toastService.success('Đã mở tạm giữ thành công')
      } else {
        const finalReason = holdReasonType === 'OTHER' ? holdReason : holdReasonType
        await holdShare({
          id: pbtv_id,
          data: {
            commission_share_ids: shareIds,
            hold_reason: finalReason,
            tax_base: holdTaxBase,
            ...(payeeRef ? { payees: [payeeRef] } : {}),
          },
        })
        toastService.success('Đã tạm giữ thành công')
      }
      setHoldGroupCode(null)
      setHoldRowKey(null)
      onRefresh?.()
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    } finally {
      setHoldSaving(false)
    }
  }

  return {
    openGroupHold,
    openPooledHold,
    dialogProps: {
      holdGroupCode,
      setHoldGroupCode,
      holdMode,
      holdScope,
      setHoldScope,
      holdReason,
      setHoldReason,
      holdTaxBase,
      setHoldTaxBase,
      holdReasonType,
      setHoldReasonType,
      holdSaving,
      holdPreview,
      saveGroupHold,
    },
  }
}

export type HoldDialogProps = ReturnType<typeof useHoldDialog>['dialogProps']

export function HoldDialog({
  holdGroupCode,
  setHoldGroupCode,
  holdMode,
  holdScope,
  setHoldScope,
  holdReason,
  setHoldReason,
  holdTaxBase,
  setHoldTaxBase,
  holdReasonType,
  setHoldReasonType,
  holdSaving,
  holdPreview,
  saveGroupHold,
}: HoldDialogProps) {
  return (
    <>
      {/* Per-group hold modal (Giữ): fee / bonus / all */}
      <Dialog.Root
        open={holdGroupCode != null}
        onOpenChange={(o) => {
          if (!o) setHoldGroupCode(null)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
          <Dialog.Content className="border-border-1 fixed top-1/2 left-1/2 z-50 w-[min(460px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white shadow-xl">
            <div className="border-border-1 flex items-center justify-between border-b px-5 py-3">
              <Dialog.Title className="text-[15px] font-bold text-neutral-900">
                {holdMode === 'release'
                  ? 'Mở tạm giữ hoa hồng / thưởng'
                  : 'Tạm giữ hoa hồng / thưởng'}
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setHoldGroupCode(null)}
                aria-label="Đóng"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              <div>
                <div className="mb-1.5 text-[12px] font-medium text-neutral-600">
                  {holdMode === 'release' ? 'Hình thức mở giữ' : 'Hình thức giữ'}
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    {
                      v: 'fee',
                      label:
                        holdMode === 'release' ? 'Chỉ mở giữ phí hoa hồng' : 'Chỉ giữ phí hoa hồng',
                    },
                    {
                      v: 'bonus',
                      label: holdMode === 'release' ? 'Chỉ mở giữ thưởng' : 'Chỉ giữ thưởng',
                    },
                    {
                      v: 'all',
                      label:
                        holdMode === 'release'
                          ? 'Mở giữ toàn bộ (phí + thưởng)'
                          : 'Giữ toàn bộ (phí + thưởng)',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.v}
                      className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-800"
                    >
                      <input
                        type="radio"
                        name="hold-scope"
                        checked={holdScope === opt.v}
                        onChange={() => setHoldScope(opt.v as 'fee' | 'bonus' | 'all')}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {/* `Dialog.Description` chứ không phải <p> trần: Radix cần nó để gắn
                    `aria-describedby` cho DialogContent — thiếu thì trình đọc màn hình chỉ
                    nghe được tiêu đề, và console cảnh báo mỗi lần mở hộp thoại. */}
                <Dialog.Description className="mt-1.5 text-[11px] text-neutral-400">
                  {holdMode === 'release'
                    ? 'Mở giữ toàn bộ số tiền cam kết kỳ này của (các) khoản đã chọn.'
                    : 'Giữ toàn bộ số tiền cam kết kỳ này của (các) khoản đã chọn.'}
                </Dialog.Description>
              </div>
              {holdMode === 'hold' && holdPreview && holdPreview.count > 0 && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                  Sẽ tạo <b>{holdPreview.count} lệnh giữ</b> khi phiếu được duyệt
                  {holdPreview.count > 1
                    ? ' (mỗi khoản một lệnh riêng trên danh sách Tạm giữ HH)'
                    : ''}
                  :
                  {holdPreview.feeCount > 0 && (
                    <div>
                      · Phí hoa hồng: {holdPreview.feeCount} lệnh ·{' '}
                      {formatCurrencyVND(holdPreview.feeAmount)} ₫
                    </div>
                  )}
                  {holdPreview.bonusCount > 0 && (
                    <div>
                      · Thưởng: {holdPreview.bonusCount} lệnh ·{' '}
                      {formatCurrencyVND(holdPreview.bonusAmount)} ₫
                    </div>
                  )}
                  {holdPreview.deductionCount > 0 && (
                    <div>
                      · Giảm trừ: {holdPreview.deductionCount} lệnh ·{' '}
                      {formatCurrencyVND(holdPreview.deductionAmount)} ₫
                    </div>
                  )}
                </div>
              )}
              {holdMode === 'hold' && (
                <>
                  <Select
                    label="Lý do tạm giữ"
                    options={HOLD_REASON_OPTIONS}
                    value={holdReasonType}
                    onChange={(val) => setHoldReasonType(val as string)}
                    clearable={false}
                  />

                  {holdReasonType === 'OTHER' && (
                    <div>
                      <div className="mb-1.5 text-[12px] font-medium text-neutral-600">
                        Chi tiết lý do khác <span className="text-red-500">*</span>
                      </div>
                      <input
                        value={holdReason}
                        onChange={(e) => setHoldReason(e.target.value)}
                        placeholder="Nhập chi tiết lý do..."
                        className="border-border-1 h-9 w-full rounded border px-3 text-[13px] outline-none focus:border-neutral-400"
                        required
                      />
                    </div>
                  )}

                  <Select
                    label="Loại tạm giữ"
                    options={[
                      {
                        value: 'PRE_TAX',
                        label: 'Tạm giữ trước thuế (giảm thu nhập tính thuế)',
                      },
                      {
                        value: 'POST_TAX',
                        label: 'Tạm giữ sau thuế (khấu trừ vào thực nhận)',
                      },
                    ]}
                    value={holdTaxBase}
                    onChange={(val) => setHoldTaxBase(val as 'PRE_TAX' | 'POST_TAX')}
                    clearable={false}
                  />
                </>
              )}

              {holdMode !== 'hold' && (
                <div>
                  <div className="mb-1.5 text-[12px] font-medium text-neutral-600">
                    Ghi chú / Lý do
                  </div>
                  <input
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="VD: Đã bổ sung CCMG..."
                    className="border-border-1 h-9 w-full rounded border px-3 text-[13px] outline-none focus:border-neutral-400"
                  />
                </div>
              )}
            </div>
            <div className="border-border-1 flex items-center justify-end gap-2 border-t px-5 py-3">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setHoldGroupCode(null)}
                disabled={holdSaving}
              >
                Hủy
              </Button>
              <Button variant="primary" size="small" onClick={saveGroupHold} loading={holdSaving}>
                Xác nhận
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
