import { FC } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui'
import { ChevronDown, Check, X, Trash2 } from 'lucide-react'
import {
  IconArrowbenddoubleupright,
  IconArrowbenddoubleupleft,
  IconBuildings,
} from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import type { components } from '@/api/schema'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { BookingContractStatus } from '@/features/project/booking-contract/types/booking-contract-types'
import { BookingTransferDialog } from './BookingTransferDialog'
import { getSaleService, useTransferBooking } from '@/services/sales-service'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { useDialog } from '@/hooks/useDialog'

type Booking = components['schemas']['Booking']

export type BookingContractActionMenuProps = {
  contract: Booking
  onRefund: () => void
  onApprove?: () => void
  onAccountantApprove?: () => void
  onAdminLeadApprove?: () => void
  onReject?: () => void
  onRejectApprove?: () => void
  onRejectAccountantApprove?: () => void
  onAdminLeadReject?: () => void
  onDelete?: () => void
}

const ActionButton = ({
  label,
  onClick,
  leftIcon,
  disabled = false,
}: {
  label: string
  onClick: () => void
  leftIcon: React.ReactNode
  disabled?: boolean
}) => (
  <Button
    variant="text"
    className="hover:bg-background-3 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
    onClick={onClick}
    leftIcon={leftIcon}
    disabled={disabled}
  >
    <span className="typo-body-base text-content-dark-1">{label}</span>
  </Button>
)

export const BookingContractActionMenu: FC<BookingContractActionMenuProps> = ({
  contract,
  onRefund,
  onApprove,
  onAccountantApprove,
  onAdminLeadApprove,
  onReject,
  onRejectApprove,
  onRejectAccountantApprove,
  onAdminLeadReject,
  onDelete,
}) => {
  const navigate = useNavigate()

  // Chỉ hiển thị các action chuyển đổi/hoàn tiền khi trạng thái là BOOKED và can_convert = true
  const showTransfer =
    (contract.booking_status as unknown as BookingContractStatus) ===
      BookingContractStatus.BOOKED && !!contract.can_convert
  const showRefund =
    (contract.booking_status as unknown as BookingContractStatus) === BookingContractStatus.BOOKED

  const { mutateAsync: transferBooking } = useTransferBooking()
  const queryClient = useQueryClient()
  const { displayFormContent, displayClose } = useDialog()

  const handleTransfer = async (data: { project_id: number; product_inventory_id: number }) => {
    try {
      await transferBooking({ id: contract.id, data })
      toastService.success('Chuyển hợp đồng đặt chỗ thành công')
      displayClose()
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES.BOOKINGS.LIST({}) })
    } catch (error: any) {
      toastService.error(error?.message || 'Có lỗi xảy ra khi chuyển hợp đồng')
    }
  }

  const handleNavigateToDepositContract = async () => {
    try {
      const latestBooking = await getSaleService().getBooking(contract.id)
      const latestStatus = latestBooking.booking_status as unknown as BookingContractStatus
      if (latestStatus !== BookingContractStatus.BOOKED || !latestBooking.can_convert) {
        toastService.error(
          'Phiếu đặt chỗ này đã được chuyển thành hợp đồng cọc hoặc không thể chuyển.'
        )
        return
      }
      navigate(`${APP_PATH.DEPOSIT_CONTRACT_CREATE}?booking_id=${contract.id}`)
    } catch (e: any) {
      toastService.error('Có lỗi xảy ra khi kiểm tra trạng thái phiếu đặt chỗ.')
    }
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="medium" rightIcon={<ChevronDown size={18} />}>
            Thao tác
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-max min-w-[240px] rounded-[3px] border-none bg-white p-2 shadow-lg"
        >
          <div className="flex flex-col">
            {onApprove && (
              <ActionButton
                label="Xác nhận phê duyệt"
                onClick={onApprove}
                leftIcon={<Check size={18} className="text-green-600" />}
              />
            )}
            {onAccountantApprove && (
              <ActionButton
                label="Kế toán phê duyệt"
                onClick={onAccountantApprove}
                leftIcon={<Check size={18} className="text-green-600" />}
              />
            )}
            {onAdminLeadApprove && (
              <ActionButton
                label="Quản lý xác nhận"
                onClick={onAdminLeadApprove}
                leftIcon={<Check size={18} className="text-green-600" />}
              />
            )}
            {onRejectAccountantApprove && (
              <ActionButton
                label="Kế toán từ chối"
                onClick={onRejectAccountantApprove}
                leftIcon={<X size={18} className="text-red-500" />}
              />
            )}
            {onRejectApprove && (
              <ActionButton
                label="Admin từ chối"
                onClick={onRejectApprove}
                leftIcon={<X size={18} className="text-red-500" />}
              />
            )}
            {onAdminLeadReject && (
              <ActionButton
                label="Quản lý từ chối"
                onClick={onAdminLeadReject}
                leftIcon={<X size={18} className="text-red-500" />}
              />
            )}
            {onReject && (
              <ActionButton
                label="Từ chối"
                onClick={onReject}
                leftIcon={<X size={18} className="text-red-500" />}
              />
            )}

            {onDelete && (
              <ActionButton
                label="Xóa hợp đồng"
                onClick={onDelete}
                leftIcon={<Trash2 size={18} className="text-red-500" />}
              />
            )}

            {(onApprove ||
              onAccountantApprove ||
              onAdminLeadApprove ||
              onReject ||
              onRejectApprove ||
              onRejectAccountantApprove ||
              onAdminLeadReject ||
              onDelete) && <div className="bg-border-basic-1 my-1 h-px" />}

            {showTransfer && (
              <>
                <ActionButton
                  label="Chuyển sang hợp đồng cọc"
                  onClick={handleNavigateToDepositContract}
                  leftIcon={
                    <IconArrowbenddoubleupright size={18} className="text-content-dark-2" />
                  }
                />
                <ActionButton
                  label="Chuyển hợp đồng đặt chỗ"
                  onClick={() => {
                    displayFormContent({
                      title: 'Chuyển hợp đồng đặt chỗ',
                      description: 'Vui lòng chọn dự án và sản phẩm mới để chuyển.',
                      content: (
                        <BookingTransferDialog contract={contract} onTransfer={handleTransfer} />
                      ),
                      hideFooter: true,
                      confirmText: '',
                    })
                  }}
                  leftIcon={<IconBuildings size={18} className="text-content-dark-2" />}
                />
              </>
            )}

            {showRefund && (
              <>
                {showTransfer && <div className="bg-border-basic-1 mx-2 my-1 h-px" />}
                <ActionButton
                  label="Hoàn hợp đồng đặt chỗ"
                  onClick={onRefund}
                  leftIcon={<IconArrowbenddoubleupleft size={18} className="text-red-500" />}
                />
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
