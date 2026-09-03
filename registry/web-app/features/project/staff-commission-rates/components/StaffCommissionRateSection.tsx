import { useCallback, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { IconPlus } from '@/assets/icons'
import { Button, Select, TextArea, TextField } from '@/components/ui'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import {
  useCreateStaffCommissionRate,
  useDeleteStaffCommissionRate,
  useStaffCommissionRates,
  useUpdateStaffCommissionRate,
  type ProjectStaffCommissionRateConfig,
} from '@/features/project/staff-commission-rates/services/staff-commission-rate-service'
import { StaffCommissionRateRole as StaffRole } from '@/constants/api-schema-aliases'

const SUBJECT = 'project_staff_commission_rate'
const ROLE_KEY = APP_CONSTANT_KEY.REALESTATE.PROJECT_STAFF_ROLE_CHOICES

const rateFormSchema = z.object({
  role: z.nativeEnum(StaffRole, { required_error: 'Vui lòng chọn vai trò' }),
  pct_rate: z
    .union([z.number(), z.string()])
    .refine((v) => v !== '' && v != null, { message: 'Vui lòng nhập định mức' })
    .transform((v) => String(Number(String(v).replace(/,/g, '')))),
  note: z.string().nullish(),
})
type RateFormValues = z.input<typeof rateFormSchema>

type RateFormProps = {
  projectId: number
  roleOptions: Array<{ value: string; label: string }>
  existing?: ProjectStaffCommissionRateConfig
  usedRoles: string[]
  onSaved: () => void
  onClose: () => void
}

const StaffCommissionRateForm = ({
  projectId,
  roleOptions,
  existing,
  usedRoles,
  onSaved,
  onClose,
}: RateFormProps) => {
  const createMutation = useCreateStaffCommissionRate()
  const updateMutation = useUpdateStaffCommissionRate()
  const isSaving = createMutation.isPending || updateMutation.isPending

  const { control, handleSubmit, setError } = useForm<RateFormValues>({
    resolver: zodResolver(rateFormSchema),
    defaultValues: {
      role: existing?.role,
      pct_rate: existing?.pct_rate ?? '',
      note: existing?.note ?? '',
    },
  })

  // On create, only roles not yet configured are selectable.
  const availableRoleOptions = existing
    ? roleOptions
    : roleOptions.filter((o) => !usedRoles.includes(o.value))

  const onSubmit = handleSubmit(async (values) => {
    const parsed = rateFormSchema.parse(values)
    try {
      if (existing) {
        await updateMutation.mutateAsync({
          projectPk: projectId,
          id: existing.id,
          data: { pct_rate: parsed.pct_rate, note: parsed.note ?? '' },
        })
      } else {
        await createMutation.mutateAsync({
          projectPk: projectId,
          data: { role: parsed.role, pct_rate: parsed.pct_rate, note: parsed.note ?? '' },
        })
      }
      toastService.success('Đã lưu định mức hoa hồng')
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
        name="role"
        render={({ field, fieldState }) => (
          <Select
            label="Vai trò"
            placeholder="Chọn vai trò"
            options={availableRoleOptions}
            value={field.value || null}
            onChange={field.onChange}
            disabled={!!existing}
            required
            error={fieldState.error?.message}
          />
        )}
      />
      <div className="flex flex-col gap-1">
        <Controller
          control={control}
          name="pct_rate"
          render={({ field, fieldState }) => (
            <TextField
              label="Định mức (%)"
              placeholder="VD: 1.2 hoặc 0.001"
              value={field.value?.toString() ?? ''}
              onChange={field.onChange}
              required
              error={fieldState.error?.message}
            />
          )}
        />
        <span className="typo-body-sm-regular text-content-dark-3">
          Với GĐ dự án, đây là mức đang dùng để tính hoa hồng ở mọi kỳ (kể cả kỳ đã duyệt) — sửa sẽ
          áp dụng ngay.
        </span>
      </div>
      <Controller
        control={control}
        name="note"
        render={({ field }) => (
          <TextArea
            label="Ghi chú"
            placeholder="Ghi chú (nếu có)"
            value={field.value ?? ''}
            onChange={field.onChange}
            rows={2}
          />
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

export type StaffCommissionRateSectionProps = {
  projectId: number
  active: boolean
}

export const StaffCommissionRateSection = ({
  projectId,
  active,
}: StaffCommissionRateSectionProps) => {
  const ability = useAbility()
  const { displayCustom, displayClose, displayConfirm } = useDialog()
  const canList = ability.can('list', SUBJECT)
  const canManage =
    ability.can('create', SUBJECT) &&
    ability.can('update', SUBJECT) &&
    ability.can('destroy', SUBJECT)

  const { keysMap, keysMapOptions } = useAppConstant({ module: 'realestate', keys: [ROLE_KEY] })
  const roleLabels = (keysMap.get(ROLE_KEY) as Record<string, string> | undefined) ?? {}
  const roleOptions = (
    (keysMapOptions.get(ROLE_KEY) ?? []) as Array<{
      value: string
      label: string
    }>
  ).filter((o) => o.value === StaffRole.project_director)

  const { data, isLoading, refetch } = useStaffCommissionRates(projectId, {
    enabled: !!projectId && canList && active,
  })
  const rows = useMemo(() => data?.results ?? [], [data])
  const usedRoles = rows.map((r) => r.role)
  const deleteMutation = useDeleteStaffCommissionRate()

  const openForm = useCallback(
    (existing?: ProjectStaffCommissionRateConfig) => {
      displayCustom({
        title: existing ? 'Sửa định mức hoa hồng' : 'Thêm định mức hoa hồng',
        size: 'md',
        hideFooter: true,
        content: (
          <StaffCommissionRateForm
            projectId={projectId}
            roleOptions={roleOptions}
            existing={existing}
            usedRoles={usedRoles}
            onSaved={refetch}
            onClose={displayClose}
          />
        ),
      })
    },
    [displayCustom, displayClose, projectId, roleOptions, usedRoles, refetch]
  )

  const handleDelete = useCallback(
    (row: ProjectStaffCommissionRateConfig) => {
      displayConfirm({
        title: 'Xoá định mức',
        content: `Xoá định mức hoa hồng cho vai trò "${roleLabels[row.role] ?? row.role}"?`,
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync({ projectPk: projectId, id: row.id })
            toastService.success('Đã xoá định mức')
            await refetch()
          } catch (err) {
            handleApiError(err)
          }
        },
      })
    },
    [displayConfirm, deleteMutation, projectId, roleLabels, refetch]
  )

  if (!canList) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="typo-body-lg-semibold text-content-dark-1">
          Cấu hình HH GDDA &amp; Thưởng TKKD
        </h3>
        {canManage && usedRoles.length < roleOptions.length && (
          <Button
            type="button"
            variant="secondary"
            leftIcon={<IconPlus className="h-4 w-4" />}
            onClick={() => openForm()}
          >
            Thêm cấu hình
          </Button>
        )}
      </div>

      {isLoading ? (
        <span className="text-content-dark-3">Đang tải...</span>
      ) : rows.length === 0 ? (
        <div className="border-border-1 rounded-lg border border-dashed bg-white py-8 text-center">
          <span className="typo-body-base-regular text-content-dark-3">
            Chưa có định mức hoa hồng cho vai trò nào.
          </span>
        </div>
      ) : (
        <div className="border-border-1 overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left">
            <thead className="bg-neutral-5 text-content-dark-3 typo-body-sm-semibold">
              <tr>
                <th className="px-4 py-2">Vai trò</th>
                <th className="px-4 py-2 text-right">Định mức (%)</th>
                <th className="px-4 py-2">Ghi chú</th>
                {canManage && <th className="px-4 py-2 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="typo-body-base-regular text-content-dark-1">
              {rows.map((row) => (
                <tr key={row.id} className="border-border-1 border-t">
                  <td className="px-4 py-2">{roleLabels[row.role] ?? row.role}</td>
                  <td className="px-4 py-2 text-right">{row.pct_rate}</td>
                  <td className="px-4 py-2">{row.note || '—'}</td>
                  {canManage && (
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="text" onClick={() => openForm(row)}>
                          Sửa
                        </Button>
                        <Button type="button" variant="text" onClick={() => handleDelete(row)}>
                          Xoá
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default StaffCommissionRateSection
