import { ColoredValueVariant } from '@/api/schema'
import {
  DepartmentCommissionPoolSplitStatus as SplitStatus,
  DepartmentCommissionPoolStatus as PoolStatus,
} from '@/constants/api-schema-aliases'
/**
 * Nhãn + màu cho hai trạng thái của pool hoa hồng phòng ban.
 *
 * Duyệt (`status`) và chia (`split_status`) là hai vòng đời tách rời: pool đã duyệt vẫn có
 * thể chưa chia. Bảng, bộ lọc và màn chi tiết đều đọc từ đây để không trôi nhãn giữa ba nơi.
 */
type StatusDisplay = { label: string; variant: ColoredValueVariant }

export const POOL_STATUS_DISPLAY: Record<string, StatusDisplay> = {
  [PoolStatus.DRAFT]: { label: 'Bản nháp', variant: ColoredValueVariant.GREY },
  [PoolStatus.CONFIRMED]: { label: 'Đã xác nhận', variant: ColoredValueVariant.GREEN },
}

export const SPLIT_STATUS_DISPLAY: Record<string, StatusDisplay> = {
  [SplitStatus.PENDING_SPLIT]: { label: 'Chờ chia', variant: ColoredValueVariant.YELLOW },
  [SplitStatus.PARTIAL_SPLIT]: { label: 'Chia một phần', variant: ColoredValueVariant.ORANGE },
  [SplitStatus.SPLIT_DONE]: { label: 'Đã chia', variant: ColoredValueVariant.GREEN },
}

/** Mã lạ (BE thêm trạng thái mới mà FE chưa cập nhật) hiển thị nguyên mã thay vì ô trống. */
export function resolveStatusDisplay(
  map: Record<string, StatusDisplay>,
  value: string | null | undefined
): StatusDisplay {
  const code = value || ''
  return map[code] ?? { label: code, variant: ColoredValueVariant.GREY }
}

function toOptions(map: Record<string, StatusDisplay>) {
  return Object.entries(map).map(([value, { label }]) => ({ label, value }))
}

export const POOL_STATUS_OPTIONS = toOptions(POOL_STATUS_DISPLAY)
export const SPLIT_STATUS_OPTIONS = toOptions(SPLIT_STATUS_DISPLAY)
