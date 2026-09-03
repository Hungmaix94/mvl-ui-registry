import { type ReactNode } from 'react'
import { Text } from '@radix-ui/themes'

import Checkbox from '@/components/ui/checkbox/Checkbox'
import { cn } from '@/utils'

import {
  hasNoSelectableFeeSupportStaff,
  isFeeSupportF2Staff,
  isFeeSupportLockedStaff,
} from '../utils/fee-support-locked-staff'
import {
  describeFeeSupportStaff,
  type FeeSupportStaffDisplayLike,
} from '../utils/fee-support-staff-display'

/** Một dòng nhân sự bán hiển thị được trên lưới chọn (DepositContractSale thoả shape này). */
export type FeeSupportStaffRow = FeeSupportStaffDisplayLike & { id: number }

const LOCKED_HINT =
  'Nhân sự nhận hỗ trợ lấy theo giao dịch: sale MV và CTV của sale luôn tham gia; F2 (sàn liên kết) chưa được hỗ trợ nên không chọn được.'
const F2_ONLY_WARNING =
  'Giao dịch này chỉ có nhân sự F2 (sàn liên kết) — chưa hỗ trợ tạo phiếu hỗ trợ phí cho F2, nên không tạo được đề xuất cho giao dịch này.'
const LOCKED_TITLE = 'Bắt buộc theo giao dịch — không thể bỏ chọn'
const F2_BLOCKED_TITLE = 'Chưa hỗ trợ tạo phiếu hỗ trợ phí cho F2 (sàn liên kết)'

export interface FeeSupportSalesStaffFieldProps {
  /** Toàn bộ nhân sự bán của HĐ cọc (MV + CTV + F2 — CR STT14). Giá trị chọn = staff.id. */
  salesStaff: readonly FeeSupportStaffRow[]
  value: number[]
  onChange: (ids: number[]) => void
  error?: string
  disabled?: boolean
  /** Nội dung thay thế khi danh sách rỗng (màn chính phân biệt "đang tải" / "chưa có"). */
  emptyMessage?: ReactNode
  /** Bọc tên nhân sự — màn chính dùng để link sang trang nhân viên; dialog để mặc định. */
  renderName?: (staff: FeeSupportStaffRow, name: string) => ReactNode
  label?: string
}

/**
 * Lưới checkbox chọn nhân sự nhận hỗ trợ (controlled — parent tự bind RHF), dùng chung
 * cho cả màn tạo theo Deal lẫn dialog tạo trên HĐ cọc.
 *
 * CR STT14: hiển thị ĐỦ nhân sự bán; sale MV + CTV của sale bị KHOÁ (luôn tích, không bỏ
 * tích được).
 *
 * 86eyqv8yu: F2 (`partner`) nay cũng KHOÁ, nhưng khoá ở chiều ngược lại — luôn KHÔNG
 * tích và không tích được. CR STT14 (FSD 18.8 §3.2, chốt 2026-07-27) từng cho F2 tích
 * tự do, kèm câu để ngỏ "cần chốt BE nhận hay từ chối id partner"; câu đó chưa bao giờ
 * được chốt, mà BE thì từ chối `partner` từ ngày đầu — nên ô tích tự do chỉ dẫn tới 400
 * kèm message kỹ thuật. Bỏ affordance đi thay vì để nó hứa suông.
 */
function FeeSupportSalesStaffField({
  salesStaff,
  value,
  onChange,
  error,
  disabled,
  emptyMessage = 'Giao dịch chưa có nhân viên (sale) nào trên hợp đồng cọc.',
  renderName,
  label = 'Nhân sự tham gia nhận hỗ trợ',
}: FeeSupportSalesStaffFieldProps) {
  const isEmpty = salesStaff.length === 0
  const hasF2Only = hasNoSelectableFeeSupportStaff(salesStaff)

  const toggle = (id: number, checked: boolean) => {
    onChange(checked ? [...value, id] : value.filter((v) => v !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-content-dark-2 typo-body-base-medium">
        {label} <span className="text-action-primary-red-default">*</span>
      </label>

      {!isEmpty && <Text className="text-content-dark-3 typo-body-sm-regular">{LOCKED_HINT}</Text>}

      {isEmpty ? (
        <Text className="text-content-dark-3 typo-body-base-regular italic">{emptyMessage}</Text>
      ) : (
        <>
          {hasF2Only && (
            <Text className="text-data-red-default typo-body-sm-regular">{F2_ONLY_WARNING}</Text>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {salesStaff.map((staff) => {
              const { name, org } = describeFeeSupportStaff(staff)
              const isLocked = isFeeSupportLockedStaff(staff)
              // F2 không tích được: BE từ chối mọi id `partner`, nên tích nó chỉ ra 400.
              const isF2 = isFeeSupportF2Staff(staff)
              const isChecked = isLocked || value.includes(staff.id)
              const lockReason = isLocked ? LOCKED_TITLE : isF2 ? F2_BLOCKED_TITLE : undefined
              return (
                <div
                  key={staff.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                    isChecked
                      ? 'border-action-primary-red-default bg-data-red-disabled'
                      : 'border-border-1 bg-background-1'
                    // Cố ý KHÔNG hạ opacity dòng F2: chữ trên dòng đã là
                    // `text-content-dark-3` (mức nhạt nhất còn đạt tương phản), hạ
                    // tiếp là rơi xuống dưới ngưỡng đọc được. Ô tích disabled + câu
                    // lý do ngay dưới tên đã nói đủ rằng dòng này không tham gia.
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (isLocked || isF2) return
                      toggle(staff.id, !!checked)
                    }}
                    disabled={disabled || isLocked || isF2}
                    title={lockReason}
                    aria-label={lockReason ? `${name} — ${lockReason}` : name}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="typo-body-base-semibold text-content-dark-1">
                      {renderName ? renderName(staff, name) : name}
                    </div>
                    <div className="typo-body-sm-regular text-content-dark-3 mt-0.5">{org}</div>
                    {/* Lý do phải đọc được bằng mắt — tooltip chỉ hiện khi rê chuột. */}
                    {isF2 && (
                      <div className="typo-body-sm-regular text-content-dark-3 mt-1 italic">
                        {F2_BLOCKED_TITLE}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/*
        Giao dịch không còn ai tích được thì lỗi zod là "Vui lòng chọn ít nhất một
        nhân sự tham gia" — câu đó SAI ở đây: không có gì để chọn cả, và nó đẩy
        người dùng đi tìm một ô tích không tồn tại. F2_ONLY_WARNING ở trên mới là
        lý do thật, nên nhường chỗ cho nó.

        Nhưng CHỈ nuốt đúng ca "rỗng vì không có gì để chọn" (`value` rỗng). `sales`
        nằm trong FORM_FIELD_NAMES nên lỗi 400 của BE có `attr=sales` cũng đổ vào
        đúng prop này; nuốt theo `hasF2Only` trần là giấu luôn lỗi thật đó. Ca dựng
        được: HĐ cọc bị gỡ mất dòng MV sau khi phiếu đã tạo ⇒ màn Sửa thấy F2-only
        trong khi `value` vẫn giữ id cũ ⇒ BE trả "phải thuộc đúng hợp đồng cọc".
      */}
      {error && !(hasF2Only && value.length === 0) && (
        <Text className="text-data-red-default typo-body-sm-regular">{error}</Text>
      )}
    </div>
  )
}

export default FeeSupportSalesStaffField
