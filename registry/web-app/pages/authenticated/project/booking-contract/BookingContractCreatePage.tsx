import { FC, useRef } from 'react'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import toastService from '@/services/toast-service'
import BookingContractForm, {
  BookingContractFormRef,
} from '@/features/project/booking-contract/components/BookingContractForm'
import { BookingContractFormValues } from '@/features/project/booking-contract/types/booking-contract-types'
import { useCreateBooking } from '@/services/sales-service'
import { BookingRefundSaleSale_type } from '@/api/schema'
import { CtvLineType, DepositContractPaymentMethod } from '@/constants/api-schema-aliases'
import { handleApiError } from '@/utils/error-utils'
import { formatDateToApi } from '@/utils/date-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'

import { getRealEstateService } from '@/services/realestate-service'

const BookingContractCreatePage: FC = () => {
  const navigate = useNavigate()
  const formRef = useRef<BookingContractFormRef>(null)
  const { mutateAsync: createBooking } = useCreateBooking()

  const submitBooking = async (data: BookingContractFormValues) => {
    try {
      if (data.product_inventory_id) {
        const product = await getRealEstateService().getProductInventory(data.product_inventory_id)
        if (product.status && product.status !== 'available') {
          formRef.current?.setError('product_inventory_id', {
            type: 'manual',
            message: 'Sản phẩm đã được đặt chỗ hoặc không khả dụng.',
          })
          return
        }
      }
      await createBooking({
        customer_id: data.customer_id!,
        project_id: data.project_id,
        investor_id: data.investor_id,
        product_inventory_id: data.product_inventory_id,
        sales_allocation_id: data.sales_allocation ?? undefined,
        booking_date: formatDateToApi(data.booking_date)!,
        payment_amount: data.payment_amount.toString(),
        payment_method: data.payment_method as DepositContractPaymentMethod,
        transfer_to_account: data.transfer_to_account as any,
        sales_staff: data.sales_staff.map((staff) => ({
          employee_id: staff.employee_id,
          participation_percentage: staff.participation_percentage || '0',
          sale_type:
            (staff.sale_type as BookingRefundSaleSale_type) || BookingRefundSaleSale_type.mv,
          exchange_id: (staff as any).exchange_id,
          collaborator_id: (staff as any).collaborator_id,
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
        })),
        cust_customer_type: data.customer_type as any,
        cust_full_name: data.customer_name || undefined,
        cust_phone: data.customer_phone || undefined,
        cust_email: data.customer_email || undefined,
        cust_gender: data.customer_gender as any,
        cust_date_of_birth: data.customer_dob ? formatDateToApi(data.customer_dob) : null,
        cust_id_number: data.customer_cccd || undefined,
        cust_id_issued_date: data.customer_id_issued_date
          ? formatDateToApi(data.customer_id_issued_date)
          : null,
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
        contract_number: data.contract_number || '',
        priority_order: data.priority_order ?? undefined,
        existing_files: {
          attachments: data.kept_attachment_ids || [],
        },
        ...(data.attachments &&
          data.attachments.length > 0 && {
            files: {
              attachments: data.attachments,
            },
          }),
      })
      toastService.success('Tạo hợp đồng đặt chỗ thành công')
      navigate(APP_PATH.PROJECT_BOOKING_CONTRACT)
    } catch (error: any) {
      if (formRef.current) {
        handleApiError(error, formRef.current.setError as any)
      } else {
        toastService.error(error?.message || 'Có lỗi xảy ra khi tạo hợp đồng')
      }
    }
  }

  // Chặn double-submit ở mức đồng bộ (§4.3c): click thứ hai bị bỏ qua ngay, không đợi
  // React render lại để disable nút — nếu không sẽ tạo 2 hợp đồng đặt chỗ trùng.
  const { submit: handleCreateSubmit, isSubmitting } = useSubmitOnce(submitBooking)

  return (
    <div className="flex flex-col gap-4 pb-12">
      <PageTitle title="Tạo hợp đồng đặt chỗ" enableBackButton />

      <BookingContractForm
        ref={formRef}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

export default BookingContractCreatePage
