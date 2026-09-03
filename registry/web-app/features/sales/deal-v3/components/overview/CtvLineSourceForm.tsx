import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField, Button, Select } from '@/components/ui'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect'
import { useCtvLineSourceCreate } from '@/features/sales/deals/services/deal-service'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import { extractErrorMessage } from '@/utils/error-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

const formSchema = z.object({
  ctv_line_type: z.string().nullable().optional(),
  ctv_line_employee: z.union([z.string(), z.number()]).nullable().optional(),
  ctv_line_department: z.union([z.string(), z.number()]).nullable().optional(),
  reason: z.string().min(1, 'Vui lòng nhập lý do thay đổi'),
})

type FormValues = z.infer<typeof formSchema>

interface CtvLineSourceFormProps {
  dealId: number
  shareId: number
  initialValues?: {
    ctv_line_type?: string | null
    ctv_line_employee?: number | null
    ctv_line_department?: number | null
    employeeLabel?: string
    departmentLabel?: string
  }
}

export const CtvLineSourceForm: React.FC<CtvLineSourceFormProps> = ({
  dealId,
  shareId,
  initialValues,
}) => {
  const { displayClose } = useDialog()
  const queryClient = useQueryClient()
  const mutation = useCtvLineSourceCreate()

  const { loadEmployeeOptions } = useEmployeeSelect()
  const { loadDepartmentOptions } = useDepartmentSelect()

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT_SALE.CTV_LINE_TYPE_CHOICES],
  })

  const ctvLineTypeOptions = [
    ...(keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT_SALE.CTV_LINE_TYPE_CHOICES) ||
      []),
  ]

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ctv_line_type: initialValues?.ctv_line_type || '',
      ctv_line_employee: initialValues?.ctv_line_employee || '',
      ctv_line_department: initialValues?.ctv_line_department || '',
      reason: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync({
        id: dealId,
        data: {
          share_id: shareId,
          ctv_line_type: values.ctv_line_type || null,
          ctv_line_employee: values.ctv_line_employee ? Number(values.ctv_line_employee) : null,
          ctv_line_department: values.ctv_line_department
            ? Number(values.ctv_line_department)
            : null,
          reason: values.reason,
        },
      })
      toastService.success('Cập nhật Line CTV thành công')
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'detail', dealId] })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', 'workspace', 'commission', dealId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', dealId, 'commission-shares'],
      })
      displayClose()
    } catch (error: any) {
      toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi cập nhật Line CTV'))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col space-y-4 p-4">
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <label className="text-content-dark-1 text-sm font-medium">Phân loại Line CTV</label>
          <Controller
            name="ctv_line_type"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                {...field}
                options={ctvLineTypeOptions}
                placeholder="Chọn phân loại Line CTV"
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-content-dark-1 text-sm font-medium">Nhân viên Line</label>
          <Controller
            name="ctv_line_employee"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                {...field}
                value={field.value || null}
                onChange={(val: any) => field.onChange(val ? String(val) : '')}
                options={
                  field.value && initialValues?.employeeLabel
                    ? [{ value: String(field.value), label: initialValues.employeeLabel }]
                    : undefined
                }
                loadOptions={loadEmployeeOptions}
                enableSearch={true}
                searchPlaceholder="Tìm kiếm nhân viên..."
                placeholder="Chọn nhân viên Line"
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-content-dark-1 text-sm font-medium">Bộ phận Line</label>
          <Controller
            name="ctv_line_department"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                {...field}
                value={field.value || null}
                onChange={(val: any) => field.onChange(val ? String(val) : '')}
                options={
                  field.value && initialValues?.departmentLabel
                    ? [{ value: String(field.value), label: initialValues.departmentLabel }]
                    : undefined
                }
                loadOptions={loadDepartmentOptions}
                enableSearch={true}
                searchPlaceholder="Tìm kiếm bộ phận..."
                placeholder="Chọn bộ phận Line"
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-content-dark-1 text-sm font-medium">
            Lý do thay đổi <span className="text-data-red-default">*</span>
          </label>
          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value || ''}
                placeholder="Nhập lý do thay đổi..."
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </div>

      <div className="border-border-1 mt-6 flex items-center justify-end gap-3 border-t pt-4">
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
