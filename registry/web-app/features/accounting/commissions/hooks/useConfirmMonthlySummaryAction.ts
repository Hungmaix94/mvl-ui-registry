import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  useConfirmMonthlySummary,
  type MonthlySummaryRole,
  type MonthlyBeneficiaryCommissionSummaryDetail,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'

/**
 * Nút "Duyệt bảng kê" ở màn chi tiết hoa hồng tháng — dùng chung cho Sale / CTV / Sàn F2.
 *
 * Ba màn chi tiết trước đây mỗi màn tự viết lại đúng đoạn này, và invalidate khác nhau nên
 * duyệt xong quay ra danh sách vẫn thấy trạng thái cũ. Ở đây invalidate theo TIỀN TỐ
 * `['accounting', 'monthly-summaries', role]` để trúng cả ROLE_LIST lẫn ROLE_DETAIL, cộng
 * DETAIL chung — react-query khớp query key theo tiền tố nên một lệnh là đủ.
 */
export function useConfirmMonthlySummaryAction(
  summary: MonthlyBeneficiaryCommissionSummaryDetail,
  role: MonthlySummaryRole
) {
  const queryClient = useQueryClient()
  const confirmMutation = useConfirmMonthlySummary()

  const handleConfirm = useCallback(async () => {
    try {
      await confirmMutation.mutateAsync({
        role,
        id: summary.id,
        data: {
          year: summary.year,
          month: summary.month,
          beneficiary_type: summary.beneficiary_type,
          beneficiary_employee: summary.beneficiary_employee,
          beneficiary_collaborator: summary.beneficiary_collaborator,
          beneficiary_exchange: summary.beneficiary_exchange,
        },
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_ALL(role),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(summary.id),
      })
      toastService.success('Duyệt bảng kê thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [confirmMutation, queryClient, role, summary])

  return { handleConfirm, isConfirming: confirmMutation.isPending }
}
