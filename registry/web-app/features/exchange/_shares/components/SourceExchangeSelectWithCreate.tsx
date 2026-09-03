import { forwardRef, useCallback, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Select } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@/assets/icons'
import type {
  SelectOption,
  LoadOptionsParams,
  LoadOptionsResult,
} from '@/components/ui/select/Select'
import { useDialog } from '@/hooks/useDialog'
import { useApiMutation } from '@/hooks/useApiQuery'
import { useAbility } from '@/lib/ability'
import {
  getRealEstateService,
  type SourceExchange,
  type SourceExchangeRequest,
} from '@/services/realestate-service.ts'
import { ExchangeForm } from '@/features/exchange/_shares/components/ExchangeForm.tsx'
import type { ExchangeFormValues } from '@/features/exchange/_shares/types/exchange-form-types.ts'
import toastService from '@/services/toast-service.tsx'
import { PAGE_SIZE } from '@/constants/table.ts'
import { toSelectId, mergeSelectOption } from '@/utils/select-option-utils.ts'
import {
  buildExchangeOption,
  isSourceExchangeQueryKey,
  type ExchangeLike,
} from '@/features/exchange/_shares/utils/exchange-option.ts'

type SourceExchangeSelectWithCreateProps = {
  /** Tên field (do FormController truyền qua `field.name`) → gắn vào Select cho a11y/label htmlFor. */
  name?: string
  value?: number | null
  onChange?: (value: number | null) => void
  error?: string
  disabled?: boolean
  required?: boolean
  label?: ReactNode
  placeholder?: string
  searchPlaceholder?: string
  clearable?: boolean
  pageSize?: number
  /** Loader danh sách sàn (do nơi gọi cấp — vd loader nguồn sàn F0 đã scope theo dự án). */
  loadOptions: (params: LoadOptionsParams) => Promise<LoadOptionsResult<SelectOption>>
  loadInitialOptions: (values: (string | number)[]) => Promise<SelectOption[]>
  /** Sàn đã chọn sẵn (edit mode) — seed option để hiển thị nhãn ngay, không cần fetch. */
  initialExchange?: ExchangeLike | null
  /** Ép bật/tắt nút "Thêm mới". Mặc định theo quyền `source_exchange.create`. */
  canCreate?: boolean
}

/**
 * Controller "Sàn F0" (nguồn sàn) dùng chung: bọc `Select` và bổ sung lối tạo mới ngay tại chỗ khi
 * search không ra kết quả. Nhấn "Thêm mới" → dialog `ExchangeForm`; tạo thành công → tự chọn sàn
 * vừa tạo. value/onChange dùng kiểu `number` (source exchange id). Loader danh sách do nơi gọi cấp.
 */
const SourceExchangeSelectWithCreate = forwardRef<
  HTMLDivElement,
  SourceExchangeSelectWithCreateProps
>(
  (
    {
      name,
      value,
      onChange,
      error,
      disabled,
      required,
      label = 'Sàn F0',
      placeholder = 'Chọn sàn',
      searchPlaceholder = 'Tìm sàn...',
      clearable = true,
      pageSize = PAGE_SIZE,
      loadOptions,
      loadInitialOptions: loadInitialOptionsProp,
      initialExchange,
      canCreate,
    },
    ref
  ) => {
    const ability = useAbility()
    const canCreateExchange = (canCreate ?? ability.can('create', 'source_exchange')) && !disabled

    const { displayFormContent, displayClose } = useDialog()

    // Popover controlled để chủ động đóng khi mở dialog tạo mới (tránh dropdown treo trạng thái
    // "không tìm thấy" sau khi đã tự chọn sàn vừa tạo).
    const [isOpen, setIsOpen] = useState(false)

    // Option dựng tại chỗ (sàn vừa tạo) + option khởi tạo edit mode → hiển thị nhãn tức thì.
    const [localOptions, setLocalOptions] = useState<SelectOption[]>(() =>
      initialExchange?.id ? [buildExchangeOption(initialExchange)] : []
    )

    const loadInitialOptions = useCallback(
      async (values: (string | number)[]): Promise<SelectOption[]> => {
        const local = localOptions.filter((o) => values.some((v) => String(v) === String(o.value)))
        const remaining = values.filter((v) => !local.some((o) => String(o.value) === String(v)))
        const fetched = remaining.length > 0 ? await loadInitialOptionsProp(remaining) : []
        return [...local, ...fetched]
      },
      [localOptions, loadInitialOptionsProp]
    )

    const handleSelectChange = useCallback(
      (next: string | number | (string | number)[] | null) => {
        onChange?.(toSelectId(next))
      },
      [onChange]
    )

    const handleCreated = useCallback(
      (created: SourceExchange) => {
        if (!created?.id) return
        setLocalOptions((prev) => mergeSelectOption(prev, buildExchangeOption(created)))
        onChange?.(created.id)
        displayClose()
      },
      [onChange, displayClose]
    )

    const openCreateDialog = useCallback(() => {
      if (!canCreateExchange) return
      setIsOpen(false)
      displayFormContent({
        title: 'Tạo mới nguồn sàn',
        hideFooter: true,
        content: (
          <CreateSourceExchangeDialogContent onCreated={handleCreated} onCancel={displayClose} />
        ),
      })
    }, [canCreateExchange, displayFormContent, displayClose, handleCreated])

    const renderEmpty = useCallback(
      (query: string) => (
        <ExchangeEmptyCreatePrompt
          query={query}
          canCreate={canCreateExchange}
          onCreate={openCreateDialog}
        />
      ),
      [canCreateExchange, openCreateDialog]
    )

    return (
      <Select
        ref={ref}
        name={name}
        label={label}
        required={required}
        value={value != null ? String(value) : null}
        onChange={handleSelectChange}
        loadOptions={loadOptions}
        loadInitialOptions={loadInitialOptions}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        enableSearch
        clearable={clearable}
        pageSize={pageSize}
        disabled={disabled}
        error={error}
        open={isOpen}
        onOpenChange={setIsOpen}
        renderEmpty={renderEmpty}
      />
    )
  }
)

SourceExchangeSelectWithCreate.displayName = 'SourceExchangeSelectWithCreate'

export default SourceExchangeSelectWithCreate

type ExchangeEmptyCreatePromptProps = {
  query: string
  canCreate?: boolean
  onCreate: () => void
}

/** Khối empty của dropdown: nhắc "không tìm thấy" + nút mở dialog tạo mới sàn (ẩn khi thiếu quyền). */
function ExchangeEmptyCreatePrompt({ query, canCreate, onCreate }: ExchangeEmptyCreatePromptProps) {
  const trimmed = query.trim()
  const message = !trimmed
    ? 'Không tìm thấy sàn phù hợp.'
    : canCreate
      ? `Không tìm thấy sàn "${trimmed}". Bạn có muốn thêm mới?`
      : `Không tìm thấy sàn "${trimmed}".`

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <span className="typo-body-sm-regular text-content-dark-3">{message}</span>
      {canCreate && (
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
          Thêm mới sàn F0
        </Button>
      )}
    </div>
  )
}

type CreateSourceExchangeDialogContentProps = {
  onCreated: (exchange: SourceExchange) => void
  onCancel: () => void
}

/**
 * Nội dung dialog tạo mới nguồn sàn (F0): sở hữu mutation nên loading/lỗi phản ứng đúng.
 * `ExchangeForm` tự bắt lỗi API (map field + toast) nên khi lỗi dialog KHÔNG đóng; chỉ đóng khi
 * `mutateAsync` thành công (không throw) → gọi `onCreated`.
 */
function CreateSourceExchangeDialogContent({
  onCreated,
  onCancel,
}: CreateSourceExchangeDialogContentProps) {
  const queryClient = useQueryClient()

  // KHÔNG dùng `useCreateSourceExchange` mặc định: onSuccess của nó gọi `invalidateQueries()` TOÀN
  // BỘ → query chi tiết bảng hàng refetch → SaleAllocationForm re-sync theo `values` → GHI ĐÈ sàn
  // vừa chọn. Ở đây chỉ invalidate cache nguồn sàn, không đụng form bảng hàng đang mở.
  const createSourceExchangeMutation = useApiMutation(
    (data: SourceExchangeRequest) => getRealEstateService().createSourceExchange(data),
    {
      skipInvalidateOnSuccess: true,
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (query) => isSourceExchangeQueryKey(query.queryKey),
        })
      },
    }
  )

  const handleSubmit = useCallback(
    async (values: ExchangeFormValues) => {
      const { attachment_tokens, ...rest } = values
      const payload: SourceExchangeRequest = {
        ...rest,
        ...(attachment_tokens.length > 0 ? { files: { attachments: attachment_tokens } } : {}),
      }
      const created = await createSourceExchangeMutation.mutateAsync(payload)
      toastService.success('Tạo nguồn sàn thành công')
      onCreated(created)
    },
    [createSourceExchangeMutation, onCreated]
  )

  return (
    <ExchangeForm
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isSubmitting={createSourceExchangeMutation.isPending}
      formClassname={'p-0 my-0'}
    />
  )
}
