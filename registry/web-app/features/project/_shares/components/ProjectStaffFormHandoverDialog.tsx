import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { useForm, FormProvider, Controller, SubmitHandler, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parse, isValid, addDays, format } from 'date-fns'
import { ArrowRight, RefreshCw, Info, Clock } from 'lucide-react'

import { Button, FileUpload, Select } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import { DATE_FORMAT } from '@/constants/date-format'
import { formatDate } from '@/utils/date-utils'

export type ProjectStaffFormHandoverDialogResult = {
  predecessorIndex: number | null
  predecessorNewEnd: Date | null
  successor: {
    role: string
    employee_id: number
    effective_from: Date
    effective_to: Date | null
    employee_detail?: any
    attachment_tokens?: string[]
  }
}

export type ProjectStaffFormHandoverDialogProps = {
  roleOptions: { value: string; label: string }[]
  existingAssignments: any[]
  onConfirm: (result: ProjectStaffFormHandoverDialogResult) => void
  onCancel?: () => void
  defaultRole?: string
  disableRoleSelect?: boolean
}

const handoverSchema = z.object({
  role: z.string().min(1, 'Vui lòng chọn vai trò'),
  employee_id: z.number({
    required_error: 'Vui lòng chọn nhân sự.',
    invalid_type_error: 'Vui lòng chọn nhân sự.',
  }),
  effective_from: z.date({
    required_error: 'Vui lòng chọn ngày áp dụng',
  }),
  attachment_tokens: z.array(z.string()).optional(),
  employee_detail: z.any().optional(),
})

type HandoverFormValues = z.infer<typeof handoverSchema>

export const ProjectStaffFormHandoverDialog = ({
  roleOptions,
  existingAssignments,
  onConfirm,
  onCancel,
  defaultRole,
  disableRoleSelect,
}: ProjectStaffFormHandoverDialogProps) => {
  const { displayClose } = useDialog()
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Filter role options to only GDDA and TKDA
  const coordinatorRoles = useMemo(() => {
    return roleOptions.filter(
      (opt) => opt.value === 'project_director' || opt.value === 'project_secretary'
    )
  }, [roleOptions])

  const form = useForm<HandoverFormValues>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      role: defaultRole || coordinatorRoles[0]?.value || '',
      employee_id: undefined,
      effective_from: new Date(),
      attachment_tokens: [],
      employee_detail: undefined,
    },
  })

  const {
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting, errors },
  } = form

  const selectedRole = useWatch({ control, name: 'role' })
  const selectedEmployeeId = useWatch({ control, name: 'employee_id' })
  const selectedEmployeeDetail = useWatch({ control, name: 'employee_detail' })
  const effectiveFromDate = useWatch({ control, name: 'effective_from' })

  // Helpers
  const getInitials = useCallback((name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (
      (parts[parts.length - 2]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')
    ).toUpperCase()
  }, [])

  // Helper to format date
  const getLocalDateStr = (val: Date | string | null | undefined): string | null => {
    if (!val) return null
    if (val instanceof Date) {
      return format(val, 'yyyy-MM-dd')
    }
    if (typeof val === 'string') {
      return val.substring(0, 10)
    }
    return null
  }

  // Find predecessor (with index) in existing local assignments
  const predInfo = useMemo(() => {
    if (!effectiveFromDate || !selectedRole) return null
    const startAStr = getLocalDateStr(effectiveFromDate)
    if (!startAStr) return null

    // Map existing assignments to include original index
    const mapped = existingAssignments
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.role === selectedRole)

    // Filter to those starting strictly before chosen start date
    const predecessors = mapped.filter(({ item }) => {
      const itemStart = getLocalDateStr(item.effective_from)
      return itemStart && itemStart < startAStr
    })

    if (predecessors.length === 0) return null

    // Return the latest one
    return predecessors.sort((a, b) => {
      const startA = getLocalDateStr(a.item.effective_from) || ''
      const startB = getLocalDateStr(b.item.effective_from) || ''
      return startB.localeCompare(startA)
    })[0]
  }, [existingAssignments, selectedRole, effectiveFromDate])

  const pred = predInfo?.item || null
  const predIndex = predInfo?.index ?? null

  // Custom validation rule: check for overlap and duplicate
  const customErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    if (!effectiveFromDate || !selectedRole) return errs

    const startAStr = getLocalDateStr(effectiveFromDate)
    if (!startAStr) return errs

    const list = existingAssignments.filter((s) => s.role === selectedRole)
    const activePred = list.find((s) => {
      const itemStart = getLocalDateStr(s.effective_from)
      return itemStart && itemStart < startAStr
    })

    if (activePred) {
      const predStartStr = getLocalDateStr(activePred.effective_from) || ''
      if (startAStr <= predStartStr) {
        const predName =
          activePred.employee_detail?.fullname || activePred.employee_detail?.code || 'Nhân sự'
        errs.effective_from = `Ngày bắt đầu phải sau ${formatDate(activePred.effective_from)} (ngày ${predName} nhận vai trò).`
      }

      const predEmpId = activePred.employee_detail?.id || activePred.employee_id
      if (selectedEmployeeId === predEmpId) {
        const predName =
          activePred.employee_detail?.fullname || activePred.employee_detail?.code || 'Nhân sự'
        errs.employee_id = `${predName} đang là người phụ trách hiện tại.`
      }
    }

    // Check overlap with any LATER period (e.g. upcoming coordinators)
    const later = list.find((s) => {
      const itemStart = getLocalDateStr(s.effective_from)
      return itemStart && itemStart >= startAStr
    })
    if (later) {
      const laterName = later.employee_detail?.fullname || later.employee_detail?.code || 'Nhân sự'
      errs.effective_from =
        errs.effective_from ||
        `Đã có mốc bắt đầu ngày ${formatDate(later.effective_from)} (${laterName}). Hãy chọn ngày khác hoặc xoá mốc đó.`
    }

    return errs
  }, [effectiveFromDate, existingAssignments, selectedRole, selectedEmployeeId])

  const newEnd = useMemo(() => {
    if (!effectiveFromDate || !pred) return null
    return addDays(effectiveFromDate, -1)
  }, [effectiveFromDate, pred])

  const isFuture = useMemo(() => {
    if (!effectiveFromDate) return false
    return format(effectiveFromDate, 'yyyy-MM-dd') > todayStr
  }, [effectiveFromDate, todayStr])

  const onSubmit: SubmitHandler<HandoverFormValues> = (data) => {
    if (Object.keys(customErrors).length > 0) return

    onConfirm({
      predecessorIndex: predIndex,
      predecessorNewEnd: newEnd,
      successor: {
        role: data.role,
        employee_id: data.employee_id,
        effective_from: data.effective_from,
        effective_to: null,
        employee_detail: data.employee_detail,
        attachment_tokens: data.attachment_tokens,
      },
    })
    displayClose()
  }

  const handleCancel = useCallback(() => {
    onCancel?.()
    displayClose()
  }, [onCancel, displayClose])

  const predName = pred?.employee_detail?.fullname || pred?.employee_detail?.code || 'Nhân sự cũ'
  const newPersonName = selectedEmployeeDetail?.fullname || '(chọn nhân sự)'

  return (
    <div className="flex flex-col gap-4 p-4">
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Select
              label="Vai trò"
              value={selectedRole}
              onChange={(val) => setValue('role', String(val || ''))}
              options={coordinatorRoles}
              required
              disabled={isSubmitting || disableRoleSelect}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Controller
              control={control}
              name="employee_id"
              render={({ field }) => (
                <EmployeeSelectWithDialog
                  label="Nhân sự nhận vai trò"
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  onEntityChange={(entity) => {
                    setValue('employee_detail', entity)
                  }}
                  error={errors.employee_id?.message || customErrors.employee_id}
                  required
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Controller
              control={control}
              name="effective_from"
              render={({ field, fieldState }) => (
                <DatePicker
                  label="Ngày bắt đầu hiệu lực"
                  value={field.value}
                  onChange={(val) => {
                    if (!val) {
                      field.onChange(new Date())
                      return
                    }
                    const parsed = parse(val, DATE_FORMAT, new Date())
                    field.onChange(isValid(parsed) ? parsed : new Date())
                  }}
                  error={fieldState.error?.message || customErrors.effective_from}
                  required
                />
              )}
            />
          </div>

          {/* Preview Box - Flow of handover */}
          {pred && (
            <div className="border-border-1 my-4 overflow-hidden rounded-[10px] border bg-white">
              <div className="text-content-dark-3 border-border-1 flex items-center gap-2 border-b bg-[#F0F2F5] px-3.5 py-2.5 text-[11px] font-bold tracking-[0.05em] uppercase">
                <RefreshCw className="text-brand-primary h-3.5 w-3.5" />
                <span>Hệ thống sẽ tự cập nhật</span>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="text-content-dark-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1f5f9] text-[11px] font-semibold">
                    {getInitials(predName)}
                  </div>
                  <div className="truncate">
                    <div className="text-content-dark-1 truncate text-[13px] font-semibold">
                      {predName}
                    </div>
                    <div className="text-[11.5px] text-red-500">
                      Kết thúc: {newEnd ? formatDate(newEnd) : '---'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="text-content-dark-3 h-5 w-5 shrink-0" />

                <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
                  <div className="truncate">
                    <div className="text-content-dark-1 truncate text-[13px] font-semibold">
                      {newPersonName}
                    </div>
                    <div className="text-[11.5px] font-semibold text-emerald-600">
                      Bắt đầu: {effectiveFromDate ? formatDate(effectiveFromDate) : '---'}
                    </div>
                  </div>
                  <div className="text-content-dark-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1f5f9] text-[11px] font-semibold">
                    {selectedEmployeeDetail ? getInitials(newPersonName) : '?'}
                  </div>
                </div>
              </div>

              <div
                className={`border-border-1 flex gap-2 border-t border-dashed p-3 text-xs leading-relaxed ${
                  isFuture
                    ? 'border-blue-100 bg-blue-50 text-blue-700'
                    : 'text-content-dark-2 bg-[#f8fafc]'
                }`}
              >
                {isFuture ? (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>
                  {isFuture ? (
                    <>
                      Đây là chuyển giao <b>theo lịch tương lai</b>. <b>{predName}</b> vẫn{' '}
                      <b>đang hiệu lực</b> đến hết {newEnd ? formatDate(newEnd) : '---'};{' '}
                      <b>{newPersonName}</b> ở trạng thái <b>Sắp hiệu lực</b> từ{' '}
                      {effectiveFromDate ? formatDate(effectiveFromDate) : '---'}.
                    </>
                  ) : (
                    <>
                      Ngày kết thúc của <b>{predName}</b> được đặt = ngày bắt đầu mới − 1 ={' '}
                      <b>{newEnd ? formatDate(newEnd) : '---'}</b>, đảm bảo hai khoảng không chồng
                      lấn.
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5" data-field-name="attachment_tokens">
            <Controller
              name="attachment_tokens"
              control={control as any}
              render={({ field, fieldState: { error } }) => (
                <FileUpload
                  value={field.value}
                  onChange={(v: string | string[]) =>
                    field.onChange(Array.isArray(v) ? v : v ? [v] : [])
                  }
                  label="Tài liệu đính kèm"
                  purpose="sales_allocation"
                  disabled={isSubmitting}
                  required={false}
                  multiple
                  error={error?.message}
                />
              )}
            />
          </div>

          <div className="border-border-1 mt-6 flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary-border" onClick={handleCancel}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || undefined}
              disabled={Object.keys(customErrors).length > 0}
            >
              {pred ? 'Xác nhận chuyển giao' : 'Xác nhận phân công'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

export default ProjectStaffFormHandoverDialog
