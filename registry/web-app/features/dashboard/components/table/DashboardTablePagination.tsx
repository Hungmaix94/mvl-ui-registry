import { Button } from '@/components/ui/button'
import { IconCaretleft, IconCaretright } from '@/assets/icons'

/**
 * Thanh phân trang dùng chung cho các bảng trên dashboard.
 *
 * Ba bảng (Đối tác theo dự án, Hiệu suất theo tổ chức, Giao dịch theo dự án) đều
 * cần đúng một thanh này; để mỗi bảng tự chép một bản là chúng sẽ trôi khỏi nhau
 * ngay lần chỉnh sửa sau.
 *
 * Tự ẩn khi tổng số dòng không vượt quá một trang — không có gì để chuyển thì
 * thanh điều hướng chỉ làm nhiễu.
 */
type DashboardTablePaginationProps = {
  page: number
  pageSize: number
  totalCount: number
  /** Danh từ đếm hiển thị cạnh tổng số, vd: "tổ chức", "dự án". */
  unitLabel: string
  onPageChange: (page: number) => void
}

function DashboardTablePagination({
  page,
  pageSize,
  totalCount,
  unitLabel,
  onPageChange,
}: DashboardTablePaginationProps) {
  if (totalCount <= pageSize) return null

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="flex items-center justify-end gap-3">
      <span className="text-content-dark-3 text-sm">
        Trang {page}/{pageCount} · {totalCount} {unitLabel}
      </span>
      <Button
        variant="secondary-border"
        size="small"
        iconOnly
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        aria-label="Trang trước"
      >
        <IconCaretleft size={16} />
      </Button>
      <Button
        variant="secondary-border"
        size="small"
        iconOnly
        disabled={page >= pageCount}
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        aria-label="Trang sau"
      >
        <IconCaretright size={16} />
      </Button>
    </div>
  )
}

export default DashboardTablePagination
