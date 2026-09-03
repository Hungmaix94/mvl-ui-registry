import { FC, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Flex, Tabs } from '@radix-ui/themes'
import { PageTitle, Button } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  useDealWorkspace,
  useDealCommissionConfigList,
  useMarkCompletedDeal,
} from '@/features/sales/deals/services/deal-service'
import toastService from '@/services/toast-service.tsx'
import { useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/utils/error-utils'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useAbility } from '@/lib/ability'
import { useInvestorReconciliations } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import { useF2Reconciliations } from '@/features/sales/f2-reconciliations/services/f2-reconciliation-service'
import { useCTVReconciliations } from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-service'

// Tab 1 — General info (deal + deposit contract)
import { DealInfoBlock } from '@/features/sales/deal-v3/components/overview/DealInfoBlock'
import { CustomerContractBlock } from '@/features/sales/deal-v3/components/overview/CustomerContractBlock'
import { DealLifecycleBlock } from '@/features/sales/deal-v3/components/overview/DealLifecycleBlock'
import { DealPricingBlock } from '@/features/sales/deal-v3/components/overview/DealPricingBlock'

// Tab 2 — Cashflow tab (Section 04)
import { DealCashflowTab } from '@/features/sales/deal-v3/components/overview/DealCashflowTab'

// Tab 3 — Commission Breakdown tab (Sections 05, 06, 08)
import { DealCommissionTab } from '@/features/sales/deal-v3/components/overview/DealCommissionTab'

// Tab 4 — Reconciliation tab
import { DealReconciliationTab } from '@/features/sales/deals/components/DealReconciliationTab'

// Tab 5 — LAD tab
import { DealLadTab } from '@/features/sales/deals/components/DealLadTab'

// Tab 6 — Change history tab
import { DealHistoryTab } from '@/features/sales/deals/components/DealHistoryTab'
import { withRememberedSearch } from '@/utils/list-url-memory'

// ── Tab value constants ──────────────────────────────────────────────────────
const DEAL_TABS = {
  GENERAL: 'general',
  RECONCILIATIONS: 'reconciliations',
  LADS: 'lads',
  HISTORY: 'history',
} as const

type DealTabValue = (typeof DEAL_TABS)[keyof typeof DEAL_TABS]

const TAB_LABELS: Record<DealTabValue, string> = {
  [DEAL_TABS.GENERAL]: 'Thông tin chung',
  [DEAL_TABS.RECONCILIATIONS]: 'Đối chiếu',
  [DEAL_TABS.LADS]: 'Lô áp dụng',
  [DEAL_TABS.HISTORY]: 'Lịch sử',
}

// ── Page Component ───────────────────────────────────────────────────────────
const DealDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const dealId = Number(id)
  const ability = useAbility()

  const queryClient = useQueryClient()
  const hasWorkspacePermission = ability.can('workspace', 'deal')
  const { data: deal, isLoading, error } = useDealWorkspace(dealId)

  const activeTab =
    (hasWorkspacePermission && (searchParams.get('tab') as DealTabValue)) || DEAL_TABS.GENERAL

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true })
  }

  const isError = !!error
  const isNotFound = !!error && (error as any)?.response?.status === 404

  const handleShowHistory = () => {
    navigate(APP_PATH.DEAL_HISTORY.replace(':id', String(dealId)))
  }

  // Fetch reconciliation counts
  const canViewInv = ability.can('list', 'investor_reconciliation_sheet')
  const canViewF2 = ability.can('list', 'f2_reconciliation_sheet')
  const canViewCTV = ability.can('list', 'ctv_reconciliation_sheet')

  const { data: invData } = useInvestorReconciliations(
    { deal: dealId },
    { enabled: !!dealId && canViewInv && hasWorkspacePermission }
  )
  const { data: f2Data } = useF2Reconciliations(
    { deal: dealId },
    { enabled: !!dealId && canViewF2 && hasWorkspacePermission }
  )
  const { data: ctvData } = useCTVReconciliations(
    { deal: dealId },
    { enabled: !!dealId && canViewCTV && hasWorkspacePermission }
  )

  const reconCount = hasWorkspacePermission
    ? (invData?.results?.length || 0) +
      (f2Data?.results?.length || 0) +
      (ctvData?.results?.length || 0)
    : 0

  // Fetch LAD events count from commission config history
  const { data: configEnvelope } = useDealCommissionConfigList(dealId, {
    enabled: !!dealId && hasWorkspacePermission,
  })
  const configList = useMemo(() => {
    if (!configEnvelope) return []
    const rawData = (configEnvelope as any)?.data
    if (rawData) {
      if (Array.isArray(rawData)) {
        return rawData[0]?.history || []
      }
      return rawData?.history || []
    }
    if (Array.isArray(configEnvelope)) {
      return configEnvelope[0]?.history || []
    }
    return (configEnvelope as any)?.history || []
  }, [configEnvelope])
  const ladsCount = hasWorkspacePermission ? configList.length : 0

  const markCompletedMutation = useMarkCompletedDeal()

  const handleMarkCompleted = useCallback(async () => {
    try {
      await markCompletedMutation.mutateAsync({ id: dealId, data: { note: '' } })
      toastService.success('Hoàn tất giao dịch thành công')
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'detail', dealId] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'deals', 'workspace', dealId] })
    } catch (err: any) {
      toastService.error(extractErrorMessage(err, 'Không thể hoàn tất giao dịch'))
    }
  }, [dealId, markCompletedMutation, queryClient])

  // Header Actions
  const handleCreateTransactionSheet = useCallback(() => {
    const depositContractId = deal?.overview?.deposit_contract?.id
    if (depositContractId) {
      navigate(`${APP_PATH.TRANSACTION_SHEET_CREATE}?deposit_contract_id=${depositContractId}`)
    }
  }, [deal, navigate])

  const dealStatus = deal?.header?.deal_status || deal?.status

  return (
    <>
      <PageTitle
        enableBackButton
        handleBackButton={() => navigate(withRememberedSearch(APP_PATH.DEAL))}
        handleShowHistory={handleShowHistory}
        customActions={
          <Flex gap="2" align="center">
            {dealStatus === 'active' &&
              (ability.can('update', 'deal') || ability.can('manage', 'all')) && (
                <Button
                  variant="primary"
                  onClick={handleMarkCompleted}
                  loading={markCompletedMutation.isPending}
                >
                  Hoàn tất giao dịch
                </Button>
              )}

            <Button
              variant="primary"
              onClick={handleCreateTransactionSheet}
              disabled={!deal?.overview?.deposit_contract?.id}
            >
              Tạo TTGD
            </Button>
          </Flex>
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'deal')}
      >
        {deal && (
          <Flex direction="column" gap="5" className="px-10 py-4">
            <div className="bg-surface-primary-default min-h-[calc(100vh-140px)] w-full">
              <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
                <Tabs.List
                  size="2"
                  className="mb-5 flex flex-wrap gap-2 [&>button]:min-w-0 [&>button]:flex-[0_0_auto]"
                >
                  <Tabs.Trigger value={DEAL_TABS.GENERAL}>
                    {TAB_LABELS[DEAL_TABS.GENERAL]}
                  </Tabs.Trigger>

                  {hasWorkspacePermission && (
                    <>
                      <Tabs.Trigger value={DEAL_TABS.RECONCILIATIONS}>
                        <span className="flex items-center gap-1.5">
                          {TAB_LABELS[DEAL_TABS.RECONCILIATIONS]}
                          {reconCount > 0 && (
                            <span className="bg-surface-secondary-default text-content-dark-3 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold">
                              {reconCount}
                            </span>
                          )}
                        </span>
                      </Tabs.Trigger>

                      <Tabs.Trigger value={DEAL_TABS.LADS}>
                        <span className="flex items-center gap-1.5">
                          {TAB_LABELS[DEAL_TABS.LADS]}
                          {ladsCount > 0 && (
                            <span className="bg-surface-secondary-default text-content-dark-3 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold">
                              {ladsCount}
                            </span>
                          )}
                        </span>
                      </Tabs.Trigger>

                      <Tabs.Trigger value={DEAL_TABS.HISTORY}>
                        {TAB_LABELS[DEAL_TABS.HISTORY]}
                      </Tabs.Trigger>
                    </>
                  )}
                </Tabs.List>

                {/* ── Tab 1: Thông tin chung ──────────────────────────────── */}
                <Tabs.Content value={DEAL_TABS.GENERAL} className="border-none p-0">
                  <Flex direction="column" gap="5">
                    <DealInfoBlock workspace={deal!} />
                    <CustomerContractBlock workspace={deal!} />
                    <DealLifecycleBlock workspace={deal!} />
                    <DealPricingBlock dealId={dealId} workspace={deal!} />
                    {hasWorkspacePermission && (
                      <>
                        <DealCashflowTab dealId={dealId} />
                        <DealCommissionTab dealId={dealId} />
                      </>
                    )}
                  </Flex>
                </Tabs.Content>

                {hasWorkspacePermission && (
                  <>
                    {/* ── Tab 2: Đối chiếu ──────────────────────── */}
                    <Tabs.Content value={DEAL_TABS.RECONCILIATIONS} className="border-none p-0">
                      <DealReconciliationTab
                        dealId={dealId}
                        dealCode={deal?.header?.deal_code || ''}
                      />
                    </Tabs.Content>

                    {/* ── Tab 3: Lô áp dụng ──────────────────────── */}
                    <Tabs.Content value={DEAL_TABS.LADS} className="border-none p-0">
                      <DealLadTab dealId={dealId} />
                    </Tabs.Content>

                    {/* ── Tab 4: Lịch sử ─────────────────────────── */}
                    <Tabs.Content value={DEAL_TABS.HISTORY} className="border-none p-0">
                      <DealHistoryTab dealId={dealId} />
                    </Tabs.Content>
                  </>
                )}
              </Tabs.Root>
            </div>
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default DealDetailPage
