/**
 * Trạng thái nút "Khôi phục theo chính sách chung" trên các ô/biểu mẫu tỷ lệ HH.
 *
 * Nút gọi `POST /deals/{id}/shares/{section}/{share_id}/clear/` để bỏ ghi đè thủ công
 * và trả dòng về giá trị resolver tính theo chính sách chung. Nút luôn hiển thị (kể cả
 * khi không bấm được) để người dùng biết cơ chế này tồn tại — thay vì ẩn đi và khiến
 * họ tưởng màn hình không hỗ trợ khôi phục.
 */

export const RESET_TO_POLICY_LABEL = 'Khôi phục theo chính sách chung'

const TITLE_ENABLED = 'Bỏ ghi đè thủ công, tính lại theo chính sách chung'
const TITLE_NO_OVERRIDE = 'Dòng này đang theo chính sách chung, không có ghi đè để khôi phục'

export type ResetToPolicyButtonState = {
  disabled: boolean
  title: string
}

export function getResetToPolicyButtonState(params: {
  /** `share.is_custom_override` — dòng đang bị ghi đè thủ công hay không. */
  isCustomOverride?: boolean | null
  /** Có mutation nào (ghi đè / khôi phục) đang chạy hay không. */
  isPending?: boolean
}): ResetToPolicyButtonState {
  const hasOverride = !!params.isCustomOverride

  return {
    disabled: !hasOverride || !!params.isPending,
    title: hasOverride ? TITLE_ENABLED : TITLE_NO_OVERRIDE,
  }
}

export default getResetToPolicyButtonState
