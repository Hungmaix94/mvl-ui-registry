import { type ReactNode } from 'react'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { cn } from '@/utils'

type F2ReconciliationLinkProps = {
  /** Id DÒNG đối chiếu F2 (`F2Reconciliation`), không phải id bảng đối chiếu. */
  reconciliationId?: number | null
  children: ReactNode
  className?: string
  title?: string
}

/**
 * Mã đối chiếu F2 dạng link, mở trang chi tiết đối chiếu ở tab mới.
 *
 * Lùi về text thường khi thiếu id hoặc người xem không có quyền `f2_reconciliation_sheet.retrieve`
 * (đúng quyền route `F2_RECONCILIATION_DETAIL` đang đòi). Chặn nổi bọt click để đặt được trong
 * hàng bảng bấm được mà không kích hoạt điều hướng của hàng.
 */
const F2ReconciliationLink = ({
  reconciliationId,
  children,
  className,
  title,
}: F2ReconciliationLinkProps) => {
  const ability = useAbility()

  if (!reconciliationId || !ability.can('retrieve', 'f2_reconciliation_sheet')) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }

  return (
    <a
      href={APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', String(reconciliationId))}
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

export default F2ReconciliationLink
