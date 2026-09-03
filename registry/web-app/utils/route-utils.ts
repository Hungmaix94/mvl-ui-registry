// Nhập thẳng file hằng thay vì barrel `@/routes`: barrel kéo cả `AppRoute.tsx` (toàn bộ router +
// `BreadcrumbWrapper`), mà `BreadcrumbWrapper` lại nhập ngược `@/routes` ⇒ vòng lặp module khiến
// `APP_PATH` là `undefined` ở thời điểm khởi tạo. `AppRoute.constant.ts` là leaf, không có vòng.
import { APP_PATH } from '@/routes/AppRoute.constant'

export const getParentRoute = (currentPath: string): string => {
  // Remove trailing slash and split
  const segments = currentPath.replace(/\/$/, '').split('/').filter(Boolean)

  // If only one segment (e.g., '/dashboard'), go to dashboard
  if (segments.length <= 1) {
    return APP_PATH.DASHBOARD
  }

  // Remove last segment to get parent
  const parentSegments = segments.slice(0, -1)
  return '/' + parentSegments.join('/')
}

/**
 * Trong phiên SPA này có entry nào để đi lùi không?
 *
 * `createBrowserRouter` (react-router v6) đánh số mọi entry history của app bằng `idx` trong
 * `window.history.state`, và đặt `idx = 0` cho entry đầu tiên khi khởi tạo. Nên `idx > 0` là
 * bằng chứng XÁC ĐỊNH rằng `navigate(-1)` sẽ rơi vào một trang của app chứ không văng ra ngoài.
 *
 * Đừng thay bằng `document.referrer`: trong SPA nó chỉ phản ánh cách tab được mở lần ĐẦU và
 * không đổi khi điều hướng client-side, nên mở tab mới / gõ URL / F5 đều cho referrer rỗng và
 * mọi nút back trong cả phiên bị coi nhầm là "vào thẳng từ ngoài".
 */
export const canGoBackInApp = (): boolean => {
  const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx

  return typeof historyIndex === 'number' && historyIndex > 0
}
