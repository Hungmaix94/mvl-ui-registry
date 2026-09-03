import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui'
import { APP_PATH } from '@/routes'

import {
  FEE_SUPPORT_GATE_ERROR_CODE,
  FeeSupportRequestStatus,
} from '../constants/fee-support-request-constants'
import type { FeeSupportGateExtra } from '../constants/fee-support-request-constants'
import type { FeeSupportRequestBrief } from '../services/fee-support-request-service'
import { FeeSupportRequestStatusBadge } from './FeeSupportRequestStatusBadge'

/** Câu chốt của luật — dùng chung cho banner, tooltip nút duyệt và hộp thoại lỗi. */
export const FEE_SUPPORT_GATE_REASON =
  'Hợp đồng cọc này có đề xuất hỗ trợ phí — chỉ duyệt được sau khi phiếu đề xuất đã được duyệt.'

/** Ca khác hẳn: phiếu duyệt xong rồi nhưng không còn khớp giao dịch — đợi không hết. */
export const FEE_SUPPORT_DEFERRED_REASON =
  'Đề xuất hỗ trợ phí đã duyệt nhưng không còn hợp lệ với giao dịch của hợp đồng cọc này.'

export const FEE_SUPPORT_GATE_TITLE = 'Chưa duyệt được hợp đồng cọc'

/** `id` chỉ có ở đường banner (đọc từ detail); lỗi 400 của BE chỉ trả mã phiếu. */
export type FeeSupportBlockingRow = { id?: number; code: string; status: string }

type Props = {
  /** Phiếu đang chặn. Rỗng = chưa có phiếu nào ⇒ đổi hẳn lời hướng dẫn. */
  blocking: FeeSupportBlockingRow[]
  /** Mời tạo phiếu ngay tại chỗ (chỉ truyền khi user có quyền tạo). */
  onCreate?: () => void
  /**
   * Các luật phiếu vi phạm khi đối chiếu với giao dịch (`DEFERRED_FAILED`). Có giá
   * trị thì đây KHÔNG phải ca "chờ duyệt" — phiếu duyệt xong rồi nhưng không còn
   * khớp, nên hướng dẫn phải là thu hồi/sửa chứ không phải đợi.
   */
  reasons?: string[]
}

/**
 * Giải thích vì sao HĐ cọc chưa duyệt được, kèm việc phải làm.
 *
 * Hai tình huống khác hẳn nhau về hành động: chưa có phiếu thì phải TẠO; có phiếu rồi
 * thì phải ĐẨY phiếu qua nốt thang duyệt — nên liệt kê mã phiếu và trạng thái hiện tại,
 * link thẳng sang phiếu thay vì bắt người dùng tự đi tìm.
 */
export function FeeSupportGateNotice({ blocking, onCreate, reasons }: Props) {
  const hasProposals = blocking.length > 0
  const isDeferredFailure = !!reasons?.length

  return (
    <div className="border-border-2 bg-background-3 flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange-500" />
        <div className="flex flex-col gap-1">
          <p className="typo-body-base text-content-dark-1 font-medium">
            {isDeferredFailure ? FEE_SUPPORT_DEFERRED_REASON : FEE_SUPPORT_GATE_REASON}
          </p>
          <p className="typo-body-small text-content-dark-3">
            {isDeferredFailure
              ? 'Phiếu đã duyệt xong nhưng không còn khớp với giao dịch, nên đợi cũng không hết lỗi. Thu hồi phiếu (cấp TP Admin từ chối) rồi lập phiếu mới, hoặc sửa cấu hình hoa hồng / giá tính phí cho khớp.'
              : hasProposals
                ? 'Phiếu dưới đây chưa duyệt xong. Duyệt nốt phiếu rồi quay lại duyệt hợp đồng.'
                : 'Chưa có phiếu đề xuất nào. Tạo phiếu và trình duyệt, hoặc bỏ tích "có đề xuất hỗ trợ phí" trên hợp đồng.'}
          </p>
        </div>
      </div>

      {isDeferredFailure && (
        <ul className="typo-body-small text-content-dark-2 list-disc pl-9">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {hasProposals && (
        <ul className="flex flex-col gap-2">
          {blocking.map((item) => (
            <li key={item.code} className="flex items-center gap-2">
              <Link
                to={
                  item.id
                    ? APP_PATH.FEE_SUPPORT_PROPOSAL_DETAIL.replace(':id', String(item.id))
                    : APP_PATH.FEE_SUPPORT_PROPOSAL
                }
                className="typo-body-small text-action-primary-red-default font-medium hover:underline"
              >
                {item.code}
              </Link>
              <FeeSupportRequestStatusBadge status={item.status as never} />
            </li>
          ))}
        </ul>
      )}

      {onCreate && !hasProposals && (
        <div>
          <Button variant="secondary" size="medium" onClick={onCreate}>
            Tạo phiếu hỗ trợ bán hàng
          </Button>
        </div>
      )}
    </div>
  )
}

/** Dựng notice từ `error.extra` của BE (đường 400 lúc bấm duyệt). */
export function FeeSupportGateNoticeFromError({
  extra,
  onCreate,
}: {
  extra: FeeSupportGateExtra
  onCreate?: () => void
}) {
  const blocking =
    extra.code === FEE_SUPPORT_GATE_ERROR_CODE.MISSING ? [] : (extra.blocking_proposals ?? [])
  // Ca deferred KHÔNG mời tạo phiếu: đã có phiếu (đã duyệt) rồi, phải thu hồi trước.
  const isDeferred = extra.code === FEE_SUPPORT_GATE_ERROR_CODE.DEFERRED_FAILED
  return (
    <FeeSupportGateNotice
      blocking={blocking}
      onCreate={isDeferred ? undefined : onCreate}
      reasons={isDeferred ? extra.reasons : undefined}
    />
  )
}

/**
 * Phiếu đang chặn, suy từ detail HĐ cọc — mọi phiếu còn sống mà chưa duyệt xong.
 * Chỉ gọi khi đã biết hợp đồng đang bị chặn (`isDepositFeeSupportBlocked`), lúc đó
 * theo định nghĩa không có phiếu nào đã duyệt nên không cần lọc lại.
 */
export function feeSupportBlockingRows(
  requests: FeeSupportRequestBrief[] | null | undefined
): FeeSupportBlockingRow[] {
  return (requests ?? [])
    .filter(
      (r) =>
        r.status !== FeeSupportRequestStatus.rejected &&
        r.status !== FeeSupportRequestStatus.withdrawn
    )
    .map((r) => ({ id: r.id, code: r.code, status: r.status }))
}

export default FeeSupportGateNotice
