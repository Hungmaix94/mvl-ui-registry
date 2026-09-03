import React from 'react'

export interface SubHeadProps {
  /** Số thứ tự mục. Bỏ trống thì không hiện badge, phần còn lại giữ nguyên. */
  n?: string | number | null
  title: string
  /** ReactNode chứ không phải string: có mục cần in đậm vài thuật ngữ ngay trong câu mô tả. */
  subtitle?: React.ReactNode
  right?: React.ReactNode
}

/**
 * Dải tiêu đề chuẩn cho các màn chia theo mục đánh số (hiện dùng ở màn Chia HH sale).
 *
 * Đặt ở `components/commons` chứ không nằm trong feature: mục ① của màn Chia HH là
 * `DealSplitSection` thuộc feature `sales/deal-v3`, mà feature đó lại được
 * `accounting/commission-splits` gọi vào — để component này trong commission-splits là tạo
 * import vòng giữa hai feature.
 *
 * Trước đây mỗi mục truyền một `tint` riêng (lục / lam / tím) tô cùng lúc viền trái, badge
 * số và chữ tiêu đề, nên sáu mục ra sáu bảng màu mà màu đó không mã hoá thông tin gì. Nay
 * badge luôn đỏ (primary của hệ), tiêu đề luôn đen. Màu là HẰNG SỐ, cố ý không mở lại thành
 * prop — mở ra là mỗi mục lại trôi một kiểu. Cần nhấn riêng thì dùng `right`.
 */
export function SubHead({ n, title, subtitle, right }: SubHeadProps) {
  return (
    <div className="border-border-1 bg-background-2 flex items-center gap-2.5 border-b px-3.5 py-2.5">
      {n != null && n !== '' && (
        <span className="bg-action-primary-red-default flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">
          {n}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-content-dark-1 block text-[13px] font-bold">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[11px] text-neutral-500">{subtitle}</span>}
      </div>
      {right && <span className="ml-auto shrink-0">{right}</span>}
    </div>
  )
}

export default SubHead
