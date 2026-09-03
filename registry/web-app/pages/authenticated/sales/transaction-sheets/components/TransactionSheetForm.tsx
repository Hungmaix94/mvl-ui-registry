import { useMemo, useCallback, useState } from 'react'
import { useForm, FormProvider, SubmitHandler, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Select, Button, CurrencyInput, TextArea, FileUpload } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { Separator } from '@/components/ui/separator'
import FormController from '@/components/ui/form/FormController'
// import removed

import {
  transactionSheetFormSchema,
  TransactionSheetFormValues,
} from '@/features/sales/transaction-sheets/types/transaction-sheet-form-types'

import CustomerSelectWithDialog from '@/features/project/booking-contract/components/CustomerSelectWithDialog'
import TransactionSaleTable from './TransactionSaleTable'
import { apiClient } from '@/api/client'
import { ApiPaths } from '@/api/schema'
import { useFormValidationScroll } from '@/hooks/useFormValidationScroll'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { DepositStatus } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
type TransactionSheetFormProps = {
  initialValues?: Partial<TransactionSheetFormValues>
  onSubmit: (values: TransactionSheetFormValues) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
}

export const TransactionSheetForm = ({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit = false,
}: TransactionSheetFormProps) => {
  const form = useForm<TransactionSheetFormValues>({
    resolver: zodResolver(transactionSheetFormSchema) as any,
    defaultValues: {
      sales_staff: [],
      purchase_contract_date: new Date(),
      ...initialValues,
    },
  })

  // Set the correct customerType from initialValues otherwise individual by default
  const [customerType, setCustomerType] = useState<any>(
    (initialValues as any)?.customer_type || 'individual'
  )

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, submitCount },
  } = form

  useFormValidationScroll(errors, submitCount)

  const submitButtonText = useMemo(() => (isEdit ? 'Cập nhật' : 'Tạo mới'), [isEdit])

  const handleFormSubmit: SubmitHandler<TransactionSheetFormValues> = useCallback(
    async (values) => {
      try {
        await onSubmit(values)
      } catch (error) {
        console.error('Submit TransactionSheet error:', error)
        handleApiError(error, form.setError, {
          deposit_contract_id: 'deposit_contract',
          customer_id: 'customer',
          note: 'note',
          fee_calculation_price: 'fee_calculation_price',
          purchase_contract_date: 'purchase_contract_date',
        })
      }
    },
    [onSubmit, form.setError]
  )

  const loadDepositContractOptions = useCallback(
    async ({ query, page, pageSize }: { query: string; page: number; pageSize: number }) => {
      try {
        const { data } = await apiClient.GET(ApiPaths.sales_deposit_contracts_list, {
          params: {
            query: {
              search: query || undefined,
              page,
              page_size: pageSize,
              approval_status: 'approved' as any,
              status: 'approved' as any,
              has_transaction_sheet: false,
            },
          },
        })

        const items =
          data?.data?.results?.map((item: any) => {
            const unitNumber =
              item.product_inventory_detail?.unit_number ||
              item.product_inventory_detail?.code ||
              ''
            return {
              value: Number(item.id),
              label: [item.code, item.customer_detail?.name, unitNumber]
                .filter(Boolean)
                .join(' - '),
              data: item,
            }
          }) || []

        const hasNextPage = !!data?.data?.next
        const nextPageMatch = data?.data?.next?.match(/[?&]page=(\d+)/)
        const nextPage = nextPageMatch ? Number(nextPageMatch[1]) : null

        return { items, hasNextPage, nextPage }
      } catch (error) {
        console.error('Failed to load deposit contracts', error)
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    []
  )

  const loadInitialDepositContractOptions = useCallback(async (values: (string | number)[]) => {
    if (!values || values.length === 0) return []
    try {
      const id = Number(values[0])
      const { data } = await apiClient.GET(ApiPaths.sales_deposit_contracts_retrieve, {
        params: { path: { id } },
      })
      if (!data?.data) return []
      const detail = data.data as any
      const unitNumber =
        detail.product_inventory_detail?.unit_number || detail.product_inventory_detail?.code || ''
      return [
        {
          value: Number(detail.id),
          label: [detail.code, detail.customer_detail?.name, unitNumber]
            .filter(Boolean)
            .join(' - '),
          data: detail,
        },
      ]
    } catch (error) {
      console.error('Failed to load initial deposit contract', error)
      return []
    }
  }, [])

  const mapDepositSalesStaffToTransactionSales = useCallback((salesStaff: any[] = []) => {
    return salesStaff.map((sale: any) => ({
      sale_type: sale.sale_type,
      employee:
        sale.employee?.id ?? sale.employee_id ?? sale.employee_detail?.id ?? sale.employee ?? null,
      exchange:
        sale.exchange?.id ?? sale.exchange_id ?? sale.exchange_detail?.id ?? sale.exchange ?? null,
      collaborator:
        sale.collaborator?.id ??
        sale.collaborator_id ??
        sale.collaborator_detail?.id ??
        sale.collaborator ??
        null,
      employee_detail: sale.employee_detail,
      exchange_detail: sale.exchange_detail,
      collaborator_detail: sale.collaborator_detail,
      full_name:
        sale.collaborator_name ||
        sale.full_name ||
        sale.collaborator_detail?.fullname ||
        sale.collaborator_detail?.name ||
        sale.employee_detail?.fullname ||
        sale.exchange_detail?.name ||
        '',
      percentage: Number(sale.participation_percentage ?? sale.percentage) || 0,
    }))
  }, [])

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 px-10 py-4">
        {/* SECTION 1 — Thông tin Hợp đồng */}
        <div className="bg-surface-primary-default rounded-md">
          <div className="mb-4">
            <h3 className="text-text-primary-default text-lg font-semibold">Thông tin Giao dịch</h3>
          </div>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
            <FormController<TransactionSheetFormValues, any>
              register={register}
              control={control}
              name="deposit_contract"
              Field={Select}
              wrapperClassName="lg:col-span-4"
              fieldProps={{
                label: 'Hợp đồng đặt cọc',
                placeholder: 'Chọn hợp đồng đặt cọc...',
                onChangeOption: (option: any) => {
                  if (!option?.data || isEdit) return

                  const depositStatus = option.data.status
                  const approvalStatus = option.data.approval_status
                  if (
                    approvalStatus !== 'approved' ||
                    depositStatus === DepositStatus.REFUNDED ||
                    depositStatus === DepositStatus.ABANDONED ||
                    depositStatus === DepositStatus.REJECTED
                  ) {
                    toastService.error(
                      'Hợp đồng đặt cọc chưa được phê duyệt hoặc đã bị hủy/hoàn tiền/từ chối. Không thể tạo Phiếu TTGD.'
                    )
                    setTimeout(() => {
                      setValue('deposit_contract', undefined as any, { shouldValidate: true })
                    }, 0)
                    return
                  }

                  const fillForm = (data: any) => {
                    const custType =
                      data?.customer_detail?.customer_type || data?.customer_type || 'individual'
                    setCustomerType(custType)

                    const customerId =
                      data?.customer_detail?.id || data?.customer?.id || data?.customer
                    if (customerId) {
                      setValue('customer', customerId, { shouldValidate: true })
                    }

                    if (
                      data?.fee_calculation_price !== undefined &&
                      data?.fee_calculation_price !== null
                    ) {
                      setValue('fee_calculation_price', Number(data.fee_calculation_price), {
                        shouldValidate: true,
                      })
                    }

                    if (data?.pct_revenue !== undefined && data?.pct_revenue !== null) {
                      setValue('pct_revenue', Number(data.pct_revenue), { shouldValidate: true })
                    } else if (
                      data?.product_inventory_detail?.pct_revenue !== undefined &&
                      data?.product_inventory_detail?.pct_revenue !== null
                    ) {
                      setValue('pct_revenue', Number(data.product_inventory_detail.pct_revenue), {
                        shouldValidate: true,
                      })
                    }

                    if (Array.isArray(data?.sales_staff) && data.sales_staff.length > 0) {
                      setValue(
                        'sales_staff',
                        mapDepositSalesStaffToTransactionSales(data.sales_staff) as any,
                        { shouldValidate: true }
                      )
                      return true
                    }
                    return false
                  }

                  const hasSalesStaff = fillForm(option.data)
                  if (hasSalesStaff) return

                  // Fallback: list response may not include sales_staff or full details, so fetch detail.
                  const selectedId = Number(option.value ?? option.data.id)
                  if (!selectedId) {
                    setValue('sales_staff', [] as any, { shouldValidate: true })
                    return
                  }

                  void (async () => {
                    try {
                      const { data } = await apiClient.GET(
                        ApiPaths.sales_deposit_contracts_retrieve,
                        {
                          params: { path: { id: selectedId } },
                        }
                      )
                      const depositDetail = data?.data as any
                      if (!depositDetail) return

                      fillForm(depositDetail)
                    } catch (error) {
                      console.error('Failed to autofill from deposit contract', error)
                    }
                  })()
                },
                loadOptions: loadDepositContractOptions,
                loadInitialOptions: loadInitialDepositContractOptions,
                enableSearch: true,
                required: true,
                disabled: isSubmitting || isEdit, // Often shouldn't change source contract when editing
              }}
            />
            <FormController<TransactionSheetFormValues, any>
              register={register}
              control={control}
              name="purchase_contract_date"
              Field={DatePicker}
              wrapperClassName="lg:col-span-4"
              fieldProps={{
                label: 'Ngày ký HĐMB dự kiến',
                disabled: isSubmitting,
              }}
            />
            <FormController<TransactionSheetFormValues, any>
              register={register}
              control={control}
              name="fee_calculation_price"
              Field={CurrencyInput}
              wrapperClassName="lg:col-span-4"
              fieldProps={{
                label: 'Giá tạm tính',
                placeholder: '0',
                allowNegativeValue: false,
                suffix: 'VNĐ',
                disabled: isSubmitting,
              }}
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* SECTION 2 — Thông tin Khách hàng */}
        <div className="bg-surface-primary-default rounded-md">
          <div className="mb-4">
            <h3 className="text-text-primary-default text-lg font-semibold">
              Thông tin Khách hàng
            </h3>
          </div>
          <Controller
            control={control}
            name="customer"
            render={({ field, fieldState }) => (
              <CustomerSelectWithDialog
                label="Khách hàng"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                required
                customerType={customerType}
              />
            )}
          />
          <FormController<TransactionSheetFormValues, any>
            register={register}
            control={control}
            name="note"
            Field={TextArea}
            wrapperClassName="mt-4"
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Nhập ghi chú...',
              maxCharacters: 500,
              disabled: isSubmitting,
            }}
          />
        </div>

        <Separator className="my-6" />

        {/* SECTION 3 — Nhân sự phụ trách bán */}
        <div className="bg-surface-primary-default rounded-md">
          <TransactionSaleTable isReadOnly={isSubmitting || isEdit} />
        </div>

        <Separator className="my-6" />

        {/* SECTION 4 — File đính kèm */}
        <div className="bg-surface-primary-default rounded-md">
          <Controller
            control={control}
            name="attachments"
            render={({ field, fieldState }) => (
              <FileUpload
                label="Tài liệu đính kèm"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                multiple
                purpose="transaction_sheet_document"
                existingFiles={(initialValues as any)?.attachments_detail || []}
                onKeptExistingIdsChange={(ids: number[]) => setValue('kept_attachment_ids', ids)}
                disabled={isSubmitting}
                required={false}
              />
            )}
          />
        </div>

        {/* Footer Actions */}
        <Flex gap="4" justify="end" className="border-border-1 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            {submitButtonText}
          </Button>
        </Flex>
      </form>
    </FormProvider>
  )
}

export default TransactionSheetForm
