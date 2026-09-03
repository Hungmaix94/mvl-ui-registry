import { useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Table, Flex } from '@radix-ui/themes'
import { TextField, Select, Button, CurrencyInput, FileUpload, PhoneInput } from '@/components/ui'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import FormController from '@/components/ui/form/FormController'
import { formatCurrencyVND, formatRatePct } from '@/utils'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import {
  refundBookingFormSchema,
  type RefundBookingFormValues,
} from '../types/refund-booking-form-types'
import { useScrollToError } from '@/hooks/useScrollToError'
import useBankOptions from '@/hooks/useBankOptions'

import { useCustomer, useBooking } from '@/services/sales-service'
import { useEmployee } from '@/services'
import { useBookingContractLoadOptions } from '../../booking-contract/services/useBookingContractLoadOptions'
import { ConfirmationLogsTable } from '@/features/sales/components/ConfirmationLogsTable'
import type { components } from '@/api/schema'
import { parseDateFromApi } from '@/utils/date-utils'
import { DepositContractPaymentMethod } from '@/constants/api-schema-aliases'

type CustomerSource = Partial<
  components['schemas']['Customer'] & components['schemas']['CustomerNested']
>

type RefundBookingFormProps = {
  initialValues?: Partial<RefundBookingFormValues>
  onSubmit: (data: RefundBookingFormValues) => void
  onCancel?: () => void
  isSubmitting?: boolean
  isEdit?: boolean
}

const RefundStaffRow = ({
  staff,
  bookingAmount,
}: {
  staff: any
  bookingAmount: string | number
}) => {
  const { data: employeeData } = useEmployee(staff?.employee_id as number)

  const percentage = Number(staff?.participation_percentage || 0)
  const dealPct = Number(staff?.pct_commission || 0)
  const thanhTienDTBDS = (Number(bookingAmount || 0) * dealPct) / 100
  const thanhTienDTCaNhan = thanhTienDTBDS * (percentage / 100)

  const branchName = employeeData?.branch?.name || staff?.employee_detail?.branch?.name
  const blockName = employeeData?.block?.name || staff?.employee_detail?.block?.name
  const departmentName = employeeData?.department?.name || staff?.employee_detail?.department?.name

  return (
    <Table.Row className="border-border-1 border-b last:border-b-0">
      <Table.Cell className="typo-body-base-regular border-border-1 border-r px-3 py-2 align-middle">
        <div className="flex flex-col gap-1 py-2">
          <div>
            {staff?.employee_detail?.fullname ||
              staff?.exchange_detail?.name ||
              staff?.collaborator_detail?.name ||
              staff?.collaborator_name ||
              (staff?.employee_id
                ? `#${staff.employee_id}`
                : staff?.exchange_id
                  ? `#${staff.exchange_id}`
                  : staff?.collaborator_id
                    ? `#${staff.collaborator_id}`
                    : '-')}
          </div>
          <div className="text-content-dark-3 typo-body-small-regular mt-1">
            {[branchName, blockName, departmentName].filter(Boolean).join(' - ')}
          </div>
        </div>
      </Table.Cell>
      <Table.Cell className="border-border-1 typo-body-base-regular border-r py-2 pr-8 pl-3 text-right align-middle">
        <div className="py-2">{percentage}%</div>
      </Table.Cell>
      <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-right align-middle">
        <div className="py-2">{formatCurrencyVND(thanhTienDTBDS)}</div>
      </Table.Cell>
      <Table.Cell className="border-border-1 typo-body-base-regular border-r py-2 pr-8 pl-3 text-right align-middle">
        <div className="py-2">{dealPct}%</div>
      </Table.Cell>
      <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-right align-middle">
        <div className="py-2">{formatCurrencyVND(thanhTienDTCaNhan)}</div>
      </Table.Cell>
    </Table.Row>
  )
}

const RefundBookingForm = ({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit = false,
}: RefundBookingFormProps) => {
  const form = useForm<RefundBookingFormValues>({
    resolver: zodResolver(refundBookingFormSchema) as Resolver<RefundBookingFormValues>,
    defaultValues: {
      booking_date: new Date(),
      ...initialValues,
    },
  })

  const {
    register,
    control,
    handleSubmit: formHandleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = form

  // Xem docs/ai/conventions.md § Chống double-submit. Form này được dùng ở 4 chỗ,
  // trong đó modal mở qua `displayFormContent` KHÔNG re-render khi prop `isSubmitting`
  // đổi (dialog snapshot JSX một lần) — nên cờ nội bộ của RHF là thứ duy nhất
  // hiển thị được loading ở modal đó.
  const isBusy = isSubmitting || isFormSubmitting

  useScrollToError(errors)

  const watchBookingAmount = watch('booking_amount')
  const watchBookingId = watch('booking_id')
  const { bankOptions } = useBankOptions(watch('refund_bank_name'))

  const { data: bookingData } = useBooking(Number(watchBookingId))

  const {
    loadProjectOptions,
    loadProductInventoryOptions,
    loadBookingOptions,
    loadInitialBookingOptions,
    loadInitialProjectOptions,
    loadInitialProductInventoryOptions,
  } = useBookingContractLoadOptions()

  const watchCustomerId = watch('customer_id')

  // CR STT11: khối "Thông tin Khách Hàng" và "Nhân sự phụ trách bán" chỉ dựng sau khi
  // đã chọn hợp đồng đặt chỗ — cả hai đều được auto-fill từ chính booking đó.
  const hasBooking = Boolean(watchBookingId)

  const { data: customerDataById } = useCustomer(Number(watchCustomerId))

  // When a booking is selected, we might want to auto-fill some info
  useEffect(() => {
    if (watchBookingId && bookingData) {
      if (bookingData.payment_amount) {
        setValue('booking_amount', Number(bookingData.payment_amount), { shouldValidate: true })
      }
      if (bookingData.booking_date) {
        const date = new Date(bookingData.booking_date)
        if (!isNaN(date.getTime())) setValue('booking_date', date, { shouldValidate: true })
      }
      if (bookingData.project_detail?.id) {
        setValue('project_id', bookingData.project_detail.id, { shouldValidate: true })
      }
      if (bookingData.product_inventory_detail?.id) {
        setValue('product_inventory_id', bookingData.product_inventory_detail.id, {
          shouldValidate: true,
        })
      } else {
        setValue('product_inventory_id', null, {
          shouldValidate: true,
        })
      }
      if (bookingData.sales_staff?.[0]?.employee_detail?.id) {
        setValue('sales_employee_id', Number(bookingData.sales_staff[0].employee_detail.id), {
          shouldValidate: true,
        })
      }

      // Sync customer_id when booking changes. Serializer `Booking` chỉ phơi khách hàng qua
      // `customer_detail` — hai nhánh dự phòng cũ (`.customer?.id`, `.customer_id`) đọc field
      // không tồn tại, chỉ chạy được nhờ `as any` và luôn trả undefined.
      if (bookingData.customer_detail?.id) {
        setValue('customer_id', bookingData.customer_detail.id, { shouldValidate: true })
      }

      // Autofill bank info if payment method is transfer
      if (!isEdit && bookingData.payment_method === DepositContractPaymentMethod.transfer) {
        if (bookingData.source_account_holder_name) {
          setValue('sender_account_name', bookingData.source_account_holder_name, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          })
          setValue('refund_account_name', bookingData.source_account_holder_name, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          })
        }
        if (bookingData.source_account_number) {
          setValue('sender_account_number', bookingData.source_account_number, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          })
          setValue('refund_account_number', bookingData.source_account_number, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          })
        }
        if (bookingData.source_bank_name) {
          setValue('refund_bank_name', bookingData.source_bank_name, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          })
        }
      }
    }
  }, [bookingData, watchBookingId, setValue, isEdit])

  useEffect(() => {
    // `customerDataById` is the full Customer; `customer_detail` is CustomerNested, which
    // only carries id / customer_type / name / identify_number — the rest stays undefined.
    const targetCust: CustomerSource | undefined = customerDataById || bookingData?.customer_detail
    if (watchCustomerId && targetCust) {
      // Sync values for submission
      if (targetCust.id) setValue('customer_id', targetCust.id, { shouldValidate: true })

      const isBusiness = targetCust.customer_type === 'business'

      const name = isBusiness
        ? targetCust.business_name || targetCust.full_name || targetCust.name || ''
        : targetCust.name || targetCust.full_name || ''

      const cccd = isBusiness
        ? targetCust.business_tax_code || targetCust.id_number || targetCust.identify_number || ''
        : targetCust.id_number || targetCust.identify_number || ''

      const address = isBusiness
        ? targetCust.business_address || targetCust.address_detail || ''
        : targetCust.address_detail || ''

      // Only overwrite when the source actually carries the field — a partial payload
      // must never wipe a value the user already has in the form.
      setValue('customer_name', name, { shouldValidate: true })
      if (cccd) setValue('customer_cccd', cccd, { shouldValidate: true })
      if (targetCust.phone) setValue('customer_phone', targetCust.phone, { shouldValidate: true })
      if (address) setValue('customer_address', address, { shouldValidate: true })

      if (!isBusiness && targetCust.date_of_birth) {
        const dob = parseDateFromApi(targetCust.date_of_birth)
        if (dob) setValue('customer_dob', dob)
      }
    }
  }, [customerDataById, bookingData?.customer_detail, watchCustomerId, setValue])

  const [keptAttachmentIds, setKeptAttachmentIds] = useState<number[]>([])

  const handleSubmit = async (values: RefundBookingFormValues) => {
    try {
      await onSubmit({
        ...values,
        kept_attachment_ids: isEdit ? keptAttachmentIds : undefined,
      })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)} className="flex flex-col gap-6 px-10 py-4">
      {/* CR STT11 — "Hoàn tiền đặt chỗ": hợp đồng đặt chỗ đứng đầu form. Khối thông tin
          khách hàng và nhân sự bán nằm phía dưới và chỉ hiện sau khi chọn xong booking,
          vì dữ liệu của cả hai khối đó được auto-fill từ chính booking. */}
      <Flex direction="column" gap="4">
        <h3 className="text-text-primary-default text-lg font-semibold">Thông tin hợp đồng</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormController
            register={register}
            control={control}
            name="booking_id"
            Field={Select}
            fieldProps={{
              label: 'Mã giao dịch đặt chỗ',
              placeholder: 'Chọn giao dịch',
              loadOptions: loadBookingOptions,
              loadInitialOptions: loadInitialBookingOptions,
              enableSearch: true,
              searchPlaceholder: 'Tìm giao dịch...',
              required: true,
              disabled: isEdit,
            }}
          />
          <FormController
            register={register}
            control={control}
            name="project_id"
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Chọn Dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
              searchPlaceholder: 'Tìm dự án...',
              required: true,
            }}
          />
          <FormController
            register={register}
            control={control}
            name="product_inventory_id"
            Field={Select}
            fieldProps={{
              label: 'Mã bất động sản',
              placeholder: 'Chọn mã bất động sản',
              loadOptions: loadProductInventoryOptions,
              loadInitialOptions: loadInitialProductInventoryOptions,
              enableSearch: true,
              searchPlaceholder: 'Tìm mã bất động sản...',
            }}
          />
          <FormController
            register={register}
            control={control}
            name="booking_amount"
            Field={CurrencyInput}
            fieldProps={{ label: 'Số tiền đặt chỗ', placeholder: 'Nhập số tiền', required: true }}
          />
          <FormController
            register={register}
            control={control}
            name="booking_date"
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày đặt chỗ',
              required: true,
              disabledDays: { after: new Date() },
            }}
          />
          <FormController
            register={register}
            control={control}
            name="sender_account_name"
            Field={TextField}
            fieldProps={{
              label: 'Chủ tk người chuyển (đặt chỗ)',
              placeholder: 'Nhập tên chủ thẻ',
              required: true,
            }}
          />
          <FormController
            register={register}
            control={control}
            name="sender_account_number"
            Field={TextField}
            fieldProps={{
              label: 'Số tk người chuyển (đặt chỗ)',
              placeholder: 'Nhập STK',
              required: true,
            }}
          />
        </div>
      </Flex>

      <SeparatorHorizontal />

      {hasBooking && (
        <>
          <Flex direction="column" gap="4" data-testid="refund-customer-section">
            <h3 className="text-text-primary-default text-lg font-semibold">
              Thông tin Khách Hàng
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FormController
                register={register}
                control={control}
                name="customer_name"
                Field={TextField}
                fieldProps={{
                  label: 'Họ và tên người đề nghị',
                  placeholder: 'Nhập họ tên',
                  required: true,
                }}
              />
              <FormController
                register={register}
                control={control}
                name="customer_cccd"
                Field={TextField}
                fieldProps={{ label: 'CCCD/CMND', placeholder: 'Nhập CCCD', required: true }}
              />
              <FormController
                register={register}
                control={control}
                name="customer_phone"
                Field={PhoneInput}
                fieldProps={{
                  label: 'Số điện thoại',
                  placeholder: 'Nhập số điện thoại',
                  required: true,
                }}
              />
              <FormController
                register={register}
                control={control}
                name="customer_address"
                Field={TextField}
                fieldProps={{
                  label: 'Địa chỉ liên hệ',
                  placeholder: 'Nhập địa chỉ khách hàng',
                  required: true,
                }}
              />
            </div>
          </Flex>

          <SeparatorHorizontal />

          <Flex direction="column" gap="4" data-testid="refund-sales-staff-section">
            <h3 className="text-text-primary-default text-lg font-semibold">
              Nhân sự phụ trách bán
            </h3>
            <div className="border-border-1 overflow-hidden rounded-sm border">
              <Table.Root className="w-full border-collapse">
                <Table.Header className="border-border-1 bg-background-2 border-b">
                  <Table.Row>
                    <Table.ColumnHeaderCell
                      className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B]"
                      style={{ width: '350px' }}
                    >
                      Nhân viên
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell
                      className="border-border-1 typo-body-base-medium border-r py-3 pr-8 pl-3 text-right align-middle text-[#4B4B4B]"
                      style={{ width: '150px' }}
                    >
                      Tỷ lệ doanh thu
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell
                      className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
                      style={{ width: '200px' }}
                    >
                      Thành tiền doanh thu BĐS
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell
                      className="border-border-1 typo-body-base-medium border-r py-3 pr-8 pl-3 text-right align-middle text-[#4B4B4B]"
                      style={{ width: '150px' }}
                    >
                      Tỷ lệ Hoa hồng (%)
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell
                      className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
                      style={{ width: '200px' }}
                    >
                      Thành tiền doanh thu cá nhân
                    </Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(
                    bookingData?.sales_staff ||
                    initialValues?.sales_staff || [
                      {
                        employee_detail: initialValues?.sales_employee_detail,
                        participation_percentage: '100',
                        pct_commission: '0',
                        amt_commission: '0',
                      },
                    ]
                  ).map((staff: any, index: number) => (
                    <RefundStaffRow
                      key={index}
                      staff={staff}
                      bookingAmount={watchBookingAmount || initialValues?.booking_amount || 0}
                    />
                  ))}
                </Table.Body>
                <Table.Body className="bg-[#F7EBEB]">
                  <Table.Row>
                    <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-right align-middle">
                      Tổng
                    </Table.Cell>
                    <Table.Cell className="border-border-1 typo-body-base-semibold border-r py-4 pr-8 pl-3 text-right align-middle">
                      {(
                        bookingData?.sales_staff ||
                        initialValues?.sales_staff || [{ participation_percentage: '100' }]
                      ).reduce(
                        (sum: number, staff: any) =>
                          sum + Number(staff.participation_percentage || 0),
                        0
                      )}
                      %
                    </Table.Cell>
                    <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-right align-middle text-[#E5202B]">
                      {formatCurrencyVND(
                        (Number(watchBookingAmount || initialValues?.booking_amount || 0) *
                          Number(
                            (bookingData?.sales_staff || initialValues?.sales_staff)?.[0]
                              ?.pct_commission || 0
                          )) /
                          100
                      )}
                    </Table.Cell>
                    <Table.Cell className="border-border-1 typo-body-base-semibold border-r py-4 pr-8 pl-3 text-right align-middle">
                      {(bookingData?.sales_staff || initialValues?.sales_staff)?.[0]?.pct_commission
                        ? formatRatePct(
                            (bookingData?.sales_staff || initialValues?.sales_staff)[0]
                              .pct_commission
                          )
                        : ''}
                    </Table.Cell>
                    <Table.Cell className="border-border-1 typo-body-base-semibold px-3 py-4 text-right align-middle text-[#E5202B]">
                      {formatCurrencyVND(
                        (
                          bookingData?.sales_staff ||
                          initialValues?.sales_staff || [{ participation_percentage: '100' }]
                        ).reduce((sum: number, staff: any) => {
                          const pct = Number(staff.participation_percentage || 0)
                          const dealPct = Number(staff.pct_commission || 0)
                          const totalBDS =
                            (Number(watchBookingAmount || initialValues?.booking_amount || 0) *
                              dealPct) /
                            100
                          return sum + totalBDS * (pct / 100)
                        }, 0)
                      )}
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </div>
          </Flex>

          <SeparatorHorizontal />
        </>
      )}

      <Flex direction="column" gap="4">
        <h3 className="text-text-primary-default text-lg font-semibold">Thông tin hoàn tiền</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormController
            register={register}
            control={control}
            name="refund_amount"
            Field={CurrencyInput}
            fieldProps={{ label: 'Số tiền hoàn', placeholder: 'Nhập số tiền', required: true }}
          />
          <FormController
            register={register}
            control={control}
            name="refund_account_name"
            Field={TextField}
            fieldProps={{ label: 'Tên tài khoản nhận hoàn', required: true }}
          />
          <FormController
            register={register}
            control={control}
            name="refund_account_number"
            Field={TextField}
            fieldProps={{ label: 'Số tài khoản nhận hoàn', required: true }}
          />
          <FormController
            register={register}
            control={control}
            name="refund_bank_name"
            Field={Select}
            fieldProps={{
              label: 'Mở ngân hàng tại',
              required: true,
              placeholder: 'Chọn tên ngân hàng',
              options: bankOptions,
              enableSearch: true,
              searchPlaceholder: 'Tìm kiếm ngân hàng...',
            }}
          />
          <FormController
            register={register}
            control={control}
            name="refund_bank_branch"
            Field={TextField}
            fieldProps={{ label: 'Chi nhánh ngân hàng', required: true }}
          />
        </div>
      </Flex>

      <SeparatorHorizontal />

      <Flex direction="column" gap="4">
        <div className="lg:col-span-3">
          <FormController
            register={register}
            control={control}
            name="attachments"
            Field={FileUpload}
            fieldProps={{
              label: 'Tài liệu đính kèm',
              multiple: true,
              purpose: 'refund_booking_document',
              existingFiles: initialValues?.attachments || [],
              onKeptExistingIdsChange: setKeptAttachmentIds,
            }}
          />
        </div>
      </Flex>

      {(initialValues as any)?.confirmation_logs?.length > 0 && (
        <>
          <SeparatorHorizontal />
          <Flex direction="column" gap="4">
            <h3 className="text-text-primary-default text-lg font-semibold">
              Thông tin người xác nhận
            </h3>
            <ConfirmationLogsTable logs={(initialValues as any)?.confirmation_logs} />
          </Flex>
        </>
      )}

      <div className="flex justify-end gap-3 pb-8">
        <Button
          type="button"
          onClick={onCancel || (() => window.history.back())}
          variant="secondary"
          disabled={isBusy}
          className="min-w-[100px]"
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isBusy} loading={isBusy} className="min-w-[100px]">
          {isEdit ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  )
}

export default RefundBookingForm
