import { Link } from 'react-router-dom'
import { formatCurrencyVND } from '@/utils/common'
import { APP_PATH } from '@/routes'
import {
  type RedirectedOutItem,
  ORIGINAL_BENEFICIARY_TYPE_LABEL,
  sumRedirectedOut,
  groupRedirectedOut,
} from '@/features/accounting/commissions/utils/summary-breakdown'

type Props = {
  items: RedirectedOutItem[]
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Đã duyệt chi',
  paid: 'Đã chi',
}

// Block informational trên detail của NGƯỜI HƯỞNG GỐC: các khoản của họ mà người khác
// nhận thay ("nhận hộ"). Tiền + thuế thuộc về người thực nhận — KHÔNG cộng vào tổng kỳ này.
// Gộp theo (deal, người nhận) — BE trả 1 dòng / split (mỗi phiếu thu 1 split).
export const RedirectedOutSection = ({ items }: Props) => {
  if (!items.length) return null
  const groups = groupRedirectedOut(items)
  return (
    <div
      className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
      style={{ borderLeft: '4px solid #64748B' }}
    >
      <div
        className="border-border-1 flex items-center justify-between border-b px-6 py-4"
        style={{ backgroundColor: '#64748B0D' }}
      >
        <div>
          <div className="text-[14px] font-semibold text-neutral-900">
            Đã chuyển người khác nhận (nhận hộ)
          </div>
          <div className="text-[11px] text-neutral-500">
            Phần chia thực nhận của bạn do người khác đứng ra nhận — KHÔNG tính vào tổng chi kỳ này
            của bạn
          </div>
        </div>
        <div className="text-right text-sm font-bold text-neutral-700">
          {formatCurrencyVND(sumRedirectedOut(items))} đ
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-border-1 bg-neutral-20 border-b text-[11px] tracking-wider text-neutral-500 uppercase">
              <th className="px-6 py-3 font-medium whitespace-nowrap">Mã deal</th>
              <th className="px-6 py-3 font-medium">Người nhận thay</th>
              <th className="px-6 py-3 font-medium">Lý do</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap">Trạng thái</th>
              <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Số tiền</th>
            </tr>
          </thead>
          <tbody className="divide-border-1 divide-y bg-white">
            {groups.map((group) => (
              <tr key={group.key} className="text-[13px] hover:bg-neutral-50">
                <td className="px-6 py-3.5">
                  {group.deal_id ? (
                    <Link
                      to={APP_PATH.DEAL_DETAIL.replace(':id', String(group.deal_id))}
                      className="text-brand-primary font-medium hover:underline"
                    >
                      <code className="text-xs">{group.deal_code || 'N/A'}</code>
                    </Link>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                  {group.split_count > 1 && (
                    <div className="text-[11px] text-neutral-400">
                      {group.split_count} đợt tiền về
                    </div>
                  )}
                </td>
                <td className="px-6 py-3.5 text-neutral-800">
                  {group.payee ? (
                    <span>
                      <span className="mr-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                        {ORIGINAL_BENEFICIARY_TYPE_LABEL[group.payee.type] || group.payee.type}
                      </span>
                      {group.payee.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td
                  className="max-w-[260px] truncate px-6 py-3.5 text-neutral-500"
                  title={group.reasons.join(' · ')}
                >
                  {group.reasons.join(' · ') || '—'}
                </td>
                <td className="px-6 py-3.5 text-neutral-600">
                  {STATUS_LABEL[group.status] || group.status}
                </td>
                <td className="px-6 py-3.5 text-right font-semibold text-neutral-700">
                  {formatCurrencyVND(group.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
