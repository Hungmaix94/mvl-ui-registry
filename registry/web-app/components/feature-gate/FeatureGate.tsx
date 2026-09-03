import { ReactNode } from 'react'

import { getForbiddenFeatures } from '@/config/environment'
import type { FeatureKey } from '@/constants/feature-flags'

type FeatureGateProps = {
  feature: FeatureKey
  children: ReactNode
  /** Nội dung thay thế khi cụm bị tắt. Mặc định không render gì. */
  fallback?: ReactNode
}

/**
 * Chỉ render `children` khi cụm tính năng còn bật theo `VITE_FORBIDDEN_FEATURES`.
 *
 * Dùng cho nội dung nằm **ngoài** route của cụm — điển hình là các khối Dashboard trỏ vào
 * màn của cụm đã tắt. `FeatureGuard` chỉ chặn theo đường dẫn nên không với tới được những
 * chỗ này: card vẫn hiện, người dùng bấm vào mới văng 404.
 */
function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  if (getForbiddenFeatures().has(feature)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default FeatureGate
