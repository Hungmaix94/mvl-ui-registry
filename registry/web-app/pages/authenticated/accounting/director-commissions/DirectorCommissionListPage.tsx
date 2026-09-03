import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import { parsePositiveInt } from '@/utils/common'
import { extractErrorMessage } from '@/utils/error-utils'
import { APP_PATH } from '@/routes'
import { PROJECT_DETAIL_TAB } from '@/constants/project'
import toastService from '@/services/toast-service'
import { getRealEstateService } from '@/services/realestate-service'
import MissingDirectorConfigDialogContent from '@/features/accounting/director-commissions/components/MissingDirectorConfigDialogContent'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import {
  useDirectorCommissions,
  useCreateDirectorCommission,
  type GetDirectorCommissionsParams,
  type ProjectDirectorCommissionPeriod,
} from '@/features/accounting/director-commissions/services/director-commission-service'
import DirectorCommissionTable from '@/features/accounting/director-commissions/components/DirectorCommissionTable'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import DirectorCommissionPeriodSelect from '@/features/accounting/director-commissions/components/DirectorCommissionPeriodSelect'
import DirectorCommissionFilterForm, {
  type DirectorCommissionFilterFormRef,
} from '@/features/accounting/director-commissions/components/DirectorCommissionFilterForm'
import DirectorCommissionFormDialog, {
  type DirectorCommissionFormValues,
} from '@/features/accounting/director-commissions/components/DirectorCommissionFormDialog'
import { useDirectorCommissionActions } from '@/features/accounting/director-commissions/hooks/useDirectorCommissionActions'
import {
  DIRECTOR_COMMISSION_ACTIONS as A,
  DIRECTOR_COMMISSION_DEP,
  DIRECTOR_COMMISSION_SUBJECT as SUBJECT,
} from '@/features/accounting/director-commissions/constants/director-commission-constants'

// Period-scoped list: load the whole period in one page (projects per period are few).
const PERIOD_PAGE_SIZE = 100

// Keywords that mean "the project has no director commission-rate config yet".
const MISSING_CONFIG_RE = /config|norm|rate|cấu hình|định mức|chưa có/i

export default function DirectorCommissionListPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const { displayCustom, displayClose } = useDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<DirectorCommissionFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const canList = ability.can(A.LIST, SUBJECT)
  const canCreate = ability.can(A.CREATE, SUBJECT)
  const canSelectPeriod = ability.can(
    DIRECTOR_COMMISSION_DEP.ACCOUNTING_PERIOD.action,
    DIRECTOR_COMMISSION_DEP.ACCOUNTING_PERIOD.subject
  )

  const { data: currentPeriod } = useCurrentAccountingPeriod({ enabled: canSelectPeriod })
  const { data: allPeriods } = useAllAccountingPeriods({ enabled: canSelectPeriod })
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const accountingPeriodFromUrl = parsePositiveInt(searchParams.get('accounting_period'))
  const statusFromUrl = useMemo(() => searchParams.getAll('status'), [searchParams])

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

  const apiParams = useMemo<GetDirectorCommissionsParams | undefined>(() => {
    if (!isUrlReady || !accountingPeriodFromUrl) return undefined
    const params: NonNullable<GetDirectorCommissionsParams> = {
      accounting_period: accountingPeriodFromUrl,
      page: 1,
      page_size: PERIOD_PAGE_SIZE,
    }
    if (statusFromUrl.length > 0) params.status__in = statusFromUrl
    return params
  }, [isUrlReady, accountingPeriodFromUrl, statusFromUrl])

  const { data, isLoading, isFetching, refetch } = useDirectorCommissions(apiParams, {
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

  const filterBadgeCount = useMemo(() => statusFromUrl.length, [statusFromUrl])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/director-commissions/export/',
    'hoa-hong-giam-doc.xlsx'
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
    if (Array.isArray(formData.status)) {
      formData.status.forEach((s) => newParams.append('status', s))
    }
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [accountingPeriodFromUrl, setSearchParams])

  const formInitialValues = useMemo(
    () => ({ status: statusFromUrl.length > 0 ? statusFromUrl : null }),
    [statusFromUrl]
  )

  const createMutation = useCreateDirectorCommission()

  // When the project has no director commission-rate config, the API rejects creation (409).
  // Offer to open that project's commission-config tab (new browser tab) to set it up first.
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
        `?tab=${PROJECT_DETAIL_TAB.COMMISSION}&configAction=create-staff-rate`

      displayCustom({
        title: 'Dự án chưa có định mức HH Giám đốc dự án',
        size: 'md',
        hideFooter: true,
        content: (
          <MissingDirectorConfigDialogContent
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
    async (values: DirectorCommissionFormValues) => {
      try {
        const created = await createMutation.mutateAsync({
          project: values.project,
          accounting_period: values.accounting_period,
          pct_payout: values.pct_payout ?? null,
          note: '',
        })
        displayClose()
        toastService.success('Đã tạo bản nháp')
        const newId = (created as ProjectDirectorCommissionPeriod | undefined)?.id
        if (newId) {
          navigate(APP_PATH.DIRECTOR_COMMISSION_TRACKING_DETAIL.replace(':id', String(newId)))
        } else {
          refetch()
        }
      } catch (err) {
        const message = extractErrorMessage(err)
        if (MISSING_CONFIG_RE.test(message)) {
          await showMissingConfigDialog(values.project)
          return
        }
        toastService.error(message)
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
        <DirectorCommissionFormDialog
          defaultValues={{ accounting_period: accountingPeriodFromUrl ?? undefined }}
          onSubmit={handleCreateSubmit}
          onCancel={displayClose}
        />
      ),
    })
  }, [canCreate, displayCustom, displayClose, accountingPeriodFromUrl, handleCreateSubmit])

  const actions = useDirectorCommissionActions({ onChanged: () => refetch() })

  const handleEdit = useCallback(
    (record: ProjectDirectorCommissionPeriod) => {
      // Editing the dials opens the detail page where the edit dialog lives.
      navigate(APP_PATH.DIRECTOR_COMMISSION_TRACKING_DETAIL.replace(':id', String(record.id)))
    },
    [navigate]
  )

  return (
    <>
      <PageTitle
        title="Hoa hồng Giám đốc dự án"
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={canCreate ? handleCreateNew : undefined}
        titleCreateNew="Thêm dự án vào kỳ"
      />

      <div className="flex flex-col gap-4 px-7 pt-1 pb-6">
        <p className="text-content-dark-3 text-sm">
          Danh sách dự án trong kỳ tính hoa hồng Giám đốc dự án. Click 1 dòng để xem sổ đối chiếu
          lũy kế và chi tiết chi/đòi lại.
        </p>

        <div className="flex items-center gap-4">
          <DirectorCommissionPeriodSelect
            periods={periods}
            selectedPeriodId={accountingPeriodFromUrl}
            onSelect={goToPeriod}
          />
          <span className="text-content-dark-2 text-sm">
            <span className="text-content-dark-1 font-semibold">{periodCount}</span> dự án trong kỳ
          </span>
        </div>

        <DirectorCommissionTable
          data={rows}
          isLoading={isLoading || isFetching}
          periodLabel={periodLabel}
          onEdit={handleEdit}
          onRecompute={actions.recompute}
          onConfirm={actions.confirm}
          onVoid={actions.openVoid}
          onReopen={actions.reopen}
        />

        {/* Calculation legend */}
        <div className="border-data-blue-default/30 bg-data-blue-disabled flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm">
          <span className="bg-data-blue-default text-content-light-1 mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold">
            i
          </span>
          <p className="text-content-dark-2 leading-relaxed">
            <span className="text-content-dark-1 font-semibold">Cách tính: </span>
            <br />
            <code className="bg-content-light-1/70 rounded px-1">
              Được hưởng lũy kế = Mức % × Tiền thực về lũy kế
            </code>
            <br />
            <code className="bg-content-light-1/70 rounded px-1">
              Số dư = Được hưởng − Đã chi (+ Còn nợ / − Chi lố)
            </code>
          </p>
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DirectorCommissionFilterForm ref={filterFormRef} initialValues={formInitialValues} />
        }
        onClearFilter={() => filterFormRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </>
  )
}
