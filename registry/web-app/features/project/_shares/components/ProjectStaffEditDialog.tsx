import { useMemo } from 'react'
import { z } from 'zod'
import { useForm, FormProvider, Controller, SubmitHandler, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parse, isValid, format } from 'date-fns'
import { Info } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { DATE_FORMAT } from '@/constants/date-format'
import { usePartialUpdateProjectStaff } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { formatDate } from '@/utils/date-utils'

export type ProjectStaffEditDialogProps = {
  projectId: number
  record: any
  role: 'project_director' | 'project_secretary'
  roleLabel: string
  roleShort: string
  staffs: any[]
  onSuccess?: () => void
}

// Dates only. Changing the assignee is intentionally NOT offered here: the
// backend PATCH does not move already-created deal-level commission shares
// (those are frozen at deal-creation time), so reassigning the person must go
// through the dedicated handover / reassignment flow instead.
const editSchema = z
  .object({
    effective_from: z.date({
      required_error: 'Vui lòng chọn ngày bắt đầu.',
      invalid_type_error: 'Vui lòng chọn ngày bắt đầu.',
    }),
    effective_to: z.date().nullish(),
  })
  .refine((data) => !data.effective_to || data.effective_to >= data.effective_from, {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.',
    path: ['effective_to'],
  })

type EditFormValues = z.infer<typeof editSchema>

const toDate = (value?: string | null): Date | null => {
  if (!value) return null
  const parsed = parse(value.substring(0, 10), 'yyyy-MM-dd', new Date())
  return isValid(parsed) ? parsed : null
}

export const ProjectStaffEditDialog = ({
  projectId,
  record,
  role,
  roleLabel,
  roleShort,
  staffs,
  onSuccess,
}: ProjectStaffEditDialogProps) => {
  const { displayClose } = useDialog()
  const queryClient = useQueryClient()
  const partialUpdateProjectStaffMutation = usePartialUpdateProjectStaff()

  const employeeName = record?.employee?.fullname || record?.employee?.code || '— Không xác định —'

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      effective_from: toDate(record?.effective_from) ?? new Date(),
      effective_to: toDate(record?.effective_to),
    },
  })

  const {
    handleSubmit,
    control,
    setError,
    formState: { isSubmitting },
  } = form

  const effectiveFromDate = useWatch({ control, name: 'effective_from' })

  const customErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    if (!effectiveFromDate) return errs
    const fromStr = format(effectiveFromDate, 'yyyy-MM-dd')

    // Mirror the backend timeline guard: another assignment of the same role
    // starting on/after this date has no well-defined boundary, so it is rejected.
    const others = staffs.filter((s) => s.role === role && s.id !== record?.id)
    const laterOrSame = others.find(
      (s) => s.effective_from && s.effective_from.substring(0, 10) >= fromStr
    )
    if (laterOrSame) {
      const name = laterOrSame.employee?.fullname || laterOrSame.employee?.code || 'Nhân sự'
      errs.effective_from = `Đã có mốc bổ nhiệm ngày ${formatDate(laterOrSame.effective_from)} (${name}). Ngày bắt đầu phải trước mốc đó.`
    }
    return errs
  }, [effectiveFromDate, staffs, role, record?.id])

  const onSubmit: SubmitHandler<EditFormValues> = async (data) => {
    if (Object.keys(customErrors).length > 0) return
    try {
      await partialUpdateProjectStaffMutation.mutateAsync({
        id: record.id,
        data: {
          effective_from: format(data.effective_from, 'yyyy-MM-dd'),
          effective_to: data.effective_to ? format(data.effective_to, 'yyyy-MM-dd') : null,
        },
      })

      toastService.success(`Đã cập nhật mốc bổ nhiệm ${roleShort}.`)

      queryClient.invalidateQueries({ queryKey: ['realestate', 'projects', 'staffs'] })
      queryClient.invalidateQueries({ queryKey: ['realestate', 'projects', projectId] })

      displayClose()
      onSuccess?.()
    } catch (e) {
      handleApiError(e, setError)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-content-dark-3 typo-body-sm-medium">Vai trò</label>
            <input
              type="text"
              value={`${roleShort} — ${roleLabel}`}
              className="border-border-1 w-full rounded-lg border bg-[#f1f5f9] px-3 py-2 text-sm text-[#64748b] outline-none"
              disabled
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-content-dark-3 typo-body-sm-medium">Nhân sự phụ trách</label>
            <input
              type="text"
              value={employeeName}
              className="border-border-1 w-full rounded-lg border bg-[#f1f5f9] px-3 py-2 text-sm text-[#64748b] outline-none"
              disabled
            />
            <span className="text-content-dark-3 text-[11.5px] italic">
              Đổi người phụ trách vui lòng dùng chức năng Chuyển giao để hệ thống dịch chuyển hoa
              hồng đúng cách.
            </span>
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
                      field.onChange(null)
                      return
                    }
                    const parsed = parse(val, DATE_FORMAT, new Date())
                    field.onChange(isValid(parsed) ? parsed : null)
                  }}
                  error={fieldState.error?.message || customErrors.effective_from}
                  required
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Controller
              control={control}
              name="effective_to"
              render={({ field, fieldState }) => (
                <DatePicker
                  label="Ngày kết thúc hiệu lực (để trống nếu đang phụ trách)"
                  value={field.value ?? undefined}
                  onChange={(val) => {
                    if (!val) {
                      field.onChange(null)
                      return
                    }
                    const parsed = parse(val, DATE_FORMAT, new Date())
                    field.onChange(isValid(parsed) ? parsed : null)
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>

          <div className="border-border-1 text-content-dark-2 flex gap-2 rounded-[10px] border border-dashed bg-[#f8fafc] p-3 text-xs leading-relaxed">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Chỉ sửa được mốc bổ nhiệm mới nhất của vai trò. Khi lưu, hệ thống tự canh lại ngày kết
              thúc của mốc liền trước để hai khoảng không chồng lấn.
            </span>
          </div>

          <div className="border-border-1 mt-6 flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary-border" onClick={displayClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || undefined}
              disabled={Object.keys(customErrors).length > 0}
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

export default ProjectStaffEditDialog
