import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parse } from 'date-fns'
import { Flex, Separator } from '@radix-ui/themes'
import { Grid } from '@/components/ui'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { Button, CurrencyInput, RadioGroup, TextArea, TextField, FileUpload } from '@/components/ui'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import {
  type PenaltyTicket,
  useCreatePenaltyTicket,
  usePartialUpdatePenaltyTicket,
} from '@/features/payroll/services/penalty-ticket-service'
import toastService from '@/services/toast-service'
import usePenaltyTicketOptions from '../hooks/usePenaltyTicketOptions'
import { PatchedPenaltyTicketUpdateRequestViolation_type } from '@/api/schema'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import { formatDateToApi } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils.ts'

const schema = z.object({
  code: z.string().optional(),
  employee_id: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      return val
    },
    z.number({ required_error: 'Vui lòng chọn nhân viên' }).min(1, 'Vui lòng chọn nhân viên')
  ),
  month: z.preprocess(
    (val) => {
      // MonthPicker có thể trả về undefined, null, hoặc giá trị không hợp lệ
      if (!val || val === undefined || val === null) return undefined
      // Kiểm tra nếu là date hợp lệ
      if (val instanceof Date && !isNaN(val.getTime())) return val
      return undefined
    },
    z.date({ required_error: 'Vui lòng chọn kỳ tính lương' })
  ),
  violation_type: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      return val
    },
    z.nativeEnum(PatchedPenaltyTicketUpdateRequestViolation_type, {
      required_error: 'Vui lòng chọn loại vi phạm',
    })
  ),
  violation_count: z.coerce
    .number({ required_error: 'Vui lòng nhập số lần vi phạm' })
    .min(1, 'Số lần vi phạm phải >= 1'),
  amount: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      const num = typeof val === 'string' ? parseFloat(val) : val
      return isNaN(num as number) ? undefined : num
    },
    z.number({ required_error: 'Vui lòng nhập số tiền' }).min(0, 'Số tiền phải >= 0')
  ),
  status: z.nativeEnum(PenaltyTicketStatus),
  payment_date: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  note: z.string().optional(),
})

export type PenaltyTicketFormData = z.infer<typeof schema>

interface Props {
  initialData?: PenaltyTicket
  onSuccess?: () => void
  onCancel?: () => void
}

export default function PenaltyTicketForm({ initialData, onSuccess, onCancel }: Props) {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createMutation = useCreatePenaltyTicket()
  const partialUpdateMutation = usePartialUpdatePenaltyTicket()
  const { statusOptions, violationTypeOptions } = usePenaltyTicketOptions()

  const form = useForm<PenaltyTicketFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      code: initialData?.code || '',
      employee_id: initialData?.employee?.id || undefined,
      month: initialData?.month ? parse(initialData.month, 'MM/yyyy', new Date()) : undefined,
      violation_type: initialData?.violation_type || undefined,
      violation_count: initialData?.violation_count ?? 1,
      amount: initialData?.amount || undefined,
      status: initialData?.status || PenaltyTicketStatus.UNPAID,
      payment_date: initialData?.payment_date || '',
      attachments: initialData?.attachments || [],
      note: initialData?.note || '',
    },
  })

  const { register, control, handleSubmit } = form

  const onSubmit = async (data: PenaltyTicketFormData) => {
    const initialAttachments = initialData?.attachments || []
    const currentAttachments = data.attachments || []

    // Extract file_tokens/ids from current attachments
    const attachmentValues = currentAttachments
      .map((file: any) => {
        // New upload: file_token (string that's not a file path)
        if (typeof file === 'string' && !file.startsWith('uploads/')) return file
        // Existing file: numeric id or object with id
        if (typeof file === 'number') return file
        if (file && typeof file === 'object' && 'id' in file && file.id) return file.id
        return null
      })
      .filter((value): value is string | number => value !== null)

    // Check if attachments have changed
    const initialIds = initialAttachments.map((f: any) => f.id).sort()
    const currentIds = attachmentValues.filter((v) => typeof v === 'number').sort()
    const hasNewFiles = attachmentValues.some((v) => typeof v === 'string')
    const filesRemoved = initialIds.length > currentIds.length
    const filesChanged = !isEditMode || hasNewFiles || filesRemoved

    // Only include required fields for create/update
    const payload: any = {
      code: data.code,
      employee_id: data.employee_id,
      month: format(data.month, 'MM/yyyy'),
      violation_type: data.violation_type,
      violation_count: data.violation_count,
      amount: data.amount,
      status: data.status,
      payment_date: formatDateToApi(data.payment_date) || undefined,
      note: data.note || undefined,
    }

    // Only include files if they changed or in create mode
    if (filesChanged && attachmentValues.length > 0) {
      payload.files = {
        attachments: attachmentValues,
      }
    } else if (filesRemoved && attachmentValues.length === 0) {
      // Handle complete file removal
      payload.files = {
        attachments: [],
      }
    }

    try {
      if (isEditMode && initialData?.id) {
        await partialUpdateMutation.mutateAsync({
          id: initialData.id,
          data: payload,
        })
        toastService.success('Đã cập nhật phiếu phạt thành công.')
      } else {
        await createMutation.mutateAsync(payload)
        toastService.success('Đã tạo phiếu phạt thành công.')
      }
      onSuccess?.()
    } catch (error: any) {
      handleApiError(error, form.setError)
    }
  }

  return (
    <Form
      loading={createMutation.isPending || partialUpdateMutation.isPending}
      onSubmit={onSubmit}
      handleSubmit={handleSubmit as any}
    >
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        <Controller
          name="employee_id"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <EmployeeSelectWithDialog
              value={field.value}
              onChange={field.onChange}
              error={error?.message}
              required
              label="Nhân viên"
              disabled={createMutation.isPending || partialUpdateMutation.isPending}
            />
          )}
        />

        <Separator orientation="horizontal" className="!w-full" />

        <p className="text-content-dark-1 typo-body-xl-semibold">Thông tin phiếu phạt</p>

        {isEditMode && (
          <FormController
            register={register}
            name="code"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Mã phiếu phạt',
              disabled: true,
              required: true,
            }}
          />
        )}

        <FormController
          register={register}
          name="month"
          control={control}
          Field={MonthPicker}
          fieldProps={{
            label: 'Kỳ lương',
            required: true,
            placeholder: 'MM/YYYY',
            showYear: true,
            buttonType: 'button',
            disabled: createMutation.isPending || partialUpdateMutation.isPending,
          }}
        />

        <FormController
          register={register}
          name="violation_type"
          control={control}
          Field={RadioGroup}
          fieldProps={{
            label: 'Loại vi phạm',
            required: true,
            options: violationTypeOptions,
            disabled: createMutation.isPending || partialUpdateMutation.isPending,
          }}
        />

        <Grid cols={2} gap="5">
          <FormController
            register={register}
            name="violation_count"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Số lần vi phạm',
              required: true,
              placeholder: 'Nhập số lần vi phạm',
              type: 'number',
              disabled: createMutation.isPending || partialUpdateMutation.isPending,
            }}
          />

          <FormController
            register={register}
            name="amount"
            control={control}
            Field={CurrencyInput}
            fieldProps={{
              label: 'Số tiền',
              required: true,
              placeholder: 'Nhập số tiền',
              disabled: createMutation.isPending || partialUpdateMutation.isPending,
            }}
          />
        </Grid>

        <FormController
          register={register}
          name="status"
          control={control}
          Field={RadioGroup}
          fieldProps={{
            label: 'Tình trạng',
            required: true,
            options: statusOptions,
            disabled: isEditMode || createMutation.isPending || partialUpdateMutation.isPending,
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
            rows: 4,
            maxCharacters: 500,
            disabled: createMutation.isPending || partialUpdateMutation.isPending,
          }}
        />

        <FormController
          register={register}
          name="attachments"
          control={control}
          Field={FileUpload}
          fieldProps={{
            label: 'Tài liệu đính kèm',
            hiddenDescription: true,
            disabled: createMutation.isPending || partialUpdateMutation.isPending,
            multiple: true,
            required: false,
            purpose: 'penalty-ticket-attachment',
            existingFiles: initialData?.attachments,
          }}
        />
      </Flex>

      <Flex gap="4" justify="end" className="px-10 pt-4 pb-[100px]">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={createMutation.isPending || partialUpdateMutation.isPending}
          className={'w-[150px]'}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={createMutation.isPending || partialUpdateMutation.isPending}
          loading={createMutation.isPending || partialUpdateMutation.isPending}
          className="w-[150px]"
        >
          {isEditMode ? 'Lưu' : 'Tạo mới'}
        </Button>
      </Flex>
    </Form>
  )
}
