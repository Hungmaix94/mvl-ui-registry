import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import {
  usePromotionDistribution,
  useUpdatePromotionDistribution,
  type ProjectPromotionDistribution,
} from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import PromotionDistributionDetail from '@/features/accounting/promotion-distributions/components/PromotionDistributionDetail'
import PromotionDistributionWorkflowActions from '@/features/accounting/promotion-distributions/components/PromotionDistributionWorkflowActions'
import PromotionDistributionFormDialog from '@/features/accounting/promotion-distributions/components/PromotionDistributionFormDialog'
import { usePromotionDistributionActions } from '@/features/accounting/promotion-distributions/hooks/usePromotionDistributionActions'
import type { PromotionDistributionFormValues } from '@/features/accounting/promotion-distributions/types/promotion-distribution-types'
import {
  PROMOTION_DISTRIBUTION_ACTIONS as A,
  PROMOTION_DISTRIBUTION_SUBJECT as SUBJECT,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function PromotionDistributionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ability = useAbility()
  const { displayCustom, displayClose } = useDialog()

  const canRetrieve = ability.can(A.RETRIEVE, SUBJECT)

  const {
    data: item,
    isLoading,
    error,
  } = usePromotionDistribution(Number(id), { enabled: !!id && canRetrieve })

  const updateMutation = useUpdatePromotionDistribution()
  // No explicit onChanged refetch — useApiMutation already calls
  // queryClient.invalidateQueries() on success, which refetches the active
  // detail query. Adding refetch() here triggered a duplicate GET detail.
  const actions = usePromotionDistributionActions()

  const handleBack = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.PROMOTION_DISTRIBUTION_TRACKING))
  }, [navigate])

  const handleEdit = useCallback(
    (record: ProjectPromotionDistribution) => {
      if (!ability.can(A.UPDATE, SUBJECT)) return
      const onEditSubmit = async (values: PromotionDistributionFormValues) => {
        await updateMutation.mutateAsync({
          id: record.id,
          data: {
            project: values.project,
            accounting_period: values.accounting_period,
            mkt_cutoff_date: values.mkt_cutoff_date,
            marketing_cost: values.marketing_cost,
            note: values.note ?? undefined,
            existing_files: { attachments: values.kept_attachment_ids ?? [] },
            ...(values.attachments && values.attachments.length > 0
              ? { files: { attachments: values.attachments } }
              : {}),
          },
        })
        displayClose()
        toastService.success('Đã cập nhật phiếu')
        // No explicit refetch — useApiMutation's global invalidate already refetches the detail.
      }
      displayCustom({
        title: 'Sửa dự án trong kỳ',
        size: 'md',
        hideFooter: true,
        content: (
          <PromotionDistributionFormDialog
            mode="edit"
            defaultValues={{
              project: record.project,
              accounting_period: record.accounting_period,
              mkt_cutoff_date: record.mkt_cutoff_date,
              marketing_cost: record.marketing_cost ?? '0',
              note: record.note ?? '',
              attachments: [],
              attachments_detail: record.attachments ?? [],
              kept_attachment_ids: (record.attachments ?? []).map((a) => a.id),
            }}
            onSubmit={onEditSubmit}
            onCancel={displayClose}
          />
        ),
      })
    },
    [ability, displayCustom, displayClose, updateMutation]
  )

  const isError = !!error
  const isNotFound =
    isError && (error as { response?: { status?: number } })?.response?.status === 404

  return (
    <>
      <PageTitle
        title={item?.project_name || 'Chi tiết bảng theo dõi doanh thu Xúc tiến'}
        idLabel={item?.code || ''}
        enableBackButton
        handleBackButton={handleBack}
        breadcrumb={[
          { label: 'Hoa hồng' },
          {
            label: 'Bảng theo dõi doanh thu Xúc tiến',
            href: APP_PATH.PROMOTION_DISTRIBUTION_TRACKING,
          },
          { label: 'Chi tiết phân chia', isCurrentPage: true },
        ]}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        hasPermission={canRetrieve}
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-6">
          {!isLoading && item && (
            <PromotionDistributionDetail
              item={item}
              headerActions={
                <PromotionDistributionWorkflowActions
                  item={item}
                  onEdit={handleEdit}
                  onRecompute={actions.recompute}
                  onConfirm={actions.confirm}
                  onVoid={actions.openVoid}
                  onReopen={actions.reopen}
                />
              }
            />
          )}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}
