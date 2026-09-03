import { forwardRef, useCallback, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Select } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@/assets/icons'
import type { SelectOption } from '@/components/ui/select/Select'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useDialog } from '@/hooks/useDialog'
import { useApiMutation } from '@/hooks/useApiQuery'
import { useAbility } from '@/lib/ability'
import {
  getRealEstateService,
  type Investor,
  type InvestorRequest,
  type GetInvestorsDropdownParams,
} from '@/services/realestate-service.ts'
import { InvestorForm } from '@/features/investor/_shares/components/InvestorForm.tsx'
import type { InvestorFormValues } from '@/features/investor/_shares/types/investor-form-types.ts'
import toastService from '@/services/toast-service.tsx'
import { PAGE_SIZE } from '@/constants/table.ts'
import {
  buildInvestorOption,
  isInvestorQueryKey,
  mergeInvestorOption,
  toInvestorId,
  type InvestorLike,
} from '@/features/investor/_shares/utils/investor-option.ts'

type InvestorSelectWithCreateProps = {
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
  additionalParams?: GetInvestorsDropdownParams | (() => GetInvestorsDropdownParams)
  /** Chủ đầu tư đã chọn sẵn (edit mode) — seed option để hiển thị nhãn ngay, không cần fetch. */
  initialInvestor?: InvestorLike | null
  /** Ép bật/tắt nút "Thêm mới". Mặc định theo quyền `investor.create`. */
  canCreate?: boolean
}

/**
 * Controller "Chủ đầu tư" dùng chung: bọc `Select` (async, phân trang) và bổ sung lối tạo mới ngay
 * tại chỗ khi search không ra kết quả. Nhấn "Thêm mới" → dialog `InvestorForm`; tạo thành công →
 * tự chọn chủ đầu tư vừa tạo. value/onChange dùng kiểu `number` (investor id).
 */
const InvestorSelectWithCreate = forwardRef<HTMLDivElement, InvestorSelectWithCreateProps>(
  (
    {
      name,
      value,
      onChange,
      error,
      disabled,
      required,
      label = 'Chủ đầu tư',
      placeholder = 'Tìm/chọn chủ đầu tư',
      searchPlaceholder = 'Tìm kiếm chủ đầu tư...',
      clearable = true,
      pageSize = PAGE_SIZE,
      additionalParams,
      initialInvestor,
      canCreate,
    },
    ref
  ) => {
    const ability = useAbility()
    const canCreateInvestor = (canCreate ?? ability.can('create', 'investor')) && !disabled

    const { displayFormContent, displayClose } = useDialog()
    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
      valueType: 'id',
      pageSize,
      additionalParams,
    })

    // Popover được điều khiển để chủ động đóng khi mở dialog tạo mới, tránh dropdown treo ở trạng
    // thái "không tìm thấy" sau khi đã tự chọn chủ đầu tư vừa tạo.
    const [isOpen, setIsOpen] = useState(false)

    // Option dựng tại chỗ (chủ đầu tư vừa tạo) + option khởi tạo edit mode → hiển thị nhãn tức thì.
    const [localOptions, setLocalOptions] = useState<SelectOption[]>(() =>
      initialInvestor?.id ? [buildInvestorOption(initialInvestor)] : []
    )

    const loadInitialOptions = useCallback(
      async (values: (string | number)[]): Promise<SelectOption[]> => {
        const local = localOptions.filter((o) => values.some((v) => String(v) === String(o.value)))
        const remaining = values.filter((v) => !local.some((o) => String(o.value) === String(v)))
        const fetched = remaining.length > 0 ? await loadInitialInvestorOptions(remaining) : []
        return [...local, ...fetched]
      },
      [localOptions, loadInitialInvestorOptions]
    )

    const handleSelectChange = useCallback(
      (next: string | number | (string | number)[] | null) => {
        onChange?.(toInvestorId(next))
      },
      [onChange]
    )

    const handleCreated = useCallback(
      (created: Investor) => {
        if (!created?.id) return
        setLocalOptions((prev) => mergeInvestorOption(prev, buildInvestorOption(created)))
        onChange?.(created.id)
        displayClose()
      },
      [onChange, displayClose]
    )

    const openCreateDialog = useCallback(() => {
      if (!canCreateInvestor) return
      setIsOpen(false)
      displayFormContent({
        title: 'Tạo mới chủ đầu tư',
        hideFooter: true,
        content: <CreateInvestorDialogContent onCreated={handleCreated} onCancel={displayClose} />,
      })
    }, [canCreateInvestor, displayFormContent, displayClose, handleCreated])

    const renderEmpty = useCallback(
      (query: string) => (
        <InvestorEmptyCreatePrompt
          query={query}
          canCreate={canCreateInvestor}
          onCreate={openCreateDialog}
        />
      ),
      [canCreateInvestor, openCreateDialog]
    )

    return (
      <Select
        ref={ref}
        name={name}
        label={label}
        required={required}
        value={value != null ? String(value) : null}
        onChange={handleSelectChange}
        loadOptions={loadInvestorOptions}
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

InvestorSelectWithCreate.displayName = 'InvestorSelectWithCreate'

export default InvestorSelectWithCreate

type InvestorEmptyCreatePromptProps = {
  query: string
  canCreate?: boolean
  onCreate: () => void
}

/** Khối empty của dropdown: nhắc "không tìm thấy" + nút mở dialog tạo mới (ẩn khi không có quyền). */
function InvestorEmptyCreatePrompt({ query, canCreate, onCreate }: InvestorEmptyCreatePromptProps) {
  const trimmed = query.trim()
  const message = !trimmed
    ? 'Không tìm thấy chủ đầu tư phù hợp.'
    : canCreate
      ? `Không tìm thấy chủ đầu tư "${trimmed}". Bạn có muốn thêm mới?`
      : `Không tìm thấy chủ đầu tư "${trimmed}".`

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
          Thêm mới chủ đầu tư
        </Button>
      )}
    </div>
  )
}

type CreateInvestorDialogContentProps = {
  onCreated: (investor: Investor) => void
  onCancel: () => void
}

/**
 * Nội dung dialog tạo mới: sở hữu mutation nên trạng thái loading/lỗi phản ứng đúng.
 * `InvestorForm` tự bắt lỗi API (map field + toast) nên khi lỗi dialog KHÔNG đóng; chỉ đóng khi
 * `mutateAsync` thành công (không throw) → gọi `onCreated`.
 */
function CreateInvestorDialogContent({ onCreated, onCancel }: CreateInvestorDialogContentProps) {
  const queryClient = useQueryClient()

  // KHÔNG dùng `useCreateInvestor` mặc định: onSuccess của nó gọi `invalidateQueries()` TOÀN BỘ →
  // query chi tiết dự án refetch → `ProjectForm` reset() theo initialData → GHI ĐÈ chủ đầu tư vừa
  // chọn (bug edit mode). Ở đây chỉ invalidate cache chủ đầu tư, không đụng form dự án đang mở.
  const createInvestorMutation = useApiMutation(
    (data: InvestorRequest) => getRealEstateService().createInvestor(data),
    {
      skipInvalidateOnSuccess: true,
      onSuccess: () => {
        queryClient.invalidateQueries({ predicate: (query) => isInvestorQueryKey(query.queryKey) })
      },
    }
  )

  const handleSubmit = useCallback(
    async (values: InvestorFormValues) => {
      const { attachment_tokens, attachment_keep_ids: _keep, ...rest } = values
      const payload: InvestorRequest = {
        ...rest,
        ...(attachment_tokens.length > 0 ? { files: { attachments: attachment_tokens } } : {}),
      }
      const created = await createInvestorMutation.mutateAsync(payload)
      toastService.success('Tạo chủ đầu tư thành công')
      onCreated(created)
    },
    [createInvestorMutation, onCreated]
  )

  return (
    <InvestorForm
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isSubmitting={createInvestorMutation.isPending}
      formClassname={'p-0 my-0'}
    />
  )
}
