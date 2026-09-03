import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField, CurrencyInput, Button, FileUpload, Select } from '@/components/ui'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import {
  useOverrideShareRate,
  useClearShareRate,
} from '@/features/sales/deals/services/deal-service'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import { CommissionShare } from '@/features/sales/deals/services/deal-service'
import { extractErrorMessage } from '@/utils/error-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { cleanDecimalString } from '@/features/sales/deal-v3/utils/commission-recipient'
import {
  getResetToPolicyButtonState,
  RESET_TO_POLICY_LABEL,
} from '@/features/sales/deal-v3/utils/commission-reset-policy'

const formSchema = z.object({
  percentage: z.string().optional().nullable(),
  fixed_amount: z.string().optional().nullable(),
  in_house_rate: z.union([z.string(), z.number()]).optional().nullable(),
  contribution_percentage: z.union([z.string(), z.number()]).optional().nullable(),
  reason: z.string().min(1, 'Vui lòng nhập lý do'),
  participant_id: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface EditCommissionShareFormProps {
  dealId: number
  share: CommissionShare & {
    pct_type?: string | null
    inHouseRate?: string | number | null
  }
  section?: 'split' | 'management' | 'promotion'
}

export const EditCommissionShareForm: React.FC<EditCommissionShareFormProps> = ({
  dealId,
  share,
  section = 'split',
}) => {
  const queryClient = useQueryClient()
  const mutation = useOverrideShareRate()
  const clearMutation = useClearShareRate()
  const { displayClose } = useDialog()

  const { loadEmployeeOptions } = useEmployeeSelect()

  const appConstKey =
    section === 'promotion'
      ? APP_CONSTANT_KEY.REALESTATE.TBC_PROMOTION_RECIPIENT_PCT_TYPE_CHOICES
      : APP_CONSTANT_KEY.REALESTATE.COMMISSION_RECIPIENT_CONFIG_PCT_TYPE_CHOICES

  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [appConstKey],
  })

  const roleOptions = [...(keysMapOptions.get(appConstKey) || [])]

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      percentage: share.actual_rate_percentage?.toString() || '',
      fixed_amount: share.calculated_amount?.toString() || '',
      reason: '',
      participant_id: share.employee?.id?.toString() || share.collaborator?.id?.toString() || '',
      in_house_rate: share.inHouseRate != null ? String(share.inHouseRate) : '',
      contribution_percentage: share.contribution_percentage?.toString() || '',
      role: share.pct_type || '',
    },
  })

  const [fileTokens, setFileTokens] = useState<string[]>([])

  const inHouseRateValue = form.watch('in_house_rate')
  const contributionPctValue = form.watch('contribution_percentage')

  React.useEffect(() => {
    if (section !== 'promotion') return
    const ihr = Number(String(inHouseRateValue || '').replace(',', '.'))
    const cp = Number(String(contributionPctValue || '').replace(',', '.'))
    if (!isNaN(ihr) && !isNaN(cp) && ihr > 0 && cp > 0) {
      const calculated = parseFloat(((ihr * cp) / 100).toFixed(4))
      const hasComma =
        String(inHouseRateValue).includes(',') || String(contributionPctValue).includes(',')
      form.setValue(
        'percentage',
        hasComma ? String(calculated).replace('.', ',') : String(calculated)
      )
    } else {
      form.setValue('percentage', null as any)
    }
  }, [section, inHouseRateValue, contributionPctValue, form])

  const onSubmit = async (values: FormValues) => {
    // Validate value before submit
    if (values.percentage) {
      const normalized = String(values.percentage).replace(',', '.')
      const num = Number(normalized)
      if (isNaN(num)) {
        toastService.error('Tỷ lệ % không hợp lệ')
        return
      }
      if (num < 0 || num > 100) {
        toastService.error('Tỷ lệ % phải từ 0 đến 100')
        return
      }
    }
    if (values.contribution_percentage) {
      const normalized = String(values.contribution_percentage).replace(',', '.')
      const num = Number(normalized)
      if (isNaN(num)) {
        toastService.error('Mức độ đóng góp không hợp lệ')
        return
      }
      if (num < 0 || num > 100) {
        toastService.error('Mức độ đóng góp phải từ 0 đến 100')
        return
      }
    }
    if (values.in_house_rate) {
      const normalized = String(values.in_house_rate).replace(',', '.')
      const num = Number(normalized)
      if (isNaN(num)) {
        toastService.error('Tỷ lệ in-house không hợp lệ')
        return
      }
      if (num < 0 || num > 100) {
        toastService.error('Tỷ lệ in-house phải từ 0 đến 100')
        return
      }
    }
    if (values.fixed_amount) {
      const num = Number(values.fixed_amount)
      if (isNaN(num) || num < 0) {
        toastService.error('Số tiền cố định không hợp lệ')
        return
      }
    }

    try {
      const finalPercentage = values.percentage
        ? Number(String(values.percentage).replace(',', '.'))
        : null

      const payload: any = {
        share_id: share.share_id,
        percentage: finalPercentage,
        fixed_amount: values.fixed_amount || null,
        reason: values.reason,
        ...(values.participant_id
          ? {
              recipient_id: Number(values.participant_id),
              recipient_kind:
                share.collaborator && values.participant_id === share.collaborator.id?.toString()
                  ? 'collaborator'
                  : 'employee',
            }
          : {}),
        ...(fileTokens.length > 0 ? { attachments: fileTokens } : {}),
      }

      if (section === 'promotion') {
        if (values.in_house_rate != null && values.in_house_rate !== '') {
          payload.in_house_rate = Number(String(values.in_house_rate).replace(',', '.'))
        }
        if (values.contribution_percentage != null && values.contribution_percentage !== '') {
          payload.contribution_percentage = Number(
            String(values.contribution_percentage).replace(',', '.')
          )
        }
      }

      await mutation.mutateAsync({
        id: dealId,
        section: section as any,
        data: payload,
      })
      toastService.success('Cập nhật đối tượng tham gia thành công')
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'detail', dealId] })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', 'workspace', 'commission', dealId],
      })
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', dealId, 'commission-shares'] })
      displayClose()
    } catch (error: any) {
      toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi cập nhật'))
    }
  }

  const handleReset = async () => {
    const reason = form.getValues('reason')
    if (!reason) {
      form.setError('reason', { type: 'manual', message: 'Vui lòng nhập lý do khôi phục' })
      return
    }

    try {
      await clearMutation.mutateAsync({
        id: dealId,
        section: section as any,
        shareId: String(share.share_id),
        data: {
          reason,
        },
      })
      toastService.success('Đã khôi phục theo chính sách chung')
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'detail', dealId] })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', 'workspace', 'commission', dealId],
      })
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', dealId, 'commission-shares'] })
      displayClose()
    } catch (error: any) {
      toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi khôi phục'))
    }
  }

  const getPercentageLabel = (section: string) => {
    switch (section) {
      case 'split':
        return 'Tỷ lệ tham gia (%)'
      case 'management':
        return 'HH cơ bản (%)'
      case 'promotion':
        return 'Mức độ đóng góp (%)'
      default:
        return 'Tỷ lệ (%)'
    }
  }

  const getFixedAmountLabel = (section: string) => {
    switch (section) {
      case 'split':
        return 'Thưởng nóng (VNĐ)'
      case 'management':
        return 'Thưởng / Số tiền cố định (VNĐ)'
      case 'promotion':
        return 'Số tiền cố định (VNĐ)'
      default:
        return 'Số tiền cố định (VNĐ)'
    }
  }

  const isPending = mutation.isPending || clearMutation.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col space-y-4 p-4">
      <div className="flex-1 space-y-4">
        {section === 'promotion' && (
          <>
            <div className="space-y-2">
              <label className="text-content-dark-1 text-sm font-medium">Đối tượng tham gia</label>
              <Controller
                name="participant_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Select
                    {...field}
                    value={field.value || null}
                    onChange={(val: any) => field.onChange(val ? String(val) : '')}
                    options={
                      field.value
                        ? [
                            {
                              value: field.value,
                              label:
                                share.employee?.fullname || share.collaborator?.name || field.value,
                            },
                          ]
                        : undefined
                    }
                    loadOptions={loadEmployeeOptions}
                    enableSearch={true}
                    searchPlaceholder="Tìm kiếm nhân viên..."
                    placeholder="Chọn nhân viên"
                    error={fieldState.error?.message}
                    disabled={!!share.collaborator}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-content-dark-1 text-sm font-medium">Loại hoa hồng</label>
              <Controller
                name="role"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Select
                    {...field}
                    options={roleOptions}
                    placeholder="Chọn vai trò"
                    error={fieldState.error?.message}
                    disabled={true}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-content-dark-1 text-sm font-medium">Tỷ lệ In-house (%)</label>
              <Controller
                name="in_house_rate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value?.toString() ?? ''}
                    placeholder="Nhập tỷ lệ in-house (0–100)"
                    type="text"
                    error={fieldState.error?.message}
                    suffix="%"
                    onChange={(val: any) => {
                      field.onChange(cleanDecimalString(val?.toString() || '', 2))
                    }}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-content-dark-1 text-sm font-medium">Mức độ đóng góp (%)</label>
              <Controller
                name="contribution_percentage"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value?.toString() ?? ''}
                    placeholder="Nhập mức độ đóng góp (0–100)"
                    type="text"
                    error={fieldState.error?.message}
                    suffix="%"
                    onChange={(val: any) => {
                      field.onChange(cleanDecimalString(val?.toString() || '', 2))
                    }}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-content-dark-1 text-sm font-medium">Tỷ lệ thực tế (%)</label>
              <Controller
                name="percentage"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value?.toString() ?? ''}
                    placeholder="Tự động tính (in-house × đóng góp)"
                    type="text"
                    disabled
                    suffix="%"
                    onChange={() => {}}
                  />
                )}
              />
            </div>
          </>
        )}

        {section !== 'promotion' && (
          <>
            <div className="space-y-2">
              <label className="text-content-dark-1 text-sm font-medium">
                {getPercentageLabel(section)}
              </label>
              <Controller
                name="percentage"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    placeholder="Nhập tỷ lệ %"
                    type="text"
                    error={fieldState.error?.message}
                    onChange={(val: any) => {
                      field.onChange(cleanDecimalString(val?.toString() || '', 3))
                    }}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-content-dark-1 text-sm font-medium">
                {getFixedAmountLabel(section)}
              </label>
              <Controller
                name="fixed_amount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <CurrencyInput
                    value={field.value ? Number(field.value) : undefined}
                    onChange={(val) => field.onChange(val ? val.toString() : '')}
                    placeholder="Nhập số tiền"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="text-content-dark-1 text-sm font-medium">
            Lý do điều chỉnh <span className="text-data-red-default">*</span>
          </label>
          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value || ''}
                placeholder="Nhập lý do điều chỉnh..."
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <FileUpload
            required={false}
            purpose="deal"
            multiple
            maxFiles={5}
            accept={['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg']}
            maxSize={5 * 1024 * 1024}
            onChange={(tokens: string | string[]) =>
              setFileTokens(Array.isArray(tokens) ? tokens : [tokens])
            }
          />
        </div>
      </div>

      <div className="border-border-1 mt-6 flex items-center justify-between border-t pt-4">
        <div>
          <Button
            type="button"
            variant="secondary-border"
            onClick={handleReset}
            {...getResetToPolicyButtonState({
              isCustomOverride: share.is_custom_override,
              isPending,
            })}
          >
            {RESET_TO_POLICY_LABEL}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary-border"
            onClick={() => displayClose()}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            Lưu
          </Button>
        </div>
      </div>
    </form>
  )
}
