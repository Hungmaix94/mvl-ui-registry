import { type ReactNode } from 'react'
import { useAbility } from '@/lib/ability'
import { cn } from '@/utils'
import type { PaymentVoucher } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import { resolvePayeeLink } from '@/features/accounting/payment-vouchers/utils/payment-voucher-utils'

type PayeeLinkProps = {
  record: PaymentVoucher
  children: ReactNode
  className?: string
  title?: string
}

/**
 * Bọc tên/mã đối tượng chi thành link mở trang chi tiết (nhân sự / cộng tác viên
 * / sàn giao dịch) ở TAB MỚI. Fallback về text thường khi thiếu id, loại không
 * có trang chi tiết (nhà cung cấp), hoặc không đủ quyền retrieve tương ứng.
 * stopPropagation để đặt được bên trong row bảng có click điều hướng.
 */
const PayeeLink = ({ record, children, className, title }: PayeeLinkProps) => {
  const ability = useAbility()
  const { linkTo, subject } = resolvePayeeLink(record)
  const canView = subject ? ability.can('retrieve', subject) : false

  if (!linkTo || !canView) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }

  return (
    <a
      href={linkTo}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'text-action-primary-red-default hover:underline focus-visible:underline',
        className
      )}
    >
      {children}
    </a>
  )
}

export default PayeeLink
