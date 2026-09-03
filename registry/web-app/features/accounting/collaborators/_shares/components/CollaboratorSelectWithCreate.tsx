import { forwardRef, useCallback, useState, type ReactNode } from 'react'

import { Select } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@/assets/icons'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useAbility } from '@/lib/ability'
import {
  looksLikeIdNumber,
  toCollaboratorId,
} from '@/features/accounting/collaborators/_shares/utils/collaborator-option.ts'
// Import thẳng từ file constant, KHÔNG qua barrel `@/routes`: barrel kéo theo cả `appRouter` →
// vòng lặp import làm `APP_PATH` undefined trong môi trường test.
import { APP_PATH } from '@/routes/AppRoute.constant'

type CollaboratorSelectWithCreateProps = {
  /** Tên field (do FormController truyền qua `field.name`) → gắn vào Select cho a11y/label htmlFor. */
  name?: string
  value?: number | string | null
  onChange?: (value: number | null) => void
  error?: string
  disabled?: boolean
  required?: boolean
  label?: ReactNode
  placeholder?: string
  searchPlaceholder?: string
  clearable?: boolean
  className?: string
  /** Ép bật/tắt nút "Tạo mới CTV". Mặc định theo quyền `collaborator.create`. */
  canCreate?: boolean
}

/** Dựng URL trang tạo CTV, prefill theo từ khoá đang gõ (số → CCCD, còn lại → họ tên). */
export function buildCollaboratorCreateUrl(query: string, origin: string): string {
  const url = new URL(APP_PATH.COLLABORATOR_CREATE, origin)
  const trimmed = query.trim()
  if (trimmed) {
    url.searchParams.set(looksLikeIdNumber(trimmed) ? 'id_number' : 'name', trimmed)
  }
  return url.toString()
}

/**
 * Controller "Cộng tác viên" dùng chung: bọc `Select` (async, phân trang, tìm theo mã/họ tên/CCCD)
 * và bổ sung lối tạo mới khi tìm không ra kết quả. Nhấn "Tạo mới CTV" → mở trang tạo CTV ở TAB MỚI
 * (prefill theo từ khoá), form hợp đồng đang dở ở tab hiện tại không bị đụng tới. Theo đúng tiền lệ
 * `CustomerSelectWithDialog`. value/onChange dùng kiểu `number` (collaborator id).
 */
const CollaboratorSelectWithCreate = forwardRef<HTMLDivElement, CollaboratorSelectWithCreateProps>(
  (
    {
      name,
      value,
      onChange,
      error,
      disabled,
      required,
      label,
      placeholder = 'Tìm/chọn cộng tác viên',
      searchPlaceholder = 'Tìm theo mã, họ tên hoặc CCCD...',
      clearable = true,
      className,
      canCreate,
    },
    ref
  ) => {
    const ability = useAbility()
    const canCreateCollaborator = (canCreate ?? ability.can('create', 'collaborator')) && !disabled

    const { loadCollaboratorOptions, loadInitialCollaboratorOptions, hasLoadFailed } =
      useCollaboratorSelect()

    // Đóng dropdown khi mở tab tạo mới: lúc quay lại, mở ra là `Select` nạp lại options (effect nạp
    // chạy theo `isOpen`) nên CTV vừa tạo xuất hiện mà không phải sửa từ khoá cho khác đi.
    const [isOpen, setIsOpen] = useState(false)

    const handleSelectChange = useCallback(
      (next: string | number | (string | number)[] | null) => {
        onChange?.(toCollaboratorId(next))
      },
      [onChange]
    )

    const openCreatePage = useCallback(
      (query: string) => {
        if (!canCreateCollaborator) return
        setIsOpen(false)
        window.open(
          buildCollaboratorCreateUrl(query, window.location.origin),
          '_blank',
          'noopener,noreferrer'
        )
      },
      [canCreateCollaborator]
    )

    const renderEmpty = useCallback(
      (query: string) => (
        <CollaboratorEmptyCreatePrompt
          query={query}
          canCreate={canCreateCollaborator}
          hasLoadFailed={hasLoadFailed()}
          onCreate={() => openCreatePage(query)}
        />
      ),
      [canCreateCollaborator, openCreatePage, hasLoadFailed]
    )

    return (
      <Select
        ref={ref}
        name={name}
        label={label}
        required={required}
        value={value != null && value !== '' ? String(value) : null}
        onChange={handleSelectChange}
        loadOptions={loadCollaboratorOptions}
        loadInitialOptions={loadInitialCollaboratorOptions}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        enableSearch
        clearable={clearable}
        className={className}
        disabled={disabled}
        error={error}
        open={isOpen}
        onOpenChange={setIsOpen}
        dropdownAutoWidth
        renderEmpty={renderEmpty}
      />
    )
  }
)

CollaboratorSelectWithCreate.displayName = 'CollaboratorSelectWithCreate'

export default CollaboratorSelectWithCreate

type CollaboratorEmptyCreatePromptProps = {
  query: string
  canCreate?: boolean
  /** Lần tải gần nhất hỏng → danh sách rỗng vì lỗi, KHÔNG phải vì không có CTV nào khớp. */
  hasLoadFailed?: boolean
  onCreate: () => void
}

/** Khối empty của dropdown: nhắc "không tìm thấy" + nút mở trang tạo mới (ẩn khi không có quyền). */
function CollaboratorEmptyCreatePrompt({
  query,
  canCreate,
  hasLoadFailed,
  onCreate,
}: CollaboratorEmptyCreatePromptProps) {
  const trimmed = query.trim()
  // Tải hỏng thì tuyệt đối không mời tạo mới: người dùng sẽ tạo trùng một CTV đã tồn tại chỉ vì
  // API đang lỗi. Trường hợp đó chỉ báo lỗi và mời thử lại.
  const showCreate = !!canCreate && !hasLoadFailed
  const message = hasLoadFailed
    ? 'Không tải được danh sách cộng tác viên. Vui lòng thử lại.'
    : !trimmed
      ? 'Không tìm thấy cộng tác viên phù hợp.'
      : showCreate
        ? `Không tìm thấy cộng tác viên "${trimmed}". Bạn có muốn tạo mới?`
        : `Không tìm thấy cộng tác viên "${trimmed}".`

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <span className="typo-body-sm-regular text-content-dark-3">{message}</span>
      {showCreate && (
        <>
          <span className="typo-body-xs-regular text-content-dark-4">
            Trang tạo CTV mở ở tab mới — tạo xong quay lại đây và chọn lại.
          </span>
          <Button
            type="button"
            variant="text"
            size="small"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.stopPropagation()
              onCreate()
            }}
            leftIcon={<IconPlus size={16} />}
            className="text-action-primary-red-default hover:bg-action-primary-red-activated typo-body-base-semibold h-9 rounded-md px-3 transition-colors"
          >
            Tạo mới CTV
          </Button>
        </>
      )}
    </div>
  )
}
