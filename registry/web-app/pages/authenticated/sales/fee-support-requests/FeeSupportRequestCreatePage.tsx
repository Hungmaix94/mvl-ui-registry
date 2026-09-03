import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'

import FeeSupportRequestForm from '@/features/sales/fee-support-requests/components/FeeSupportRequestForm'
import {
  useCreateFeeSupportRequest,
  type FeeSupportRequestCreateRequest,
} from '@/features/sales/fee-support-requests/services/fee-support-request-service'
import { withRememberedSearch } from '@/utils/list-url-memory'

/**
 * Tạo đề xuất hỗ trợ phí từ web (origin=web_secretary — BE gán, phiếu vào thẳng
 * chờ TP Admin duyệt, D19). Lỗi validation ném lại cho form map vào field.
 */
export const FeeSupportRequestCreatePage = () => {
  const navigate = useNavigate()
  const createMutation = useCreateFeeSupportRequest()

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.FEE_SUPPORT_PROPOSAL))
  }, [navigate])

  const handleSubmit = useCallback(
    async (payload: FeeSupportRequestCreateRequest) => {
      const res = await createMutation.mutateAsync(payload)
      toastService.success('Tạo đề xuất hỗ trợ phí thành công')
      navigate(APP_PATH.FEE_SUPPORT_PROPOSAL_DETAIL.replace(':id', String(res.id)))
    },
    [createMutation, navigate]
  )

  return (
    <>
      <PageTitle
        title="Tạo đề xuất hỗ trợ phí bán hàng"
        enableBackButton
        handleBackButton={handleCancel}
      />
      <div className="bg-background-2 flex-grow">
        <FeeSupportRequestForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isPending={createMutation.isPending}
        />
      </div>
    </>
  )
}

export default FeeSupportRequestCreatePage
