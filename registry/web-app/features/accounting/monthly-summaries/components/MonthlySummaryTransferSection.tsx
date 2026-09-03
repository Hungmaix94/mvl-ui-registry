import { Text } from '@/components/ui'
import { formatCurrencyVND } from '@/utils/common'

/**
 * Mục "Khấu trừ HHQL" trên chi tiết bảng tổng kỳ.
 *
 * Gộp hai loại vào MỘT mục để kế toán chỉ nhìn một chỗ, nhưng vẫn ghi rõ mục đích từng
 * dòng vì hai loại khác nhau về bản chất:
 *   - khấu trừ để thưởng: tiền sang người khác, có tên người nhận;
 *   - khấu trừ vĩnh viễn: tiền ở lại công ty, có lý do (phạt / chia sai / ...).
 *
 * Mọi dòng đều TRƯỚC THUẾ nên không cần nhãn trước/sau thuế; số hiển thị âm vì đây là
 * khoản trừ khỏi thu nhập của kỳ.
 *
 * Mục "Thưởng từ khấu trừ của người khác" tách riêng và read-only: phiếu chỉ sửa được từ
 * phía người bị khấu trừ, tránh hai người cùng sửa một phiếu.
 */

type TransferItem = {
  transfer_id: number
  counterparty?: { id: number; code?: string; full_name?: string; department?: string } | null
  amount: string
  period?: string
  reason?: string
  note?: string
}

type DeductionItem = {
  deduction_id: number
  reason_kind_display?: string
  amount: string
  reason?: string
  attachment?: string | null
}

type Props = {
  transferOut?: { subtotal?: string; items?: TransferItem[] }
  transferIn?: { subtotal?: string; items?: TransferItem[] }
  deduction?: { subtotal?: string; items?: DeductionItem[] }
  /** HHQL gộp trước khi trừ — để hiện dòng "còn lại". */
  hhqlTotal?: string
}

function Row({ label, sub, amount }: { label: string; sub?: string; amount: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-2 text-sm">
      <div className="min-w-0">
        <div className="truncate text-neutral-800">{label}</div>
        {sub ? <div className="truncate text-xs text-neutral-400">{sub}</div> : null}
      </div>
      <div className="shrink-0 font-medium text-rose-600">{formatCurrencyVND(Number(amount))}</div>
    </div>
  )
}

export default function MonthlySummaryTransferSection({
  transferOut,
  transferIn,
  deduction,
  hhqlTotal,
}: Props) {
  const outItems = transferOut?.items || []
  const deductionItems = deduction?.items || []
  const inItems = transferIn?.items || []

  const hasDeductionBlock = outItems.length > 0 || deductionItems.length > 0
  if (!hasDeductionBlock && inItems.length === 0) return null

  const deductedTotal = Number(transferOut?.subtotal || 0) + Number(deduction?.subtotal || 0)
  const remaining = Number(hhqlTotal || 0) + deductedTotal

  return (
    <div className="flex flex-col gap-4">
      {hasDeductionBlock && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
            <Text className="font-semibold text-gray-900">Khấu trừ HHQL</Text>
            <Text className="text-xs text-gray-400">
              Khoản trừ trước thuế khỏi HHQL của kỳ. Dòng &quot;thưởng&quot; là tiền chuyển sang
              người khác; dòng &quot;khấu trừ&quot; là tiền ở lại công ty.
            </Text>
          </div>
          <div className="divide-y divide-gray-50">
            {outItems.map((item) => (
              <Row
                key={`out-${item.transfer_id}-${item.counterparty?.id}`}
                label={`Khấu trừ chia cho ${item.counterparty?.full_name || '—'} (thưởng)`}
                sub={[item.counterparty?.code, item.counterparty?.department, item.note]
                  .filter(Boolean)
                  .join(' · ')}
                amount={item.amount}
              />
            ))}
            {deductionItems.map((item) => (
              <Row
                key={`ded-${item.deduction_id}`}
                label={`${item.reason_kind_display || 'Khấu trừ'} (khấu trừ)${item.attachment ? ' 📎' : ''}`}
                sub={item.reason}
                amount={item.amount}
              />
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3 text-sm">
            <span className="text-neutral-500">Tổng khấu trừ</span>
            <span className="font-semibold text-rose-600">{formatCurrencyVND(deductedTotal)}</span>
          </div>
          {hhqlTotal !== undefined && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm">
              <span className="text-neutral-500">HHQL còn lại sau khấu trừ</span>
              <span className="font-semibold text-neutral-800">{formatCurrencyVND(remaining)}</span>
            </div>
          )}
        </div>
      )}

      {inItems.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
            <Text className="font-semibold text-gray-900">
              Thưởng từ khấu trừ HHQL của người khác
            </Text>
            <Text className="text-xs text-gray-400">
              Phiếu do người bị khấu trừ tạo — không sửa được ở đây.
            </Text>
          </div>
          <div className="divide-y divide-gray-50">
            {inItems.map((item) => (
              <div
                key={`in-${item.transfer_id}`}
                className="flex items-start justify-between gap-4 px-5 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate text-neutral-800">
                    Thưởng từ {item.counterparty?.full_name || '—'}
                  </div>
                  <div className="truncate text-xs text-neutral-400">
                    {[item.counterparty?.code, item.period ? `khấu trừ HHQL kỳ ${item.period}` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="shrink-0 font-medium text-teal-700">
                  {formatCurrencyVND(Number(item.amount))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3 text-sm">
            <span className="text-neutral-500">Tổng nhận</span>
            <span className="font-semibold text-teal-700">
              {formatCurrencyVND(Number(transferIn?.subtotal || 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
