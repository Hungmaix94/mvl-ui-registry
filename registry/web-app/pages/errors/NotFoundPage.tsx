import { useNavigate } from 'react-router-dom'

import { APP_PATH } from '@/routes'
import { Button } from '@/components/ui'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Không tìm thấy trang</h2>
          <p className="mt-2 text-gray-600">Trang bạn đang tìm kiếm không tồn tại.</p>
        </div>

        <div className="space-y-4">
          <Button variant="primary" size="large" onClick={() => navigate(APP_PATH.DASHBOARD)}>
            Đi đến Trang chủ
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
