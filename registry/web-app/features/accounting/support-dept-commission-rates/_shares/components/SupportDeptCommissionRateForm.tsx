import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button, Select, Switch, TextField } from '@/components/ui'
import { PAGE_SIZE } from '@/constants/table'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect'
import { type GetDepartmentsDropdownParams } from '@/features/org/services/department-service'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import {
  useCreateSupportDeptCommissionRate,
  useUpdateSupportDeptCommissionRate,
  type SupportDeptCommissionRateConfig,
} from '@/features/accounting/support-dept-commission-rates/services/support-dept-commission-rate-service'
import {
  SOURCE_KIND_OPTIONS,
  SourceKind,
  supportDeptCommissionRateFormSchema,
  type SupportDeptCommissionRateFormValues,
} from '@/features/accounting/support-dept-commission-rates/types/support-dept-commission-rate-types'

type Props = {
  existing?: SupportDeptCommissionRateConfig
  usedDepartmentIds: number[]
  onSaved: () => void
  onClose: () => void
}

const SupportDeptCommissionRateForm = ({
  existing,
  usedDepartmentIds,
  onSaved,
  onClose,
}: Props) => {
  const createMutation = useCreateSupportDeptCommissionRate()
  const updateMutation = useUpdateSupportDeptCommissionRate()
  const isSaving = createMutation.isPending || updateMutation.isPending

  // Chỉ cho chọn phòng ban HEAD (đầu mối) khi cấu hình định mức hoa hồng theo phòng ban.
  // `is_main_department` do BE bổ sung vào endpoint dropdown (chưa có trong schema gen) → cast.
  const { loadDepartmentOptions, loadInitialDepartmentOptions } = useDepartmentSelect({
    pageSize: PAGE_SIZE,
    additionalParams: { is_main_department: true } as GetDepartmentsDropdownParams,
  })

  const { control, handleSubmit, setError } = useForm<SupportDeptCommissionRateFormValues>({
    resolver: zodResolver(supportDeptCommissionRateFormSchema),
    defaultValues: {
      department: existing?.department ?? 0,
      source_kind: (existing?.source_kind as SourceKind) ?? SourceKind.SUPPORT_FLAT,
      rate: existing?.rate ?? '',
      is_active: existing?.is_active ?? true,
    },
  })

  // Departments already configured cannot get a second row (OneToOne on the backend).
  const excludeIds = useMemo(
    () => new Set(usedDepartmentIds.filter((id) => id !== existing?.department)),
    [usedDepartmentIds, existing?.department]
  )
  const filterDepartmentOptions = useMemo(
    () => async (params: Parameters<typeof loadDepartmentOptions>[0]) => {
      const res = await loadDepartmentOptions(params)
      return { ...res, items: res.items.filter((o) => !excludeIds.has(Number(o.value))) }
    },
    [loadDepartmentOptions, excludeIds]
  )

  const onSubmit = handleSubmit(async (values) => {
    const parsed = supportDeptCommissionRateFormSchema.parse(values)
    try {
      if (existing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          data: {
            source_kind: parsed.source_kind,
            rate: parsed.rate,
            is_active: parsed.is_active,
          },
        })
      } else {
        await createMutation.mutateAsync({
          department: parsed.department,
          source_kind: parsed.source_kind,
          rate: parsed.rate,
          is_active: parsed.is_active,
        })
      }
      toastService.success('Đã lưu định mức hoa hồng phòng hỗ trợ')
      onSaved()
      onClose()
    } catch (err) {
      handleApiError(err, setError)
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Controller
        control={control}
        name="department"
        render={({ field, fieldState }) => (
          <Select
            label="Phòng ban"
            placeholder="Chọn phòng ban"
            loadOptions={filterDepartmentOptions}
            loadInitialOptions={loadInitialDepartmentOptions}
            pageSize={PAGE_SIZE}
            searchPlaceholder="Tìm kiếm phòng ban..."
            enableSearch
            value={field.value ? String(field.value) : null}
            onChange={(v) => field.onChange(v ? Number(v) : 0)}
            disabled={!!existing}
            required
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="source_kind"
        render={({ field, fieldState }) => (
          <Select
            label="Loại nguồn"
            placeholder="Chọn loại nguồn"
            options={SOURCE_KIND_OPTIONS}
            value={field.value || null}
            onChange={field.onChange}
            required
            error={fieldState.error?.message}
          />
        )}
      />
      <div className="flex flex-col gap-1">
        <Controller
          control={control}
          name="rate"
          render={({ field, fieldState }) => (
            <TextField
              label="Định mức (% tiền thu về)"
              placeholder="VD: 0.2 hoặc 0.8"
              value={field.value?.toString() ?? ''}
              onChange={field.onChange}
              required
              error={fieldState.error?.message}
            />
          )}
        />
        <span className="typo-body-sm-regular text-content-dark-3">
          Định mức tính trên tổng tiền thu về của các căn đã duyệt chi (PBTV) trong kỳ.
        </span>
      </div>
      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <div className="flex items-center justify-between">
            <span className="typo-body-base-regular text-content-dark-1">Kích hoạt</span>
            <Switch checked={!!field.value} onChange={field.onChange} />
          </div>
        )}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
          Hủy
        </Button>
        <Button type="submit" loading={isSaving}>
          Lưu
        </Button>
      </div>
    </form>
  )
}

export default SupportDeptCommissionRateForm
