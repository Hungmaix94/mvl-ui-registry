import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import BrokerCertificateTable from '@/features/accounting/broker-certificates/view/BrokerCertificateTable.tsx'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import BrokerCertificateFilterForm, {
  type BrokerCertificateFilterFormRef,
} from '@/features/accounting/broker-certificates/_shares/components/BrokerCertificateFilterForm.tsx'
import BrokerCertificateRevokeDialog from '@/features/accounting/broker-certificates/_shares/components/BrokerCertificateRevokeDialog.tsx'
import {
  type BrokerCertificate,
  type GetBrokerCertificatesParams,
  useBrokerCertificates,
  useBrokerCertificatesExpiringSoon,
} from '@/features/accounting/broker-certificates/services/broker-certificate-service'
import type { BrokerCertificateFilterValues } from '@/features/accounting/broker-certificates/types/broker-certificate-types'

function buildApiParams(searchParams: URLSearchParams): GetBrokerCertificatesParams {
  const params: GetBrokerCertificatesParams = {}
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page
  const ps = parsePositiveInt(searchParams.get('page_size'))
  params.page_size = ps && PAGE_SIZES.includes(ps) ? ps : PAGE_SIZE
  const status = searchParams.get('status')
  if (status) params.status = status as GetBrokerCertificatesParams['status']
  const certType = searchParams.get('cert_type')
  if (certType) params.cert_type = certType as GetBrokerCertificatesParams['cert_type']
  const holder = parsePositiveInt(searchParams.get('holder_collaborator'))
  if (holder) params.holder_collaborator = holder
  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering
  return params
}

export default function BrokerCertificatePage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<BrokerCertificateFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<BrokerCertificate | null>(null)

  useEffect(() => {
    if (window.location.search === '' && searchParams.toString() === '') {
      const p = new URLSearchParams()
      p.set('page', '1')
      p.set('page_size', String(PAGE_SIZE))
      setSearchParams(p, { replace: true })
    }
    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apiParams = useMemo(
    () => (isUrlReady ? buildApiParams(searchParams) : undefined),
    [searchParams, isUrlReady]
  )
  const listQuery = useBrokerCertificates(apiParams, {
    enabled: isUrlReady && !isExpiringSoon && !!apiParams,
  })
  const expiringQuery = useBrokerCertificatesExpiringSoon(
    { page: apiParams?.page, page_size: apiParams?.page_size },
    { enabled: isUrlReady && isExpiringSoon }
  )
  const { data, isLoading, error, isFetching } = isExpiringSoon ? expiringQuery : listQuery

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/broker-certificates/export/',
    'chung-chi-moi-gioi.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const ps = parsePositiveInt(searchParams.get('page_size'))
  const pageSize = ps && PAGE_SIZES.includes(ps) ? ps : PAGE_SIZE

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    return { tableData: results, pageCount: Math.ceil(count / pageSize) || 1, totalRecords: count }
  }, [data, pageSize])

  const filterBadgeCount = useMemo(
    () =>
      ['status', 'cert_type', 'holder_collaborator'].filter((k) => !!searchParams.get(k)).length,
    [searchParams]
  )

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const p = new URLSearchParams(searchParams)
      p.set('page', String(pageIndex + 1))
      p.set('page_size', String(newPageSize))
      setSearchParams(p, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    const p = new URLSearchParams()
    p.set('page', '1')
    p.set('page_size', String(PAGE_SIZE))
    setSearchParams(p, { replace: true })
  }, [setSearchParams])

  const handleApplyFilter = useCallback(() => {
    const f = filterFormRef.current?.getValues()
    if (!f) return
    const p = new URLSearchParams()
    p.set('page', '1')
    p.set('page_size', String(pageSize))
    if (f.status) p.set('status', String(f.status))
    if (f.cert_type) p.set('cert_type', String(f.cert_type))
    if (f.holder_collaborator) p.set('holder_collaborator', String(f.holder_collaborator))
    setSearchParams(p, { replace: true })
    setIsFilterOpen(false)
  }, [pageSize, setSearchParams])

  const formInitialValues: Partial<BrokerCertificateFilterValues> = useMemo(
    () => ({
      status: searchParams.get('status'),
      cert_type: searchParams.get('cert_type'),
      holder_collaborator: searchParams.get('holder_collaborator')
        ? Number(searchParams.get('holder_collaborator'))
        : null,
    }),
    [searchParams]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Chứng chỉ môi giới (CTV)"
        handleFilter={isExpiringSoon ? undefined : () => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleCreateNew={
          ability.can('create', 'brokercertificate') && !isExpiringSoon
            ? () => navigate(APP_PATH.BROKER_CERTIFICATE_CREATE)
            : undefined
        }
        titleCreateNew="Thêm chứng chỉ"
        handleExportBtnFull={isExpiringSoon ? undefined : handleExport}
        titleExportBtnIcon="Xuất Excel"
        customActions={
          <Button
            type="button"
            variant={isExpiringSoon ? 'primary' : 'secondary'}
            onClick={() => {
              setIsExpiringSoon((v) => !v)
              handleClearAll()
            }}
          >
            {isExpiringSoon ? 'Tất cả chứng chỉ' : 'Sắp hết hạn'}
          </Button>
        }
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto pt-4 pb-6">
        <BrokerCertificateTable
          data={tableData}
          isLoading={isLoading || isFetching}
          error={error as Error | null}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onRevoke={isExpiringSoon ? undefined : setRevokeTarget}
          onClearFilter={handleClearAll}
          hasFilter={filterBadgeCount > 0}
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        content={
          <BrokerCertificateFilterForm ref={filterFormRef} initialValues={formInitialValues} />
        }
        onClearFilter={() => filterFormRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
      />
      <BrokerCertificateRevokeDialog target={revokeTarget} onClose={() => setRevokeTarget(null)} />
    </div>
  )
}
