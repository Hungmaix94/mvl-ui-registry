import { useMemo } from 'react'

import { ColoredValueVariant } from '@/api/schema'
import { Chip } from '@/components/ui'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

export const WORKSHEET_STATUS = {
  DRAFT: 'DRAFT',
  ADMIN_APPROVED: 'ADMIN_APPROVED',
  APPROVED: 'APPROVED',
  VOIDED: 'VOIDED',
} as const

export type WorksheetStatus = (typeof WORKSHEET_STATUS)[keyof typeof WORKSHEET_STATUS]

const NO_LABELS: Record<string, string> = {}

/**
 * Nhãn 4 trạng thái vòng đời bảng kê — **chỉ** lấy từ app-constant
 * `DealPeriodWorksheet_STATUS_CHOICES` của BE.
 *
 * Trước đây FE giữ một map chữ cứng và cho nó thắng app-constant, nên đổi nhãn ở BE
 * (`WorksheetStatus` trong `apps/accounting/constants.py` + `.po`) không hề hiện ra trên
 * web dù đã deploy. Nay BE là nguồn duy nhất: sửa chữ chỉ cần sửa `.po` +
 * `make compilemessages`, không cần PR web.
 *
 * Chưa tải xong app-constant thì rơi về chính mã trạng thái (`DRAFT`…) thay vì chữ cứng —
 * hiện mã xấu nhưng thật, còn hơn hiện một câu FE tự bịa rồi lệch với BE.
 */
export function useWorksheetStatusLabels(): Record<string, string> {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.DEAL_PERIOD_WORKSHEET_STATUS_CHOICES],
  })

  return (
    (keysMap.get(APP_CONSTANT_KEY.ACCOUNTING.DEAL_PERIOD_WORKSHEET_STATUS_CHOICES) as Record<
      string,
      string
    > | null) ?? NO_LABELS
  )
}

export const WORKSHEET_STATUS_VARIANT: Record<string, ColoredValueVariant> = {
  [WORKSHEET_STATUS.DRAFT]: ColoredValueVariant.ORANGE,
  [WORKSHEET_STATUS.ADMIN_APPROVED]: ColoredValueVariant.BLUE,
  [WORKSHEET_STATUS.APPROVED]: ColoredValueVariant.GREEN,
  [WORKSHEET_STATUS.VOIDED]: ColoredValueVariant.RED,
}

/**
 * Lựa chọn cho dropdown lọc "Trạng thái duyệt".
 *
 * Thứ tự và tập giá trị vẫn do FE giữ (`WORKSHEET_STATUS` là máy trạng thái, không phải
 * chữ hiển thị) — nhờ vậy dropdown không bao giờ mọc thêm `LOCKED` hay thiếu
 * `ADMIN_APPROVED` (bug 86ey45799) kể cả khi app-constant trả về thừa/thiếu key. Chỉ
 * phần CHỮ là của BE.
 */
export function buildWorksheetStatusOptions(labels: Record<string, string>) {
  return Object.values(WORKSHEET_STATUS).map((value) => ({
    value,
    label: labels[value] ?? value,
  }))
}

export function useWorksheetStatusOptions() {
  const labels = useWorksheetStatusLabels()

  return useMemo(() => buildWorksheetStatusOptions(labels), [labels])
}

type Props = {
  status?: string | null
}

export function WorksheetStatusChip({ status }: Props) {
  const s = status || ''
  const labels = useWorksheetStatusLabels()

  return (
    <Chip
      label={labels[s] ?? s ?? '—'}
      variant={WORKSHEET_STATUS_VARIANT[s] ?? ColoredValueVariant.GREY}
      // `Chip` mặc định `whitespace-nowrap` mà ô bảng không cắt tràn, nên nhãn dài
      // ("KT đã duyệt thực nhận" đo được 145px) đè sang cột bên cạnh. Cho phép xuống dòng
      // để chip luôn nằm gọn trong ô, kể cả khi app-constant trả về nhãn dài hơn dự kiến.
      className="whitespace-normal"
    />
  )
}
