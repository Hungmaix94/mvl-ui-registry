import { useState, useEffect } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { CurrencyInput, Select } from '@/components/ui'
import {
  useSalesInvoices,
  useSalesInvoice,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { useDrawdownInvestorAdvance } from '../services/investor-advance-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'
import { SalesInvoiceStatus } from '@/constants/api-schema-aliases'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: number
  investorId: number
  investorName: string
  projectName: string
  balance: number
  onSuccess: () => void
}

export default function InvestorAdvanceDrawdownDialog({
  open,
  onOpenChange,
  accountId,
  investorId,
  investorName,
  projectName,
  balance,
  onSuccess,
}: Props) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [allocations, setAllocations] = useState<Record<number, number>>({})

  // Query sales invoices of the investor with status ISSUED or PARTIAL
  const { data: invoicesData, isLoading: isLoadingInvoices } = useSalesInvoices(
    {
      investor: investorId,
      status__in: [SalesInvoiceStatus.ISSUED, SalesInvoiceStatus.PARTIAL],
      page_size: 100,
    },
    { enabled: open && !!investorId }
  )

  // Query details of selected invoice to get its lines
  const { data: selectedInvoice, isLoading: isLoadingInvoiceDetail } = useSalesInvoice(
    Number(selectedInvoiceId),
    { enabled: !!selectedInvoiceId }
  )

  const invoiceOptions = (invoicesData?.results ?? []).map((inv: any) => {
    const totalAmt = Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0)
    const paidAmt = Number(inv.paid_amount ?? 0)
    const remainingAmt = totalAmt - paidAmt
    return {
      value: String(inv.id),
      label: `${inv.code} (Còn lại: ${formatCurrencyVND(remainingAmt)} VNĐ)`,
    }
  })

  const eligibleLines = (selectedInvoice?.lines ?? []).filter((line: any) => {
    return Number(line.remaining || 0) > 0
  })

  // Reset allocations when the selected invoice changes
  useEffect(() => {
    setAllocations({})
  }, [selectedInvoiceId])

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0)

  const drawdownMutation = useDrawdownInvestorAdvance()

  const handleConfirm = async () => {
    if (totalAllocated <= 0) {
      toastService.error('Vui lòng nhập số tiền đối trừ cho ít nhất một dòng hóa đơn')
      return
    }
    if (totalAllocated > balance) {
      toastService.error('Tổng số tiền đối trừ không được vượt quá số dư tài khoản hiện tại')
      return
    }

    // Validate each line's allocation
    for (const line of eligibleLines) {
      const allocatedAmount = allocations[line.id] || 0
      if (allocatedAmount < 0) {
        toastService.error('Số tiền đối trừ không được âm')
        return
      }
      if (allocatedAmount > Number(line.remaining || 0)) {
        toastService.error(
          `Số tiền đối trừ cho căn ${line.unit_number || line.id} vượt quá số dư còn lại của dòng hóa đơn`
        )
        return
      }
    }

    try {
      const postData = {
        allocations: Object.entries(allocations)
          .filter(([_, val]) => val > 0)
          .map(([lineId, val]) => ({
            sales_invoice_line_id: Number(lineId),
            amount: val.toString(),
          })),
      }

      await drawdownMutation.mutateAsync({
        id: accountId,
        data: postData,
      })

      toastService.success('Đã đối trừ tạm ứng thành công')
      onSuccess()
      onOpenChange(false)
      setSelectedInvoiceId(null)
      setAllocations({})
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Đối trừ tạm ứng CĐT"
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleConfirm}
      confirmText="Xác nhận đối trừ"
      loading={drawdownMutation.isPending}
      content={
        <div className="flex max-h-[70vh] min-w-[500px] flex-col gap-4 overflow-y-auto px-1 py-4">
          <div className="border-border-1 bg-background-2 flex flex-col gap-1 rounded-lg border p-3 text-sm">
            <div>
              <span className="text-content-dark-3">Chủ đầu tư:</span>{' '}
              <span className="text-content-dark-1 font-semibold">{investorName}</span>
            </div>
            <div>
              <span className="text-content-dark-3">Dự án:</span>{' '}
              <span className="text-content-dark-1 font-semibold">{projectName}</span>
            </div>
            <div>
              <span className="text-content-dark-3">Số dư ví hiện tại:</span>{' '}
              <span className="text-data-green-default font-bold">
                {formatCurrencyVND(balance)} VNĐ
              </span>
            </div>
            {totalAllocated > 0 && (
              <div className="border-border-1 mt-1.5 flex items-center justify-between border-t pt-1.5">
                <span className="text-content-dark-3 font-semibold">Tổng tiền đối trừ:</span>
                <span
                  className={cn(
                    'font-bold',
                    totalAllocated > balance ? 'text-data-red-default' : 'text-data-blue-default'
                  )}
                >
                  {formatCurrencyVND(totalAllocated)} VNĐ
                </span>
              </div>
            )}
          </div>

          <Select
            label="Hóa đơn bán ra"
            placeholder={isLoadingInvoices ? 'Đang tải hóa đơn...' : 'Chọn hóa đơn bán ra'}
            options={invoiceOptions}
            value={selectedInvoiceId ?? undefined}
            onChange={(val) => setSelectedInvoiceId(val ? String(val) : null)}
            enableSearch
            clearable
          />

          {selectedInvoiceId && (
            <div className="border-border-1 flex flex-col gap-3 border-t pt-3">
              <span className="text-content-dark-3 text-xs font-semibold tracking-wider uppercase">
                Phân bổ đối trừ theo dòng hóa đơn
              </span>

              {isLoadingInvoiceDetail ? (
                <div className="text-content-dark-3 py-2 text-sm italic">
                  Đang tải chi tiết hóa đơn...
                </div>
              ) : eligibleLines.length === 0 ? (
                <div className="text-content-dark-3 py-2 text-sm italic">
                  Hóa đơn này không có dòng nào đủ điều kiện đối trừ (đã thanh toán hết).
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {eligibleLines.map((line: any) => {
                    const remainingVal = Number(line.remaining || 0)
                    return (
                      <div
                        key={line.id}
                        className="border-border-1 bg-background-2 flex flex-col gap-2 rounded-lg border p-3"
                      >
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span className="text-content-dark-1">
                            Căn hộ:{' '}
                            <span className="font-semibold">{line.unit_number || 'N/A'}</span>
                          </span>
                          <span className="text-content-dark-3">
                            Còn lại:{' '}
                            <span className="text-content-dark-2 font-bold">
                              {formatCurrencyVND(remainingVal)} VNĐ
                            </span>
                          </span>
                        </div>

                        <CurrencyInput
                          label="Số tiền đối trừ (VNĐ)"
                          placeholder="Nhập số tiền đối trừ"
                          value={allocations[line.id]}
                          onChange={(val) =>
                            setAllocations((prev) => ({
                              ...prev,
                              [line.id]: val ?? 0,
                            }))
                          }
                          suffix="VNĐ"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      }
    />
  )
}
