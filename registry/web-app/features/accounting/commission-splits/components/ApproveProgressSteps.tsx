import { IconCheck } from '@/assets/icons'
import { cn } from '@/utils'

/**
 * Tiến trình "Duyệt chi thực nhận" — 3 bước, hiển thị NGAY TRONG dialog xác nhận.
 *
 * Duyệt chi là 2 call PATCH nối tiếp (`set-period-progress` rồi `approve`) cộng một lượt
 * tải lại số liệu. Trước đây dialog đóng ngay khi bấm, cờ `isApproving` chỉ nối vào spinner
 * của đúng 2 nút, và các response refetch về lẻ tẻ sau đó — kế toán không biết hệ thống
 * đang làm gì và thấy số nhảy. Giữ dialog mở với checklist này để tiến trình luôn nhìn thấy
 * được, và `config.loading` chặn bấm lần hai (trước đây bấm 2 lần là gọi 2 lần thật).
 */

export type ApproveStepState = 'done' | 'active' | 'pending'

export type ApproveStep = {
  label: string
  state: ApproveStepState
}

/** Nhãn 3 bước; `feePctLabel` để kế toán thấy đúng % sắp được chốt. */
export function buildApproveSteps(currentIndex: number, feePctLabel: string): ApproveStep[] {
  const labels = [
    `Chốt tiến độ chi${feePctLabel ? ` (${feePctLabel})` : ''}`,
    'Duyệt chi & tạo các khoản phải chi',
    'Tải lại số liệu',
  ]
  return labels.map((label, index) => ({
    label,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending',
  }))
}

export const ApproveProgressSteps = ({ steps }: { steps: ApproveStep[] }) => {
  const active = steps.find((step) => step.state === 'active')
  const activeIndex = active ? steps.indexOf(active) + 1 : steps.length

  return (
    <div className="flex flex-col gap-4 px-6 pt-2 pb-6">
      <p className="typo-body-base-regular text-content-dark-3">
        Bước {activeIndex}/{steps.length} — {active?.label || 'Hoàn tất'}. Vui lòng không đóng
        trang.
      </p>
      <ul className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                step.state === 'done' && 'bg-[#16A34A] text-white',
                step.state === 'active' && 'bg-[#DBEAFE]',
                step.state === 'pending' && 'border-border-1 border'
              )}
            >
              {step.state === 'done' && <IconCheck className="h-3 w-3" />}
              {step.state === 'active' && <span className="dot-loader" />}
            </span>
            <span
              className={cn(
                'typo-body-sm-regular',
                step.state === 'pending' ? 'text-content-dark-4' : 'text-content-dark-1'
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ApproveProgressSteps
