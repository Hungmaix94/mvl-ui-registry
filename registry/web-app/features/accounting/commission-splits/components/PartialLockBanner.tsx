import { formatCurrencyVND } from '@/utils/common'

export type LockedTranche = {
  pbtv_id: number
  pbtv_code: string
  receipt_code: string
  /** Tiền mặt về trên phiếu thu của đợt. */
  amount: string
  /** Phần đợt này đóng góp vào tổng đã chốt / còn chia được. Σ = locked_amount / editable_amount. */
  split_amount?: string
  payment_voucher_codes: string[]
}

interface Props {
  /** Còn ít nhất một đợt sửa được. */
  recipientsEditable: boolean
  /** Lý do phần bị đóng băng; null khi không có đợt nào bị khoá. */
  recipientsLockReason: string | null
  lockedAmount: string | number
  editableAmount: string | number
  lockedTranches: LockedTranche[]
  /** Các đợt chưa khoá — để đối chiếu tiền về với phần thực sự còn chia được. */
  openTranches?: LockedTranche[]
}

/**
 * Kỳ chốt MỘT PHẦN: đợt tiền về trước đã có phiếu chi nên đóng băng, đợt sau vẫn mở.
 *
 * Trước đây cả bảng chia bị xám khi có một đợt đã chi, mà màn hình không nói vì sao —
 * kế toán chỉ thấy mọi nút biến mất. Banner này nói thẳng: bao nhiêu đã chốt, bao nhiêu
 * còn chia được, và phiếu chi nào đã đóng băng đợt kia (huỷ phiếu đó là cách duy nhất
 * mở lại phần đã chốt).
 *
 * Hai con số tổng KHÔNG tự giải thích được nên phải liệt kê từng đợt kèm mã phiếu thu:
 *
 * 1. Tiền về ≠ tiền chia. Đợt mở có thể nhận 150.000.000 mà chỉ còn 196.544 chia được,
 *    vì phần phí gốc đã về 0 và chỉ còn thưởng trừ giảm trừ (số RÒNG, có dòng âm).
 * 2. Tổng chỉ đếm các dòng chia theo phiếu thu; các dòng quản lý (mgmt_*) không nằm trong
 *    đó, nên tổng phân bổ của đợt luôn lớn hơn con số hiện ra.
 *
 * Không hiện khi kỳ chưa có đợt nào bị khoá — trạng thái phổ biến, thêm banner chỉ gây nhiễu.
 */
export function PartialLockBanner({
  recipientsEditable,
  recipientsLockReason,
  lockedAmount,
  editableAmount,
  lockedTranches,
  openTranches = [],
}: Props) {
  const locked = Number(lockedAmount ?? 0)
  if (!recipientsLockReason || locked <= 0) return null

  const editable = Number(editableAmount ?? 0)
  const vouchers = Array.from(new Set(lockedTranches.flatMap((t) => t.payment_voucher_codes)))

  return (
    <div
      role="status"
      className="border-border-1 mb-3 rounded-lg border bg-amber-50 px-4 py-3 text-[13px] text-neutral-700"
    >
      <div className="font-semibold text-amber-800">
        {recipientsEditable ? 'Kỳ này đã chốt một phần' : 'Kỳ này đã chốt toàn bộ'}
      </div>
      <div className="mt-1">
        <span className="font-semibold">{formatCurrencyVND(locked)} đ</span> đã chốt (đã có phiếu
        chi, không sửa được)
        {recipientsEditable && (
          <>
            {' · '}
            <span className="font-semibold">{formatCurrencyVND(editable)} đ</span> còn chia được
          </>
        )}
      </div>

      {(lockedTranches.length > 0 || openTranches.length > 0) && (
        <ul className="mt-2 flex flex-col gap-1">
          {lockedTranches.map((t) => (
            <TrancheRow key={t.pbtv_id} tranche={t} locked />
          ))}
          {recipientsEditable &&
            openTranches.map((t) => <TrancheRow key={t.pbtv_id} tranche={t} locked={false} />)}
        </ul>
      )}

      {vouchers.length > 0 && (
        <div className="mt-2 text-[12px] text-neutral-500">
          Huỷ phiếu chi {vouchers.join(', ')} nếu thật sự cần sửa lại phần đã chốt.
        </div>
      )}
    </div>
  )
}

function TrancheRow({ tranche, locked }: { tranche: LockedTranche; locked: boolean }) {
  const received = Number(tranche.amount ?? 0)
  const split = Number(tranche.split_amount ?? 0)
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
      <span aria-hidden>{locked ? '🔒' : '🟢'}</span>
      <span className="font-mono font-semibold text-neutral-700">{tranche.receipt_code}</span>
      <span className="font-mono text-neutral-400">{tranche.pbtv_code}</span>
      <span className="text-neutral-500">
        về {formatCurrencyVND(received)} đ → {formatCurrencyVND(split)} đ{' '}
        {locked ? 'đã chia, khoá' : 'còn chia được'}
      </span>
      {locked && tranche.payment_voucher_codes.length > 0 && (
        <span className="text-neutral-500">
          bởi{' '}
          <span className="font-mono text-neutral-600">
            {tranche.payment_voucher_codes.join(', ')}
          </span>
        </span>
      )}
    </li>
  )
}
