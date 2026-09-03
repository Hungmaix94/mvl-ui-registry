import { Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { EmployeePayoutBatchStatusBadge } from './EmployeePayoutBatchStatusBadge'
import type { EmployeeCommissionPayoutBatch } from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import { formatPayoutWave } from '@/features/accounting/employee-payout-batches/constants'
import { EmployeePayoutBatchStatus as EmployeeCommissionPayoutBatchStatus } from '@/constants/api-schema-aliases'

type Props = {
  batch: EmployeeCommissionPayoutBatch | null
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  isConfirming?: boolean
}

export function EmployeePayoutBatchDetailDrawer({
  batch,
  isOpen,
  onClose,
  onConfirm,
  isConfirming = false,
}: Props) {
  const isDraft = batch?.status === EmployeeCommissionPayoutBatchStatus.DRAFT

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{batch ? `Đợt chi ${batch.code}` : 'Chi tiết đợt chi'}</SheetTitle>
        </SheetHeader>

        {batch && (
          <div className="flex flex-col gap-6 p-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <Text size="1" className="text-content-dark-4">
                  Mã đợt chi
                </Text>
                <Text size="2" weight="medium">
                  {batch.code}
                </Text>
              </div>

              <div className="flex flex-col gap-1">
                <Text size="1" className="text-content-dark-4">
                  Kỳ tháng
                </Text>
                <Text size="2">
                  {batch.month}/{batch.year}
                </Text>
              </div>

              <div className="flex flex-col gap-1">
                <Text size="1" className="text-content-dark-4">
                  Đợt chi
                </Text>
                <Text size="2">{formatPayoutWave(batch.wave)}</Text>
              </div>

              <div className="flex flex-col gap-1">
                <Text size="1" className="text-content-dark-4">
                  Ngày tạo đợt
                </Text>
                <Text size="2">{batch.batch_date ? formatDate(batch.batch_date) : '-'}</Text>
              </div>

              <div className="flex flex-col gap-1">
                <Text size="1" className="text-content-dark-4">
                  Tổng tiền
                </Text>
                <Text size="2" weight="medium">
                  {batch.total_amount ? formatCurrencyVND(Number(batch.total_amount)) : '-'}
                </Text>
              </div>

              <div className="flex flex-col gap-1">
                <Text size="1" className="text-content-dark-4">
                  Trạng thái
                </Text>
                <EmployeePayoutBatchStatusBadge
                  status={batch.status as EmployeeCommissionPayoutBatchStatus}
                />
              </div>
            </div>

            {/* Lines table */}
            {batch.lines.length > 0 && (
              <div>
                <Text size="2" weight="medium" className="mb-3 block">
                  Danh sách thanh toán
                </Text>
                <div className="border-border-1 rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-border-1 border-b bg-neutral-50">
                        <th className="px-3 py-2 text-left font-medium">Người nhận</th>
                        <th className="px-3 py-2 text-left font-medium">Số tài khoản</th>
                        <th className="px-3 py-2 text-left font-medium">Ngân hàng</th>
                        <th className="px-3 py-2 text-right font-medium">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.lines.map((line) => (
                        <tr key={line.id} className="border-border-1 border-b last:border-0">
                          <td className="px-3 py-2">{line.payee_name_snapshot ?? '-'}</td>
                          <td className="px-3 py-2">{line.payee_account_snapshot ?? '-'}</td>
                          <td className="px-3 py-2">{line.payee_bank_name_snapshot ?? '-'}</td>
                          <td className="px-3 py-2 text-right font-medium text-neutral-900">
                            {line.amount ? formatCurrencyVND(Number(line.amount)) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            {isDraft && onConfirm && (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={onConfirm}
                  disabled={isConfirming}
                  loading={isConfirming}
                >
                  Xác nhận
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default EmployeePayoutBatchDetailDrawer
