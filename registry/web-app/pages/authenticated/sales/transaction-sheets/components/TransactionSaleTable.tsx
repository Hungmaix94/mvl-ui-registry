import { useMemo, useCallback } from 'react'
import { Table, Text } from '@radix-ui/themes'
import { Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFormContext, Controller, useWatch, useFieldArray } from 'react-hook-form'

import { APP_PATH } from '@/routes/AppRoute.constant'

import { cn, formatCurrencyVND, formatPercent } from '@/utils'
import { Button, IconButton } from '@/components/ui'
import { FormArrayError } from '@/components/ui/form'
import { FullCellNumberInput } from '@/components/commons'
import { useDialog } from '@/hooks/useDialog'

import { TransactionSheetFormValues } from '@/features/sales/transaction-sheets/types/transaction-sheet-form-types'
import {
  TRANSACTION_SALE_TYPE,
  TransactionSaleType,
} from '@/features/sales/transaction-sheets/types/transaction-sheet'
import AddTransactionSaleDialog, {
  AddTransactionSaleDialogResult,
} from './AddTransactionSaleDialog'
import { TransactionSaleStaffReadOnlyTable } from '@/features/sales/components/TransactionSaleStaffReadOnlyTable'

type Props = {
  isReadOnly?: boolean
}

export const TransactionSaleTable = ({ isReadOnly = false }: Props) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<TransactionSheetFormValues>()
  const { displayFormContent, displayClose } = useDialog()

  const { fields, append, remove } = useFieldArray({ control, name: 'sales_staff' })

  const watchedSales = useWatch({
    control,
    name: 'sales_staff',
  }) as TransactionSheetFormValues['sales_staff']

  const watchedFeeCalculationPrice = useWatch({
    control,
    name: 'fee_calculation_price',
  }) as number | undefined

  const watchedPctRevenue = useWatch({
    control,
    name: 'pct_revenue',
  }) as number | undefined

  const watchedAmtRevenue = undefined as number | undefined

  const totalPercentage = useMemo(
    () => watchedSales?.reduce((acc, item) => acc + Number(item.percentage || 0), 0) ?? 0,
    [watchedSales]
  )

  const totalIndividualAmount = useMemo(() => {
    if (watchedFeeCalculationPrice != null) {
      const activeSalesPctSum = watchedSales
        ?.filter((s) => s.sale_type !== 'partner')
        ?.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0) || 0
      if (watchedPctRevenue != null) {
        return (watchedFeeCalculationPrice * watchedPctRevenue * activeSalesPctSum) / 10000
      }
      return (watchedFeeCalculationPrice * activeSalesPctSum) / 100
    }
    return 0
  }, [watchedFeeCalculationPrice, watchedPctRevenue, watchedSales])

  const handleAddSale = useCallback(() => {
    if (isReadOnly) return

    displayFormContent({
      title: 'Thêm người bán hàng',
      content: (
        <AddTransactionSaleDialog
          onConfirm={(data: AddTransactionSaleDialogResult) => {
            append({
              sale_type: data.sale_type,
              employee: data.employee,
              exchange: data.exchange,
              employee_detail: data.employee_detail,
              exchange_detail: data.exchange_detail,
              percentage: 0,
            })
            displayClose()
          }}
          onCancel={() => displayClose()}
        />
      ),
      confirmText: '',
      hideFooter: true,
    })
  }, [isReadOnly, append, displayFormContent, displayClose])

  return (
    <div className="flex flex-col gap-4">
      <Text className="text-content-dark-1 typo-body-xl-semibold">Nhân sự phụ trách bán</Text>

      {isReadOnly ? (
        <TransactionSaleStaffReadOnlyTable
          data={watchedSales || []}
          feeCalculationPrice={watchedFeeCalculationPrice}
          pctRevenue={watchedPctRevenue}
          amtRevenue={watchedAmtRevenue}
        />
      ) : fields.length === 0 ? (
        <div className="border-border-1 bg-neutral-10 flex flex-col items-center justify-center rounded-sm border border-dashed p-8">
          <Button
            variant="secondary-border"
            size="medium"
            type="button"
            onClick={handleAddSale}
            leftIcon={<Plus className="h-4 w-4" />}
            className="gap-2"
          >
            Thêm nhân sự phụ trách bán
          </Button>
        </div>
      ) : (
        <div className="border-border-1 overflow-hidden border">
          <Table.Root className="w-full border-collapse">
            <Table.Header className="border-border-1 bg-background-2 border-b">
              <Table.Row>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]"
                  style={{ width: 'auto', minWidth: '300px' }}
                >
                  Người bán
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]"
                  style={{ width: '150px', minWidth: '150px' }}
                >
                  Loại hình
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]"
                  style={{ width: '150px', minWidth: '150px' }}
                >
                  Tỷ lệ tham gia (%)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B]"
                  style={{ width: '220px', minWidth: '220px' }}
                >
                  Tỷ lệ doanh thu (Tạm tính)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
                  style={{ width: '280px', minWidth: '280px' }}
                >
                  {/* NOTE: Cột này thể hiện Thành tiền doanh thu BĐS (Tạm tính) (STT 42 / Bug 86exqzkx4) */}
                  Thành tiền doanh thu BĐS (Tạm tính)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
                  style={{ width: '300px', minWidth: '300px' }}
                >
                  Thành tiền doanh thu cá nhân (Tạm tính)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 px-3 py-3 text-center align-middle"
                  style={{ width: '60px', minWidth: '60px' }}
                />
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {fields.map((field, index) => {
                const sale = watchedSales?.[index] || (field as any)
                const isInternal = sale?.sale_type === 'mv'
                const isPartner = sale?.sale_type === 'partner'
                const pct = sale?.percentage != null ? Number(sale.percentage) : 0

                const rowBaseAmt = isPartner
                  ? 0
                  : watchedAmtRevenue != null
                    ? watchedAmtRevenue
                    : watchedFeeCalculationPrice != null
                      ? watchedPctRevenue != null
                        ? (watchedFeeCalculationPrice * watchedPctRevenue) / 100
                        : watchedFeeCalculationPrice
                      : 0

                const rowIndividualAmt = isPartner
                  ? 0
                  : watchedFeeCalculationPrice != null
                    ? watchedPctRevenue != null
                      ? (watchedFeeCalculationPrice * watchedPctRevenue * pct) / 10000
                      : (watchedFeeCalculationPrice * pct) / 100
                    : 0

                const personLabel = isInternal
                  ? sale?.employee_detail?.fullname || (sale?.employee ? `#${sale.employee}` : '-')
                  : sale?.full_name ||
                    sale?.exchange_detail?.name ||
                    sale?.collaborator_detail?.fullname ||
                    sale?.collaborator_detail?.name ||
                    (sale?.exchange ? `#${sale.exchange}` : '-')

                return (
                  <Table.Row key={field.id} className="border-border-1 border-b last:border-b-0">
                    <Table.Cell
                      className={cn(
                        'border-border-1 typo-body-base-regular border-r px-3 py-2 align-middle'
                      )}
                    >
                      <div className="flex flex-col gap-0.5 py-1">
                        {isInternal && sale?.employee ? (
                          <Link
                            to={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(
                              ':id',
                              String(sale.employee)
                            )}
                            target="_blank"
                            className="text-action-primary-default font-medium hover:underline"
                          >
                            {personLabel}
                          </Link>
                        ) : (
                          <span>{personLabel}</span>
                        )}
                        {isInternal && sale?.employee_detail && (
                          <span className="text-content-dark-3 typo-body-small-regular">
                            {[
                              sale.employee_detail?.branch?.name,
                              sale.employee_detail?.department?.name,
                            ]
                              .filter(Boolean)
                              .join(' - ')}
                          </span>
                        )}
                      </div>
                    </Table.Cell>

                    <Table.Cell
                      className={cn(
                        'border-border-1 typo-body-base-regular border-r px-3 py-2 align-middle'
                      )}
                    >
                      {TRANSACTION_SALE_TYPE[sale?.sale_type as TransactionSaleType] ?? '-'}
                    </Table.Cell>

                    <Table.Cell
                      className={cn(
                        'border-border-1 typo-body-base-regular relative border-r bg-white !p-0 align-top'
                      )}
                    >
                      <Controller
                        control={control}
                        name={`sales_staff.${index}.percentage`}
                        render={({ field }) => (
                          <FullCellNumberInput
                            {...field}
                            className="hover:ring-neutral-80 h-full min-h-[44px] w-full bg-transparent pr-8 pl-3 text-right outline-none ring-inset focus-within:bg-white hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                            value={
                              field.value !== undefined && field.value !== null
                                ? String(field.value)
                                : ''
                            }
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const val = Number(e.target.value)
                              field.onChange(val > 100 ? 100 : val >= 0 ? val : 0)
                            }}
                            suffix="%"
                          />
                        )}
                      />
                    </Table.Cell>

                    <Table.Cell
                      className={cn(
                        'border-border-1 typo-body-base-regular border-r bg-white px-3 py-2 text-center align-middle'
                      )}
                    >
                      {sale?.sale_type === 'partner'
                        ? formatPercent(0)
                        : watchedPctRevenue != null
                          ? formatPercent(watchedPctRevenue)
                          : '100%'}
                    </Table.Cell>

                    <Table.Cell
                      className={cn(
                        'border-border-1 typo-body-base-regular border-r bg-white px-3 py-2 text-right align-middle text-[#E5202B]'
                      )}
                    >
                      {sale?.sale_type === 'partner'
                        ? formatCurrencyVND(0) + ' VNĐ'
                        : watchedFeeCalculationPrice != null || watchedAmtRevenue != null
                          ? formatCurrencyVND(rowBaseAmt) + ' VNĐ'
                          : '-'}
                    </Table.Cell>

                    <Table.Cell
                      className={cn(
                        'border-border-1 typo-body-base-regular border-r bg-white px-3 py-2 text-right align-middle text-[#E5202B]'
                      )}
                    >
                      {sale?.sale_type === 'partner'
                        ? formatCurrencyVND(0) + ' VNĐ'
                        : watchedFeeCalculationPrice != null
                          ? formatCurrencyVND(rowIndividualAmt) + ' VNĐ'
                          : '-'}
                    </Table.Cell>

                    <Table.Cell className="px-3 py-2 text-center align-middle">
                      <IconButton
                        variant="text"
                        size="small"
                        onClick={() => remove(index)}
                        className="hover:text-red-70 text-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>

            {/* Add button row */}
            <Table.Body>
              <Table.Row>
                <Table.Cell colSpan={4} className="border-none !px-0 !pt-4">
                  <div className="sticky left-3 w-max pl-3">
                    <Button
                      variant="text"
                      color="gray"
                      size="large"
                      type="button"
                      onClick={handleAddSale}
                      leftIcon={<Plus className="h-5 w-5" />}
                      className="font-body-base-medium text-content-dark-1 flex gap-3"
                    >
                      Thêm nhân sự phụ trách bán
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            </Table.Body>

            {/* Total row */}
            <Table.Body className="bg-[#F7EBEB]">
              <Table.Row>
                <Table.Cell
                  className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-right align-middle"
                  colSpan={2}
                >
                  Tổng
                </Table.Cell>
                <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-left align-middle">
                  {formatPercent(totalPercentage)}
                </Table.Cell>
                <Table.Cell className="border-border-1 !p-0" />
                <Table.Cell className="border-border-1 border-r !p-0" />
                <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-right align-middle text-[#E5202B]">
                  {totalIndividualAmount != null ? formatCurrencyVND(totalIndividualAmount) + ' VNĐ' : '-'}
                </Table.Cell>
                <Table.Cell className="border-border-1 !p-0" />
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </div>
      )}

      <FormArrayError errors={errors?.sales_staff} />
    </div>
  )
}

export default TransactionSaleTable
