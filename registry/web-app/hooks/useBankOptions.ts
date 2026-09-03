import { useMemo } from 'react'
import { useBanks } from '@/services/common-service'
import type { SelectOption } from '../ui/select/Select.tsx'

// Danh mục ngân hàng hiện có 23 bản ghi, backend mặc định 25/trang.
// Truyền page_size tường minh để danh sách không bị cắt khi bổ sung ngân hàng mới.
const BANK_PAGE_SIZE = 100

type UseBankOptionsResult = {
  bankOptions: SelectOption[]
  isLoadingBanks: boolean
}

/**
 * Options cho dropdown chọn ngân hàng, hiển thị dạng "[Tên viết tắt] - [Tên chính thống]".
 *
 * Giá trị lưu xuống API là `bank.name` (tên chính thống) — giữ nguyên kiểu dữ liệu
 * chuỗi tự do của các field `source_bank_name` / `receiver_bank_name` hiện tại.
 *
 * @param currentValue giá trị đang lưu của form. Bản ghi cũ nhập tay có thể không khớp
 * danh mục; khi đó giá trị này được thêm vào options để form sửa không mất dữ liệu
 * (Select bỏ qua value không có trong options và hiện placeholder rỗng).
 */
export default function useBankOptions(currentValue?: string | null): UseBankOptionsResult {
  const { data: banksData, isLoading: isLoadingBanks } = useBanks({ page_size: BANK_PAGE_SIZE })

  const bankOptions = useMemo(() => {
    const options: SelectOption[] = (banksData?.results || []).map((bank) => ({
      value: bank.name,
      label: `${bank.code} - ${bank.name}`,
    }))

    if (currentValue && !options.some((option) => option.value === currentValue)) {
      return [...options, { value: currentValue, label: currentValue }]
    }

    return options
  }, [banksData?.results, currentValue])

  return { bankOptions, isLoadingBanks }
}
