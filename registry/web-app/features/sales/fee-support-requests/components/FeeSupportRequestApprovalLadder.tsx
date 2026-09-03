import { useMemo } from 'react'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils'

import {
  FEE_SUPPORT_LADDER_BY_ORIGIN,
  FeeSupportRequestOrigin,
  FeeSupportRequestStatus,
} from '../constants/fee-support-request-constants'

type StepState = 'done' | 'current' | 'pending'

type Props = {
  origin: FeeSupportRequestOrigin | undefined
  status: FeeSupportRequestStatus
  /** BE chỉ trả mốc duyệt cuối — hiển thị ở bước "hiệu lực". */
  approvedAt?: string | null
}

/**
 * Thang duyệt D19 suy từ (origin, status): mobile_sale 5 cấp + hiệu lực,
 * web_secretary 1 cấp TP Admin + hiệu lực. Nhãn bước = nhãn status từ server.
 *
 * Timeline này CỐ Ý chỉ đánh dấu bước đã qua / hiện hành. Danh tính người duyệt
 * (ai duyệt, lúc nào, từ chối ở cấp nào, ghi chú gì) nằm ở khối "Thông tin người
 * xác nhận" ngay dưới, dựng từ endpoint con `/confirmation-logs/` — đừng nhồi
 * thêm vào đây (86ey4vjmp).
 */
export function FeeSupportRequestApprovalLadder({ origin, status, approvedAt }: Props) {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.STATUS_CHOICES],
  })

  const labelMap = keysMap.get(APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.STATUS_CHOICES) as
    | Record<string, string>
    | undefined

  const steps = origin ? FEE_SUPPORT_LADDER_BY_ORIGIN[origin] : undefined
  const isRejected = status === FeeSupportRequestStatus.rejected
  const isApproved = status === FeeSupportRequestStatus.approved

  const stepStates: StepState[] = useMemo(() => {
    if (!steps) return []
    if (isApproved) return steps.map(() => 'done')
    const currentIdx = steps.indexOf(status)
    return steps.map((_, idx) => {
      if (currentIdx === -1) return 'pending' // draft / rejected: chưa vào thang hoặc đã dừng
      if (idx < currentIdx) return 'done'
      if (idx === currentIdx) return 'current'
      return 'pending'
    })
  }, [steps, status, isApproved])

  if (!steps || steps.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {isRejected && (
        <div className="border-action-primary-red-default text-action-primary-red-default typo-body-base-medium rounded-md border border-solid px-4 py-3">
          Đề xuất đã bị từ chối — phiếu không thể tiếp tục duyệt, cần tạo đề xuất mới nếu vẫn có nhu
          cầu (BR7).
        </div>
      )}

      <ol className="flex flex-col">
        {steps.map((stepStatus, index) => {
          const state = stepStates[index]
          const isLast = index === steps.length - 1
          const label = labelMap?.[stepStatus] ?? stepStatus

          return (
            <li key={stepStatus} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span className="bg-border-1 absolute top-7 left-3 h-[calc(100%-1.25rem)] w-px" />
              )}
              <span
                className={cn(
                  'z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  state === 'done' && 'bg-data-green-disabled text-data-green-default',
                  state === 'current' && 'bg-data-yellow-disabled text-content-dark-1',
                  state === 'pending' && 'bg-background-2 text-content-dark-3',
                  isRejected && 'opacity-60'
                )}
              >
                {index + 1}
              </span>

              <div
                className={cn('flex min-w-0 flex-1 flex-col gap-0.5', isRejected && 'opacity-60')}
              >
                <span
                  className={cn(
                    'typo-body-base-medium',
                    state === 'current'
                      ? 'text-content-dark-1 font-semibold'
                      : 'text-content-dark-2'
                  )}
                >
                  {label}
                </span>
                {stepStatus === FeeSupportRequestStatus.approved && approvedAt && (
                  <span className="text-content-dark-3 text-xs">{formatDate(approvedAt)}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default FeeSupportRequestApprovalLadder
