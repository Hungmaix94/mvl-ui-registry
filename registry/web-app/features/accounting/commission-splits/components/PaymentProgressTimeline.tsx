import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import type { components } from '@/api/schema'
import { IconFloppydisk, IconInfo } from '@/assets/icons'
import { IconButton } from '@/components/ui'
import { APP_PATH } from '@/routes/AppRoute.constant'
import toastService from '@/services/toast-service'
import { formatCurrencyVND, formatPctFloor } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { extractErrorMessage } from '@/utils/error-utils'

import {
  type CommissionSplitDetail,
  refetchWorksheetQueries,
  useSetPeriodProgress,
} from '../services/commission-splits-service'

/** Regen 2026-07-27: type không còn export ở top level, chỉ còn trong components. */
type DistributionPctBreakdown = components['schemas']['DistributionPctBreakdown']
import {
  isNonFieldError,
  useBlockedActionDialog,
} from '@/features/accounting/_shares/hooks/useBlockedActionDialog'

import { DistributionPctFormulaHint } from './DistributionPctFormulaHint'
import { PaymentProgressBar } from './PaymentProgressBar'
import { SubHead } from '@/components/commons/SubHead'
import {
  dialTrackLabel,
  readDialSideEffects,
  type DialSideEffect,
} from '../utils/dial-side-effects'
import { readDialSkippedRals, type DialSkippedRals } from '../utils/dial-skipped-rals'

export interface Allocation {
  id: number | null | undefined
  worksheet_id: number | null | undefined
  period_year: number | null | undefined
  period_month: number | null | undefined
  distribution_pct: string
  // Giải trình công thức của distribution_pct (BE trả kèm list row) — hiện tooltip
  // "(tiền phí về) ÷ (phí căn − giảm trừ)" thay vì để con số trần.
  distribution_pct_breakdown?: DistributionPctBreakdown | null
  // Accountant-pinned per-period dials (null = chưa chốt riêng cho kỳ đó).
  fee_progress_pct?: string | null
  bonus_progress_pct?: string | null
  // F2 dial của kỳ — tách riêng khỏi phí (sale/CTV/quản lý). Null = chưa chốt (F2 giữ
  // nguyên; FE gợi ý = tiến độ đối chiếu base × tiền về của kỳ).
  f2_progress_pct?: string | null
  // Thưởng F2 dial của kỳ — tách khỏi thưởng sale. Null = chưa chốt (catch-up).
  bonus_f2_progress_pct?: string | null
  // % ĐÃ THU của kỳ theo track (từ Mục 2, gom theo kỳ thanh toán) — fallback hiển thị
  // khi kỳ chưa chốt dial (distribution_pct gộp cả phí+thưởng nên không dùng được).
  fee_collection_pct?: string | null
  bonus_collection_pct?: string | null
  // Σ shared_bonus_to_sale_pct of the confirmed IR rows paid in the period — the bonus
  // payment progress the ADMIN pinned on the reconciliation. An unset dial is 0: no admin
  // quota means no sale/F2 bonus may be paid out this period.
  bonus_dial_pct?: string | null // always populated by the caller ("0" when unset)
  amount_received: string
  date: string | null | undefined
  status: string
  // Worksheet lifecycle (DRAFT / ADMIN_APPROVED / APPROVED) — drives the "HH có thể
  // chi / HH sẽ chi" wording.
  worksheet_status?: string
  code: string
  payout_allocated_amount: string | null | undefined
}

export interface DialCaps {
  feeCollected: number | null
  bonusCollected: number | null
  bonusDial: number | null
  feeMax: number | null
  bonusMax: number | null
  // F2 chung trần thu với phí (đối chiếu base × tiền về); trừ phần F2 đã chi kỳ trước.
  f2Prior: number | null
  f2Max: number | null
  // Thưởng F2 chung trần thu thưởng + dial thưởng kỳ với thưởng sale; prior riêng.
  bonusF2Prior: number | null
  bonusF2Max: number | null
}

interface PaymentProgressTimelineProps {
  detail: CommissionSplitDetail
  currentDetail?: CommissionSplitDetail
  sortedAllocations: Allocation[]
  worksheetId: number
  routeIdStr: string | undefined
  localFeePct: number
  setLocalFeePct: (val: number) => void
  localBonusPct: number | null
  setLocalBonusPct: (val: number | null) => void
  localF2Pct: number | null
  setLocalF2Pct: (val: number | null) => void
  localBonusF2Pct: number | null
  setLocalBonusF2Pct: (val: number | null) => void
  maxFeePct: number
  maxBonusPct: number
  maxF2Pct: number
  maxBonusF2Pct: number
  hasF2: boolean
  hasF2Bonus: boolean
  dialCaps: DialCaps
  totalCumPct: number
  currentTotalPaid: number
  currentMgmtTotalThis: number
  isTkdaView: boolean
  // Quyền LƯU dial (dealperiodworksheet.set_period_progress). false = view-only: hiện giá
  // trị dial nhưng ẩn nút Lưu + khoá input (KETOAN_HHQL). Tách khỏi quyền XEM (recipients).
  canEditDial: boolean
  /**
   * Báo cho cha biết dial đang ghi. Cha dùng để đóng băng việc nạp lại form và phủ overlay
   * lên Mục 4 — lưu dial ghi lại tiền của Mục 4 y như duyệt chi, nên số phải đứng yên tới
   * khi mọi request xong rồi mới đổi MỘT lần.
   */
  onWriteStateChange?: (busy: boolean) => void
  // Giải trình dial (dial_note) — BE bắt buộc khi dial phí/F2 lệch default; state đặt ở
  // DetailInfo vì call site "Duyệt chi thực nhận" cũng phải gửi cùng note.
  dialNote: string
  setDialNote: (val: string) => void
  // Auto-default BE trả (fee_default_pct / f2_default_pct) — mốc so lệch của ô giải trình.
  feeDefaultPct: number | null
  f2DefaultPct: number | null
}

// % hiển thị luôn cắt xuống 2 số thập phân (BE lưu/trả tới 10 số thập phân, ROUND_DOWN) —
// state/gửi API vẫn giữ full precision, chỉ chỗ render mới đi qua đây. FLOOR chứ không
// half-up: xem formatPctFloor — đây là quy tắc chung với Mục 2 và với trần dial.
const getPct = (v: string | number | null | undefined) => {
  if (v == null || v === '') return undefined
  return formatPctFloor(v, 2)
}

/** Trần của dial phải FLOOR về 2dp, không half-up: cap thật 21,8181… mà hiện
 *  "Tối đa 21,82%" thì user gõ đúng con số được quảng cáo lại bị clamp xuống im lặng. */
export const formatCapPct = (v: number | null | undefined) => formatPctFloor(v, 2)

/** Cắt xuống 2dp — đúng phép mà ô input dial dùng để hiển thị, và là `formatPctFloor`
 *  phiên bản trả SỐ. `toFixed(9)` trước khi trunc vì float: 69,23 * 100 ra
 *  6922.999999999999, trunc thẳng thì rơi mất 0,01. */
export const trunc2 = (v: number) => Math.trunc(Number((v * 100).toFixed(9))) / 100

/** Hai giá trị HIỂN THỊ GIỐNG NHAU ở 2dp ⇒ coi như KHÔNG đổi: input hiện bản cắt 2dp,
 *  user gõ lại y nguyên con số đang thấy không được tính là chỉnh sửa (nếu tính thì 10dp
 *  của BE bị ghi đè bằng bản đã cắt).
 *
 *  So bằng chính phép cắt của ô input, không bằng khoảng epsilon: từ khi ô hiện
 *  `trunc2` thay vì `Math.round`, khoảng cách giữa số hiện và state lên tới gần 0,01
 *  (34,9999999641 hiện thành 34,99) — epsilon 0,005 cũ sẽ coi cú gõ lại là chỉnh sửa và
 *  ghi 34,99 đè lên 10dp của BE. Cắt hai vế rồi so là phép hỏi đúng câu cần hỏi: "hai số
 *  này có hiện ra giống nhau trên màn không". */
export const precisionEq = (a: number | null, b: number | null) => {
  if (a === b) return true
  if (a == null || b == null) return false
  return trunc2(a) === trunc2(b)
}

/** Dial lệch default? So ở 2dp — đúng phép so BE dùng cho dial_deviates (kế toán nhập
 *  2dp, giá trị lưu 10dp: 21,82 gõ tay vs default 21,8181818000 KHÔNG tính là lệch).
 *  Thiếu default (BE chưa trả / không có trần) ⇒ không có mốc để lệch. */
export const dialDeviates2dp = (dial: number | null, defaultPct: number | null) => {
  if (dial == null || defaultPct == null) return false
  return Math.round(dial * 100) / 100 !== Math.round(defaultPct * 100) / 100
}

export interface PeriodFeeInfo {
  pct: number
  pctLabel: string
  isEstimated: boolean
}

/**
 * Gom "% thanh toán kỳ này – Phí" về một nguồn duy nhất.
 * Tỷ lệ phí đã lưu (`fee_progress_pct`) là ưu tiên hàng đầu.
 * Với kỳ đang chọn (`isCurrent`), hiển thị `localFeePct` đang chỉnh.
 * Khi kỳ chưa chốt dial phí, fallback về % thu theo tiền về (`fee_collection_pct` hoặc `distribution_pct`)
 * và gắn cờ `isEstimated = true` để render nhãn "(tạm tính theo tiền về)".
 */
export function getPeriodFeeInfo(
  alloc: Allocation,
  isCurrent: boolean,
  localFeePct: number
): PeriodFeeInfo {
  // "Chưa chốt dial" phải hiểu GIỐNG NHAU ở cả hai nhánh: BE từng trả chuỗi RỖNG thay vì
  // null cho `fee_progress_pct` (xem parse-pct.test.ts), nên chỉ kiểm `== null` sẽ coi kỳ
  // chưa chốt là đã chốt và mất nhãn "(tạm tính theo tiền về)".
  const hasPinnedDial = alloc.fee_progress_pct != null && alloc.fee_progress_pct !== ''

  if (isCurrent) {
    return {
      pct: localFeePct,
      pctLabel: formatPctFloor(localFeePct, 2),
      isEstimated: !hasPinnedDial,
    }
  }

  if (hasPinnedDial) {
    const num = parseFloat(alloc.fee_progress_pct as string)
    return {
      pct: num,
      pctLabel: getPct(alloc.fee_progress_pct) ?? formatPctFloor(num, 2),
      isEstimated: false,
    }
  }

  const rawFallback = alloc.fee_collection_pct ?? alloc.distribution_pct
  const num = parseFloat(rawFallback || '0')
  return {
    pct: num,
    pctLabel: getPct(rawFallback) ?? formatPctFloor(num, 2),
    isEstimated: true,
  }
}

/** One dial row: number input + hint, shared by the fee/bonus dials of the current period.
 *  readOnly = view-only role: show the pinned value but disable the number input. */
export const DialRow = ({
  label,
  color,
  value,
  max,
  hint,
  onChange,
  onBlur,
  readOnly = false,
}: {
  label: string
  color: string
  value: number
  max: number
  hint?: string
  onChange: (val: number) => void
  onBlur?: () => void
  readOnly?: boolean
}) => {
  // `draft` = đúng chuỗi user đang gõ, chỉ tồn tại khi ô đang được sửa. Không có draft
  // (lúc nghỉ / vừa load) thì hiện bản CẮT XUỐNG 2dp của state 10dp — trunc chứ không
  // round: nhãn "% TT phí" ngay trên ô và trần "Tối đa …" đều floor, ô input half-up là
  // nguồn duy nhất còn nói 35 trong khi cả màn nói 34,99. Trần 34,9999999641 hiện thành
  // 35 còn dụ kế toán gõ 35 rồi bị clamp ngầm — đúng thứ formatCapPct sinh ra để dập.
  // KHÔNG bind thẳng value={Math.round(value*100)/100}: input number là controlled, React
  // so sánh lỏng `node.value != value` nên khi user gõ 21,826 nó ghi đè DOM về 21,83 —
  // caret nhảy về cuối (không gõ nổi chữ số thứ 3) mà payload gửi đi vẫn là 21,826,
  // tức nhìn một đằng lưu một nẻo. Đúng thứ màn này sinh ra để dập.
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex h-[40px] items-center justify-between gap-2 rounded-md bg-neutral-50/60 px-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-neutral-700">{label}</span>
        {hint && (
          <IconInfo
            className="h-3.5 w-3.5 shrink-0 cursor-help text-neutral-400 transition-colors hover:text-neutral-600"
            title={hint}
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={max}
          step="any"
          value={draft ?? trunc2(value)}
          readOnly={readOnly}
          onWheel={(e) => e.currentTarget.blur()}
          onBlur={() => {
            setDraft(null)
            onBlur?.()
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            onChange(Math.max(0, Math.min(max, parseFloat(e.target.value || '0'))))
          }}
          style={{ color }}
          className="focus:border-action-primary-red-default focus:ring-action-primary-red-default h-7 w-16 [appearance:textfield] rounded border border-neutral-200 bg-white px-2 text-right text-[13px] font-bold outline-none read-only:cursor-not-allowed read-only:opacity-60 focus:ring-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-[12px] font-medium text-neutral-500">%</span>
      </div>
    </div>
  )
}

export const PaymentProgressTimeline = ({
  detail,
  currentDetail,
  sortedAllocations,
  worksheetId,
  routeIdStr,
  localFeePct,
  setLocalFeePct,
  localBonusPct,
  setLocalBonusPct,
  localF2Pct,
  setLocalF2Pct,
  localBonusF2Pct,
  setLocalBonusF2Pct,
  maxFeePct,
  maxBonusPct,
  maxF2Pct,
  maxBonusF2Pct,
  hasF2,
  hasF2Bonus,
  dialCaps,
  totalCumPct,
  currentTotalPaid,
  currentMgmtTotalThis,
  isTkdaView,
  canEditDial,
  onWriteStateChange,
  dialNote,
  setDialNote,
  feeDefaultPct,
  f2DefaultPct,
}: PaymentProgressTimelineProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  // silent: tự lo refetch một lượt ở cuối thay vì để mutation bung 4 invalidate chạy đua.
  const { mutateAsync: setPeriodProgress, isPending: isSavingDial } = useSetPeriodProgress({
    silent: true,
  })
  const queryClient = useQueryClient()
  const { showBlocked } = useBlockedActionDialog()

  /**
   * Lịch sử của một kỳ KHÁC kỳ đang chọn, tra trong HỢP của 2 payload.
   *
   * `previous_periods` của mỗi payload chỉ chứa các kỳ TRƯỚC kỳ của nó. Khi kế toán đang
   * xem một kỳ cũ (route = kỳ mới), `detail.previous_periods` không phủ được các kỳ nằm
   * sau nó — và ngược lại. Gộp cả hai mới đủ mọi thẻ kỳ trên Mục 3.
   */
  const findPrevPeriod = (alloc: Allocation) => {
    const match = (p: { period_year?: number | null; period_month?: number | null }) =>
      p.period_year === alloc.period_year && p.period_month === alloc.period_month
    return detail?.previous_periods?.find(match) || currentDetail?.previous_periods?.find(match)
  }

  const sumRecipients = (positions?: { recipients?: { amount?: string | null }[] }[] | null) =>
    positions?.reduce(
      (posSum, pos) =>
        posSum + (pos.recipients?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0),
      0
    ) || 0

  // Dial đang chỉnh lệch khỏi default BE (2dp) ⇒ hiện ô giải trình + chặn lưu khi trống.
  const storedNote = (detail.dial_note ?? '').trim()
  // Track bị lượt lưu dial vừa rồi ghi đè mà không ai yêu cầu — xem `dial-side-effects`.
  const [dialSideEffects, setDialSideEffects] = useState<DialSideEffect[]>([])
  const [dialSkippedRals, setDialSkippedRals] = useState<DialSkippedRals>({
    paidCount: 0,
    approvedNotPaidCount: 0,
  })
  // Tiền đang bị dial ghim thấp giữ lại, BE tính sẵn (`*_withheld_amount`): FE tự suy sẽ
  // phải chép lại toàn bộ phép fan + clamp của BE và chắc chắn lệch. Payload BE cũ chưa có
  // field ⇒ mảng rỗng ⇒ không hiện gì, không đoán.
  const withheldNotes = (
    [
      {
        key: 'fee',
        label: '% TT phí',
        amount: Number((detail as { fee_withheld_amount?: string }).fee_withheld_amount || 0),
        dial: Number(detail.fee_progress_pct || 0),
        defaultPct: Number(detail.fee_default_pct || 0),
      },
      {
        key: 'f2',
        label: '% TT phí F2',
        amount: Number((detail as { f2_withheld_amount?: string }).f2_withheld_amount || 0),
        dial: Number(detail.f2_progress_pct || 0),
        defaultPct: Number(detail.f2_default_pct || 0),
      },
    ] as const
  ).filter((note) => note.amount > 0)
  const dialDeviating =
    dialDeviates2dp(localFeePct, feeDefaultPct) ||
    (hasF2 && localF2Pct != null && dialDeviates2dp(localF2Pct, f2DefaultPct))

  return (
    <div className="border-border-1 overflow-hidden rounded-md border bg-white">
      {/* CR STT39 — Mục ① cũ đã gộp vào Mục "Căn hộ & Chia thực nhận", các mục sau
          dồn lên một bậc để dãy số trên màn vẫn chạy liền từ ①.
          Header đi qua `SubHead` như 5 mục còn lại: trước đây mục này tự dựng header
          riêng (badge xanh, tiêu đề 14px) nên lệch hẳn khỏi phần còn lại của màn. */}
      <SubHead
        n="3"
        title="Tiến độ thanh toán luỹ kế của căn"
        subtitle={
          <>
            CĐT trả căn theo nhiều kỳ. Thanh dưới cộng dồn % các kỳ đã thu; mỗi kỳ là một lần chia
            thực nhận. Bấm vào một kỳ để xem chi tiết kỳ đó — cả màn (Mục 4 và cột{' '}
            <b>% thanh toán kỳ này</b>) chuyển sang số liệu của kỳ được chọn. Với kỳ chưa duyệt chi,
            kế toán chỉnh <b>% TT phí</b> và <b>% TT thưởng</b> riêng — Mục 4 (Thành tiền phí /
            Thưởng sale) và Thưởng HH quản lý được tính lại theo 2 tỷ lệ này.
          </>
        }
      />

      {/* Thanh tiến độ — dựng theo pattern của Đối chiếu CĐT v2.0, xem PaymentProgressBar. */}
      <PaymentProgressBar
        segments={sortedAllocations.map((alloc) => {
          // Kỳ ĐANG CHỌN, không phải kỳ trên route: dial state của màn thuộc về kỳ đang
          // xem, nên đoạn thanh của nó phải đọc `localFeePct`, các kỳ khác đọc số đã lưu.
          // KHÔNG phân biệt theo `alloc.status`: đó là vòng đời duyệt chi cho nhân sự,
          // còn thanh này đo tiền CĐT đã về — tiền đã về rồi thì không phụ thuộc việc
          // bảng kê của kỳ đó đã được duyệt chi hay chưa.
          const isCurrent = alloc.worksheet_id === worksheetId
          const feeInfo = getPeriodFeeInfo(alloc, isCurrent, localFeePct)
          return {
            key: String(alloc.id || `${alloc.period_year}-${alloc.period_month}`),
            label: alloc.code,
            pct: feeInfo.pct,
            kind: isCurrent ? ('current' as const) : ('settled' as const),
          }
        })}
        cumulativePct={totalCumPct}
      />

      {/* Tiền về chưa phân bổ (treo) — tiền CĐT đã về nhưng chưa chia hết cho người nhận.
          Ẩn cả strip khi payload chưa có field treo (BE chưa deploy) để không hiện "0 đ" sai. */}
      {detail.unallocated_net != null && (
        <div className="mx-5 mb-1 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#92400E]">
          <span title="Tổng tiền CĐT đã về (pre-VAT) trừ đi hoa hồng đã DUYỆT CHI cho toàn căn. Khác mẫu số với ô bên cạnh: phần đã chia nhưng chưa duyệt chi vẫn được tính là chưa phân bổ.">
            Tiền về chưa phân bổ (toàn căn):{' '}
            <b className="">{formatCurrencyVND(Number(detail.unallocated_net || 0))} đ</b>
          </span>
          {detail.period_unallocated != null && (
            <span title="Tiền về trong kỳ đang xem trừ đi số ĐÃ CHIA của kỳ này (kể cả phần chưa duyệt chi) — phần còn lại được chia tiếp ở các kỳ sau.">
              Kỳ này chưa chia hết:{' '}
              <b className="">{formatCurrencyVND(Number(detail.period_unallocated || 0))} đ</b>
            </span>
          )}
          <span className="text-[10.5px] text-[#B45309]/80">
            Lưu ý: Doanh thu ghi nhận, KPI phòng/nhân viên và HHQL phòng (pool) đều tính theo dial
            "% thanh toán phí" này.
          </span>
        </div>
      )}

      {/* Period buttons grid */}
      <div className="grid grid-cols-1 gap-3.5 p-5 pt-3 md:grid-cols-3">
        {(() => {
          let accPct = 0
          return sortedAllocations.map((alloc) => {
            const isActive = alloc.worksheet_id === worksheetId
            const isPaid = alloc.status === 'APPROVED' || alloc.status === 'LOCKED'
            // `isCurrent` = kỳ ĐANG CHỌN (mọi giá trị/hành vi của thẻ bám vào đây, vì state
            // dial của màn là của kỳ đang xem). `isRoutePeriod` chỉ để đánh dấu badge "Hiện
            // tại" — kỳ mở từ danh sách — để kế toán không mất dấu mình vào màn từ kỳ nào.
            const isCurrent = isActive
            const isRoutePeriod = alloc.worksheet_id === Number(routeIdStr)
            /**
             * Màu đường kẻ trong thẻ phải đi theo nền thẻ. Thẻ đang chọn có nền đỏ nhạt, kẻ
             * xám `border-1` lên đó trông bệch và lệch hẳn so với thẻ kia — đúng chỗ hai thẻ
             * bị nhận xét là "footer khác biệt nhau".
             */
            const ruleCls = isActive ? 'border-red-20' : 'border-border-1'
            const feeInfo = getPeriodFeeInfo(alloc, isCurrent, localFeePct)
            const pct = feeInfo.pct
            accPct += pct

            const payoutAllocatedAmt = (() => {
              // Kỳ đang chọn = số đang tính trên màn (đã theo dial hiện hành).
              if (isCurrent) return currentTotalPaid + currentMgmtTotalThis
              // Kỳ mở từ danh sách: chính là payload `currentDetail`, không nằm trong
              // previous_periods của ai cả.
              if (isRoutePeriod) return sumRecipients(currentDetail?.positions)
              return sumRecipients(findPrevPeriod(alloc)?.positions)
            })()

            // Kỳ đã thu dùng ĐỎ primary (không phải xanh info): đỏ là màu chủ đạo của màn,
            // còn xanh lá vẫn giữ riêng cho "kỳ hiện tại" nên ba trạng thái vẫn phân biệt được.
            const statusColor = isCurrent
              ? 'var(--color-data-green-default)'
              : isPaid
                ? 'var(--color-action-primary-red-default)'
                : 'var(--color-neutral-300)'

            const periodVouchers = (() => {
              if (isCurrent) return detail?.receipt_vouchers || []
              if (isRoutePeriod) return currentDetail?.receipt_vouchers || []
              return findPrevPeriod(alloc)?.receipt_vouchers || []
            })()

            // Kỳ đã duyệt chi thực nhận → tiền CHẮC CHẮN sẽ chi; chưa duyệt thực nhận → có thể chi.
            const isDisbursementApproved = alloc.worksheet_status === 'APPROVED'
            const payoutLabel = isDisbursementApproved
              ? 'HH sẽ chi (đã duyệt chi thực nhận)'
              : 'HH có thể chi khi duyệt'

            // % đã chốt của kỳ: dial riêng nếu có; kỳ chưa chốt fallback về % PHÍ đã thu
            // của kỳ (Mục 2), cuối cùng mới tới % tiền về của căn.
            const feePctOfPeriod = feeInfo.pctLabel
            // Kỳ chưa chốt dial thưởng → hiển thị % thưởng ĐÃ THU của kỳ (Mục 2, theo tiền
            // về) thay vì chữ "theo tiền về", để đối chiếu được với số tiền Thưởng sale
            // đang chia ở Mục 4.
            const bonusPctOfPeriod = isCurrent
              ? localBonusPct != null
                ? formatPctFloor(localBonusPct, 2)
                : (getPct(alloc.bonus_progress_pct) ?? getPct(alloc.bonus_collection_pct) ?? '0%')
              : (getPct(alloc.bonus_progress_pct) ?? getPct(alloc.bonus_collection_pct) ?? '0%')
            // Kỳ đang chia theo tiền về (dial chưa chốt) → giữ nhãn phụ để không mất ngữ nghĩa.
            // Thưởng CĐT cam kết mà kỳ này chưa chi, tách theo NGUYÊN NHÂN (BE trả sẵn).
            const pendingUncollected = Number((detail as any).bonus_pending_uncollected_amount || 0)
            const pendingWithheld = Number((detail as any).bonus_pending_withheld_amount || 0)
            const bonusIsCashDriven = isCurrent
              ? localBonusPct == null
              : alloc.bonus_progress_pct == null
            // Tiến độ thưởng Admin quy định cho kỳ (shared_bonus_to_sale_pct của kỳ đối
            // chiếu) — mốc để kế toán chốt dial thưởng hợp lý. Kỳ chưa quy định = 0%
            // (không có hạn mức Admin thì không được chi thưởng kỳ này).
            const bonusDialLabel = getPct(alloc.bonus_dial_pct) ?? '0%'

            // F2 % của kỳ: dial riêng nếu đã chốt; kỳ hiện tại lấy giá trị đang chỉnh
            // (localF2Pct null = chưa chốt → gợi ý theo tiền về, hiển thị "—").
            const f2PctOfPeriod =
              isCurrent && localF2Pct != null
                ? formatPctFloor(localF2Pct, 2)
                : (getPct(alloc.f2_progress_pct) ?? '—')

            // Thưởng F2 % của kỳ: cùng quy tắc — dial đang chỉnh nếu đang ở kỳ hiện tại,
            // else giá trị đã chốt của kỳ ("—" when chưa chốt / đang catch-up theo tiền về).
            const bonusF2PctOfPeriod =
              isCurrent && localBonusF2Pct != null
                ? formatPctFloor(localBonusF2Pct, 2)
                : (getPct(alloc.bonus_f2_progress_pct) ?? '—')

            // Dial thay đổi so với giá trị BE đang giữ → hiện nút lưu.
            const storedFee =
              alloc.fee_progress_pct != null
                ? parseFloat(alloc.fee_progress_pct)
                : parseFloat(alloc.distribution_pct || '0')
            const storedBonus =
              alloc.bonus_progress_pct != null ? parseFloat(alloc.bonus_progress_pct) : null
            const storedF2 =
              alloc.f2_progress_pct != null ? parseFloat(alloc.f2_progress_pct) : null
            const storedBonusF2 =
              alloc.bonus_f2_progress_pct != null ? parseFloat(alloc.bonus_f2_progress_pct) : null

            const dialChanged =
              !precisionEq(localFeePct, storedFee) ||
              !precisionEq(localBonusPct ?? null, storedBonus) ||
              !precisionEq(localF2Pct ?? null, storedF2) ||
              !precisionEq(localBonusF2Pct ?? null, storedBonusF2)

            // `dialChanged` là cờ CHUNG cho cả 4 dial mà payload thì luôn gửi đủ 4 — nên
            // một dial đổi thật sẽ kéo theo 3 dial kia. Dial nào chỉ lệch dưới epsilon
            // (user gõ lại đúng con số 2dp đang hiển thị) thì gửi lại nguyên giá trị 10dp
            // của BE, không gửi bản đã tròn.
            const keepPrecision = (local: number | null, stored: number | null) =>
              local != null && stored != null && precisionEq(local, stored) ? stored : local

            const isDialEditable = canEditDial && !isDisbursementApproved && !isPaid

            const handleSaveDial = async (wsId: number | null | undefined) => {
              if (!wsId || !isDialEditable || !dialChanged || isSavingDial) return
              // Chặn client-side trước cho ca thường (BE vẫn 400 cho ca race): dial lệch
              // default mà chưa có giải trình thì không gửi — kế toán phải nhập lý do.
              if (dialDeviating && !dialNote.trim() && !storedNote) {
                toastService.error(
                  'Tỷ lệ chi lệch với tiền đã thu về — nhập giải trình trước khi lưu.'
                )
                return
              }
              try {
                onWriteStateChange?.(true)
                const saved = await setPeriodProgress({
                  id: Number(wsId),
                  data: {
                    fee_pct: keepPrecision(localFeePct, storedFee)!.toString(),
                    ...(localBonusPct != null
                      ? { bonus_pct: keepPrecision(localBonusPct, storedBonus)!.toString() }
                      : {}),
                    ...(localF2Pct != null
                      ? { f2_pct: keepPrecision(localF2Pct, storedF2)!.toString() }
                      : {}),
                    ...(localBonusF2Pct != null
                      ? {
                          bonus_f2_pct: keepPrecision(localBonusF2Pct, storedBonusF2)!.toString(),
                        }
                      : {}),
                    ...(dialNote.trim() ? { note: dialNote.trim() } : {}),
                  },
                })
                // MỘT lượt refetch có await, thay cho 4 invalidate + onRefresh không await:
                // số ở Mục 4 chỉ đổi đúng một lần, khi mọi query đã về.
                await refetchWorksheetQueries(queryClient, Number(wsId))
                // Đọc lại CHÍNH con số vừa lưu. Câu chung chung "phí/F2/thưởng" không cho
                // kế toán kiểm lại mình vừa chốt bao nhiêu, mà đây là con số quyết định tiền
                // chi của cả kỳ. Điều kiện liệt kê bám ĐÚNG các dial đang render ở Mục 3
                // (`hasF2`/`hasF2Bonus`), không bám việc payload có gửi field hay không —
                // deal thuần sale vẫn gửi `bonus_f2_pct: 0` và sẽ đọc ra "thưởng F2 0%" vô nghĩa.
                const savedDials = [
                  `phí ${formatPctFloor(localFeePct, 2)}`,
                  ...(hasF2 && localF2Pct != null ? [`F2 ${formatPctFloor(localF2Pct, 2)}`] : []),
                  ...(localBonusPct != null ? [`thưởng ${formatPctFloor(localBonusPct, 2)}`] : []),
                  ...(hasF2Bonus && localBonusF2Pct != null
                    ? [`thưởng F2 ${formatPctFloor(localBonusF2Pct, 2)}`]
                    : []),
                ].join(' · ')
                toastService.success(
                  `Đã lưu % thanh toán ${alloc.code} — ${savedDials}. Số tiền Mục 4 đã tính lại theo tỷ lệ mới.`
                )
                // Track nào BỊ GHI ĐÈ mà kế toán không hề đụng vào thì phải nói ra. Các xô
                // thưởng chạy theo % đối chiếu chứ không theo dial, nên MỌI lượt lưu đều
                // chạy lại catch-up của chúng: ws176 lưu dial phí F2 xong thưởng F2 nhảy
                // 509.423 → 1.018.846, và hạ dial trở lại KHÔNG kéo nó xuống (thưởng chưa
                // bao giờ đi theo dial đó). Im lặng thì không phân biệt được với bug.
                setDialSideEffects(readDialSideEffects(saved))
                setDialSkippedRals(readDialSkippedRals(saved))
              } catch (err) {
                // A draft payment voucher holding these payout splits blocks the dial —
                // the message names the voucher to cancel first, so it needs a dialog
                // rather than a toast that fades.
                if (isNonFieldError(err)) {
                  showBlocked(err, {
                    title: 'Chưa đổi được % thanh toán',
                    hint: 'Hủy phiếu chi nháp được nêu ở trên, rồi kéo lại tiến độ.',
                  })
                } else {
                  toastService.error(extractErrorMessage(err))
                }
              } finally {
                // Nhả cờ trong finally: lỗi dial (vd phiếu chi nháp đang giữ split) mà quên
                // nhả thì Mục 4 kẹt overlay và form không bao giờ nạp lại.
                onWriteStateChange?.(false)
              }
            }

            return (
              <div
                key={alloc.id || `${alloc.period_year}-${alloc.period_month}`}
                // Neo cho test: mọi giá trị trên thẻ phải là của kỳ ĐANG CHỌN, và bảng %
                // in cùng những con số ở nhiều ô nên phải khoanh đúng thẻ mới đối chiếu được.
                data-testid={`period-card-${alloc.period_year}-${alloc.period_month}`}
                onClick={() => {
                  if (!isActive && alloc.worksheet_id) {
                    const newParams = new URLSearchParams(searchParams)
                    if (alloc.worksheet_id === Number(routeIdStr)) {
                      newParams.delete('worksheet_id')
                    } else {
                      newParams.set('worksheet_id', alloc.worksheet_id.toString())
                    }
                    setSearchParams(newParams)
                  }
                }}
                style={{
                  // Kỳ đang xem: nền ĐỎ nhạt — cùng thang với viền đỏ, nhìn phát ra ngay.
                  // Kỳ khác: XÁM rõ (`background-3`) chứ không phải trắng hay gần trắng —
                  // panel bọc ngoài đã trắng, thẻ trắng/`#f9f9f9` lẫn thẳng vào nền. Xám ở đây
                  // còn đúng nghĩa "kỳ này không phải chỗ đang làm việc".
                  background: isActive ? 'var(--color-red-10)' : 'var(--color-background-3)',
                  // CÙNG độ dày viền cho cả hai trạng thái. Trước đây thẻ đang chọn dày 2px,
                  // hẹp hơn thẻ kia 1px ở mỗi bên — đủ để hàng "% TT phí / % TT thưởng / Lũy kế"
                  // bẻ dòng ở thẻ này mà không bẻ ở thẻ kia, thành ra hai thẻ lệch layout.
                  border: `1.5px solid ${isActive ? 'var(--color-action-primary-red-default)' : 'var(--color-border-1, #E5E7EB)'}`,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  borderRadius: 8,
                  padding: '10px 12px',
                  transition: 'border-color 120ms, background 120ms, box-shadow 120ms',
                }}
                className={
                  isActive
                    ? ''
                    : alloc.id
                      ? 'cursor-pointer hover:bg-neutral-50'
                      : 'cursor-not-allowed opacity-90'
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    <span className="text-[13px] font-medium text-neutral-900">
                      {`Kỳ ${String(alloc.period_month).padStart(2, '0')}/${alloc.period_year}`}
                    </span>
                  </div>
                  {/* Badge duy nhất còn neo theo kỳ MỞ TỪ DANH SÁCH, không theo kỳ đang chọn. */}
                  {isRoutePeriod ? (
                    <span className="bg-data-green-disabled text-data-green-default border-data-green-default/30 ml-auto rounded border px-1.5 py-0.5 text-[10px] font-medium">
                      Hiện tại
                    </span>
                  ) : isPaid ? (
                    <span className="bg-red-10 text-action-primary-red-default border-action-primary-red-default/20 ml-auto rounded border px-1.5 py-0.5 text-[10px] font-medium">
                      Đã thu
                    </span>
                  ) : (
                    <span className="ml-auto rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                      Dự kiến
                    </span>
                  )}
                </div>

                {/* Hàng 1 (% TT phí · % TT thưởng · Lũy kế) và hàng 2 (% TT F2 · % Thưởng F2)
                    nằm trong CÙNG MỘT lưới để hai hàng dùng chung cột — "% Thưởng F2" phải
                    thẳng cột với "% TT thưởng" ngay trên nó. Tách làm hai khối flex riêng thì
                    mỗi hàng tự gói trái, nhãn lệch nhau vì "% TT F2" ngắn hơn "% TT phí".

                    Cột khai `auto auto 1fr`, KHÔNG phải `grid-cols-3` chia đều: chia đều bóp ô
                    giữa làm cặp nhãn–giá trị bị bẻ làm đôi (nhãn một dòng, số dòng dưới). `auto`
                    co theo nội dung nên không bao giờ bóp, `whitespace-nowrap` khoá từng cặp
                    thành một khối.

                    Mọi giá trị % để MỘT màu chữ đậm: chúng cùng là một đại lượng, phân biệt
                    phí / thưởng / lũy kế đã nằm ở nhãn. Trước đây mỗi số một màu (lục, cam,
                    lam, tím) khiến thẻ nhỏ gánh 5 sắc mà không sắc nào thêm thông tin. */}
                <div
                  className={`${ruleCls} mt-2.5 grid grid-cols-[auto_auto_1fr] items-baseline gap-x-4 gap-y-1.5 border-t pt-2 text-[12px]`}
                >
                  <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-[11px] text-neutral-500">% TT phí:</span>
                    <span
                      data-testid="period-fee-pct"
                      className="text-content-dark-1 font-mono text-[14px] font-bold"
                    >
                      {feePctOfPeriod}
                    </span>
                    <DistributionPctFormulaHint breakdown={alloc.distribution_pct_breakdown} />
                  </span>

                  <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-[11px] text-neutral-500">% TT thưởng:</span>
                    <span
                      className="text-content-dark-1 font-mono text-[14px] font-bold"
                      title={
                        bonusIsCashDriven
                          ? 'Kỳ chưa chốt dial thưởng — số hiển thị là % thưởng đã thu theo tiền về của kỳ.'
                          : undefined
                      }
                    >
                      {bonusPctOfPeriod}
                    </span>
                  </span>

                  <span className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
                    <span className="text-[11px] text-neutral-400">Lũy kế:</span>
                    <span className="font-mono text-[13px] font-semibold text-neutral-700">
                      {formatPctFloor(accPct, 2)}
                    </span>
                  </span>

                  {/* Hàng 2. Ô rỗng vẫn phải render: chỉ có F2 mà không có thưởng F2 (hoặc
                      ngược lại) thì thiếu ô là ô còn lại tụt sang cột 1, mất thẳng hàng. */}
                  {(hasF2 || hasF2Bonus) && (
                    <>
                      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                        {hasF2 && (
                          <>
                            <span className="text-[11px] text-neutral-500">% TT F2:</span>
                            <span className="font-mono text-[13px] font-semibold text-neutral-700">
                              {f2PctOfPeriod}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                        {hasF2Bonus && (
                          <>
                            <span className="text-[11px] text-neutral-500">% Thưởng F2:</span>
                            <span className="font-mono text-[13px] font-semibold text-neutral-700">
                              {bonusF2PctOfPeriod}
                            </span>
                          </>
                        )}
                      </span>
                      <span />
                    </>
                  )}
                </div>

                {/* Thưởng còn treo — tách theo NGUYÊN NHÂN. Gộp một dòng thì tháng sau
                    không ai biết phần thiếu là do CĐT chưa trả hay do kế toán giữ lại. */}
                {isCurrent && (pendingUncollected > 0 || pendingWithheld > 0) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                    {pendingUncollected > 0 && (
                      <span
                        className="text-[#9CA3AF]"
                        title="CĐT đã cam kết trong đối chiếu nhưng chưa trả tiền hoá đơn — không thao tác gì được, tiền về là tự vào."
                      >
                        Treo chờ tiền về:{' '}
                        <span className="font-mono font-semibold text-neutral-600">
                          {formatCurrencyVND(pendingUncollected)}
                        </span>
                      </span>
                    )}
                    {pendingWithheld > 0 && (
                      <span
                        className="text-[#9CA3AF]"
                        title="Kỳ này thu được rồi nhưng dial thưởng đang để thấp hơn trần — kéo dial lên là chi được ngay."
                      >
                        Kế toán giữ lại:{' '}
                        <span className="font-mono font-semibold text-[#B45309]">
                          {formatCurrencyVND(pendingWithheld)}
                        </span>
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-neutral-400">
                  <span>Tiến độ thưởng Admin quy định:</span>
                  <span className="font-mono font-medium text-neutral-600">{bonusDialLabel}</span>
                  {bonusIsCashDriven && (
                    <span
                      className="text-[#9CA3AF]"
                      title="Số 'theo tiền về' ở trên có thể vượt mốc Admin quy định — chốt dial thưởng không được vượt mốc này."
                    >
                      (căn cứ chốt dial)
                    </span>
                  )}
                </div>

                <div
                  className={`${ruleCls} mt-2.5 flex flex-col gap-2 border-t pt-2 text-[13px] font-medium text-neutral-900`}
                >
                  <div
                    title={
                      isDisbursementApproved
                        ? 'Kỳ đã được duyệt chi — đây là số HH sẽ chi.'
                        : 'Kỳ chưa duyệt chi — đây là số HH dự kiến, chỉ chi sau khi Duyệt chi thực nhận.'
                    }
                  >
                    <span className={isDisbursementApproved ? 'text-[#16A34A]' : 'text-[#B45309]'}>
                      {payoutLabel}
                    </span>
                    : <span className="font-bold">{formatCurrencyVND(payoutAllocatedAmt)} đ</span>
                  </div>

                  {/* List phiếu thu trong kỳ */}
                  {periodVouchers.length > 0 && (
                    <div
                      className={`${ruleCls} mt-1 flex flex-col gap-1 border-t border-dashed pt-1 text-[11px]`}
                    >
                      {periodVouchers.map((rv) => (
                        <div
                          key={rv.id}
                          className="flex items-center justify-between text-neutral-600"
                        >
                          <Link
                            to={APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', String(rv.id))}
                            className="text-action-primary-red-default font-semibold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rv.code}
                          </Link>
                          <span className="font-normal text-neutral-400">
                            {formatDate(rv.receipt_date)}
                          </span>
                          <span className="font-bold text-neutral-800">
                            {formatCurrencyVND(Number(rv.total_amount || 0))} đ
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isCurrent && detail.recipients_editable && !isTkdaView && (
                  <div
                    className={`${ruleCls} mt-2.5 border-t border-dashed pt-2.5`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                        % THANH TOÁN KỲ NÀY
                      </span>
                      {isDisbursementApproved ? (
                        <span
                          className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500"
                          title="Đã duyệt chi — không thể chỉnh sửa tỷ lệ thanh toán trừ khi mở lại bảng kê"
                        >
                          Đã duyệt chi (Khóa sửa)
                        </span>
                      ) : !canEditDial ? (
                        <span
                          className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400"
                          title="Bạn chỉ có quyền xem tỷ lệ chia — không có quyền lưu (dealperiodworksheet.set_period_progress)."
                        >
                          Chỉ xem
                        </span>
                      ) : null}
                      {isDialEditable && dialChanged && (
                        <IconButton
                          size="small"
                          variant="primary"
                          loading={isSavingDial}
                          disabled={isSavingDial}
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          title="Lưu % thanh toán — Mục 4 và Thưởng HH quản lý sẽ tính lại theo tỷ lệ mới"
                          onClick={() => handleSaveDial(alloc.worksheet_id)}
                        >
                          <IconFloppydisk className="h-3.5 w-3.5" />
                        </IconButton>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Column 1: Phí & Phí F2 */}
                      <div className="flex flex-col gap-2.5">
                        <DialRow
                          label="Phí"
                          color="var(--color-data-green-default)"
                          value={localFeePct}
                          max={maxFeePct}
                          readOnly={!isDialEditable || isSavingDial}
                          hint={
                            dialCaps.feeCollected != null
                              ? `Tối đa ${formatCapPct(maxFeePct)} — lũy kế % TT phí đã thu từ CĐT: ${formatPctFloor(dialCaps.feeCollected, 2)}`
                              : `Tối đa ${formatCapPct(maxFeePct)} (phần còn lại của căn)`
                          }
                          onChange={setLocalFeePct}
                          onBlur={() => handleSaveDial(alloc.worksheet_id)}
                        />
                        {hasF2 && (
                          <DialRow
                            label="Phí F2"
                            color="#2563EB"
                            value={localF2Pct ?? 0}
                            max={maxF2Pct}
                            readOnly={!isDialEditable || isSavingDial}
                            hint={[
                              dialCaps.feeCollected != null
                                ? `Tối đa ${formatCapPct(maxF2Pct)} — trần thu theo đối chiếu CĐT: ${formatPctFloor(dialCaps.feeCollected, 2)}`
                                : `Tối đa ${formatCapPct(maxF2Pct)}`,
                              dialCaps.f2Prior
                                ? `đã chi kỳ trước: ${formatPctFloor(dialCaps.f2Prior, 2)}`
                                : null,
                              localF2Pct == null ? 'chưa chốt — F2 giữ nguyên' : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            onChange={setLocalF2Pct}
                            onBlur={() => handleSaveDial(alloc.worksheet_id)}
                          />
                        )}
                      </div>

                      {/* Column 2: Thưởng & Thưởng F2 */}
                      <div className="flex flex-col gap-2.5">
                        <DialRow
                          label="Thưởng"
                          color="#B45309"
                          value={localBonusPct ?? 0}
                          max={maxBonusPct}
                          readOnly={!isDialEditable || isSavingDial}
                          hint={[
                            dialCaps.bonusDial != null
                              ? `Tiến độ TT thưởng sale/F2 kỳ này (đối chiếu CĐT): ${formatCapPct(dialCaps.bonusDial)}`
                              : null,
                            dialCaps.bonusCollected != null
                              ? `lũy kế % TT thưởng đã thu: ${formatPctFloor(dialCaps.bonusCollected, 2)}`
                              : null,
                            localBonusPct == null ? 'chưa chốt — đang chia theo tiền về' : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          onChange={setLocalBonusPct}
                          onBlur={() => handleSaveDial(alloc.worksheet_id)}
                        />
                        {hasF2Bonus && (
                          <DialRow
                            label="Thưởng F2"
                            color="#7C3AED"
                            value={localBonusF2Pct ?? 0}
                            max={maxBonusF2Pct}
                            readOnly={!isDialEditable || isSavingDial}
                            hint={[
                              dialCaps.bonusDial != null
                                ? `Tiến độ TT thưởng sale/F2 kỳ này (đối chiếu CĐT): ${formatCapPct(dialCaps.bonusDial)}`
                                : null,
                              dialCaps.bonusF2Prior
                                ? `đã chi thưởng F2 kỳ trước: ${formatPctFloor(dialCaps.bonusF2Prior, 2)}`
                                : null,
                              localBonusF2Pct == null ? 'chưa chốt — đang chia theo tiền về' : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            onChange={setLocalBonusF2Pct}
                            onBlur={() => handleSaveDial(alloc.worksheet_id)}
                          />
                        )}
                      </div>
                    </div>
                    {/* Dial ghim THẤP hơn default đang giữ tiền lại khỏi bảng chia. Dial là
                        mục tiêu CẢ KỲ, nên khi đợt trước đã tiêu hết quota, đợt mới về được
                        cấp 0đ và tiền của nó biến mất khỏi Mục 4 mà không ai nói gì — ws176
                        thu 150.000.000đ ở PT000000849 mà phí F2 vẫn 0đ vì dial còn 10% so
                        với 22,84% đã thu. Nêu bằng TIỀN: % của một share mà màn không cộng
                        thì không giải thích được gì. */}
                    {isCurrent && withheldNotes.length > 0 && (
                      <div className="mt-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                        {withheldNotes.map((note) => (
                          <div key={note.key}>
                            {/* `formatPctFloor` đã tự gắn dấu %, thêm '%' nữa là ra "70%%" —
                                đo được trên staging worksheet 2. */}
                            Tỷ lệ <b>{note.label}</b> đang ghim {formatPctFloor(note.dial, 2)} trong
                            khi tiền về đã {formatPctFloor(note.defaultPct, 2)} —{' '}
                            <b>{formatCurrencyVND(note.amount)} đ</b> chưa được mở để chia.
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Dòng đã duyệt "Chia hoa hồng thực nhận" (chưa chi) hoặc đã chi bị LOẠI
                        khỏi lượt tính lại — ClickUp 86eyjxwd3: không ghi đè số đã chốt. */}
                    {isCurrent &&
                      (dialSkippedRals.approvedNotPaidCount > 0 ||
                        dialSkippedRals.paidCount > 0) && (
                        <div className="mt-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                          {dialSkippedRals.approvedNotPaidCount > 0 && (
                            <div>
                              <b>{dialSkippedRals.approvedNotPaidCount}</b> dòng đã duyệt Chia hoa
                              hồng thực nhận (chưa chi tiền) được giữ nguyên, không tính lại theo tỷ
                              lệ mới — muốn sửa số này thì Mở lại bảng kê trước.
                            </div>
                          )}
                          {dialSkippedRals.paidCount > 0 && (
                            <div>
                              <b>{dialSkippedRals.paidCount}</b> dòng đã chi tiền được giữ nguyên,
                              không tính lại.
                            </div>
                          )}
                        </div>
                      )}
                    {/* Track bị ghi đè mà kế toán không yêu cầu (xem dial-side-effects). */}
                    {dialSideEffects.length > 0 && (
                      <div className="mt-2.5 rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700">
                        <div className="font-medium">
                          Lượt lưu vừa rồi còn cập nhật lại các khoản sau theo % đối chiếu:
                        </div>
                        {dialSideEffects.map((effect) => (
                          <div key={effect.track}>
                            {dialTrackLabel(effect.track)}: {formatCurrencyVND(effect.before)} đ →{' '}
                            <b>{formatCurrencyVND(effect.after)} đ</b>
                          </div>
                        ))}
                        <div className="mt-1 text-neutral-500">
                          Các khoản này chạy theo % đối chiếu chứ không theo tỷ lệ chi, nên hạ tỷ lệ
                          chi xuống lại KHÔNG kéo chúng về mức cũ.
                        </div>
                      </div>
                    )}
                    {/* Giải trình khi duyệt lệch tiền về: BE bắt buộc note khi dial phí/F2
                        lệch default (2dp). Hiện sẵn khi worksheet đã có note (audit). */}
                    {(dialDeviating || storedNote || dialNote) && (
                      <div className="mt-2.5">
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[#B45309]">
                            Giải trình duyệt lệch tiền về
                            {dialDeviating && (
                              <span className="ml-1 font-normal text-[#B45309]/80">
                                (bắt buộc — tỷ lệ chi khác tỷ lệ tiền đã thu)
                              </span>
                            )}
                          </span>
                        </div>
                        <textarea
                          value={dialNote}
                          onChange={(e) => setDialNote(e.target.value)}
                          readOnly={!isDialEditable || isSavingDial}
                          rows={2}
                          maxLength={2000}
                          placeholder="Lý do duyệt tỷ lệ khác với tiền CĐT đã thanh toán…"
                          className="focus:border-action-primary-red-default focus:ring-action-primary-red-default w-full rounded border border-neutral-200 bg-white px-2 py-1.5 text-[12px] text-neutral-800 outline-none read-only:cursor-not-allowed read-only:opacity-60 focus:ring-1"
                        />
                      </div>
                    )}
                    <p className="mt-2 text-[12px] text-neutral-500">
                      % hiển thị làm tròn 2 số thập phân; số tiền được tính theo tiền mặt thực thu.
                    </p>
                  </div>
                )}
              </div>
            )
          })
        })()}
      </div>
    </div>
  )
}
