import { Table } from '@radix-ui/themes'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import Checkbox from '@/components/ui/checkbox/Checkbox'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { IconInfo } from '@/assets/icons'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import {
  inputInvoiceTotal,
  inputInvoiceCounterpartyName,
} from '../../utils/payment-voucher-wizard-utils'

type Props = {
  allInvoices: InputInvoice[]
  selectedIds: Set<number>
  isLoading: boolean
  toggleInvoice: (invoice: InputInvoice) => void
  allSelected: boolean
  someSelected: boolean
  toggleAll: () => void
  getInvoiceValue: (
    invoiceId: number,
    field: 'allocated_amount' | 'allocation_pct'
  ) => string | number
  setInvoiceValue: (
    invoiceId: number,
    field: 'allocated_amount' | 'allocation_pct',
    val: string,
    invoiceTotal: number,
    paidAmt: number
  ) => void
}

export function InputInvoicesTable({
  allInvoices,
  selectedIds,
  isLoading,
  toggleInvoice,
  allSelected,
  someSelected,
  toggleAll,
  getInvoiceValue,
  setInvoiceValue,
}: Props) {
  return (
    <div className="border-border-1 max-h-[400px] overflow-x-auto overflow-y-auto rounded-none shadow-sm">
      <Table.Root className="w-full border-collapse rounded-none" style={{ borderRadius: 0 }}>
        <Table.Header className="border-border-1 bg-background-2 border-b">
          <Table.Row>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B]"
              style={{ width: '50px' }}
            >
              <span className="flex items-center justify-center">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  className="h-4 w-4"
                />
              </span>
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]"
              style={{ width: '140px' }}
            >
              Mã HĐ
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]"
              style={{ minWidth: '200px' }}
            >
              Người bán / Diễn giải
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
              style={{ width: '140px' }}
            >
              Tổng HĐ
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
              style={{ width: '140px' }}
            >
              Còn phải trả
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium bg-background-2 sticky right-0 z-[10] px-3 py-3 text-center align-middle text-[#4B4B4B] shadow-[-1px_0_0_#e5e7eb]"
              style={{ width: '180px' }}
            >
              Tiền thanh toán
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <Table.Cell colSpan={6} className="py-10 text-center text-sm text-gray-400">
                Đang tải danh sách hoá đơn...
              </Table.Cell>
            </Table.Row>
          ) : allInvoices.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={6} className="py-10 text-center text-sm text-gray-400">
                Không có hoá đơn phù hợp
              </Table.Cell>
            </Table.Row>
          ) : (
            allInvoices.map((inv) => {
              const isSelected = selectedIds.has(inv.id)
              const totalAmt = inputInvoiceTotal(inv)
              const paidAmt = Number(inv.paid_amount ?? 0)
              const remainingAmt = totalAmt - paidAmt
              const isPartial = paidAmt > 0 && remainingAmt > 0

              return (
                <Table.Row
                  key={inv.id}
                  className={`border-border-1 border-b transition-colors last:border-b-0 ${
                    isSelected ? 'bg-red-10' : 'bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <Table.Cell className="border-border-1 border-r px-3 py-2 align-middle">
                    <div className="flex h-full items-center justify-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleInvoice(inv)}
                        className="h-4 w-4"
                      />
                    </div>
                  </Table.Cell>

                  <Table.Cell className="border-border-1 border-r px-3 py-2 align-middle">
                    <div className="font-mono text-[13px] font-medium text-gray-900">
                      {inv.code}
                    </div>
                    {inv.external_invoice_no && (
                      <div className="mt-0.5 font-mono text-[11px] text-gray-500">
                        Số HĐ: {inv.external_invoice_no}
                      </div>
                    )}
                    <div className="mt-0.5 text-xs text-gray-400">
                      {inv.invoice_date ? formatDate(inv.invoice_date) : '—'}
                    </div>
                  </Table.Cell>

                  <Table.Cell className="border-border-1 min-w-0 border-r px-3 py-2 align-middle">
                    <div className="truncate text-[13px] font-medium text-gray-900">
                      {inputInvoiceCounterpartyName(inv)}
                    </div>
                    {inv.external_invoice_no && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <span>số HĐ</span>
                        <code className="rounded bg-gray-100 px-1 text-[11px] text-gray-600">
                          {inv.external_invoice_no}
                        </code>
                      </div>
                    )}
                  </Table.Cell>

                  <Table.Cell className="border-border-1 border-r px-3 py-2 text-right align-middle">
                    <div className="text-[13px] font-medium text-gray-900">
                      {formatCurrencyVND(totalAmt)}
                    </div>
                  </Table.Cell>

                  <Table.Cell className="border-border-1 border-r px-3 py-2 text-right align-middle">
                    <div
                      className={`text-[13px] font-semibold ${
                        isPartial ? 'text-data-orange-default' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrencyVND(remainingAmt)}
                    </div>
                  </Table.Cell>

                  <Table.Cell className="border-border-1 sticky right-0 z-[1] bg-white !p-0 text-center align-middle shadow-[-1px_0_0_#e5e7eb]">
                    <div className="flex h-full w-full justify-center">
                      {isSelected ? (
                        <div className="group/cell relative flex h-full min-h-[44px] w-full items-center justify-center bg-transparent">
                          <FullCellNumberInput
                            variant="editable"
                            prefix={
                              <Tooltip>
                                <TooltipTrigger tabIndex={-1} className="cursor-help outline-none">
                                  <IconInfo
                                    size={14}
                                    className="text-gray-400 transition-colors hover:text-gray-600"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  Ấn Tab để thêm nhanh &ldquo;000&rdquo;
                                </TooltipContent>
                              </Tooltip>
                            }
                            paddingRight={0}
                            placeholder="0"
                            value={
                              getInvoiceValue(inv.id, 'allocated_amount')
                                ? Number(getInvoiceValue(inv.id, 'allocated_amount'))
                                : undefined
                            }
                            onChange={(e) => {
                              setInvoiceValue(
                                inv.id,
                                'allocated_amount',
                                e.target.value || '',
                                totalAmt,
                                paidAmt
                              )
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab') {
                                const currVal = getInvoiceValue(inv.id, 'allocated_amount')
                                if (currVal && !currVal.toString().endsWith('000')) {
                                  e.preventDefault()
                                  const numVal = Number(currVal) * 1000
                                  setInvoiceValue(
                                    inv.id,
                                    'allocated_amount',
                                    numVal.toString(),
                                    totalAmt,
                                    paidAmt
                                  )
                                }
                              }
                            }}
                            min={remainingAmt < 0 ? remainingAmt : 0}
                            max={remainingAmt >= 0 ? remainingAmt : 0}
                            suffix="VNĐ"
                            isHideSuffix={true}
                            className="!text-data-red-default min-w-[140px] !font-semibold"
                          />
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[44px] w-full items-center justify-center text-gray-300">
                          —
                        </div>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })
          )}
        </Table.Body>
      </Table.Root>
    </div>
  )
}
