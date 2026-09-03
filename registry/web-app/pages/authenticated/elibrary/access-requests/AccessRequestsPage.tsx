import { useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AccessRequestsTable from '@/features/elibrary/access-requests/view/AccessRequestsTable'
import {
  AccessRequestRole,
  type AccessRequestRoleValue,
} from '@/features/elibrary/access-requests/constants'
import {
  useElibraryAccessRequestsSummary,
  useElibraryItemAccessRequests,
} from '@/services/elibrary-service'

const ROLE_TABS = [
  { value: AccessRequestRole.owner, label: 'Tôi nhận' },
  { value: AccessRequestRole.requester, label: 'Tôi gửi' },
]

function parseRole(value: string | null): AccessRequestRoleValue {
  return value === AccessRequestRole.requester
    ? AccessRequestRole.requester
    : AccessRequestRole.owner
}

export default function AccessRequestsPage() {
  const { itemId: itemIdParam } = useParams()
  const itemId = parsePositiveInt(itemIdParam ?? null)
  const isItemScoped = !!itemId

  const [searchParams, setSearchParams] = useSearchParams()

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  // Item-scoped view is always the owner reviewing one item's requests.
  const role = isItemScoped ? AccessRequestRole.owner : parseRole(searchParams.get('role'))

  const params = useMemo(
    () => ({ page: currentPage, page_size: pageSize }),
    [currentPage, pageSize]
  )

  const summaryQuery = useElibraryAccessRequestsSummary(
    { ...params, role },
    { enabled: !isItemScoped }
  )
  const itemQuery = useElibraryItemAccessRequests(itemId ?? 0, params, { enabled: isItemScoped })

  const { data, isLoading, error, isFetching } = isItemScoped ? itemQuery : summaryQuery

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [data, pageSize])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleRoleChange = useCallback(
    (value: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('role', value)
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  return (
    <>
      <PageTitle
        title="Yêu cầu truy cập"
        tabs={isItemScoped ? undefined : ROLE_TABS}
        activeTab={isItemScoped ? undefined : role}
        onTabChange={isItemScoped ? undefined : handleRoleChange}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <AccessRequestsTable
          data={tableData}
          role={role}
          isLoading={isLoading || isFetching}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
        />
      </Flex>
    </>
  )
}
