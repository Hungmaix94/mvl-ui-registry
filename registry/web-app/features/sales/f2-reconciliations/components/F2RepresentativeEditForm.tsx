import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import {
  usePartialUpdateF2ReconciliationSheet,
  type PartialUpdateF2ReconciliationSheetRequest,
} from '../services/f2-reconciliation-service'

type FormValues = {
  mvl_representative: number | null
}

const formSchema = z.object({
  mvl_representative: z
    .number({ invalid_type_error: 'Vui lòng chọn người đại diện' })
    .nullable()
    .refine((value) => value != null, { message: 'Vui lòng chọn người đại diện' }),
})

type F2RepresentativeEditFormProps = {
  sheetId: number
  initialValues: FormValues
}

/**
 * Dialog content sửa nhanh người đại diện MVL ký "Biên bản xác nhận hoa hồng" — chỉ mở được khi
 * sheet DRAFT (86eynadnn). Bắt buộc chọn nhân viên có sẵn trong hệ thống (D12) — chức vụ không
 * nhập tay, `EmployeeSelectWithDialog` tự hiển thị chức vụ hiện tại của nhân viên được chọn, đọc
 * động theo hồ sơ nhân sự. BE khoá field sau CONFIRMED và chặn nhân viên chưa có chức vụ → 400,
 * không cần chặn lại ở FE.
 */
const F2RepresentativeEditForm = ({ sheetId, initialValues }: F2RepresentativeEditFormProps) => {
  const { displayClose } = useDialog()
  const queryClient = useQueryClient()
  const mutation = usePartialUpdateF2ReconciliationSheet()

  const { control, handleSubmit } = useForm<FormValues>({
    // zod's `.refine` narrows the schema's output type to non-null, which mismatches
    // `useForm<FormValues>` (kept nullable so the field can start unset) — same cast pattern as
    // F2ReconciliationForm's resolver, not a shape paper-over.
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: initialValues,
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync({
        id: sheetId,
        // `status` là field bắt buộc trên type Patched* dù PATCH thật sự partial ở BE (DRF bỏ qua
        // `required` khi `partial=True`) — cast để khớp type schema-gen, không đổi payload thật gửi đi.
        data: {
          mvl_representative: values.mvl_representative,
        } as PartialUpdateF2ReconciliationSheetRequest,
      })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'f2-reconciliation-sheets', 'detail', sheetId],
      })
      toastService.success('Cập nhật người đại diện thành công')
      displayClose()
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-4 p-4">
      <Controller
        name="mvl_representative"
        control={control}
        render={({ field, fieldState }) => (
          <EmployeeSelectWithDialog
            label="Người đại diện MVL"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            required
          />
        )}
      />

      <div className="border-border-1 mt-2 flex items-center justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="secondary-border"
          onClick={() => displayClose()}
          disabled={mutation.isPending}
        >
          Hủy
        </Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          Lưu
        </Button>
      </div>
    </form>
  )
}

export default F2RepresentativeEditForm
