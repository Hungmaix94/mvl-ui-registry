import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { IconBuildings } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import { parsePositiveInt } from '@/utils/common'
import { isConflictError } from '@/utils/error-utils'
import { APP_PATH } from '@/routes'
import { PROJECT_DETAIL_TAB } from '@/constants/project'
import toastService from '@/services/toast-service'
import { getRealEstateService } from '@/services/realestate-service'
import MissingPromotionConfigDialogContent from '@/features/accounting/promotion-distributions/components/MissingPromotionConfigDialogContent'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import {
  usePromotionDistributions,
  useBulkDraftPromotionDistributions,
  useCreatePromotionDistribution,
  useUpdatePromotionDistribution,
  type BulkDraftResult,
  type GetPromotionDistributionsParams,
  type ProjectPromotionDistribution,
} from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import PromotionDistributionBulkDraftResultDialog from '@/features/accounting/promotion-distributions/components/PromotionDistributionBulkDraftResultDialog'
import PromotionDistributionTable from '@/features/accounting/promotion-distributions/components/PromotionDistributionTable'
import PromotionDistributionPeriodSelect from '@/features/accounting/promotion-distributions/components/PromotionDistributionPeriodSelect'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import PromotionDistributionFilterForm, {
  type PromotionDistributionFilterFormRef,
} from '@/features/accounting/promotion-distributions/components/PromotionDistributionFilterForm'
import PromotionDistributionFormDialog from '@/features/accounting/promotion-distributions/components/PromotionDistributionFormDialog'
import { usePromotionDistributionActions } from '@/features/accounting/promotion-distributions/hooks/usePromotionDistributionActions'
import type { PromotionDistributionFormValues } from '@/features/accounting/promotion-distributions/types/promotion-distribution-types'
import {
  PROMOTION_DISTRIBUTION_ACTIONS as A,
  PROMOTION_DISTRIBUTION_DEP,
  PROMOTION_DISTRIBUTION_SUBJECT as SUBJECT,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

// Period-scoped list: load the whole period in one page (projects per period are few).
const PERIOD_PAGE_SIZE = 100

export default function PromotionDistributionListPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const { displayCustom, displayClose } = useDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<PromotionDistributionFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const canList = ability.can(A.LIST, SUBJECT)
  const canCreate = ability.can(A.CREATE, SUBJECT)
  const canSelectPeriod = ability.can(
    PROMOTION_DISTRIBUTION_DEP.ACCOUNTING_PERIOD.action,
    PROMOTION_DISTRIBUTION_DEP.ACCOUNTING_PERIOD.subject
  )

  // Load period info first: the "current" period seeds the default selection; the full list
  // (paged at 100 until exhausted) drives the period dropdown + prev/next switcher.
  const { data: currentPeriod } = useCurrentAccountingPeriod({ enabled: canSelectPeriod })
  const { data: allPeriods } = useAllAccountingPeriods({ enabled: canSelectPeriod })
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const accountingPeriodFromUrl = parsePositiveInt(searchParams.get('accounting_period'))
  const statusFromUrl = searchParams.get('status')

  useEffect(() => {
    setIsUrlReady(true)
  }, [])

  // Default the selected period to the CURRENT period (fallback: newest in the full list).
  useEffect(() => {
    if (accountingPeriodFromUrl) return
    const defaultPeriodId = currentPeriod?.id ?? periods[0]?.id
    if (!defaultPeriodId) return
    const newParams = new URLSearchParams(searchParams)
    newParams.set('accounting_period', String(defaultPeriodId))
    setSearchParams(newParams, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod, periods, accountingPeriodFromUrl])

  const apiParams = useMemo<GetPromotionDistributionsParams | undefined>(() => {
    if (!isUrlReady || !accountingPeriodFromUrl) return undefined
    const params: NonNullable<GetPromotionDistributionsParams> = {
      accounting_period: accountingPeriodFromUrl,
      page: 1,
      page_size: PERIOD_PAGE_SIZE,
    }
    if (statusFromUrl)
      params.status = statusFromUrl as NonNullable<GetPromotionDistributionsParams>['status']
    return params
  }, [isUrlReady, accountingPeriodFromUrl, statusFromUrl])

  const { data, isLoading, isFetching, refetch } = usePromotionDistributions(apiParams, {
    enabled: canList && isUrlReady && !!apiParams,
  })

  const rows = useMemo(() => data?.results ?? [], [data])
  const periodCount = data?.count ?? rows.length

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === accountingPeriodFromUrl),
    [periods, accountingPeriodFromUrl]
  )
  const periodLabel = selectedPeriod
    ? `${String(selectedPeriod.month).padStart(2, '0')}/${selectedPeriod.year}`
    : ''

  const filterBadgeCount = useMemo(() => (statusFromUrl ? 1 : 0), [statusFromUrl])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/promotion-distributions/export/',
    'phan-bo-khuyen-mai.xlsx'
  )
  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const goToPeriod = useCallback(
    (periodId: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('accounting_period', String(periodId))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return
    const newParams = new URLSearchParams()
    if (accountingPeriodFromUrl) newParams.set('accounting_period', String(accountingPeriodFromUrl))
    if (formData.status) newParams.set('status', String(formData.status))
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [accountingPeriodFromUrl, setSearchParams])

  const formInitialValues = useMemo(() => ({ status: statusFromUrl ?? null }), [statusFromUrl])

  // Create / edit dialogs
  const createMutation = useCreatePromotionDistribution()
  const updateMutation = useUpdatePromotionDistribution()

  // When the project has no promotion-commission config, the API rejects creation with 409.
  // Offer to open that project's "Cấu hình HH" tab (new browser tab) to set it up first.
  const showMissingConfigDialog = useCallback(
    async (projectId: number) => {
      let projectLabel = `#${projectId}`
      try {
        const project = await getRealEstateService().getProject(projectId)
        const label = [project?.code, project?.name].filter(Boolean).join(' - ')
        if (label) projectLabel = label
      } catch {
        // Keep the id-only fallback label.
      }

      const configUrl =
        APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(projectId)) +
        `?tab=${PROJECT_DETAIL_TAB.COMMISSION}&configAction=create`

      displayCustom({
        title: 'Dự án chưa có cấu hình hoa hồng',
        size: 'md',
        hideFooter: true,
        content: (
          <MissingPromotionConfigDialogContent
            projectLabel={projectLabel}
            onClose={displayClose}
            onOpenConfig={() => {
              window.open(configUrl, '_blank', 'noopener,noreferrer')
              displayClose()
            }}
          />
        ),
      })
    },
    [displayCustom, displayClose]
  )

  const handleCreateSubmit = useCallback(
    async (values: PromotionDistributionFormValues) => {
      try {
        const created = await createMutation.mutateAsync({
          project: values.project,
          accounting_period: values.accounting_period,
          mkt_cutoff_date: values.mkt_cutoff_date,
          marketing_cost: values.marketing_cost,
          ...(values.attachments && values.attachments.length > 0
            ? { files: { attachments: values.attachments } }
            : {}),
        })
        displayClose()
        toastService.success('Đã tạo bản nháp')
        const newId = (created as ProjectPromotionDistribution | undefined)?.id
        if (newId) {
          navigate(APP_PATH.PROMOTION_DISTRIBUTION_TRACKING_DETAIL.replace(':id', String(newId)))
        } else {
          refetch()
        }
      } catch (err) {
        if (isConflictError(err)) {
          await showMissingConfigDialog(values.project)
          return
        }
        // Let the form dialog surface validation / other errors.
        throw err
      }
    },
    [createMutation, displayClose, navigate, refetch, showMissingConfigDialog]
  )

  const handleCreateNew = useCallback(() => {
    if (!canCreate) return
    displayCustom({
      title: 'Thêm dự án vào kỳ',
      size: 'md',
      hideFooter: true,
      content: (
        <PromotionDistributionFormDialog
          mode="create"
          defaultValues={{ accounting_period: accountingPeriodFromUrl ?? undefined }}
          onSubmit={handleCreateSubmit}
          onCancel={displayClose}
        />
      ),
    })
  }, [canCreate, displayCustom, displayClose, accountingPeriodFromUrl, handleCreateSubmit])

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
        refetch()
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
    [ability, displayCustom, displayClose, updateMutation, refetch]
  )

  const actions = usePromotionDistributionActions({ onChanged: () => refetch() })

  // One button: draft every project that collected money in the selected period. The endpoint
  // is create-only + idempotent, so pressing it again later just adds the newcomers.
  const bulkDraftMutation = useBulkDraftPromotionDistributions()
  const canBulkDraft = ability.can(A.BULK_DRAFT, SUBJECT)

  const handleBulkDraft = useCallback(async () => {
    if (!canBulkDraft || !accountingPeriodFromUrl) return
    try {
      const result = (await bulkDraftMutation.mutateAsync({
        accounting_period: accountingPeriodFromUrl,
        // BE khai `marketing_cost` là `required=False, default=Decimal("0")`, nhưng
        // openapi-typescript coi property có `default` là bắt buộc trong type sinh ra. Gửi '0'
        // tường minh nên tương đương hệt bỏ trống — chi phí marketing của từng dự án được nhập
        // sau bằng PATCH, đúng như docstring của BulkDraftInputSerializer.
        marketing_cost: '0',
      })) as BulkDraftResult | undefined
      if (!result) return
      refetch()
      displayCustom({
        title: 'Kết quả thêm dự án vào kỳ',
        size: 'lg',
        hideFooter: true,
        content: (
          <PromotionDistributionBulkDraftResultDialog
            result={result}
            periodLabel={periodLabel}
            onClose={displayClose}
          />
        ),
      })
    } catch {
      toastService.error('Không thêm được dự án vào kỳ. Vui lòng thử lại.')
    }
  }, [
    canBulkDraft,
    accountingPeriodFromUrl,
    bulkDraftMutation,
    refetch,
    displayCustom,
    displayClose,
    periodLabel,
  ])

  return (
    <>
      <PageTitle
        title="Bảng theo dõi doanh thu Xúc tiến"
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleCreateNew={canCreate ? handleCreateNew : undefined}
        titleCreateNew="Thêm dự án vào kỳ"
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        customActions={
          canBulkDraft && accountingPeriodFromUrl ? (
            <Button
              size="small"
              variant="secondary-border"
              leftIcon={<IconBuildings className="h-4 w-4" />}
              onClick={handleBulkDraft}
              loading={bulkDraftMutation.isPending}
            >
              Thêm dự án có doanh thu
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 px-7 pt-1 pb-6">
        <p className="text-content-dark-3 text-sm">
          Danh sách dự án trong kỳ tính hoa hồng. Click 1 dòng để xem chi tiết phân chia HH cho từng
          loại xúc tiến.
        </p>

        {/* Period selector + count */}
        <div className="flex items-center gap-4">
          <PromotionDistributionPeriodSelect
            periods={periods}
            selectedPeriodId={accountingPeriodFromUrl}
            onSelect={goToPeriod}
          />
          <span className="text-content-dark-2 text-sm">
            <span className="text-content-dark-1 font-semibold">{periodCount}</span> dự án trong kỳ
          </span>
        </div>

        <PromotionDistributionTable
          data={rows}
          isLoading={isLoading || isFetching}
          periodLabel={periodLabel}
          onEdit={handleEdit}
          onRecompute={actions.recompute}
          onConfirm={actions.confirm}
          onVoid={actions.openVoid}
          onReopen={actions.reopen}
          onDelete={actions.remove}
        />

        {/* Calculation legend */}
        <div className="flex items-start gap-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm">
          <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
            i
          </span>
          <p className="text-content-dark-2 leading-relaxed">
            <span className="text-content-dark-1 font-semibold">Cách tính: </span>
            <br />
            <code className="rounded bg-white/70 px-1">
              Doanh thu = Tiền hàng × Tỷ lệ doanh thu
            </code>{' '}
            <br />{' '}
            <code className="rounded bg-white/70 px-1">
              DT tính HH = Doanh thu − Chi phí bán hàng
            </code>
            <br />
            Hoa hồng Phòng Xúc tiến được phân chia tiếp cho 5 loại xúc tiến trong màn chi tiết.
          </p>
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <PromotionDistributionFilterForm ref={filterFormRef} initialValues={formInitialValues} />
        }
        onClearFilter={() => filterFormRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </>
  )
}
