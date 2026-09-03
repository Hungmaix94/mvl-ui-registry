/**
 * Các cụm tính năng có thể bật/tắt theo môi trường triển khai.
 *
 * Khai báo qua biến môi trường `VITE_FORBIDDEN_FEATURES` — danh sách key ngăn cách bởi dấu phẩy.
 * Ví dụ `VITE_FORBIDDEN_FEATURES=elibrary,chat` sẽ:
 * - ẩn "Thư viện điện tử" và "Trò chuyện" khỏi sidebar,
 * - ẩn khỏi dialog tìm kiếm menu (Alt+K / Cmd+K),
 * - chặn truy cập trực tiếp bằng URL (xem `FeatureGuard`).
 *
 * Bắt buộc tiền tố `VITE_` vì `vite.config.ts` đặt `envPrefix: 'VITE_'` — thiếu tiền tố này
 * Vite không expose biến ra phía client.
 */
import { APP_PATH } from '@/routes/AppRoute.constant'

export const FEATURE_KEY = {
  ELIBRARY: 'elibrary',
  PROJECT_SECRETARY: 'project-secretary',
  ACCOUNTING: 'accounting',
  CHAT: 'chat',
  GROUP_CHAT: 'group-chat',
} as const

export type FeatureKey = (typeof FEATURE_KEY)[keyof typeof FEATURE_KEY]

export const FEATURE_KEYS: Array<FeatureKey> = Object.values(FEATURE_KEY)

/** Nhãn hiển thị, khớp đúng `title` của menu item cấp 1 tương ứng trong `menu-items.ts`. */
export const FEATURE_LABEL: Record<FeatureKey, string> = {
  [FEATURE_KEY.ELIBRARY]: 'Thư viện điện tử',
  [FEATURE_KEY.PROJECT_SECRETARY]: 'Thư ký dự án',
  [FEATURE_KEY.ACCOUNTING]: 'Kế toán',
  [FEATURE_KEY.CHAT]: 'Trò chuyện',
  [FEATURE_KEY.GROUP_CHAT]: 'Group Chat',
}

/**
 * Tiền tố đường dẫn thuộc mỗi cụm tính năng, dùng để chặn truy cập trực tiếp bằng URL.
 * Luôn tham chiếu `APP_PATH` thay vì viết chuỗi tay: đổi tên route mà prefix ở đây không
 * đổi theo thì guard ngừng chặn trong im lặng, không có lỗi biên dịch nào báo.
 *
 * Có 2 chỗ tiền tố lồng nhau, được xử lý bằng luật "tiền tố dài nhất thắng"
 * (xem `resolveFeatureKeyByPath` trong `@/utils/feature-flags`):
 *
 * 1. `/chat/group-channels` (Group Chat) nằm bên trong `/chat` (Trò chuyện).
 * 2. Ba màn tạm ứng dưới đây hiển thị trong menu "Thư ký dự án" nhưng đường dẫn lại nằm
 *    trong `/accounting` của "Kế toán" — tắt Kế toán không được phép giết chúng.
 *
 * CỐ Ý KHÔNG chặn `/docs/:token` (`APP_PATH.DOCS_PREVIEW`) khi tắt Thư viện điện tử:
 * đó là trang xem tài liệu public **dùng chung**, `src/utils/share-link.ts` dựng link này
 * cho cả elibrary lẫn tài liệu dự án (`features/project/project-documents`, thuộc cụm Thư ký
 * dự án). Chặn nó sẽ giết mọi link chia sẻ đã gửi ra ngoài của một cụm khác đang bật.
 * Muốn vô hiệu link chia sẻ là việc thu hồi token ở backend, không phải route guard client.
 */
export const FEATURE_PATH_PREFIXES: Record<FeatureKey, Array<string>> = {
  [FEATURE_KEY.ELIBRARY]: [APP_PATH.ELIBRARY],
  [FEATURE_KEY.PROJECT_SECRETARY]: [
    APP_PATH.PROJECT_ADMIN,
    APP_PATH.COMMISSION_ADVANCE,
    APP_PATH.INVESTOR_ADVANCE,
  ],
  [FEATURE_KEY.ACCOUNTING]: [APP_PATH.ACCOUNTING],
  [FEATURE_KEY.CHAT]: [APP_PATH.CHAT],
  [FEATURE_KEY.GROUP_CHAT]: [APP_PATH.CHAT_GROUP_CHANNELS],
}
