import { Link } from 'react-router-dom'

import { APP_PATH } from '@/routes'

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">403</h1>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Truy cập bị từ chối</h2>
          <p className="mt-2 text-gray-600">Bạn không có quyền truy cập tài nguyên này.</p>
        </div>

        <div className="space-y-4">
          <Link
            to={APP_PATH.DASHBOARD}
            className="bg-primary hover:bg-primary/90 inline-block rounded-md px-6 py-3 font-medium text-white transition-colors"
          >
            Đi đến Trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage
