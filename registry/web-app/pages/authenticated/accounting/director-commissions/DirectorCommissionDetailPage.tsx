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
  useDirectorCommission,
  usePartialUpdateDirectorCommission,
  type ProjectDirectorCommissionPeriod,
} from '@/features/accounting/director-commissions/services/director-commission-service'
import DirectorCommissionDetail from '@/features/accounting/director-commissions/components/DirectorCommissionDetail'
import DirectorCommissionLedgerTable from '@/features/accounting/director-commissions/components/DirectorCommissionLedgerTable'
import DirectorCommissionReceiptsTable from '@/features/accounting/director-commissions/components/DirectorCommissionReceiptsTable'
import DirectorCommissionWorkflowActions from '@/features/accounting/director-commissions/components/DirectorCommissionWorkflowActions'
import DirectorCommissionEditDialog from '@/features/accounting/director-commissions/components/DirectorCommissionEditDialog'
import { useDirectorCommissionActions } from '@/features/accounting/director-commissions/hooks/useDirectorCommissionActions'
import type { DirectorCommissionEditValues } from '@/features/accounting/director-commissions/types/director-commission-types'
import {
  DIRECTOR_COMMISSION_ACTIONS as A,
  DIRECTOR_COMMISSION_SUBJECT as SUBJECT,
} from '@/features/accounting/director-commissions/constants/director-commission-constants'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function DirectorCommissionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ability = useAbility()
  const { displayCustom, displayClose } = useDialog()

  const canRetrieve = ability.can(A.RETRIEVE, SUBJECT)

  const {
    data: item,
    isLoading,
    error,
  } = useDirectorCommission(Number(id), { enabled: !!id && canRetrieve })

  const partialUpdateMutation = usePartialUpdateDirectorCommission()
  // No explicit refetch — useApiMutation invalidates queries globally on success, which
  // refetches the active detail + ledger + receipts queries.
  const actions = useDirectorCommissionActions()

  const handleBack = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.DIRECTOR_COMMISSION_TRACKING))
  }, [navigate])

  const handleEdit = useCallback(
    (record: ProjectDirectorCommissionPeriod) => {
      if (!ability.can(A.PARTIAL_UPDATE, SUBJECT)) return
      const onEditSubmit = async (values: DirectorCommissionEditValues) => {
        await partialUpdateMutation.mutateAsync({
          id: record.id,
          data: {
            pct_payout: values.pct_payout,
            payout_override_amount: values.payout_override_amount,
            note: values.note ?? '',
          },
        })
        displayClose()
        toastService.success('Đã cập nhật kỳ hoa hồng')
      }
      displayCustom({
        title: 'Sửa mức chi kỳ hoa hồng',
        size: 'md',
        hideFooter: true,
        content: (
          <DirectorCommissionEditDialog
            defaultValues={{
              pct_payout: record.pct_payout ?? '',
              payout_override_amount: record.payout_override_amount ?? '',
              note: record.note ?? '',
            }}
            onSubmit={onEditSubmit}
            onCancel={displayClose}
          />
        ),
      })
    },
    [ability, displayCustom, displayClose, partialUpdateMutation]
  )

  const isError = !!error
  const isNotFound =
    isError && (error as { response?: { status?: number } })?.response?.status === 404

  return (
    <>
      <PageTitle
        title={item?.project_name || 'Chi tiết hoa hồng Giám đốc dự án'}
        idLabel={item?.code || ''}
        enableBackButton
        handleBackButton={handleBack}
        breadcrumb={[
          { label: 'Hoa hồng' },
          {
            label: 'Hoa hồng Giám đốc dự án',
            href: APP_PATH.DIRECTOR_COMMISSION_TRACKING,
          },
          { label: 'Chi tiết', isCurrentPage: true },
        ]}
        customActions={
          item ? (
            <DirectorCommissionWorkflowActions
              item={item}
              onEdit={handleEdit}
              onRecompute={actions.recompute}
              onConfirm={actions.confirm}
              onVoid={actions.openVoid}
              onReopen={actions.reopen}
            />
          ) : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        hasPermission={canRetrieve}
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-6">
          {!isLoading && item && (
            <>
              <DirectorCommissionDetail item={item} />
              <DirectorCommissionLedgerTable id={item.id} />
              <DirectorCommissionReceiptsTable id={item.id} />
            </>
          )}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}
