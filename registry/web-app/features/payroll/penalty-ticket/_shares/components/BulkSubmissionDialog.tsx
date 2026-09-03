import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import AppDialog from '@/components/dialog/AppDialog'
import { Form, FormController, ColumnDef, Table, Chip } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import { format, isValid, parse } from 'date-fns'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format'
import { type PenaltyTicket } from '@/features/payroll/services/penalty-ticket-service'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
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

interface BulkSubmissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTickets: PenaltyTicket[]
  onConfirm: (submissionDate: string) => void
  bulkUpdate: any
}

export default function BulkSubmissionDialog({
  open,
  onOpenChange,
  selectedTickets,
  onConfirm,
  bulkUpdate,
}: BulkSubmissionDialogProps) {
  const form = useForm<BulkSubmissionFormData>({
    resolver: zodResolver(schema),
    defaultValues: { payment_date: '' },
  })

  const { handleSubmit, reset } = form
  const { statusOptions, violationTypeOptions } = usePenaltyTicketOptions()

  useEffect(() => {
    if (open) {
      reset({ payment_date: '' })
    }
  }, [open, reset])

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
    [violationLabelMap, statusLabelMap]
  )

  const onSubmit = async (data: BulkSubmissionFormData) => {
    if (selectedTickets.length === 0) return

    try {
      const parsedDate = parse(data.payment_date, DATE_FORMAT, new Date())
      const serverDate = format(parsedDate, DATE_SERVER_FORMAT)

      await bulkUpdate.mutateAsync({
        ids: selectedTickets.map((r) => r.id),
        status: PenaltyTicketStatus.PAID,
        payment_date: serverDate,
      } as any)

      toastService.success('Đã cập nhật trạng thái đã nộp phạt thành công.')
      onConfirm(serverDate)
      onOpenChange(false)
    } catch (error) {
      handleApiError(error, form.setError)
      throw error
    }
  }

  return (
    <AppDialog
      variant="custom"
      footerFlexJustify="end"
      dialogContentClassName="px-0 max-h-[90vh] w-[90vw] max-w-6xl"
      open={open}
      onOpenChange={onOpenChange}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleSubmit(onSubmit)}
      title="Xác nhận nộp phạt"
      confirmText="Xác nhận"
      cancelText="Huỷ"
      isHideCancelButton={false}
      loading={bulkUpdate.isPending}
      disableConfirm={selectedTickets.length === 0}
      content={
        <Form
          onSubmit={onSubmit}
          handleSubmit={handleSubmit as any}
          loading={bulkUpdate.isPending}
          className="flex w-full flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-0">
            <FormController
              register={form.register}
              name="payment_date"
              control={form.control}
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày nộp',
                placeholder: 'DD/MM/YYYY',
                allowManualInput: true,
                clearable: true,
                required: true,
                className: 'px-0',
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
        </Form>
      }
    />
  )
}
