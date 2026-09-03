import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { Flex, Text } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { IconEye } from '@/assets/icons'
import type { components } from '@/api/schema.ts'

type Booking = components['schemas']['BookingDetail']
import { CustomerDetailCard } from '@/features/sales/components/CustomerDetailCard'
import { ProjectPreviewBox } from '@/features/sales/components/ProjectPreviewBox'
import { EmployeePreviewBox } from '@/features/sales/components/EmployeePreviewBox'
import { PaymentDetailGrid } from '@/features/sales/components/PaymentDetailGrid'
import { ConfirmationLogsTable } from '@/features/sales/components/ConfirmationLogsTable'
import { SalesStaffDetailTable } from '@/features/sales/components/SalesStaffDetailTable'
import { BOOKING_APPROVAL_STATUS_OPTIONS } from '@/features/project/booking-contract/types/booking-contract-types'
import Chip from '@/components/ui/chip/Chip.tsx'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils.ts'

import { DisplayField } from '@/components/commons/DisplayField'
import { useCustomer } from '@/services/sales-service'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { mapContractCustomerData } from '@/features/sales/utils/customer-mapper'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useBookingConfirmationLogs } from '@/services/sales-service'
import { useApiQuery } from '@/hooks/useApiQuery'
import { getRealEstateService, useProjectStaffs } from '@/services/realestate-service'
import { getActiveProjectStaff } from '@/features/sales/utils/projectStaffUtils'
import { BookingStatus } from '@/constants/api-schema-aliases'

type BookingContractDetailProps = {
  contract: Booking
}

const BookingContractDetail = ({ contract }: BookingContractDetailProps) => {
  const contractData = contract as Booking
  const piId = contract.product_inventory_detail?.id
  const projectId = contract.project_detail?.id

  const { data: staffsResponse } = useProjectStaffs(
    projectId ? { project: projectId } : undefined,
    { enabled: !!projectId }
  )
  const staffs = staffsResponse?.results || []

  const activeDirector =
    contract.project_director ||
    getActiveProjectStaff(staffs, 'project_director', contract.booking_date)
  const activeSecretary =
    contract.project_secretary ||
    getActiveProjectStaff(staffs, 'project_secretary', contract.booking_date)
  const { data: commissionData } = useApiQuery(
    ['realestate', 'product-inventories', piId, 'current-commission'],
    () => getRealEstateService().getProductInventoryCurrentCommission(piId!),
    { enabled: !!piId }
  )

  const { data: productDetail } = useApiQuery(
    ['realestate', 'product-inventories', piId],
    () => getRealEstateService().getProductInventory(piId!),
    { enabled: !!piId }
  )

  const currentCommission = commissionData?.current_commission
  const currentCommissionPctRevenue = currentCommission?.pct_revenue
  const currentCommissionAmtRevenue = currentCommission?.amt_revenue
  const revenueType: 'pct' | 'amt' =
    currentCommissionAmtRevenue != null && Number(currentCommissionAmtRevenue) > 0 ? 'amt' : 'pct'
  const saleCommissionType: 'pct' | 'amt' =
    currentCommission?.amt_sale_commission != null &&
    Number(currentCommission.amt_sale_commission) > 0
      ? 'amt'
      : 'pct'
  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.BOOKING.BOOKING_STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.BOOKING.PAYMENT_METHOD_CHOICES,
      APP_CONSTANT_KEY.SALES.BOOKING.TRANSFER_TO_ACCOUNT_CHOICES,
      APP_CONSTANT_KEY.SALES.BOOKING.APPROVAL_STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.BOOKING_SALE.SALE_TYPE_CHOICES,
    ],
  })

  const saleTypeLabel = (type: string) => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING_SALE.SALE_TYPE_CHOICES)
    return options?.find((opt: any) => opt.value === type)?.label || type
  }

  const getConstantLabel = (key: string, value: any, fallback?: string): string => {
    if (!value) return fallback || '-'
    const options = keysMapOptions.get(key) || []

    if (key === APP_CONSTANT_KEY.SALES.BOOKING.APPROVAL_STATUS_CHOICES) {
      const found =
        options.find((opt: any) => String(opt.value) === String(value)) ||
        BOOKING_APPROVAL_STATUS_OPTIONS.find((opt) => String(opt.value) === String(value))
      return found ? found.label : value
    }

    const option = options.find((opt: any) => String(opt.value) === String(value))
    return option ? option.label : value
  }

  // Fetch full customer data to get CCCD, Email, Address, etc.
  const { data: customerData } = useCustomer(contract.customer_detail?.id)

  const { data: confirmationLogsData } = useBookingConfirmationLogs(
    { booking: contract.id },
    { enabled: !!contract.id }
  )
  const confirmationLogs = confirmationLogsData?.results || []

  // Format dates
  const bookingDate = formatDate(contract.booking_date)

  // Status Chip mapping
  const getStatusVariant = (status: BookingStatus | string): ColoredValueVariant => {
    switch (status) {
      case 'new':
        return ColoredValueVariant.BLUE
      case BookingStatus.pending_approval:
        return ColoredValueVariant.YELLOW
      case BookingStatus.booked:
        return ColoredValueVariant.GREEN
      case BookingStatus.refunded:
        return ColoredValueVariant.RED
      case BookingStatus.converted_deposit:
        return ColoredValueVariant.BLUE
      case BookingStatus.transferred:
        return ColoredValueVariant.PURPLE
      default:
        return ColoredValueVariant.GREY
    }
  }

  const getApprovalStatusVariant = (status: string | undefined): ColoredValueVariant => {
    if (!status) return ColoredValueVariant.GREY
    switch (status) {
      case 'new':
      case 'draft':
        return ColoredValueVariant.BLUE
      case 'pending':
      case 'pending_confirm':
      case 'pending_manager':
      case 'pending_accountant':
      case 'pending_admin':
      case 'pending_admin_lead':
      case 'pending_approval':
        return ColoredValueVariant.YELLOW
      case 'approved':
        return ColoredValueVariant.GREEN
      case 'rejected':
        return ColoredValueVariant.RED
      default:
        return ColoredValueVariant.GREY
    }
  }

  return (
    <Flex direction="column" gap="5" className="px-10 py-4">
      {/* Thông tin hợp đồng */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin hợp đồng</Text>
        <div className="border-border-1 bg-surface-primary-default flex flex-col gap-6 rounded-xl border p-6">
          <Flex direction="column" gap="1">
            <Text className="text-content-dark-3 typo-body-base-medium">Mã hợp đồng</Text>
            <Text className="text-content-dark-1 typo-body-xl-semibold">
              {contract.code || '-'}
            </Text>
          </Flex>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <DisplayField label="Mã phiếu đặt cọc" value={contract.contract_number || '-'} />
            <DisplayField label="Số thứ tự ưu tiên" value={contract.priority_order || '-'} />

            <DisplayField label="Người tạo" value={contract.created_by?.fullname || '-'} />
            <DisplayField
              label="Trạng thái"
              value={
                <Flex gap="3" align="center">
                  <Chip
                    label={getConstantLabel(
                      APP_CONSTANT_KEY.SALES.BOOKING.BOOKING_STATUS_CHOICES,
                      contract.booking_status
                    )}
                    variant={getStatusVariant(contract.booking_status)}
                    size="small"
                  />
                </Flex>
              }
            />

            <DisplayField label="Ngày tạo" value={formatDate(contract.created_at)} />
            <DisplayField label="Ngày cập nhật cuối cùng" value={formatDate(contract.updated_at)} />
            <DisplayField
              label="Trạng thái phê duyệt"
              value={
                <Chip
                  label={getConstantLabel(
                    APP_CONSTANT_KEY.SALES.BOOKING.APPROVAL_STATUS_CHOICES,
                    contract.approval_status
                  )}
                  variant={getApprovalStatusVariant(contract.approval_status)}
                  size="small"
                />
              }
            />
            {(contract.transferred_to_booking_detail ||
              (contract as any).transferred_to_booking) && (
              <>
                <DisplayField
                  label="Chuyển nhượng sang Booking"
                  value={
                    contract.transferred_to_booking_detail?.code ||
                    (contract as any).transferred_to_booking?.code ||
                    // Fallback to purely ID if backend only returns the integer
                    (typeof (contract as any).transferred_to_booking === 'number'
                      ? `#${(contract as any).transferred_to_booking}`
                      : null) ||
                    '-'
                  }
                />
                <DisplayField
                  label="Số hợp đồng chuyển nhượng"
                  value={
                    contract.transferred_to_booking_detail?.contract_number ||
                    (contract as any).transferred_to_booking?.contract_number ||
                    '-'
                  }
                />
              </>
            )}
          </div>
          <div className="flex flex-col">
            <DisplayField label="Ghi chú" value={contract.note || '-'} />
          </div>
        </div>
      </Flex>

      {/* Thông tin người xác nhận */}
      <SeparatorHorizontal />

      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin người xác nhận</Text>
        <Flex direction="column" className="w-full">
          <ConfirmationLogsTable logs={confirmationLogs} />
        </Flex>
      </Flex>

      {/* Section Khách Hàng */}
      <SeparatorHorizontal />

      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin khách hàng</Text>
        <CustomerDetailCard customer={mapContractCustomerData(contract, customerData)} />
      </Flex>

      {/* Thông tin dự án */}
      <SeparatorHorizontal />

      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin dự án</Text>
        <ProjectPreviewBox
          projectData={contract.project_detail}
          projectDirector={activeDirector}
          projectSecretary={activeSecretary}
          targetDate={contract.booking_date}
        />
      </Flex>

      {/* Đầu mối dự án */}
      <SeparatorHorizontal />

      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Đầu mối dự án</Text>
        {activeDirector || activeSecretary ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activeDirector && (
              <EmployeePreviewBox employeeData={activeDirector} title="Giám đốc dự án" />
            )}
            {activeSecretary && (
              <EmployeePreviewBox employeeData={activeSecretary} title="Thư ký dự án" />
            )}
          </div>
        ) : (
          <Text className="typo-body-base-regular text-content-dark-3">
            Chưa có nhân sự nào được phân công
          </Text>
        )}
      </Flex>

      {productDetail && (
        <>
          <SeparatorHorizontal />
          <Flex direction="column" gap="4">
            <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin BĐS</Text>
            <div className="group border-border-1 bg-surface-secondary-default flex flex-col gap-6 rounded-xl border p-5 transition-colors hover:border-gray-300">
              <Flex direction="column" gap="1">
                <Text className="text-content-dark-3 typo-body-base-medium">Tên sản phẩm</Text>
                <div className="flex items-center gap-2">
                  <Text className="text-content-dark-1 typo-body-xl-semibold">
                    {productDetail.project?.name
                      ? `${productDetail.project.name} - ${productDetail.unit_number}`
                      : '-'}
                  </Text>
                  {productDetail.id && (
                    <Link
                      to={APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
                        ':id',
                        String(productDetail.id)
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-primary text-gray-400 transition-colors"
                      title="Xem chi tiết BĐS"
                    >
                      <IconEye size={18} />
                    </Link>
                  )}
                </div>
              </Flex>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <DisplayField label="Diện tích (m²)" value={productDetail.area || '---'} />
                <DisplayField
                  label="Giá niêm yết"
                  value={
                    productDetail.listed_price != null
                      ? `${formatCurrencyVND(productDetail.listed_price)} VNĐ`
                      : '---'
                  }
                />
                <DisplayField
                  label="Giá tạm tính"
                  value={
                    productDetail.fee_calculation_price != null
                      ? `${formatCurrencyVND(productDetail.fee_calculation_price)} VNĐ`
                      : '---'
                  }
                />
              </div>
            </div>
          </Flex>
        </>
      )}

      {/* Thông tin thanh toán */}
      <SeparatorHorizontal />

      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin thanh toán</Text>
        <PaymentDetailGrid
          paymentData={{
            payment_amount: contract.payment_amount,
            amount_label: 'Số tiền cọc',
            booking_date: bookingDate,
            date_label: 'Ngày đặt chỗ thiện chí',
            payment_method: getConstantLabel(
              APP_CONSTANT_KEY.SALES.BOOKING.PAYMENT_METHOD_CHOICES,
              contract.payment_method
            ),
            payment_method_value: contract.payment_method,
            transfer_to_account_label: getConstantLabel(
              APP_CONSTANT_KEY.SALES.BOOKING.TRANSFER_TO_ACCOUNT_CHOICES,
              contract.transfer_to_account
            ),
            source_account_holder_name: contractData.source_account_holder_name,
            source_account_number: contractData.source_account_number,
            source_bank_name: contractData.source_bank_name,
          }}
        />
      </Flex>
      <SeparatorHorizontal />

      {/* Section Nhân sự phụ trách bán */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Nhân sự phụ trách bán</Text>
        <Flex direction="column" className="w-full">
          <SalesStaffDetailTable
            salesStaff={contract.sales_staff || []}
            pctRevenue={currentCommissionPctRevenue ?? (contract as any)?.pct_revenue}
            amtRevenue={currentCommissionAmtRevenue ?? (contract as any)?.amt_revenue}
            revenueType={revenueType}
            feeCalculationPrice={Number(productDetail?.fee_calculation_price || 0)}
            commissionType={saleCommissionType}
            baseAmount={(() => {
              if (revenueType === 'amt') {
                return (
                  Number(currentCommissionAmtRevenue) || Number((contract as any)?.amt_revenue) || 0
                )
              }
              const feeCalcPrice = Number(productDetail?.fee_calculation_price || 0)
              const pctRevenueRaw = currentCommissionPctRevenue ?? (contract as any)?.pct_revenue
              const pctRevFraction =
                pctRevenueRaw !== undefined && pctRevenueRaw !== null
                  ? Number(pctRevenueRaw) / 100
                  : 1
              return feeCalcPrice * pctRevFraction
            })()}
            showSaleType={true}
            saleTypeLabel={saleTypeLabel}
            showConfirmationStatus={true}
          />
        </Flex>
      </Flex>

      <SeparatorHorizontal />

      <Flex direction="column">
        <AttachmentSection
          attachments={
            contract.attachments
              ? contract.attachments.map((item: any) => {
                  const file = item.attachment || item
                  return {
                    id: file.id,
                    file_name: file.file_name,
                    file_path: file.file_path,
                    size: file.size,
                    download_url: file.download_url,
                  }
                })
              : []
          }
          isRequired={false}
        />
      </Flex>
    </Flex>
  )
}

export default BookingContractDetail
