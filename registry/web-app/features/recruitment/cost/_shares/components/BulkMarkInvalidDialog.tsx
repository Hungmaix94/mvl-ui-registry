import { useMemo } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { ColumnDef, Table } from '@/components/ui'
import {
  type RecruitmentExpense,
  useMarkRecruitmentExpensesInvalidToZero,
} from '@/features/recruitment/services/recruitment-expense-service'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'

type BulkMarkInvalidDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedExpenses: RecruitmentExpense[]
  onSuccess: () => void
}

export default function BulkMarkInvalidDialog({
  open,
  onOpenChange,
  selectedExpenses,
  onSuccess,
}: BulkMarkInvalidDialogProps) {
  const markInvalid = useMarkRecruitmentExpensesInvalidToZero()

  const columns: ColumnDef<RecruitmentExpense>[] = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Thời gian',
        meta: { width: 'w-[120px]' },
        cell: ({ getValue }) => formatDate(getValue() as string) || '-',
      },
      {
        accessorKey: 'recruitment_source',
        header: 'Nguồn tuyển dụng',
        meta: { width: 'w-[200px]' },
        cell: ({ row }) => row.original.recruitment_source?.name || '-',
      },
      {
        accessorKey: 'recruitment_channel',
        header: 'Kênh tuyển dụng',
        meta: { width: 'w-[200px]' },
        cell: ({ row }) => row.original.recruitment_channel?.name || '-',
      },
      {
        accessorKey: 'total_cost',
        header: 'Tổng chi phí',
        meta: { width: 'w-[140px]' },
        cell: ({ getValue }) => {
          const value = getValue() as number
          return value ? formatCurrencyVND(value) : '-'
        },
      },
    ],
    []
  )

  const handleConfirm = async () => {
    if (selectedExpenses.length === 0) return
    try {
      await markInvalid.mutateAsync({ ids: selectedExpenses.map((e) => e.id) })
      toastService.success('Đã reset chi phí tuyển dụng thành công.')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      handleApiError(error)
    }
  }

  return (
    <AppDialog
      variant="custom"
      footerFlexJustify="end"
      dialogContentClassName="px-0 max-h-[90vh] w-[90vw] max-w-4xl"
      open={open}
      onOpenChange={onOpenChange}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleConfirm}
      title="Reset chi phí tuyển dụng"
      confirmText="Xác nhận"
      cancelText="Huỷ"
      isHideCancelButton={false}
      loading={markInvalid.isPending}
      disableConfirm={selectedExpenses.length === 0}
      content={
        <div className="flex flex-col gap-5">
          <p className="typo-body-base text-content-dark-2">
            Bạn có chắc muốn reset{' '}
            <span className="typo-body-base-semibold">{selectedExpenses.length}</span> chi phí tuyển
            dụng về 0 không?
          </p>
          <div className="flex flex-col gap-3">
            <span className="typo-body-base-semibold text-content-dark-2">
              Danh sách chi phí đã chọn ({selectedExpenses.length})
            </span>
            <div className="max-h-[400px] min-h-[200px] overflow-y-auto">
              <Table
                columns={columns}
                data={selectedExpenses}
                isLoading={false}
                enablePagination={false}
                enableRowSelection={false}
                showSTT
                density="comfortable"
                emptyMessage="Không có chi phí nào được chọn"
                className="border-0 px-0"
              />
            </div>
          </div>
        </div>
      }
    />
  )
}
