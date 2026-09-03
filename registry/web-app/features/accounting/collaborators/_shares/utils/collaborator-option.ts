import type { SelectOption } from '@/components/ui/select/Select'

/** Hình dạng tối thiểu của một cộng tác viên đủ để dựng option/nhãn cho `Select`. */
export type CollaboratorLike = {
  id: number
  code?: string | null
  name?: string | null
  /** CMND/CCCD (`Collaborator.id_number`). */
  id_number?: string | null
}

/**
 * Nhãn hiển thị của CTV dạng `"mã - họ tên"`, có fallback khi thiếu mã hoặc tên.
 * Là formatter DUY NHẤT cho nhãn CTV — dùng chung ở `useCollaboratorSelect` và
 * `CollaboratorSelectWithCreate` để nhãn không lệch nhau giữa nguồn local và nguồn fetch.
 */
export function buildCollaboratorLabel(collaborator: CollaboratorLike): string {
  const code = (collaborator.code ?? '').trim()
  const name = (collaborator.name ?? '').trim()
  return code && name ? `${code} - ${name}` : code || name || String(collaborator.id)
}

/**
 * Nhãn của DÒNG trong dropdown: nhãn chuẩn kèm CMND/CCCD.
 *
 * QUAN TRỌNG: `Select` gán chuỗi này vào `CommandItem.value`, mà cmdk lọc lại CLIENT-SIDE theo
 * đúng value đó. Không gắn CCCD vào đây thì kết quả backend trả về khi tìm theo CCCD vẫn bị cmdk
 * lọc bỏ và dropdown hiện "không tìm thấy".
 */
export function buildCollaboratorOptionLabel(collaborator: CollaboratorLike): string {
  const label = buildCollaboratorLabel(collaborator)
  const idNumber = (collaborator.id_number ?? '').trim()
  return idNumber ? `${label} - CCCD: ${idNumber}` : label
}

/** Dựng `SelectOption` cho CTV: value là id (string), label là `"mã - họ tên"`. */
export function buildCollaboratorOption(collaborator: CollaboratorLike): SelectOption {
  const label = buildCollaboratorLabel(collaborator)
  const optionLabel = buildCollaboratorOptionLabel(collaborator)
  return optionLabel === label
    ? { value: String(collaborator.id), label }
    : { value: String(collaborator.id), label, optionLabel }
}

/**
 * Chuỗi tìm kiếm có phải CMND/CCCD không (chỉ chữ số, tối thiểu 6 ký tự — CMND 9 số, CCCD 12 số).
 * Dùng để quyết định có gọi thêm filter `id_number` khi `search` không ra kết quả.
 */
export function looksLikeIdNumber(query: string): boolean {
  return /^\d{6,}$/.test(query.trim())
}

// Helper dùng chung cho mọi picker foreign-key (không riêng CTV) — re-export dưới tên quen thuộc
// để nơi gọi không phải nhớ đường dẫn util chung.
export { toSelectId as toCollaboratorId } from '@/utils/select-option-utils.ts'
