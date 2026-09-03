import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, Button, TextField, CurrencyInput } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import { cn } from '@/utils'
import toastService from '@/services/toast-service'
import { useDialog } from '@/hooks/useDialog'
import { useQueryClient } from '@tanstack/react-query'
import {
  useOverrideShareRate,
  useDealCommissionShares,
} from '@/features/sales/deals/services/deal-service'
import { extractErrorMessage } from '@/utils/error-utils'

import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { cleanDecimalString } from '@/features/sales/deal-v3/utils/commission-recipient'

const formSchema = z.object({
  participant_id: z.string().min(1, 'Vui lòng chọn đối tượng tham gia'),
  recipient_kind: z.string().optional().nullable(),
  role: z.string().min(1, 'Vui lòng chọn vai trò'),
  percentage: z.union([z.string(), z.number()]).optional().nullable(),
  fixed_amount: z.union([z.string(), z.number()]).optional().nullable(),
  in_house_rate: z.union([z.string(), z.number()]).optional().nullable(),
  contribution_percentage: z.union([z.string(), z.number()]).optional().nullable(),
  reason: z.string().min(1, 'Vui lòng nhập lý do'),
})

type FormValues = z.infer<typeof formSchema>

interface AddCommissionShareFormProps {
  dealId: number
  section?: 'split' | 'management' | 'promotion'
  initialValues?: Partial<FormValues> & {
    employeeLabel?: string
    roleName?: string
    recipientRoleLabel?: string
    recipientKind?: 'employee' | 'collaborator' | 'exchange' | 'department' | 'position'
    isEditingParticipant?: boolean
    inHouseRate?: string | number | null
  }
}

export const AddCommissionShareForm: React.FC<AddCommissionShareFormProps> = ({
  dealId,
  section = 'split',
  initialValues,
}) => {
  const { displayClose } = useDialog()
  const queryClient = useQueryClient()
  const mutation = useOverrideShareRate()

  const { loadEmployeeOptions, getCachedEmployeeById } = useEmployeeSelect()
  const appConstKey =
    section === 'promotion'
      ? APP_CONSTANT_KEY.REALESTATE.TBC_PROMOTION_RECIPIENT_PCT_TYPE_CHOICES
      : APP_CONSTANT_KEY.REALESTATE.COMMISSION_RECIPIENT_CONFIG_PCT_TYPE_CHOICES

  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [appConstKey],
  })

  const roleOptions = [...(keysMapOptions.get(appConstKey) || [])]

  if (initialValues?.role && !roleOptions.find((o) => o.value === initialValues.role)) {
    roleOptions.push({
      value: initialValues.role,
      label: initialValues.roleName || initialValues.role,
    })
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      participant_id: initialValues?.participant_id || '',
      recipient_kind: initialValues?.recipientKind || 'employee',
      role: initialValues?.role || '',
      percentage: initialValues?.percentage || '',
      fixed_amount: initialValues?.fixed_amount || '',
      in_house_rate: initialValues?.inHouseRate != null ? String(initialValues.inHouseRate) : '',
      contribution_percentage: initialValues?.contribution_percentage || '',
      reason: initialValues?.reason || '',
    },
  })

  const fixedAmount = form.watch('fixed_amount')
  const [rateType, setRateType] = useState<'pct' | 'amt'>(fixedAmount ? 'amt' : 'pct')
  const [fileTokens, setFileTokens] = useState<string[]>([])

  const roleValue = form.watch('role')
  const inHouseRateValue = form.watch('in_house_rate')
  const contributionPctValue = form.watch('contribution_percentage')

  const isPctOnly =
    section === 'promotion' || (typeof roleValue === 'string' && roleValue.includes('agency_fee'))

  React.useEffect(() => {
    if (isPctOnly && rateType !== 'pct') {
      setRateType('pct')
      form.setValue('fixed_amount', null as any)
    }
  }, [isPctOnly, rateType, form])

  const { data: promotionData } = useDealCommissionShares(dealId, 'promotion' as any, {
    enabled: section === 'promotion',
  })

  const inHouseRateMap = React.useMemo(() => {
    if (!promotionData?.raw_data?.rows) return {} as Record<string, number>
    const map: Record<string, number> = {}
    for (const r of promotionData.raw_data.rows as any[]) {
      if (r.pct_type && r.in_house_rate != null) {
        map[r.pct_type] = Number(r.in_house_rate)
      }
    }
    return map
  }, [promotionData?.raw_data?.rows])

  React.useEffect(() => {
    if (section !== 'promotion') return
    if (initialValues?.inHouseRate != null) return
    if (!roleValue) return
    const rate = inHouseRateMap[roleValue]
    if (rate != null) {
      form.setValue('in_house_rate', String(rate))
    }
  }, [roleValue, inHouseRateMap, section, initialValues?.inHouseRate, form])

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

  const handleRateToggle = () => {
    if (isPctOnly) return
    if (rateType === 'pct') {
      form.setValue('percentage', null as any, { shouldDirty: true, shouldValidate: true })
      setRateType('amt')
    } else {
      form.setValue('fixed_amount', null as any, { shouldDirty: true, shouldValidate: true })
      setRateType('pct')
    }
  }

  const suffixNode = (
    <div className="-mr-3 flex items-center">
      {isPctOnly ? (
        <div className="typo-body-base-regular border-neutral-20 text-content-dark-3 min-w-[48px] border-l px-2 text-center">
          %
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            'typo-body-base-regular border-neutral-20 min-w-[48px] border-l px-2 text-center transition-colors focus:outline-none',
            'cursor-pointer text-blue-500 hover:text-blue-700'
          )}
          onClick={handleRateToggle}
          title="Nhấn để chuyển đổi giữa % và VNĐ"
        >
          {rateType === 'pct' ? '%' : 'VNĐ'}
        </button>
      )}
    </div>
  )

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
      let finalPctType = values.role
      if (finalPctType && typeof finalPctType === 'string') {
        if (rateType === 'pct') {
          finalPctType = finalPctType.replace(/^amt_/, 'pct_')
        } else if (rateType === 'amt') {
          finalPctType = finalPctType.replace(/^pct_/, 'amt_')
        }
      }

      const finalPercentage = values.percentage
        ? Number(String(values.percentage).replace(',', '.'))
        : null

      const payload: any = {
        share_id: 0, // 0 signals new share creation
        percentage: finalPercentage,
        fixed_amount: values.fixed_amount || null,
        reason: values.reason,
        recipient_kind: values.recipient_kind || initialValues?.recipientKind || 'employee',
        recipient_id: Number(values.participant_id),
        pct_type: finalPctType,
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

      if (fileTokens.length > 0) {
        payload.attachments = fileTokens
      }

      // Send share_id: 0 or omit it to signal creation, along with recipient info and pct_type
      await mutation.mutateAsync({
        id: dealId,
        section: (section || 'split') as any,
        data: payload,
      })
      toastService.success('Thêm đối tượng tham gia thành công')
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'detail', dealId] })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', 'workspace', 'commission', dealId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sales', 'deals', dealId, 'commission-shares'],
      })
      displayClose()
    } catch (error: any) {
      toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi thêm mới'))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col space-y-4 p-4">
      <div className="flex-1 space-y-4">
        {initialValues?.recipientRoleLabel && (
          <div className="bg-action-primary-red-default/5 border-action-primary-red-default/20 mb-2 space-y-1 rounded-md border p-3">
            <p className="text-content-dark-3 text-xs font-medium">
              Đang thao tác cho chức vụ / vai trò:
            </p>
            <p className="text-data-red-default font-semibold">
              {initialValues.recipientRoleLabel}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-content-dark-1 text-sm font-medium">
            Đối tượng tham gia <span className="text-data-red-default">*</span>
          </label>
          <Controller
            name="participant_id"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                {...field}
                value={field.value || null}
                onChange={(val: any) => {
                  field.onChange(val ? String(val) : '')
                  if (val && !form.getValues('role')) {
                    const emp = getCachedEmployeeById(Number(val))
                    if (emp?.position?.code) {
                      const code = emp.position.code.toLowerCase()
                      const matchedRole = roleOptions.find(
                        (r) =>
                          r.value.toLowerCase().includes(code) ||
                          code.includes(r.value.replace('pct_', '').toLowerCase())
                      )
                      if (matchedRole) {
                        form.setValue('role', matchedRole.value, { shouldValidate: true })
                      }
                    }
                  }
                }}
                options={
                  field.value
                    ? [{ value: field.value, label: initialValues?.employeeLabel || field.value }]
                    : undefined
                }
                loadOptions={loadEmployeeOptions}
                enableSearch={true}
                searchPlaceholder="Tìm kiếm nhân viên..."
                placeholder="Chọn nhân viên"
                error={fieldState.error?.message}
                disabled={!!initialValues?.participant_id && !initialValues?.isEditingParticipant}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-content-dark-1 text-sm font-medium">
            Loại hoa hồng <span className="text-data-red-default">*</span>
          </label>
          <Controller
            name="role"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                {...field}
                options={roleOptions}
                placeholder="Chọn vai trò"
                error={fieldState.error?.message}
                disabled={!!initialValues?.role}
              />
            )}
          />
        </div>

        {section === 'promotion' && (
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
        )}

        {section === 'promotion' && (
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
        )}

        {section === 'promotion' ? (
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
        ) : (
          <div className="space-y-2">
            <label className="text-content-dark-1 text-sm font-medium">Giá trị hoa hồng</label>
            {rateType === 'pct' ? (
              <Controller
                name="percentage"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value?.toString() ?? ''}
                    placeholder="Nhập tỷ lệ %"
                    type="text"
                    error={fieldState.error?.message}
                    suffix={suffixNode}
                    onChange={(val: any) => {
                      field.onChange(cleanDecimalString(val?.toString() || '', 3))
                    }}
                  />
                )}
              />
            ) : (
              <Controller
                name="fixed_amount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <CurrencyInput
                    {...field}
                    value={field.value ?? ''}
                    onChange={(val: any) =>
                      field.onChange(val === '' || val === undefined ? null : val)
                    }
                    placeholder="Nhập số tiền..."
                    error={fieldState.error?.message}
                    suffix={suffixNode}
                  />
                )}
              />
            )}
          </div>
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
                placeholder="Nhập lý do thêm mới..."
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
