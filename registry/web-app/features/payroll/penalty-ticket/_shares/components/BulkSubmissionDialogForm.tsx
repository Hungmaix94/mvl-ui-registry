import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController, ColumnDef, Table, Chip } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { type PenaltyTicket } from '@/features/payroll/services/penalty-ticket-service'
import { isValid, parse } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format'
import usePenaltyTicketOptions from '../hooks/usePenaltyTicketOptions'
import { getViolationTypeVariant } from '../utils/penalty-ticket-colors'
import { PatchedPenaltyTicketUpdateRequestViolation_type } from '@/api/schema'
import { formatCurrencyVND } from '@/utils/common'

const schema = z.object({
  payment_date: z
    .string()
    .min(1, 'Vui lòng chọn ngày nộp phạt')
    .refine((value) => {
      const parsed = parse(value, DATE_FORMAT, new Date())
      return isValid(parsed)
    }, 'Ngày nộp không hợp lệ'),
})

export type BulkSubmissionFormData = z.infer<typeof schema>

export type BulkSubmissionDialogRef = {
  submit: () => Promise<void>
}

type BulkSubmissionDialogFormProps = {
  selectedTickets: PenaltyTicket[]
  onSubmit?: (data: BulkSubmissionFormData) => Promise<void>
}

const BulkSubmissionDialogForm = forwardRef<BulkSubmissionDialogRef, BulkSubmissionDialogFormProps>(
  function BulkSubmissionDialogForm({ selectedTickets, onSubmit }, ref) {
    const { control, register, handleSubmit, trigger } = useForm<BulkSubmissionFormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        payment_date: '',
      },
      mode: 'onTouched',
    })

    const { statusOptions, violationTypeOptions } = usePenaltyTicketOptions()

    const statusLabelMap = useMemo(
      () => new Map(statusOptions.map((o) => [o.value, o.label])),
      [statusOptions]
    )
    const violationLabelMap = useMemo(
      () => new Map(violationTypeOptions.map((o) => [o.value, o.label])),
      [violationTypeOptions]
    )

    const getViolationLabel = (type?: PatchedPenaltyTicketUpdateRequestViolation_type) =>
      type ? violationLabelMap.get(type) || type : '-'

    const columns: ColumnDef<PenaltyTicket>[] = useMemo(
      () => [
        {
          accessorKey: 'code',
          header: 'Mã phiếu',
          meta: { width: '200px' },
          cell: ({ getValue }) => (
            <span title={getValue() as string}>{(getValue() as string) || '-'}</span>
          ),
        },
        {
          accessorKey: 'employee.fullname',
          header: 'Họ tên',
          meta: { width: '180px' },
          cell: ({ row }) => (
            <span title={row.original.employee?.fullname || ''}>
              {row.original.employee?.fullname || '-'}
            </span>
          ),
        },
        {
          accessorKey: 'department.name',
          header: 'Phòng ban',
          meta: { width: '150px' },
          cell: ({ row }) => (
            <span title={row.original.department?.name || ''}>
              {row.original.department?.name || '-'}
            </span>
          ),
        },
        {
          accessorKey: 'violation_type',
          header: 'Loại vi phạm',
          meta: { width: '130px' },
          cell: ({ getValue }) => {
            const type = getValue() as PatchedPenaltyTicketUpdateRequestViolation_type
            if (!type) return <span className="text-content-dark-1 text-sm">-</span>
            return <Chip label={getViolationLabel(type)} variant={getViolationTypeVariant(type)} />
          },
        },
        {
          accessorKey: 'amount',
          header: 'Số tiền',
          meta: { width: '120px', align: 'right' },
          cell: ({ getValue }) => {
            const amount = getValue() as number | undefined
            return (
              <span title={amount ? formatCurrencyVND(amount) : ''}>
                {amount ? formatCurrencyVND(amount) : '-'}
              </span>
            )
          },
        },
      ],
      [violationLabelMap, statusLabelMap, getViolationLabel]
    )

    const handleFormSubmit = async (data: BulkSubmissionFormData) => {
      if (onSubmit) {
        await onSubmit(data)
      }
    }

    useImperativeHandle(ref, () => ({
      submit: async () => {
        // Trigger validation for all fields
        const isValid = await trigger()

        if (!isValid) {
          // Validation failed, throw silent error to prevent dialog from closing
          const validationError = new Error('Validation failed')
          ;(validationError as any).isValidationError = true
          throw validationError
        }

        // If validation passes, submit the form
        await handleSubmit(handleFormSubmit)()
      },
    }))

    return (
      <div className="flex w-full flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <FormController
            register={register}
            name="payment_date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày nộp',
              placeholder: 'DD/MM/YYYY',
              allowManualInput: true,
              clearable: true,
              required: true,
            }}
          />

          <div className="flex flex-col gap-5">
            <label className="typo-body-base-semibold text-content-dark-2">
              Danh sách phiếu đã đánh dấu ({selectedTickets.length})
            </label>
            <div className="max-h-[500px] min-h-[300px] overflow-y-auto">
              <Table
                columns={columns}
                data={selectedTickets}
                isLoading={false}
                enablePagination={false}
                enableRowSelection={false}
                showSTT={true}
                density="comfortable"
                emptyMessage="Không có phiếu phạt nào được chọn"
                className="border-0 px-0"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
)

export default BulkSubmissionDialogForm
