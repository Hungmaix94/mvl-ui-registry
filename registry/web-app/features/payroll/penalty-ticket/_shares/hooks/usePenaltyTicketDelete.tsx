import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  useDeletePenaltyTicket,
  type PenaltyTicket,
} from '@/features/payroll/services/penalty-ticket-service'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'

/**
 * Hook for deleting penalty tickets with confirmation dialog
 */
export default function usePenaltyTicketDelete() {
  const queryClient = useQueryClient()
  const deleteMutation = useDeletePenaltyTicket()
  const { displayConfirm, displayClose, setLoading } = useDialog()

  const openDeleteDialog = (penaltyTicket: PenaltyTicket) => {
    displayConfirm({
      title: 'Xóa phiếu phạt',
      content: (
        <div className="flex flex-col gap-2">
          <p>
            Bạn có chắc chắn muốn xóa phiếu phạt của{' '}
            <strong>{penaltyTicket.employee?.fullname}</strong> không?
          </p>
        </div>
      ),
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteMutation.mutateAsync(penaltyTicket.id)
          toastService.success('Đã xóa phiếu phạt thành công!')

          // Invalidate queries to refresh list
          await queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.PAYROLL.PENALTY_TICKETS.LIST({}),
          })

          displayClose()
        } catch {
          // Error toast is handled by service layer
          setLoading(false)
        }
      },
    })
  }

  return {
    openDeleteDialog,
    isDeleting: deleteMutation.isPending,
  }
}
