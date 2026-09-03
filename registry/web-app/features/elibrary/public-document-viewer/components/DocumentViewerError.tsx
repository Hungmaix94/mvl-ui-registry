import { Link } from 'react-router-dom'

import { IconWarningcircle } from '@/assets/icons'
import { APP_PATH } from '@/routes/AppRoute.constant'

interface ErrorInfo {
  title: string
  desc: string
}

const INFO_BY_STATUS: Record<number, ErrorInfo> = {
  403: { title: 'Không có quyền truy cập', desc: 'Bạn không có quyền xem tài liệu này.' },
  404: { title: 'Không tìm thấy tài liệu', desc: 'Liên kết không tồn tại hoặc đã bị thu hồi.' },
  410: { title: 'Liên kết đã hết hạn', desc: 'Liên kết chia sẻ này đã hết hạn sử dụng.' },
}

const DEFAULT_INFO: ErrorInfo = {
  title: 'Không thể mở tài liệu',
  desc: 'Đã có lỗi xảy ra khi tải tài liệu. Vui lòng thử lại sau.',
}

interface DocumentViewerErrorProps {
  status?: number
  /** Thông điệp lỗi từ server, chỉ dùng khi status không nằm trong danh sách đã biết. */
  message?: string
}

/** Trạng thái lỗi toàn màn hình (standalone, không phụ thuộc AppLayout). */
export function DocumentViewerError({ status, message }: DocumentViewerErrorProps) {
  const known = status ? INFO_BY_STATUS[status] : undefined
  const info = known ?? DEFAULT_INFO
  const description = known ? known.desc : message || DEFAULT_INFO.desc

  return (
    <div className="bg-background-2 flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <IconWarningcircle size={64} className="text-action-primary-red-default" />
      <h1 className="text-content-dark-1 mt-6 text-2xl font-bold">{info.title}</h1>
      <p className="text-content-dark-2 mt-2 max-w-md">{description}</p>
      <Link
        to={APP_PATH.HOME}
        className="bg-action-primary-red-default text-content-light-1 mt-6 inline-block rounded-md px-6 py-3 font-medium transition-colors hover:opacity-90"
      >
        Về trang chủ
      </Link>
    </div>
  )
}
