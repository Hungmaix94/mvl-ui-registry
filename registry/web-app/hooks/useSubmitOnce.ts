import { useCallback, useRef, useState } from 'react'

/**
 * Chống double-submit cho các form tạo/cập nhật.
 *
 * Vấn đề: `useState` bật cờ `isSubmitting` chỉ làm nút submit bị `disabled`
 * SAU khi React commit lại cây UI. Với form lớn (BookingContractForm ~1000 dòng)
 * khoảng thời gian đó đủ để cú click thứ hai lọt vào và bắn thêm một request
 * POST nữa — tạo ra 2 bản ghi trùng.
 *
 * Hook này chốt cửa bằng `useRef`: lần gọi thứ hai bị chặn NGAY LẬP TỨC (đồng bộ),
 * không phụ thuộc vào thời điểm React render. Cờ `isSubmitting` trả về vẫn dùng để
 * hiển thị loading + disable nút như bình thường.
 */
export function useSubmitOnce<TArgs extends unknown[]>(
  handler: (...args: TArgs) => void | Promise<void>
): { submit: (...args: TArgs) => Promise<void>; isSubmitting: boolean } {
  // Giữ handler mới nhất trong ref để `submit` có identity ổn định.
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  const inFlightRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(async (...args: TArgs) => {
    if (inFlightRef.current) return

    inFlightRef.current = true
    setIsSubmitting(true)
    try {
      await handlerRef.current(...args)
    } finally {
      inFlightRef.current = false
      setIsSubmitting(false)
    }
  }, [])

  return { submit, isSubmitting }
}
