import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { rememberListUrl } from '@/utils/list-url-memory'

/**
 * Ghi lại query string của mọi màn có bộ lọc, để nút back và breadcrumb khôi phục được khi
 * người dùng vào thẳng một trang chi tiết từ bên ngoài (không có history để lùi).
 *
 * Gắn MỘT lần ở `AppLayout` — nó bọc toàn bộ route đã đăng nhập, nên mọi điều hướng đều đi qua.
 * Đừng gọi ở từng trang: bỏ sót một trang là mất bộ nhớ của đúng trang đó, mà lỗi kiểu đó chỉ
 * lộ ra khi có người vào bằng deep link.
 */
export default function useListUrlMemory(): void {
  const { pathname, search } = useLocation()

  useEffect(() => {
    rememberListUrl(pathname, search)
  }, [pathname, search])
}
