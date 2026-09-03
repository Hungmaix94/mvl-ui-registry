import React from 'react'
import { Loading } from '@/components/ui'

interface LoadingWrapperProps {
  isLoading?: boolean
  containerHeight?: number
  children: React.ReactNode
  data?: any[]
  noDataMessage?: string
  hasActiveFilters?: boolean
  /**
   * Khung xương riêng của khối, thay cho vòng xoay chung.
   *
   * Vòng xoay giống hệt nhau ở mọi khối thì trong lúc chờ màn hình không nói được gì về thứ
   * sắp hiện ra, và nó nằm trong hộp cao cố định (`containerHeight`) hiếm khi bằng chiều cao
   * thật ⇒ dữ liệu về là trang nhảy. Khung xương tự dựng đúng bố cục của khối nên không có cả
   * hai vấn đề đó. Xem `features/dashboard/components/sales/dashboard-skeletons.tsx`.
   */
  loadingSkeleton?: React.ReactNode
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  children,
  containerHeight = 500,
  data,
  noDataMessage = 'Không có dữ liệu',
  hasActiveFilters = false,
  loadingSkeleton,
}) => {
  if (isLoading) {
    // Khung xương đã tự dựng đúng chiều cao của khối thật, nên KHÔNG bọc thêm hộp cao cố
    // định + căn giữa — bọc vào là cắt cụt hoặc chừa thừa đúng thứ nó vừa dựng cho khớp.
    if (loadingSkeleton) return <>{loadingSkeleton}</>

    return (
      <div
        data-testid="loading-spinner-box"
        className="inset-0 z-10 flex items-center justify-center bg-white/60"
        style={{ height: containerHeight }}
      >
        <Loading />
      </div>
    )
  }

  // Check if data is empty or all items have count = 0
  const hasNoData =
    data &&
    (data.length === 0 ||
      data.every((item) => {
        // For chart data that has label + numeric values
        if (item && typeof item === 'object') {
          const values = Object.entries(item)
            .filter(([key]) => key !== 'label')
            .map(([, value]) => value)

          // If all values are 0 or undefined, it's empty
          return values.length === 0 || values.every((val) => !val || Number(val) === 0)
        }
        // For data with count property (original behavior)
        return !item.count || Number(item.count) === 0
      }))

  if (hasNoData) {
    return (
      <div className="flex items-center justify-center" style={{ height: containerHeight }}>
        {hasActiveFilters ? (
          <div className="flex flex-col items-center justify-center">
            <h6 className="text-content-dark-3">Không tìm thấy dữ liệu</h6>
            <p className="typo-body-lg text-content-dark-3">
              Không có kết quả phù hợp với bộ lọc đã chọn.
            </p>
          </div>
        ) : (
          <div className="border-border-1 rounded-sm border p-4">
            <p className="text-content-dark-3 text-center">{noDataMessage}</p>
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}

export default LoadingWrapper
