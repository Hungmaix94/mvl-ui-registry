import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'

import { Button, CurrencyInput, Select, TextArea } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { useAccountingPeriodSelect } from '@/hooks/useAccountingPeriodSelect'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { handleApiError } from '@/utils/error-utils'
import { PROMOTION_MANUAL_ENTRY_CANCEL_HINT } from '@/features/accounting/promotion-manual-entries/constants/promotion-manual-entry-constants'

export type PromotionManualEntryFormValues = {
  employee: number | null
  accounting_period: number | null
  expected_amount: string
  reason: string
}

type Props = {
  mode: 'create' | 'edit'
  /**
   * Khoá 2 ô nhân sự / kỳ khi dialog mở TỪ bảng kê của một người: bối cảnh đã xác định,
   * cho sửa hai ô đó chỉ tạo đường ghi tiền nhầm người mà không ai nhận ra.
   */
  lockContext?: boolean
  defaultValues?: Partial<PromotionManualEntryFormValues>
  onSubmit: (values: PromotionManualEntryFormValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export default function PromotionManualEntryFormDialog({
  mode,
  lockContext = false,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: Props) {
  const { loadAccountingPeriodOptions, loadInitialAccountingPeriodOptions } =
    useAccountingPeriodSelect()
  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect()

  const { register, control, handleSubmit, setError } = useForm<PromotionManualEntryFormValues>({
    mode: 'onTouched',
    defaultValues: {
      employee: null,
      accounting_period: null,
      expected_amount: '',
      reason: '',
      ...defaultValues,
    },
  })

  const handleFormSubmit = useCallback(
    async (values: PromotionManualEntryFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
        // AppDialog closes the dialog when the handler returns normally, so a failed save has
        // to re-throw to keep the form (and the typed values) on screen.
        throw error
      }
    },
    [onSubmit, setError]
  )

  return (
    <Form handleSubmit={handleSubmit as never} onSubmit={handleFormSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="5" className="w-full px-1 py-2">
        <p className="typo-body-sm-regular text-content-dark-3">
          Khoản hoa hồng xúc tiến theo văn bản thoả thuận, nằm ngoài công thức phiếu phân bổ. Không
          gắn dự án. Số tiền cộng vào mục "HH Đầu tư &amp; Xúc tiến" của bảng kê và chịu thuế TNCN
          lũy tiến cùng đợt chi khối quản lý.
        </p>

        <FormController
          register={register}
          name="employee"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Nhân sự',
            placeholder: 'Chọn nhân sự',
            required: true,
            loadOptions: loadEmployeeOptions,
            loadInitialOptions: loadInitialEmployeeOptions,
            enableSearch: true,
            searchPlaceholder: 'Tìm theo tên hoặc mã…',
            isClearable: true,
            disabled: mode === 'edit' || lockContext,
          }}
        />

        <FormController
          register={register}
          name="accounting_period"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Kỳ kế toán',
            placeholder: 'Chọn kỳ kế toán',
            required: true,
            loadOptions: loadAccountingPeriodOptions,
            loadInitialOptions: loadInitialAccountingPeriodOptions,
            isClearable: true,
            disabled: mode === 'edit' || lockContext,
          }}
        />

        <FormController
          register={register}
          name="expected_amount"
          control={control}
          Field={CurrencyInput}
          fieldProps={{
            label: 'Số tiền (VND)',
            placeholder: 'Nhập số tiền',
            required: true,
            allowNegative: true,
          }}
        />

        <FormController
          register={register}
          name="reason"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Lý do / số văn bản',
            placeholder: 'Ví dụ: Theo quyết định số 12/QĐ-TGĐ ngày 20/08/2026',
            rows: 3,
          }}
        />

        <p className="typo-body-sm-regular text-content-dark-3">
          {PROMOTION_MANUAL_ENTRY_CANCEL_HINT}
        </p>

        <Flex gap="3" justify="end">
          <Button
            type="button"
            variant="secondary-border"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Huỷ
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Thêm khoản' : 'Lưu thay đổi'}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}
