import { FC, useRef } from 'react'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams } from 'react-router-dom'
import toastService from '@/services/toast-service'
import { PageTitle } from '@/components/ui'
import BookingContractForm, {
  BookingContractFormRef,
} from '@/features/project/booking-contract/components/BookingContractForm'
import { BookingContractFormValues } from '@/features/project/booking-contract/types/booking-contract-types'
import { useBooking, usePartialUpdateBooking } from '@/services/sales-service'
import { BookingRefundSaleSale_type, type components } from '@/api/schema'
import {
  CtvLineType,
  DepositContractPaymentMethod,
  BookingStatus,
} from '@/constants/api-schema-aliases'
import { handleApiError, extractErrorMessage } from '@/utils/error-utils'
import { useDialog } from '@/hooks/useDialog'
import RefundBookingForm from '@/features/project/refund-booking/components/RefundBookingForm'
import { useCreateBookingRefund } from '@/services/sales-service'
import { Button } from '@/components/ui'
import { useApiQuery } from '@/hooks/useApiQuery'
import { getRealEstateService } from '@/services/realestate-service'
import { formatDateToApi } from '@/utils/date-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'

const BookingContractEditPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const formRef = useRef<BookingContractFormRef>(null)

  const { data: detailData, isLoading, refetch } = useBooking(Number(id))
  const { mutateAsync: partialUpdateBooking } = usePartialUpdateBooking()
  const { mutateAsync: createRefund } = useCreateBookingRefund()
  const { displayFormContent, displayClose } = useDialog()

  const submitRefund = async (values: any) => {
    try {
      await createRefund(values)
      toastService.success('Đã tạo đề nghị hoàn tiền thành công')
      displayClose()
      refetch()
    } catch (err: any) {
      toastService.error(extractErrorMessage(err, 'Có lỗi xảy ra khi tạo đề nghị hoàn tiền'))
    }
  }

  // Chặn double-submit ở mức đồng bộ (§4.3c). Ở modal này KHÔNG truyền được cờ
  // `isSubmitting` xuống form: `displayFormContent` snapshot JSX một lần, prop đổi
  // sau đó không tới được form. Phần hiển thị loading do `formState.isSubmitting`
  // nội bộ của RefundBookingForm lo; ref guard dưới đây mới là cái chặn thật.
  const { submit: handleRefundSubmit } = useSubmitOnce(submitRefund)

  const openRefundModal = () => {
    if (!detailData) return

    displayFormContent({
      title: 'Đề nghị hoàn tiền đặt chỗ',
      // `size: 'full'` (max-w-[95vw]) thay cho mặc định `lg` của displayFormContent:
      // form hoàn tiền có lưới 3-4 cột và bảng nhân sự bán 5 cột, khung `lg` bóp chúng
      // xuống 1 cột và bảng bị cắt ngang.
      size: 'full',
      content: (
        <div className="max-h-[80vh] overflow-y-auto p-4">
          <RefundBookingForm
            initialValues={{
              booking_id: detailData.id,
              customer_id: detailData.customer_detail?.id,
              customer_name: detailData.customer_detail?.name,
              customer_cccd: (detailData.customer_detail as any)?.id_number,
              customer_phone: undefined,
              project_id: detailData.project_detail?.id,
              product_inventory_id: detailData.product_inventory_detail?.id,
              booking_amount: Number(detailData.payment_amount),
              booking_date: new Date(detailData.booking_date),
              sales_employee_id: detailData.sales_staff?.[0]?.employee_detail?.id,
              refund_amount: Number(detailData.payment_amount), // Default to full refund
            }}
            onSubmit={handleRefundSubmit}
          />
        </div>
      ),
      confirmText: '', // Form handled by RefundBookingForm buttons
      hideFooter: true,
    })
  }

  const updateBooking = async (data: BookingContractFormValues) => {
    try {
      if (
        data.product_inventory_id &&
        data.product_inventory_id !== detailData?.product_inventory_detail?.id
      ) {
        const product = await getRealEstateService().getProductInventory(data.product_inventory_id)
        if (product.status && product.status !== 'available') {
          formRef.current?.setError('product_inventory_id', {
            type: 'manual',
            message: 'Sản phẩm đã được đặt chỗ hoặc không khả dụng.',
          })
          return
        }
      }

      const requestData: any = {
        customer_id: data.customer_id!,
        project_id: data.project_id,
        investor_id: data.investor_id,
        product_inventory_id: data.product_inventory_id,
        sales_allocation_id: data.sales_allocation ?? undefined,
        booking_date: formatDateToApi(data.booking_date) || undefined,
        payment_amount: data.payment_amount.toString(),
        payment_method: data.payment_method as DepositContractPaymentMethod,
        transfer_to_account: data.transfer_to_account as any,
        cust_customer_type: data.customer_type as any,
        cust_full_name: data.customer_name || undefined,
        cust_phone: data.customer_phone || undefined,
        cust_email: data.customer_email || undefined,
        cust_gender: data.customer_gender as any,
        cust_date_of_birth: formatDateToApi(data.customer_dob ?? undefined) || undefined,
        cust_id_number: data.customer_cccd || undefined,
        cust_id_issued_date:
          formatDateToApi(data.customer_id_issued_date ?? undefined) || undefined,
        cust_address_detail: data.customer_address || undefined,
        cust_ward: data.customer_ward_id || null,
        cust_province: data.customer_province_id || null,
        cust_business_name: data.business_name || undefined,
        cust_business_tax_code: data.business_tax_code || undefined,
        cust_business_representative: data.business_representative || undefined,
        cust_business_representative_title: data.business_representative_title || undefined,
        cust_business_address: data.business_address || undefined,
        cust_business_ward: data.business_ward_id || null,
        cust_business_province: data.business_province_id || null,
        source_account_holder_name: data.source_account_holder_name || undefined,
        source_account_number: data.source_account_number || undefined,
        source_bank_name: data.source_bank_name || undefined,
        note: data.notes,
        contract_number: data.contract_number,
        priority_order: data.priority_order ?? undefined,
        existing_files: {
          attachments: data.kept_attachment_ids || [],
        },
      }

      if (data.attachments && data.attachments.length > 0) {
        requestData.files = {
          attachments: data.attachments,
        }
      }

      if (data.sales_staff) {
        requestData.sales_staff = data.sales_staff.map((staff) => ({
          employee_id: staff.employee_id,
          participation_percentage: staff.participation_percentage || '0',
          sale_type:
            (staff.sale_type as BookingRefundSaleSale_type) || BookingRefundSaleSale_type.mv,
          exchange_id: (staff as any).exchange_id,
          collaborator_id: (staff as any).collaborator_id,
          collaborator_detail: (staff as any).collaborator_detail,
          // CTV line fields
          ctv_line_type: staff.ctv_line_type as CtvLineType | undefined,
          ctv_line_employee_id: staff.ctv_line_employee_id,
          ctv_line_department_id: staff.ctv_line_department_id,
          count_as_line_revenue: staff.count_as_line_revenue,
          // F2 source (partner line only) — forward the per-transaction source
          // picked in the sale-staff dialog, else it is silently dropped.
          f2_source: staff.f2_source ?? undefined,
          f2_source_director_id: staff.f2_source_director_id ?? undefined,
          pct_commission: staff.amt_commission != null ? null : staff.pct_commission || '0',
          amt_commission:
            staff.amt_commission != null && String(staff.amt_commission).trim() !== ''
              ? String(Math.round(Number(staff.amt_commission)))
              : null,
        }))
      }

      await partialUpdateBooking({
        id: Number(id),
        data: requestData,
      })
      toastService.success('Cập nhật hợp đồng đặt chỗ thành công')
      navigate(APP_PATH.PROJECT_BOOKING_CONTRACT)
    } catch (error: any) {
      if (formRef.current) {
        handleApiError(error, formRef.current.setError as any)
      } else {
        toastService.error(error?.message || 'Có lỗi xảy ra khi cập nhật hợp đồng')
      }
    }
  }

  // Chặn double-submit ở mức đồng bộ (§4.3c) — hai click nhanh sẽ bắn 2 PATCH nếu
  // chỉ dựa vào việc render lại để disable nút.
  const { submit: handleUpdateSubmit, isSubmitting } = useSubmitOnce(updateBooking)

  const piId = detailData?.product_inventory_detail?.id
  const { data: commissionData } = useApiQuery(
    ['realestate', 'product-inventories', piId, 'current-commission'],
    () => getRealEstateService().getProductInventoryCurrentCommission(piId!),
    { enabled: !!piId }
  )
  const currentCommission = commissionData?.current_commission

  if (isLoading) return <div>Loading...</div>
  if (!detailData) return <div>Không tìm thấy dữ liệu</div>

  const initialValues: Partial<BookingContractFormValues> & {
    investor_name?: string
    project_name?: string
    unit_number?: string
    sales_allocation_name?: string
  } = {
    is_edit_mode: true,
    status: detailData.booking_status as any,
    contract_number: detailData.contract_number,
    priority_order: detailData.priority_order,
    customer_id: detailData.customer_detail?.id,
    customer_type: detailData.cust_customer_type || ('individual' as any),
    customer_name: detailData.cust_full_name || detailData.customer_detail?.name || '',
    customer_dob: detailData.cust_date_of_birth
      ? new Date(detailData.cust_date_of_birth)
      : undefined,
    customer_gender: detailData.cust_gender,
    customer_cccd: detailData.cust_id_number || '',
    customer_id_issued_date: detailData.cust_id_issued_date
      ? new Date(detailData.cust_id_issued_date)
      : undefined,
    customer_address: detailData.cust_address_detail || '',
    customer_phone: detailData.cust_phone || undefined || '',
    customer_email: detailData.cust_email || '',
    customer_province_id: detailData.cust_province,
    customer_ward_id: detailData.cust_ward,

    // Business fields
    business_name: detailData.cust_business_name || '',
    business_tax_code: detailData.cust_business_tax_code || '',
    business_representative: detailData.cust_business_representative || '',
    business_representative_title: detailData.cust_business_representative_title || '',
    business_province_id: detailData.cust_business_province,
    business_ward_id: detailData.cust_business_ward,
    business_address: detailData.cust_business_address || '',
    investor_id: detailData.investor_detail?.id,
    investor_name: detailData.investor_detail?.name,
    project_id: detailData.project_detail?.id,
    project_name: detailData.project_detail?.name,
    sales_allocation: detailData.sales_allocation_detail?.id,
    sales_allocation_name: detailData.sales_allocation_detail?.code
      ? `${detailData.sales_allocation_detail.code} - ${detailData.sales_allocation_detail.name?.trim() || ''}`
      : undefined,
    product_inventory_id: detailData.product_inventory_detail?.id,
    unit_number: detailData.product_inventory_detail?.unit_number,
    fee_calculation_price:
      detailData.fee_calculation_price !== undefined && detailData.fee_calculation_price !== null
        ? Number(detailData.fee_calculation_price)
        : undefined,
    pct_sale_commission:
      currentCommission?.pct_sale_commission != null
        ? Number(currentCommission.pct_sale_commission)
        : undefined,
    revenue_type:
      currentCommission?.amt_revenue != null && Number(currentCommission.amt_revenue) > 0
        ? 'amt'
        : 'pct',
    pct_revenue:
      currentCommission?.pct_revenue != null ? Number(currentCommission.pct_revenue) : undefined,
    amt_revenue:
      currentCommission?.amt_revenue != null ? Number(currentCommission.amt_revenue) : undefined,
    booking_date: detailData.booking_date ? new Date(detailData.booking_date) : new Date(),
    payment_amount: detailData.payment_amount ? Number(detailData.payment_amount) : 0,
    payment_method: detailData.payment_method,
    transfer_to_account: detailData.transfer_to_account || undefined,

    sales_staff: detailData.sales_staff?.map((staff) => ({
      employee_id: staff.employee_detail?.id,
      employee_detail: staff.employee_detail,
      participation_percentage: staff.participation_percentage || '0',
      pct_commission: staff.pct_commission,
      amt_commission: staff.amt_commission,
      sale_type: staff.sale_type || 'mv',
      exchange_id: staff.exchange_detail?.id || null,
      exchange_detail: staff.exchange_detail,
      collaborator_id: staff.collaborator_detail?.id || null,
      collaborator_detail: staff.collaborator_detail,
      // CTV line fields
      ctv_line_type: staff.ctv_line_type,
      ctv_line_employee_id: staff.ctv_line_employee_id,
      ctv_line_department_id: staff.ctv_line_department_id,
      count_as_line_revenue: staff.count_as_line_revenue,
      // F2 source (partner line only) — hydrate so the edit dialog pre-fills the
      // existing per-transaction source instead of defaulting back to "linked".
      f2_source: (staff as any).f2_source,
      f2_source_director_id: (staff as any).f2_source_director_id,
      f2_source_director_detail: (staff as any).f2_source_director_detail,
    })) || [
      {
        employee_id: undefined as any,
        participation_percentage: '100',
        sale_type: BookingRefundSaleSale_type.mv,
        exchange_id: null,
      },
    ],
    sale_commission_type: detailData.sales_staff?.some((s) => Number(s.amt_commission) > 0)
      ? 'amt'
      : 'pct',
    total_commission_percentage: detailData.sales_staff?.reduce(
      (sum: number, staff: components['schemas']['BookingSale']) =>
        sum + Number(staff.participation_percentage || 0),
      0
    ),
    notes: detailData.note,
    source_account_holder_name: detailData.source_account_holder_name,
    source_account_number: detailData.source_account_number,
    source_bank_name: detailData.source_bank_name,
    attachments: [],
    attachments_detail: detailData.attachments || [],
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      <PageTitle
        idLabel={detailData?.code}
        enableBackButton
        customActions={
          detailData?.booking_status === BookingStatus.booked && (
            <Button variant="secondary" onClick={openRefundModal}>
              Hoàn tiền
            </Button>
          )
        }
      />

      <BookingContractForm
        ref={formRef}
        onSubmit={handleUpdateSubmit}
        initialValues={initialValues}
        isSubmitting={isSubmitting}
        isEdit={true}
      />
    </div>
  )
}

export default BookingContractEditPage
