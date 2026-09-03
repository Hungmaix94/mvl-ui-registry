import { Table } from '@radix-ui/themes'
import { useCallback, useState, useEffect } from 'react'
import { Button, IconButton } from '@/components/ui'
import { Trash2, Plus } from 'lucide-react'
import { IconPencil } from '@/assets/icons'
import { useDialog } from '@/hooks/useDialog'
import AddDepositDialog from './AddDepositDialog'
import { FullCellNumberInput } from '@/components/commons'
import { formatCurrencyVND } from '@/utils'
import { format } from 'date-fns'
import { getEmployeeService } from '@/features/employee/services/employee-service'

export const SaleAllocationDepositTable = ({
  saleAllocationId: _saleAllocationId,
  isReadOnly = false,
}: {
  saleAllocationId?: number
  isReadOnly?: boolean
} = {}) => {
  const [deposits, setDeposits] = useState<any[]>([])
  const { displayFormContent, displayClose } = useDialog()
  const [employeeMap, setEmployeeMap] = useState<Record<number, string>>({})

  const watchedAdminIds = deposits
    .map((d: any) => d.admin_id)
    .filter((id: any) => typeof id === 'number')

  useEffect(() => {
    let isMounted = true
    const missingIds = watchedAdminIds.filter((id: number) => id && !employeeMap[id])
    if (missingIds.length > 0) {
      Promise.all(
        missingIds.map((id: number) =>
          getEmployeeService()
            .getEmployee(id)
            .catch(() => null)
        )
      ).then((results) => {
        if (!isMounted) return
        const newMap = { ...employeeMap }
        results.forEach((res) => {
          if (res) newMap[res.id] = res.fullname || res.email || String(res.id)
        })
        setEmployeeMap(newMap)
      })
    }
    return () => {
      isMounted = false
    }
  }, [watchedAdminIds, employeeMap])

  const handleAddDeposit = useCallback(() => {
    displayFormContent({
      title: 'Thêm mức Ký Quỹ',
      content: (
        <AddDepositDialog
          onConfirm={(data) => {
            setDeposits((prev) => [...prev, { ...data, id: Date.now() }])
            displayClose()
          }}
          onCancel={displayClose}
        />
      ),
      confirmText: '',
      hideFooter: true,
    })
  }, [displayFormContent, displayClose])

  const handleEditDeposit = useCallback(
    (d: any) => {
      displayFormContent({
        title: 'Chỉnh sửa mức Ký Quỹ',
        content: (
          <AddDepositDialog
            initialValues={{
              sign_date: d.sign_date ? new Date(d.sign_date) : null,
              amount: d.amount ? String(d.amount) : null,
              refunded_amount: d.refunded_amount != null ? String(d.refunded_amount) : '0',
              admin_id: typeof d.admin_id === 'object' ? d.admin_id?.value : d.admin_id,
              note: d.note || '',
            }}
            onConfirm={(data) => {
              setDeposits((prev) =>
                prev.map((row) => (row.id === d.id ? { ...row, ...data } : row))
              )
              displayClose()
            }}
            onCancel={displayClose}
          />
        ),
        confirmText: '',
        hideFooter: true,
      })
    },
    [displayFormContent, displayClose]
  )

  const handleRemoveDeposit = (id: number) => {
    setDeposits(deposits.filter((d) => d.id !== id))
  }

  const handleUpdateDeposit = (id: number, field: string, value: any) => {
    setDeposits((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          return { ...d, [field]: value }
        }
        return d
      })
    )
  }

  const inputCellClass =
    'w-full h-full border-none focus:ring-0 px-3 py-2 text-content-dark-3 bg-transparent outline-none typo-body-base-regular'

  return (
    <div className="flex flex-col gap-4">
      {deposits.length === 0 ? (
        <div className="border-border-1 bg-neutral-10 flex flex-col items-center justify-center border border-dashed p-6">
          {!isReadOnly ? (
            <Button
              type="button"
              variant="secondary-border"
              size="medium"
              onClick={handleAddDeposit}
              leftIcon={<Plus className="h-4 w-4" />}
              className="min-w-[200px] gap-2"
            >
              Thiết lập Ký Quỹ
            </Button>
          ) : (
            <span className="text-gray-500">Chưa có dữ liệu ký quỹ.</span>
          )}
        </div>
      ) : (
        <div className="border-border-1 overflow-hidden border">
          <Table.Root className="w-full border-collapse">
            <Table.Header className="border-border-1 bg-background-2 border-b">
              <Table.Row>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B]"
                  style={{ width: '60px' }}
                >
                  STT
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium min-w-[120px] border-r px-3 py-3 text-left align-middle text-[#4B4B4B]">
                  Ngày ký
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium min-w-[180px] border-r px-3 py-3 text-right align-middle text-[#4B4B4B]">
                  Tiền ký quỹ
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium min-w-[160px] border-r px-3 py-3 text-left align-middle text-[#4B4B4B]">
                  Admin phụ trách
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium min-w-[180px] border-r px-3 py-3 text-right align-middle text-[#4B4B4B]">
                  Đã hoàn
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium min-w-[160px] border-r px-3 py-3 text-right align-middle text-[#4B4B4B]">
                  Còn lại
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium min-w-[200px] border-r px-3 py-3 text-left align-middle text-[#4B4B4B]">
                  Ghi chú
                </Table.ColumnHeaderCell>
                {!isReadOnly && (
                  <Table.ColumnHeaderCell
                    className="typo-body-base-medium border-border-1 px-3 py-3 text-center align-middle"
                    style={{ width: '60px' }}
                  ></Table.ColumnHeaderCell>
                )}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {deposits.map((d: any, index: number) => {
                const amount = Number(d.amount) || 0
                const refundedAmount = Number(d.refunded_amount) || 0
                const remaining = amount - refundedAmount

                return (
                  <Table.Row
                    key={d.id}
                    className="border-border-1 h-[44px] border-b last:border-b-0"
                  >
                    <Table.Cell className="border-border-1 typo-body-base-medium text-content-dark-3 border-r px-3 py-2 text-center align-middle">
                      {index + 1}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-left align-middle">
                      {d.sign_date ? format(new Date(d.sign_date), 'dd/MM/yyyy') : '-'}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 relative border-r bg-white !p-0 align-top">
                      <FullCellNumberInput
                        suffix="đ"
                        min={0}
                        max={undefined}
                        value={d.amount?.toString() || ''}
                        onChange={(e: any) => handleUpdateDeposit(d.id, 'amount', e.target.value)}
                        placeholder="0"
                        className={`${inputCellClass} pr-7 text-right font-semibold text-[#E5202B]`}
                        disabled={isReadOnly}
                      />
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-left align-middle">
                      {typeof d.admin_id === 'object'
                        ? d.admin_id?.label
                        : employeeMap[d.admin_id] || d.admin_id || '-'}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 relative border-r bg-white !p-0 align-top">
                      <FullCellNumberInput
                        suffix="đ"
                        min={0}
                        max={undefined}
                        value={d.refunded_amount?.toString() || ''}
                        onChange={(e: any) =>
                          handleUpdateDeposit(d.id, 'refunded_amount', e.target.value)
                        }
                        placeholder="0"
                        className={`${inputCellClass} text-content-dark-3 pr-7 text-right`}
                        disabled={isReadOnly}
                      />
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular text-content-dark-3 bg-background-2 border-r px-3 py-2 text-right align-middle">
                      {formatCurrencyVND(remaining)}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-left align-middle">
                      {d.note || '-'}
                    </Table.Cell>

                    {!isReadOnly && (
                      <Table.Cell className="px-3 py-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <IconButton
                            type="button"
                            variant="text"
                            size="small"
                            onClick={() => handleEditDeposit(d)}
                            className="hover:text-neutral-70 hover:bg-neutral-20 text-neutral-50"
                            title="Chỉnh sửa"
                          >
                            <IconPencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            type="button"
                            variant="text"
                            size="small"
                            onClick={() => handleRemoveDeposit(d.id)}
                            className="hover:text-red-70 hover:bg-neutral-20 text-red-50"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </Table.Cell>
                    )}
                  </Table.Row>
                )
              })}
            </Table.Body>

            {!isReadOnly && (
              <Table.Body>
                <Table.Row>
                  <Table.Cell colSpan={8} className="border-none !px-0 !pt-4 !pb-2">
                    <Button
                      type="button"
                      variant="text"
                      color="gray"
                      size="medium"
                      onClick={handleAddDeposit}
                      leftIcon={<Plus className="h-4 w-4" />}
                      className="font-body-base-medium text-content-dark-1 flex gap-2"
                    >
                      Thêm
                    </Button>
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            )}
          </Table.Root>
        </div>
      )}
    </div>
  )
}
