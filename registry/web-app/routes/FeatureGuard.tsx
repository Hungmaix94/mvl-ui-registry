import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getForbiddenFeatures } from '@/config/environment'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { isPathForbidden } from '@/utils/feature-flags'

type FeatureGuardProps = {
  children: ReactNode
  redirectTo?: string
}

/**
 * Chặn truy cập vào các cụm tính năng đã tắt qua `VITE_FORBIDDEN_FEATURES`.
 *
 * Ẩn khỏi menu là chưa đủ: URL gõ tay, link cũ đã bookmark hay link chia sẻ nội bộ
 * vẫn mở được page. Guard này redirect về trang 404 vì với môi trường đó tính năng
 * thực sự không tồn tại — khác với `PermissionGuard` (có tính năng nhưng thiếu quyền).
 */
export function FeatureGuard({ children, redirectTo = APP_PATH.NOT_FOUND }: FeatureGuardProps) {
  const location = useLocation()

  if (isPathForbidden(location.pathname, getForbiddenFeatures())) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
