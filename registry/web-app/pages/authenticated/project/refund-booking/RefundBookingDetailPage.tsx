import { FC } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button, PageTitle } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import { TextArea } from '@/components/ui'
import {
  useRefundBookingDetail,
  useApproveRefundBooking,
  useRejectRefundBooking,
  useAccountantApproveRefundBooking,
  useAdminLeadApproveRefundBooking,
  useTreasurerConfirmRefundBooking,
} from '@/features/project/refund-booking/hooks/useRefundBookings'
import { useBooking, useCustomer } from '@/services/sales-service'
import {
  CustomerDetailCard,
  SharedCustomerData,
} from '@/features/sales/components/CustomerDetailCard'
import { ColoredValueVariant } from '@/api/schema.ts'
import Chip from '@/components/ui/chip/Chip.tsx'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import toastService from '@/services/toast-service.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { Flex, Text, Table } from '@radix-ui/themes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { ConfirmationLogsTable } from '@/features/sales/components/ConfirmationLogsTable'
import { APP_PATH } from '@/routes/AppRoute.constant'

import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'

import { DisplayField } from '@/components/commons/DisplayField'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import {
  RefundBookingStatus,
  REFUND_APPROVABLE_STATUSES,
  REFUND_REJECTABLE_STATUSES,
} from '@/features/project/refund-booking/constants/refund-booking-constants'
import { useAbility } from '@/lib/ability'

const RefundBookingDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const { displayFormContent, displayClose } = useDialog()
  const navigate = useNavigate()
  const refundId = Number(id)
  const { data: detailData, isLoading, error } = useRefundBookingDetail(refundId)

  const bookingId = detailData?.booking || 0
  const { data: bookingData, isLoading: isLoadingBooking } = useBooking(bookingId)

  // Fetch full customer data for the CustomerDetailCard.
  // `BookingRefund.customer` là FK dạng số; serializer `Booking` KHÔNG có field `customer`
  // (chỉ `customer_detail`), nên nhánh `(bookingData as any)?.customer` trước đây luôn undefined.
  const customerId = detailData?.customer ?? bookingData?.customer_detail?.id
  const { data: customerData } = useCustomer(customerId || 0)

  const { mutateAsync: approveRefund } = useApproveRefundBooking()
  const { mutateAsync: rejectRefund } = useRejectRefundBooking()
  const { mutateAsync: accountantApproveRefund } = useAccountantApproveRefundBooking()
  const { mutateAsync: adminLeadApproveRefund } = useAdminLeadApproveRefundBooking()
  const { mutateAsync: treasurerConfirmRefund } = useTreasurerConfirmRefundBooking()

  const ability = useAbility()

  const isNotFound = !!error && (error as any)?.response?.status === 404

  type ApprovalAction =
    | 'approve'
    | 'admin-lead-approve'
    | 'accountant-approve'
    | 'treasurer-confirm'
    | 'reject'

  const openApprovalModal = (action: ApprovalAction) => {
    let note = ''
    const isReject = action === 'reject'

    let title = 'Xác nhận xử lý'
    if (action === 'approve') title = 'Duyệt yêu cầu hoàn tiền'
    if (action === 'admin-lead-approve') title = 'Admin Lead duyệt yêu cầu'
    if (action === 'accountant-approve') title = 'Kế toán duyệt yêu cầu'
    if (action === 'treasurer-confirm') title = 'Thủ quỹ xác nhận hoàn tiền'
    if (isReject) title = 'Từ chối yêu cầu hoàn tiền'

    displayFormContent({
      title,
      description: 'Vui lòng nhập ghi chú cho quyết định này',
      content: (
        <div className="p-4">
          <TextArea
            label="Ghi chú"
            placeholder="Nhập lý do/ghi chú..."
            onChange={(value) => {
              note = value
            }}
            rows={4}
          />
        </div>
      ),
      confirmText: isReject ? 'Từ chối' : 'Phê duyệt',
      cancelText: 'Hủy',
      onConfirm: async () => {
        if (isReject && !note.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          return
        }

        try {
          if (action === 'approve') {
            await approveRefund({ id: refundId, data: { note } })
          } else if (action === 'admin-lead-approve') {
            await adminLeadApproveRefund({ id: refundId, data: { is_approved: true, note } })
          } else if (action === 'accountant-approve') {
            await accountantApproveRefund({ id: refundId, data: { is_approved: true, note } })
          } else if (action === 'treasurer-confirm') {
            await treasurerConfirmRefund({ id: refundId, data: { note } })
          } else if (action === 'reject') {
            await rejectRefund({ id: refundId, data: { note } })
          }

          toastService.success(`Đã xử lý thành công đề nghị`)
          displayClose()
          navigate(APP_PATH.PROJECT_REFUND_BOOKING)
        } catch (error) {
          toastService.error('Có lỗi xảy ra khi xử lý phê duyệt')
        }
      },
    })
  }

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.BOOKING_REFUND.STATUS_CHOICES],
  })

  const getStatusLabel = (status: string) => {
    const labels = keysMap.get(APP_CONSTANT_KEY.SALES.BOOKING_REFUND.STATUS_CHOICES) as
      | Record<string, string>
      | undefined
    return labels?.[status] || status
  }

  const getStatusVariant = (status: string): ColoredValueVariant => {
    switch (status) {
      case RefundBookingStatus.PENDING_CONFIRM:
      case RefundBookingStatus.PENDING_ADMIN:
      case RefundBookingStatus.PENDING_ADMIN_LEAD:
      case RefundBookingStatus.PENDING_ACCOUNTANT:
      case RefundBookingStatus.PENDING_TREASURER:
        return ColoredValueVariant.YELLOW
      case RefundBookingStatus.APPROVED:
      case RefundBookingStatus.COMPLETED:
        return ColoredValueVariant.GREEN
      case RefundBookingStatus.REJECTED:
        return ColoredValueVariant.RED
      default:
        return ColoredValueVariant.GREY
    }
  }

  // `status` giờ cùng kiểu với các hằng trạng thái (đều lấy từ enum schema) nên không còn
  // phải `as string` từng phần tử để so sánh được.
  const status = detailData?.status

  const canApprove =
    (!!status &&
      REFUND_APPROVABLE_STATUSES.includes(status) &&
      ability.can('approve', 'booking_refund')) ||
    (status === RefundBookingStatus.PENDING_ADMIN_LEAD &&
      ability.can('admin_lead_approve', 'booking_refund')) ||
    (status === RefundBookingStatus.PENDING_ACCOUNTANT &&
      ability.can('accountant_approve', 'booking_refund')) ||
    (status === RefundBookingStatus.PENDING_TREASURER &&
      ability.can('treasurer_confirm', 'booking_refund'))

  const canReject =
    ability.can('reject', 'booking_refund') &&
    !!status &&
    REFUND_REJECTABLE_STATUSES.includes(status)

  const getApproveAction = (): ApprovalAction => {
    switch (status) {
      case RefundBookingStatus.PENDING_ADMIN_LEAD:
        return 'admin-lead-approve'
      case RefundBookingStatus.PENDING_ACCOUNTANT:
        return 'accountant-approve'
      case RefundBookingStatus.PENDING_TREASURER:
        return 'treasurer-confirm'
      default:
        return 'approve'
    }
  }

  return (
    <>
      <PageTitle
        idLabel={detailData?.code}
        enableBackButton
        customActions={
          <Flex gap="2">
            {canReject && (
              <Button
                variant="secondary"
                className="border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => openApprovalModal('reject')}
              >
                Từ chối
              </Button>
            )}
            {canApprove && (
              <Button variant="primary" onClick={() => openApprovalModal(getApproveAction())}>
                Phê duyệt
              </Button>
            )}
          </Flex>
        }
      />

      <DetailPageWrapper
        isLoading={isLoading || (!!bookingId && isLoadingBooking)}
        isNotFound={isNotFound}
        isError={!!error}
        hasPermission={ability.can('retrieve', 'booking_refund')}
      >
        {!isLoading && !(!!bookingId && isLoadingBooking) && detailData && (
          <Flex direction="column" gap="5" className="px-10 py-4">
            {/* CR STT11 — thứ tự khối bám theo form: hợp đồng đặt chỗ (nằm trong khối
                "Thông tin Nội bộ & Bất động sản") đứng trước, rồi mới tới thông tin
                khách hàng và nhân sự bán. */}
            <Flex direction="column" gap="4">
              <Text className="typo-body-xl-semibold text-content-dark-1">
                Thông tin Nội bộ & Bất động sản
              </Text>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <DisplayField label="Mã đề nghị hoàn tiền" value={detailData.code || '-'} />
                  <DisplayField
                    label="Mã giao dịch đặt chỗ"
                    value={
                      bookingData ? (
                        <a
                          href={APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL.replace(
                            ':id',
                            String(bookingData.id)
                          )}
                          className="text-brand-primary font-medium hover:underline"
                        >
                          {bookingData.code || `#${bookingData.id}`}
                        </a>
                      ) : (
                        '-'
                      )
                    }
                  />
                  <DisplayField
                    label="Nhân viên kinh doanh hỗ trợ"
                    value={
                      bookingData?.sales_staff?.[0]?.employee_detail?.fullname ||
                      detailData?.sales_staff?.[0]?.employee_detail?.fullname ||
                      '-'
                    }
                  />
                  <DisplayField
                    label="Chi nhánh - Khối - Phòng ban"
                    value={(() => {
                      const emp =
                        bookingData?.sales_staff?.[0]?.employee_detail ||
                        detailData?.sales_staff?.[0]?.employee_detail
                      if (emp) {
                        return [emp.branch?.name, emp.block?.name, emp.department?.name]
                          .filter(Boolean)
                          .join(' - ')
                      }
                      return '-'
                    })()}
                  />
                  <DisplayField
                    label="Dự án"
                    value={bookingData?.project_detail?.name ?? detailData.project_detail?.name}
                  />
                  <DisplayField
                    label="Sản phẩm đặt chỗ"
                    value={
                      bookingData?.product_inventory_detail?.unit_number ||
                      bookingData?.product_inventory_detail?.code ||
                      detailData.product_inventory_detail?.unit_number ||
                      detailData.product_inventory_detail?.code ||
                      '-'
                    }
                  />
                </div>
              </div>
            </Flex>

            <SeparatorHorizontal />

            <Flex direction="column" gap="4">
              <Text className="typo-body-xl-semibold text-content-dark-1">
                Thông tin Khách Hàng
              </Text>
              {(() => {
                const customerDetails: SharedCustomerData = {
                  id:
                    customerData?.id ||
                    bookingData?.customer_detail?.id ||
                    detailData?.customer_detail?.id ||
                    detailData?.customer,
                  customer_type:
                    customerData?.customer_type ||
                    bookingData?.customer_detail?.customer_type ||
                    detailData?.customer_detail?.customer_type ||
                    detailData?.cust_customer_type ||
                    'individual',
                  code:
                    customerData?.code ||
                    bookingData?.customer_detail?.code ||
                    detailData?.customer_detail?.code ||
                    '-',
                  name:
                    customerData?.full_name ||
                    customerData?.business_name ||
                    bookingData?.customer_detail?.name ||
                    detailData?.customer_detail?.name ||
                    detailData?.cust_full_name ||
                    detailData?.cust_business_name ||
                    '-',
                  identify_number:
                    customerData?.id_number ||
                    customerData?.business_tax_code ||
                    bookingData?.customer_detail?.identify_number ||
                    detailData?.customer_detail?.identify_number ||
                    detailData?.cust_id_number ||
                    detailData?.cust_business_tax_code ||
                    '-',
                  phone: customerData?.phone || detailData?.cust_phone || '-',
                  email: customerData?.email || detailData?.cust_email || '-',
                }
                return <CustomerDetailCard customer={customerDetails} />
              })()}
            </Flex>

            <SeparatorHorizontal />

            <Flex direction="column" gap="4">
              <Text className="typo-body-xl-semibold text-content-dark-1">
                Nhân sự phụ trách bán
              </Text>
              <Flex direction="column" className="w-full">
                {(() => {
                  const staffList = bookingData?.sales_staff ?? detailData?.sales_staff ?? []
                  return (
                    <Table.Root className="w-full border-collapse">
                      <Table.Header
                        className="border-border-1 bg-background-2 border-b"
                        style={{
                          ['--table-row-background-color' as never]: 'var(--color-background-2)',
                        }}
                      >
                        <Table.Row>
                          <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 px-4 py-3 text-left">
                            Nhân viên
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell
                            className="typo-body-base-medium text-content-dark-2 px-4 py-3 text-center"
                            style={{ width: '200px' }}
                          >
                            Tỷ lệ tham gia
                          </Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {staffList && staffList.length > 0 ? (
                          staffList.map((staff: any, index: number) => {
                            const nameContent = staff.employee_detail?.id ? (
                              <Link
                                to={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(
                                  ':id',
                                  String(staff.employee_detail.id)
                                )}
                                className="text-brand-primary hover:text-brand-secondary transition-colors"
                                target="_blank"
                              >
                                {staff.employee_detail.fullname || '-'}
                              </Link>
                            ) : (
                              staff.employee_detail?.fullname ||
                              staff.exchange_detail?.name ||
                              staff.collaborator_detail?.name ||
                              staff.collaborator_name ||
                              '-'
                            )
                            const branchInfo = [
                              staff.employee_detail?.branch?.name ||
                                staff.employee_detail?.branch_detail?.name,
                              staff.employee_detail?.block?.name ||
                                staff.employee_detail?.block_detail?.name,
                              staff.employee_detail?.department?.name ||
                                staff.employee_detail?.department_detail?.name,
                              staff.exchange_detail?.code,
                              staff.collaborator_detail?.code,
                              staff.collaborator_detail?.phone,
                            ]
                              .filter(Boolean)
                              .join(' - ')

                            const percentage = Number(
                              staff.participation_percentage || staff.percentage || 0
                            )

                            return (
                              <Table.Row
                                key={staff.employee_detail?.id || index}
                                className="border-border-1 border-b last:border-b-0"
                              >
                                <Table.Cell className="px-4 py-3 align-middle">
                                  <div className="flex flex-col">
                                    <span className="typo-body-base-regular">{nameContent}</span>
                                    {branchInfo && (
                                      <span className="text-content-dark-3 typo-body-small-regular mt-1">
                                        {branchInfo}
                                      </span>
                                    )}
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="typo-body-base-regular px-4 py-3 text-center align-middle">
                                  {percentage}%
                                </Table.Cell>
                              </Table.Row>
                            )
                          })
                        ) : (
                          <Table.Row>
                            <Table.Cell
                              colSpan={2}
                              className="text-content-dark-3 px-4 py-4 text-center"
                            >
                              Không có nhân sự phụ trách bán
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Root>
                  )
                })()}
              </Flex>
            </Flex>

            <SeparatorHorizontal />

            <Flex direction="column" gap="4">
              <Text className="typo-body-xl-semibold text-content-dark-1">
                Thông tin Giao Dịch & Hoàn Tiền
              </Text>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <DisplayField
                    label="Số tiền đặt chỗ"
                    value={formatCurrencyVND(
                      Number(bookingData?.payment_amount ?? detailData.booking_amount)
                    )}
                  />
                  <DisplayField
                    label="Ngày đặt chỗ"
                    value={formatDate(
                      bookingData?.booking_date ?? detailData.booking_date,
                      'dd/MM/yyyy'
                    )}
                  />
                  <div className="hidden lg:block" />
                  <div className="hidden lg:block" />

                  <DisplayField
                    label="Chủ TK người chuyển (đặt chỗ)"
                    value={detailData.sender_account_name}
                  />
                  <DisplayField
                    label="Số TK người chuyển (đặt chỗ)"
                    value={detailData.sender_account_number}
                  />
                  <div className="hidden lg:block" />
                  <div className="hidden lg:block" />

                  <DisplayField
                    label="Số tiền hoàn"
                    value={
                      <Text className="text-brand-primary font-semibold">
                        {formatCurrencyVND(Number(detailData.refund_amount))}
                      </Text>
                    }
                  />
                  <DisplayField
                    label="Tên tài khoản nhận hoàn"
                    value={detailData.receiver_account_name}
                  />
                  <DisplayField
                    label="Số tài khoản nhận hoàn"
                    value={detailData.receiver_account_number}
                  />
                  <DisplayField
                    label="Trạng thái"
                    value={
                      <Chip
                        label={getStatusLabel(detailData.status)}
                        variant={getStatusVariant(detailData.status)}
                        size="small"
                      />
                    }
                  />

                  <DisplayField label="Mở ngân hàng tại" value={detailData.receiver_bank_name} />
                  <DisplayField label="Chi nhánh" value={detailData.receiver_bank_branch} />
                  <div className="hidden lg:block" />

                  <DisplayField
                    label="Người tạo yêu cầu"
                    value={detailData.created_by_detail?.fullname || '-'}
                  />
                  <DisplayField
                    label="Ngày tạo yêu cầu"
                    value={formatDate(detailData.created_at)}
                  />
                  <DisplayField
                    label="Ngày cập nhật yêu cầu"
                    value={formatDate(detailData.updated_at)}
                  />
                </div>
              </div>
            </Flex>

            <SeparatorHorizontal />

            <Flex direction="column" gap="4">
              <Text className="typo-body-xl-semibold text-content-dark-1">
                Thông tin người xác nhận
              </Text>
              <Flex direction="column" className="w-full">
                <ConfirmationLogsTable logs={detailData.confirmation_logs ?? []} />
              </Flex>
            </Flex>

            <SeparatorHorizontal />

            <Flex direction="column" gap="4">
              <div className="flex flex-col">
                <AttachmentSection
                  attachments={
                    detailData.attachments?.map((file) => ({
                      id: file.id,
                      file_name: file.file_name,
                      file_path: file.file_path,
                      size: file.size,
                      download_url: file.download_url,
                    })) ?? []
                  }
                  isRequired={false}
                />
              </div>
            </Flex>
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default RefundBookingDetailPage
