import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Button, FullScreenLoading, Select, TextArea, TextField } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import {
  type CollaboratorFormValues,
  collaboratorFormSchema,
} from '@/features/accounting/collaborators/types/collaborator-types.ts'
import {
  type CollaboratorRequest,
  useCollaborator,
  useCreateCollaborator,
  useUpdateCollaborator,
} from '@/features/accounting/collaborators/services/collaborator-service.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { useBanks } from '@/services/common-service'
import toastService from '@/services/toast-service.tsx'

/**
 * KHÔNG dùng hook router (`useNavigate`/`useLocation`…) trong file này — điều hướng là việc của
 * page, truyền qua `onSuccess` / `onCancel`. Lý do lịch sử: form từng được nhúng vào dialog toàn
 * cục, mà `<GlobalDialog />` là sibling của `<RouterProvider />` trong `App.tsx` nên mọi thứ render
 * trong dialog nằm NGOÀI Router và `useNavigate()` throw, làm nổ cả cây component.
 */
interface CollaboratorFormProps {
  collaboratorId?: number
  initialValues?: Partial<CollaboratorFormValues>
  /**
   * Chạy sau khi lưu thành công — page thì điều hướng về danh sách, dialog thì đóng dialog.
   * BẮT BUỘC: form không tự đoán được nơi gọi đang là page hay dialog, nên mọi fallback ở đây đều
   * sai ở một trong hai ngữ cảnh (vd. `history.back()` sẽ lùi route trong khi dialog vẫn mở).
   */
  onSuccess: () => void
  /** Hành vi nút "Huỷ" — page thì quay lại danh sách, dialog thì đóng dialog. BẮT BUỘC, lý do như trên. */
  onCancel: () => void
}

const COLLABORATOR_STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Ngưng hoạt động' },
] as const

const DEFAULT_VALUES: CollaboratorFormValues = {
  name: '',
  id_number: '',
  tax_code: '',
  phone: '',
  email: '',
  bank_name: '',
  bank_account: '',
  bank_branch: '',
  address: '',
  note: '',
  is_active: true,
}

export default function CollaboratorForm({
  collaboratorId,
  initialValues,
  onSuccess,
  onCancel,
}: CollaboratorFormProps) {
  const isEditMode = !!collaboratorId
  const isInitialized = useRef(false)

  const { data: collaborator, isLoading: isLoadingDetail } = useCollaborator(collaboratorId || 0, {
    enabled: isEditMode,
  })
  const createMutation = useCreateCollaborator()
  const updateMutation = useUpdateCollaborator()
  const invalidateQueries = useInvalidateQueries()

  // Bank dropdown options. Collaborator.bank_name is free-text string, so use bank's `name` as value.
  // Mirror pattern: src/features/employee/management/view-details/tab-general/bank-account/components/BankAccountForm.tsx
  const { data: banksData } = useBanks()
  const bankOptions = useMemo(
    () => (banksData?.results || []).map((bank) => ({ value: bank.name, label: bank.name })),
    [banksData?.results]
  )

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorFormSchema) as any,
    mode: 'onTouched',
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form

  useEffect(() => {
    if (isEditMode && collaborator && !isInitialized.current) {
      reset({
        name: collaborator.name || '',
        id_number: collaborator.id_number || '',
        tax_code: (collaborator as any).tax_code || '',
        phone: collaborator.phone || '',
        email: collaborator.email || '',
        bank_name: collaborator.bank_name || '',
        bank_account: collaborator.bank_account || '',
        bank_branch: collaborator.bank_branch || '',
        address: collaborator.address || '',
        note: collaborator.note || '',
        is_active: collaborator.is_active ?? true,
      })
      isInitialized.current = true
    }
  }, [collaborator, isEditMode, reset])

  const onSubmit = async (values: CollaboratorFormValues) => {
    // `tax_code` chưa có trong schema sinh tự động nhưng backend đã nhận → khai báo tường minh.
    const payload: CollaboratorRequest & { tax_code?: string } = {
      name: values.name,
      id_number: values.id_number || undefined,
      tax_code: values.tax_code || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      bank_name: values.bank_name || undefined,
      bank_account: values.bank_account || undefined,
      bank_branch: values.bank_branch || undefined,
      address: values.address || undefined,
      note: values.note || undefined,
      is_active: values.is_active,
    }

    if (isEditMode && collaboratorId) {
      await updateMutation.mutateAsync({ id: collaboratorId, data: payload })
      toastService.success('Cập nhật cộng tác viên thành công')
    } else {
      await createMutation.mutateAsync(payload)
      toastService.success('Tạo cộng tác viên thành công')
    }

    await invalidateQueries.invalidateByPrefix('sales/collaborators')
    onSuccess?.()
  }

  const handleCancel = () => {
    onCancel()
  }

  if (isEditMode && isLoadingDetail) {
    return <FullScreenLoading />
  }

  const isPending = createMutation.isPending || updateMutation.isPending || isSubmitting

  return (
    <Form handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={isPending}>
      <Flex direction="column" gap="7" className="w-full">
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin cơ bản</h2>
          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Họ tên',
                required: true,
                placeholder: 'Nhập họ tên',
                maxLength: 255,
                className: 'w-full',
              }}
            />
            <FormController
              register={register}
              name="id_number"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'CMND/CCCD / Mã số thuế',
                placeholder: 'Nhập CMND/CCCD hoặc MST',
                maxLength: 30,
                className: 'w-full',
              }}
            />
            <FormController
              register={register}
              name="tax_code"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Mã số thuế',
                placeholder: 'Nhập mã số thuế',
                maxLength: 20,
                className: 'w-full',
              }}
            />
            <FormController
              register={register}
              name="phone"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Số điện thoại',
                placeholder: 'VD: 0901234567',
                maxLength: 15,
                className: 'w-full',
              }}
            />
            <FormController
              register={register}
              name="email"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Email',
                placeholder: 'VD: user@example.com',
                maxLength: 255,
                className: 'w-full',
              }}
            />
          </div>
        </div>

        <SeparatorHorizontal />

        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Tài khoản ngân hàng</h2>
          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="bank_name"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Tên ngân hàng',
                placeholder: 'Chọn tên ngân hàng',
                options: bankOptions,
                searchPlaceholder: 'Tìm kiếm ngân hàng...',
                enableSearch: true,
                isClearable: true,
                className: 'w-full',
              }}
            />
            <FormController
              register={register}
              name="bank_account"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Số tài khoản',
                placeholder: 'Nhập số tài khoản',
                maxLength: 50,
                className: 'w-full',
              }}
            />
            <FormController
              register={register}
              name="bank_branch"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Chi nhánh',
                placeholder: 'Nhập chi nhánh ngân hàng',
                maxLength: 255,
                className: 'w-full',
              }}
            />
          </div>
        </div>

        <SeparatorHorizontal />

        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Địa chỉ &amp; Ghi chú</h2>
          <FormController
            register={register}
            name="address"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Địa chỉ',
              placeholder: 'Nhập địa chỉ',
              maxCharacters: 1000,
              rows: 3,
              className: 'w-full',
            }}
          />
          <FormController
            register={register}
            name="note"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Nhập ghi chú',
              maxCharacters: 2000,
              rows: 4,
              className: 'w-full',
            }}
          />
        </div>

        <SeparatorHorizontal />

        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Trạng thái</h2>
          <div className="grid grid-cols-2 gap-5">
            <Controller
              name="is_active"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <Select
                  label="Trạng thái hoạt động"
                  required
                  options={
                    COLLABORATOR_STATUS_OPTIONS as unknown as { value: string; label: string }[]
                  }
                  value={field.value ? 'active' : 'inactive'}
                  onChange={(next) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    field.onChange(raw === 'active')
                  }}
                  error={error?.message}
                  className="w-full"
                />
              )}
            />
          </div>
        </div>

        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isPending}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            disabled={isPending}
            className="w-[150px]"
          >
            {isEditMode ? 'Cập nhật' : 'Lưu'}
          </Button>
        </div>
      </Flex>
    </Form>
  )
}
