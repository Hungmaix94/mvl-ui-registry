import { Table } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { Button, IconButton } from '@/components/ui'
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form'
import { Trash2, Plus } from 'lucide-react'

import { useDialog } from '@/hooks/useDialog'
import AddTbcDialog from './AddTbcDialog'
import { formatCurrencyVND, formatPercent } from '@/utils'

export type SaleAllocationTbcTableProps = {
  name: 'tbc_investor' | 'tbc_f2' | 'tbc_sale'
  isReadOnly?: boolean
}

export const SaleAllocationTbcTable = ({
  name,
  isReadOnly = false,
}: SaleAllocationTbcTableProps) => {
  const { control } = useFormContext<any>()

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  })

  const categoryOptions = useMemo(
    () => [
      { value: 'agency_fee', label: 'Phí môi giới (Agency Fee)' },
      { value: 'sale_commission', label: 'Hoa hồng bán hàng' },
      { value: 'revenue', label: 'Doanh thu' },
      { value: 'investor_bonus', label: 'Thưởng CĐT' },
      { value: 'investor_bonus_to_sale', label: 'Thưởng cho sale' },
    ],
    []
  )

  const { displayFormContent, displayClose } = useDialog()
  const watchedFields = useWatch({ control, name }) as any[]

  const handleAddRow = useCallback(() => {
    if (isReadOnly) return
    displayFormContent({
      title: 'Thêm cấu hình hoa hồng',
      content: (
        <AddTbcDialog
          onConfirm={(data) => {
            append({
              category: data.category,
              effective_from: data.effective_from,
              effective_to: data.effective_to,
              percentage: data.percentage,
              fixed_amount: data.fixed_amount,
              note: data.note,
            } as any)
            displayClose()
          }}
          onCancel={displayClose}
        />
      ),
      confirmText: '',
      hideFooter: true,
    })
  }, [isReadOnly, append, displayFormContent, displayClose])

  const handleRemoveRow = (index: number) => {
    remove(index)
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 && !isReadOnly ? (
        <div className="border-border-1 bg-neutral-10 flex flex-col items-center justify-center rounded-sm border border-dashed p-6">
          <Button
            type="button"
            variant="secondary-border"
            size="medium"
            onClick={handleAddRow}
            leftIcon={<Plus className="h-4 w-4" />}
            className="min-w-[200px] gap-2"
          >
            Thêm cấu hình / bảng tính
          </Button>
        </div>
      ) : (
        <div className="border-border-1 overflow-x-auto border">
          <Table.Root className="w-full min-w-[900px] border-collapse">
            <Table.Header className="border-border-1 bg-background-2 border-b">
              <Table.Row>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '220px' }}
                >
                  Loại hoa hồng
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '160px' }}
                >
                  Ngày áp dụng
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '160px' }}
                >
                  Ngày kết thúc
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '120px' }}
                >
                  Tỷ lệ (%)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '180px' }}
                >
                  Số tiền cố định
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle font-medium text-[#4B4B4B]">
                  Ghi chú
                </Table.ColumnHeaderCell>
                {!isReadOnly && (
                  <Table.ColumnHeaderCell
                    className="typo-body-base-medium border-border-1 px-3 py-3 text-center align-middle font-medium"
                    style={{ width: '60px' }}
                  ></Table.ColumnHeaderCell>
                )}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {fields.map((field, index) => {
                const item = watchedFields?.[index] || field
                const catLabel =
                  categoryOptions.find((o) => o.value === item.category)?.label ||
                  item.category ||
                  '-'
                return (
                  <Table.Row key={field.id} className="border-border-1 border-b last:border-b-0">
                    <Table.Cell className="border-border-1 typo-body-base-medium border-r px-3 py-2 text-center align-middle">
                      {catLabel}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-center align-middle">
                      {item.effective_from
                        ? new Date(item.effective_from).toLocaleDateString('vi-VN')
                        : '-'}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-center align-middle">
                      {item.effective_to
                        ? new Date(item.effective_to).toLocaleDateString('vi-VN')
                        : '-'}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-right align-middle">
                      {item.percentage ? formatPercent(item.percentage) : '-'}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-medium border-r px-3 py-2 text-right align-middle text-[#E5202B]">
                      {item.fixed_amount ? formatCurrencyVND(item.fixed_amount) : '-'}
                    </Table.Cell>

                    <Table.Cell className="border-border-1 typo-body-base-regular text-content-dark-3 border-r px-3 py-2 align-middle">
                      {item.note || '-'}
                    </Table.Cell>

                    {!isReadOnly && (
                      <Table.Cell className="px-3 py-2 text-center align-middle">
                        <IconButton
                          variant="text"
                          size="small"
                          onClick={() => handleRemoveRow(index)}
                          className="hover:text-red-70 text-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </Table.Cell>
                    )}
                  </Table.Row>
                )
              })}
            </Table.Body>

            {!isReadOnly && fields.length > 0 && (
              <Table.Body>
                <Table.Row>
                  <Table.Cell colSpan={7} className="border-none !px-0 !pt-4 !pb-2">
                    <Button
                      type="button"
                      variant="text"
                      color="gray"
                      size="medium"
                      onClick={handleAddRow}
                      leftIcon={<Plus className="h-4 w-4" />}
                      className="font-body-base-medium text-content-dark-1 flex gap-2"
                    >
                      Thêm cấu hình / bảng tính
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
