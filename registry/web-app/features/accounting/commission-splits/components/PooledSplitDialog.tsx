/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { IconX } from '@/assets/icons'
import { Button, Select } from '@/components/ui'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { formatCurrencyVND, formatPct } from '@/utils/common'
import { cn } from '@/utils'

import { computePooledSplit } from '../utils/pooled-split-math'

/**
 * "Chia gộp cho đối tượng khác" — one entry point for the pooled split (spreadsheet flow):
 * the accountant picks ONE outside payee (NV / CTV / Sàn) and types the payee's own
 * "% phí từng sale" (4dp, against the deal fee-calculation basis). The payee takes that
 * slice once; every stand person keeps (own % − pro-rata cut), where the cut follows the
 * participation ratio — exactly the accountant's Excel:
 *
 *   sale keeps:  pct_i − x × (pct_i / Σpct)      money this period scales the same way.
 *
 * The preview table mirrors that spreadsheet (before / cut / after per stand person, plus
 * the payee row). Saving POSTs the entered % only — the BE recomputes the authoritative
 * per-RAL amounts and tags the created splits with the pooled-allocation header so every
 * later render shows ONE payee row instead of a per-sale "nhận hộ" row pair.
 */

export interface PooledFeeGroup {
  code: string
  name: string
  kind: string // 'employee' | 'collaborator' | 'exchange'
  participationPct: number | null
  /** Stand-level "% phí từng sale" of the group (share percentage, 4dp). */
  sharePct: number
  /** Fee money allocated to the group this period (worksheet grain). */
  feeExpected: number
  /** Portion of feeExpected still on the stand person's own row (cut ceiling). */
  ownerAmount: number
  /** Bonus allocated to the group this period (the BONUS channel's pool share). */
  bonusExpected?: number
  /** Deduction allocated to the group this period — NEGATIVE money. */
  deductionExpected?: number
}

export interface PooledSplitPayee {
  kind: 'employee' | 'collaborator' | 'exchange'
  id: number
  name: string
}

export interface PooledSplitSubmit {
  payee: PooledSplitPayee
  /** FEE channel, 4dp. Empty string = channel off. */
  feePct: string
  /** BONUS channel, % of this period's bonus pool. Empty = off / using bonusAmount. */
  bonusPoolPct: string
  /** BONUS channel, absolute VND. Empty = off / using bonusPoolPct. */
  bonusAmount: string
  note: string
}

interface Props {
  open: boolean
  onClose: () => void
  groups: PooledFeeGroup[]
  /** Deal fee-calculation basis (gia tri tinh phi, chua VAT). */
  feeBasis: number
  loadEmployeeOptions: any
  saving: boolean
  onSubmit: (payload: PooledSplitSubmit) => void
  /** Prefill when editing an existing pooled allocation. */
  initial?: {
    payee: PooledSplitPayee
    feePct: string
    bonusPoolPct?: string
    bonusAmount?: string
    note?: string
  } | null
}

const kindLabel = (kind: string) =>
  kind === 'collaborator' ? 'CTV' : kind === 'exchange' ? 'F2' : 'Sale'

export const PooledSplitDialog = ({
  open,
  onClose,
  groups,
  feeBasis,
  loadEmployeeOptions,
  saving,
  onSubmit,
  initial = null,
}: Props) => {
  const { loadCollaboratorOptions } = useCollaboratorSelect()
  const { loadExchangeOptions } = useExchangeSelect({ valueType: 'id' })

  const [pickKind, setPickKind] = useState<'employee' | 'collaborator' | 'exchange'>(
    initial?.payee.kind || 'collaborator'
  )
  const [payee, setPayee] = useState<PooledSplitPayee | null>(initial?.payee || null)
  const [pctInput, setPctInput] = useState<string>(initial?.feePct || '')
  const [note, setNote] = useState<string>(initial?.note || '')
  // BONUS: % của pool thưởng kỳ này XOR số tiền tuyệt đối. Neo theo tỷ lệ pool (không phải
  // % giá tính phí) vì share thưởng có thể là amount-mode và thưởng chia sẻ do dial catch-up
  // lái — % của basis sẽ vô nghĩa với cả hai.
  const [bonusMode, setBonusMode] = useState<'pct' | 'amount'>(
    initial?.bonusAmount ? 'amount' : 'pct'
  )
  const [bonusPctInput, setBonusPctInput] = useState<string>(initial?.bonusPoolPct || '')
  const [bonusAmountInput, setBonusAmountInput] = useState<string>(initial?.bonusAmount || '')

  // Working-set snapshot: the participant list is FROZEN while the dialog is open.
  // A parent-side transient (query refetch / form reset re-deriving positions during a
  // failed submit) can momentarily empty the `groups` prop — without this snapshot the
  // open dialog blanked its participant preview permanently (UAT bug: BE validation
  // error → "danh sách người tham gia" gone). Non-empty updates still flow through.
  const [effectiveGroups, setEffectiveGroups] = useState<PooledFeeGroup[]>(groups)
  if (groups !== effectiveGroups && groups.length > 0) {
    // React-sanctioned render-phase state adjustment (no effect needed).
    setEffectiveGroups(groups)
  }

  const totalSharePct = useMemo(
    () => effectiveGroups.reduce((s, g) => s + g.sharePct, 0),
    [effectiveGroups]
  )

  const x = useMemo(() => {
    const v = parseFloat((pctInput || '').replace(',', '.'))
    return Number.isFinite(v) && v > 0 ? v : 0
  }, [pctInput])

  const bonusPool = useMemo(
    () => effectiveGroups.reduce((s, g) => s + (g.bonusExpected || 0), 0),
    [effectiveGroups]
  )
  // `!== 0`: pool thưởng có thể ÂM khi đang thu hồi phần thưởng đã chi dư (2026-08-06).
  // `> 0` khoá luôn hai nút chọn kênh thưởng nên không chia gộp được phần thu hồi.
  const hasBonusPool = bonusPool !== 0

  const bonusPct = useMemo(() => {
    if (bonusMode !== 'pct') return null
    const v = parseFloat((bonusPctInput || '').replace(',', '.'))
    return Number.isFinite(v) && v > 0 ? v : null
  }, [bonusMode, bonusPctInput])

  const bonusAmt = useMemo(() => {
    if (bonusMode !== 'amount') return null
    const v = parseFloat((bonusAmountInput || '').replace(/[^\d]/g, ''))
    return Number.isFinite(v) && v > 0 ? v : null
  }, [bonusMode, bonusAmountInput])

  // Per-group cut, spreadsheet semantics — shared with the tested pure util:
  // cutPct_i = x × sharePct_i / ΣsharePct; last row absorbs rounding drift.
  const preview = useMemo(() => {
    const result = computePooledSplit(effectiveGroups, x, feeBasis, {
      poolPct: bonusPct,
      amount: bonusAmt,
    })
    if (!result) return null
    return {
      rows: result.rows.map((r) => ({ ...r.group, ...r })),
      payeeAmount: result.payeeAmount,
      payeeFullAmount: result.payeeFullAmount,
      payeeBonusAmount: result.payeeBonusAmount,
      payeeDeductionAmount: result.payeeDeductionAmount,
      payeeTotalAmount: result.payeeTotalAmount,
    }
  }, [effectiveGroups, x, feeBasis, bonusPct, bonusAmt])

  // Largest value the input can actually express: sharePct is share_full_amount ÷ basis, so
  // totalSharePct carries full float precision (e.g. 1.3999996…) while the field is 4dp.
  // FLOOR — never round up: toFixed(4) would propose 1.4000, above the real total, and both
  // `overTotal` here and the BE's `>` guard would reject the number the UI just offered.
  const maxPct = Math.floor(totalSharePct * 1e4) / 1e4

  // Equality is ALLOWED — one person receiving the whole period's commission is the
  // legit "nhận hộ toàn bộ" case (owner rows drop to 0). Only exceeding is an error.
  // Small epsilon guards float artifacts when the input equals the displayed total.
  const overTotal = x > 0 && x > totalSharePct + 1e-9
  const insufficientRows = preview?.rows.filter((r) => r.insufficient) || []
  const bonusOverPool = bonusAmt != null && bonusAmt > bonusPool + 1
  const bonusPctOver100 = bonusPct != null && bonusPct > 100
  const hasAnyChannel = x > 0 || bonusPct != null || bonusAmt != null
  const canSave =
    !!payee &&
    hasAnyChannel &&
    !overTotal &&
    !bonusOverPool &&
    !bonusPctOver100 &&
    insufficientRows.length === 0 &&
    !saving

  const pickLoader =
    pickKind === 'collaborator'
      ? loadCollaboratorOptions
      : pickKind === 'exchange'
        ? loadExchangeOptions
        : loadEmployeeOptions

  const th = 'px-3 py-2 text-[11px] font-medium text-neutral-500 whitespace-nowrap'
  const td = 'px-3 py-2.5 text-[13px]'

  if (!open) return null

  return (
    <Dialog.Root
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content
          // 1100px: bảng preview lên 8 cột từ khi có kênh thưởng + giảm trừ. Chiều dọc do
          // body (`flex-1 overflow-y-auto`) lo; chiều ngang do wrapper bảng lo.
          className="border-border-1 fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[min(1100px,96vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white shadow-xl"
          onEscapeKeyDown={onClose}
          // The payee <Select> renders its dropdown in a body-level portal; clicking an
          // option must not be treated as an outside interaction (mirrors the group modal).
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="border-border-1 flex items-center justify-between border-b px-5 py-3">
            <div>
              <Dialog.Title className="text-[15px] font-bold text-neutral-900">
                {initial ? 'Sửa chia gộp cho đối tượng khác' : 'Chia gộp cho đối tượng khác'}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-neutral-500">
                Người này nhận theo % phí nhập vào (× giá tính phí); các sale/F2 còn lại chia phần
                còn lại theo tỷ lệ tham gia. Hiển thị luôn gộp thành 1 dòng.
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            {/* Payee + pct input */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex h-6 items-center justify-between">
                  <span className="text-[12px] font-medium text-neutral-600">Người thực nhận</span>
                  {!payee && (
                    <div className="flex gap-1">
                      {(
                        [
                          { k: 'employee', l: 'NV' },
                          { k: 'collaborator', l: 'CTV' },
                          { k: 'exchange', l: 'Sàn' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.k}
                          type="button"
                          onClick={() => setPickKind(opt.k)}
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-semibold transition-colors',
                            pickKind === opt.k
                              ? 'bg-data-blue-default text-white'
                              : 'border-border-1 border bg-white text-neutral-600 hover:bg-neutral-50'
                          )}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {payee ? (
                  <div className="border-border-1 flex h-10 items-center justify-between rounded border bg-neutral-50 px-3">
                    <div>
                      <span className="text-[13px] font-medium text-neutral-900">{payee.name}</span>
                      <span className="ml-2 rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
                        {payee.kind === 'collaborator'
                          ? 'CTV'
                          : payee.kind === 'exchange'
                            ? 'Sàn'
                            : 'NV'}
                      </span>
                    </div>
                    {!initial && (
                      <button
                        type="button"
                        onClick={() => setPayee(null)}
                        className="text-[11px] text-neutral-500 underline hover:text-neutral-700"
                      >
                        Chọn lại
                      </button>
                    )}
                  </div>
                ) : (
                  <Select
                    key={pickKind}
                    loadOptions={pickLoader}
                    enableSearch
                    placeholder={
                      pickKind === 'collaborator'
                        ? 'Chọn CTV...'
                        : pickKind === 'exchange'
                          ? 'Chọn sàn...'
                          : 'Chọn nhân viên...'
                    }
                    onChangeOption={(opt: any) => {
                      if (opt?.value != null) {
                        const name =
                          String(opt.label || '')
                            .split(' - ')
                            .slice(1)
                            .join(' - ') || opt.label
                        setPayee({ kind: pickKind, id: Number(opt.value), name })
                      }
                    }}
                  />
                )}
              </div>
              <div>
                <div className="mb-1.5 flex h-6 items-center">
                  <span className="text-[12px] font-medium text-neutral-600">
                    % phí từng sale của người này
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pctInput}
                      onChange={(e) => setPctInput(e.target.value)}
                      placeholder="0,0000"
                      className="border-border-1 h-10 w-32 rounded border px-3 text-right text-[14px] font-semibold outline-none focus:border-blue-500"
                    />
                    <span className="ml-1.5 text-[13px] font-medium text-neutral-500">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 px-3 font-medium whitespace-nowrap"
                    onClick={() => setPctInput(maxPct.toFixed(4))}
                    title="Người này nhận toàn bộ hoa hồng sale của deal trong đợt này (các sale còn lại về 0)"
                  >
                    Nhận toàn bộ
                  </Button>
                  {preview && x > 0 && (
                    <span className="text-[12px] text-neutral-500">
                      ≈ {formatCurrencyVND(preview.payeeFullAmount)} đ toàn giao dịch ·{' '}
                      <b className="text-neutral-800">{formatCurrencyVND(preview.payeeAmount)} đ</b>{' '}
                      kỳ này
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-neutral-400">
                  Tính trên giá tính phí {formatCurrencyVND(feeBasis)} đ · tổng % phí sale hiện tại{' '}
                  {formatPct(totalSharePct, 4)}
                </div>
              </div>
            </div>

            {/* Kênh THƯỞNG — độc lập với phí; bỏ trống = không nhận thưởng */}
            <div className="border-border-1 rounded-lg border bg-neutral-50/60 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-neutral-600">
                  Nhận gộp cả phần thưởng{' '}
                  <span className="font-normal text-neutral-400">(bỏ trống = không nhận)</span>
                </span>
                <div className="flex gap-1">
                  {(
                    [
                      { k: 'pct', l: '% pool' },
                      { k: 'amount', l: 'Số tiền' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.k}
                      type="button"
                      disabled={!hasBonusPool}
                      onClick={() => setBonusMode(opt.k)}
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        bonusMode === opt.k
                          ? 'bg-data-blue-default text-white'
                          : 'border-border-1 border bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {hasBonusPool ? (
                <div className="flex flex-wrap items-center gap-2">
                  {bonusMode === 'pct' ? (
                    <>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={bonusPctInput}
                        onChange={(e) => setBonusPctInput(e.target.value)}
                        placeholder="0,00"
                        className="border-border-1 h-9 w-24 rounded border px-3 text-right text-[13px] font-semibold outline-none focus:border-blue-500"
                      />
                      <span className="text-[13px] text-neutral-500">% của pool thưởng</span>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3 font-medium whitespace-nowrap"
                        onClick={() => setBonusPctInput('100')}
                      >
                        Nhận toàn bộ thưởng
                      </Button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={bonusAmountInput}
                        onChange={(e) => setBonusAmountInput(e.target.value)}
                        placeholder="0"
                        className="border-border-1 h-9 w-36 rounded border px-3 text-right text-[13px] font-semibold outline-none focus:border-blue-500"
                      />
                      <span className="text-[13px] text-neutral-500">đ</span>
                    </>
                  )}
                  <span className="text-[12px] text-neutral-500">
                    Pool thưởng kỳ này {formatCurrencyVND(bonusPool)} đ
                    {preview && (bonusPct != null || bonusAmt != null) && (
                      <>
                        {' · '}
                        <b className="text-neutral-800">
                          {formatCurrencyVND(preview.payeeBonusAmount)} đ
                        </b>{' '}
                        nhận gộp
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="text-[12px] text-neutral-400">
                  Kỳ này không có thưởng nào được phân bổ cho các sale/F2 đang đứng tên.
                </div>
              )}
            </div>

            {/* Kênh GIẢM TRỪ — không có input, khoá theo đúng tỷ lệ phí */}
            <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#92400E]">
              <b>Giảm trừ đi cùng phí.</b> Người nhận gộp gánh giảm trừ theo <b>đúng tỷ lệ phí</b>{' '}
              đã nhận — nhận 100% phí thì gánh 100% giảm trừ, 50% thì 50%, không nhận phí thì không
              gánh. Không có ô nhập riêng; muốn chia khác thì dùng <b>Chia/Sửa từng nhóm</b>.
              {preview && preview.payeeDeductionAmount !== 0 && (
                <>
                  {' '}
                  Kỳ này:{' '}
                  <b className="text-[#DC2626]">
                    {formatCurrencyVND(preview.payeeDeductionAmount)} đ
                  </b>
                  .
                </>
              )}
            </div>

            {/* Validation messages */}
            {overTotal && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                % nhập vào không được vượt quá tổng % phí sale hiện tại ({formatPct(maxPct, 4)}
                ).
              </div>
            )}
            {bonusOverPool && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                Số tiền thưởng nhận gộp không được vượt pool thưởng kỳ này (
                {formatCurrencyVND(bonusPool)} đ).
              </div>
            )}
            {bonusPctOver100 && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                % thưởng không được vượt 100% pool.
              </div>
            )}
            {insufficientRows.length > 0 && !overTotal && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                Phần chính chủ không đủ để trừ ở: {insufficientRows.map((r) => r.name).join(', ')}{' '}
                (đã chia tay cho người khác trước đó). Giảm % hoặc sửa lại phần chia tay trước.
              </div>
            )}

            {/* Preview table — mirrors the accountant's spreadsheet */}
            {/* overflow-x-auto, KHÔNG overflow-hidden: 8 cột không lọt bề ngang dialog trên
                màn hẹp, `hidden` sẽ cắt mất cột Thưởng/Giảm trừ mà không có cách cuộn tới.
                min-w giữ cột đủ rộng để đọc thay vì bóp chữ xuống. */}
            <div className="border-border-1 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[980px] text-left text-xs [&_td]:align-middle [&_th]:align-middle">
                <thead className="border-border-1 border-b bg-neutral-50">
                  <tr>
                    <th className={`${th} text-left`}>Đối tượng</th>
                    <th className={`${th} text-right`}>% tham gia</th>
                    <th className={`${th} text-right`}>% phí từng sale</th>
                    <th className={`${th} text-right`}>Phí nhận gộp (trừ đi)</th>
                    <th className={`${th} text-right`}>% phí còn lại</th>
                    <th className={`${th} text-right`}>Phí còn lại kỳ này</th>
                    <th className={`${th} text-right`}>Thưởng nhận gộp</th>
                    <th className={`${th} text-right`}>Giảm trừ gánh theo</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    preview?.rows ||
                    effectiveGroups.map((g) => ({
                      ...g,
                      cutPct: 0,
                      cutAmount: 0,
                      afterPct: g.sharePct,
                      afterAmount: g.feeExpected,
                      insufficient: false,
                      bonusCutAmount: 0,
                      deductionCutAmount: 0,
                    }))
                  ).map((r) => (
                    <tr
                      key={r.code}
                      className={cn(
                        'border-border-1 border-b transition-colors',
                        r.afterPct === 0 && x > 0
                          ? 'bg-[#F0FDF4]/60 hover:bg-[#F0FDF4]'
                          : 'hover:bg-neutral-50'
                      )}
                    >
                      <td className={`${td} text-left`}>
                        <span className="font-medium text-neutral-900">{r.name}</span>
                        <span className="bg-red-10 text-action-primary-red-default ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          {kindLabel(r.kind)}
                        </span>
                      </td>
                      <td className={`${td} text-right`}>
                        {r.participationPct != null ? formatPct(r.participationPct, 2) : '—'}
                      </td>
                      <td className={`${td} text-right`}>{formatPct(r.sharePct, 4)}</td>
                      <td className={`${td} text-right text-[#DC2626]`}>
                        {x > 0 ? (
                          <div className="flex flex-col items-end leading-tight">
                            <span>-{formatPct(r.cutPct, 4)}</span>
                            <span className="text-[10px] text-neutral-400">
                              {/* `formatCurrencyVND` giữ nguyên dấu, nên phần cắt ÂM (đòi lại)
                                  tự hiện dấu trừ — thêm "-" cứng sẽ ra "--1.000.000". */}
                              {r.cutAmount < 0 ? '' : '-'}
                              {formatCurrencyVND(r.cutAmount)} đ
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${td} text-right font-semibold`}>
                        {formatPct(r.afterPct, 4)}
                      </td>
                      <td className={`${td} text-right`}>{formatCurrencyVND(r.afterAmount)} đ</td>
                      <td className={`${td} text-right text-[#DC2626]`}>
                        {r.bonusCutAmount !== 0
                          ? `${r.bonusCutAmount < 0 ? '' : '-'}${formatCurrencyVND(r.bonusCutAmount)} đ`
                          : '—'}
                      </td>
                      <td className={`${td} text-right`}>
                        {r.deductionCutAmount !== 0 ? (
                          <span
                            className="text-[#16A34A]"
                            title="Phần giảm trừ chuyển sang người nhận gộp — người đứng tên bớt gánh."
                          >
                            +{formatCurrencyVND(Math.abs(r.deductionCutAmount))} đ
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Dòng người nhận gộp. KHÔNG gate theo % phí: cấu hình chỉ-thưởng có
                      x = 0 nhưng payee vẫn nhận tiền — gate cũ làm cả dòng ra "—", nhìn
                      như chưa thêm ai vào bảng. */}
                  <tr className="bg-[#F0FDF4]">
                    <td className={`${td} text-left`}>
                      <span className="font-semibold text-neutral-900">
                        {payee?.name || 'Người thực nhận mới'}
                      </span>
                      <span className="ml-2 rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
                        Chia gộp
                      </span>
                    </td>
                    <td className={`${td} text-right text-neutral-400`}>—</td>
                    <td className={`${td} text-right font-bold text-[#16A34A]`}>
                      {x > 0 ? formatPct(x, 4) : '—'}
                    </td>
                    <td className={`${td} text-right font-bold text-[#16A34A]`}>
                      {x > 0 && preview
                        ? `${preview.payeeAmount < 0 ? '' : '+'}${formatCurrencyVND(preview.payeeAmount)} đ`
                        : '—'}
                    </td>
                    <td className={`${td} text-right font-bold text-[#16A34A]`}>
                      {x > 0 ? formatPct(x, 4) : '—'}
                    </td>
                    <td className={`${td} text-right font-bold text-[#16A34A]`}>
                      {x > 0 && preview ? `${formatCurrencyVND(preview.payeeAmount)} đ` : '—'}
                    </td>
                    <td className={`${td} text-right font-bold text-[#16A34A]`}>
                      {preview && preview.payeeBonusAmount !== 0
                        ? `${preview.payeeBonusAmount < 0 ? '' : '+'}${formatCurrencyVND(preview.payeeBonusAmount)} đ`
                        : '—'}
                    </td>
                    <td className={`${td} text-right font-bold text-[#DC2626]`}>
                      {preview && preview.payeeDeductionAmount !== 0
                        ? `${formatCurrencyVND(preview.payeeDeductionAmount)} đ`
                        : '—'}
                    </td>
                  </tr>
                  {preview && hasAnyChannel && (
                    <tr className="border-border-1 border-t bg-[#F0FDF4]">
                      <td className={`${td} text-left font-semibold text-neutral-700`} colSpan={6}>
                        Tổng trả cho {payee?.name || 'người nhận gộp'} kỳ này (phí + thưởng − giảm
                        trừ)
                      </td>
                      <td className={`${td} text-right font-bold text-neutral-900`} colSpan={2}>
                        {formatCurrencyVND(preview.payeeTotalAmount)} đ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex flex-wrap gap-3 px-3 py-2 text-[11px] text-neutral-400">
                <span>Phí: mỗi người bớt x × (% của mình ÷ tổng %)</span>
                <span>Thưởng: cắt theo tỷ lệ thưởng đã phân bổ kỳ này</span>
                <span>Giảm trừ: theo đúng tỷ lệ phí người nhận gộp lấy — không nhập tay</span>
                <span>Số chốt do hệ thống tính khi lưu</span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] font-medium text-neutral-600">Ghi chú</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Lý do / căn cứ chia gộp (không bắt buộc)"
                className="border-border-1 w-full rounded border px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="border-border-1 flex items-center justify-end gap-2 border-t px-5 py-3">
            <Button variant="secondary" size="small" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="small"
              disabled={!canSave}
              loading={saving}
              onClick={() => {
                if (!payee || !preview) return
                onSubmit({
                  payee,
                  // Chuỗi rỗng = kênh tắt; call site không gửi field đó lên BE.
                  feePct: x > 0 ? x.toFixed(4) : '',
                  bonusPoolPct: bonusPct != null ? bonusPct.toFixed(4) : '',
                  bonusAmount: bonusAmt != null ? String(Math.round(bonusAmt)) : '',
                  note,
                })
              }}
            >
              Lưu chia gộp
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
