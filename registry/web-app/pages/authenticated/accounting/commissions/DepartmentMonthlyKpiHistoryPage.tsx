import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle, Button, Table } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  useDepartmentCommissionPool,
  useDepartmentCommissionPoolHistories,
} from '@/features/accounting/department-commission-pools/services/department-commission-pools-service'
import { APP_PATH } from '@/routes'
import { format } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'
import { useAbility } from '@/lib/ability'

interface HistoryItem {
  log_id: number
  timestamp: string
  action: string
  full_name?: string
  username?: string
  changes?: Record<string, unknown>
}

export function DepartmentMonthlyKpiHistoryPage() {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const poolId = Number(id)
  const navigate = useNavigate()

  const {
    data: poolData,
    isLoading: isPoolLoading,
    error: poolError,
  } = useDepartmentCommissionPool(poolId)
  const {
    data: historiesData,
    isLoading: isHistoriesLoading,
    error: historyError,
  } = useDepartmentCommissionPoolHistories(poolId)

  const isLoading = isPoolLoading || isHistoriesLoading
  const isNotFound = !isLoading && !poolData && !!poolError
  const isError = !isLoading && (!!poolError || !!historyError) && !isNotFound

  const historyUrl = `${APP_PATH.DEPARTMENT_MONTHLY_KPI}/${poolId}`

  const breadcrumb = useMemo(() => {
    return [
      { label: 'Kế toán', href: '/accounting/dashboard' },
      { label: 'Hoa hồng quản lý' },
      { label: 'Hoa hồng quản lý khối back', href: APP_PATH.DEPARTMENT_MONTHLY_KPI },
      { label: poolData?.department_name || 'Chi tiết', href: historyUrl },
      { label: 'Lịch sử thay đổi' },
    ]
  }, [poolData, historyUrl])

  const historyColumns = useMemo<ColumnDef<HistoryItem>[]>(
    () => [
      {
        id: 'timestamp',
        header: 'Thời gian',
        size: 180,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-neutral-600">
            {logTimestamp(row.original.timestamp)}
          </span>
        ),
      },
      {
        id: 'action',
        header: 'Hành động',
        size: 200,
        cell: ({ row }) => (
          <span className="font-semibold text-neutral-800">{row.original.action || '—'}</span>
        ),
      },
      {
        id: 'operator',
        header: 'Người thực hiện',
        size: 180,
        cell: ({ row }) => (
          <span className="font-medium text-neutral-800">
            {row.original.full_name || row.original.username || 'Hệ thống'}
          </span>
        ),
      },
      {
        id: 'changes',
        header: 'Chi tiết thay đổi',
        size: 300,
        cell: ({ row }) => {
          const changes = row.original.changes
          if (!changes || Object.keys(changes).length === 0) {
            return <span className="text-neutral-400">—</span>
          }
          return (
            <span className="font-mono text-xs text-neutral-500">{JSON.stringify(changes)}</span>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={`Lịch sử thay đổi — ${poolData?.department_name || ''}`}
        breadcrumb={breadcrumb}
        toolbarLeftContent={
          <Button variant="secondary" onClick={() => navigate(historyUrl)}>
            Quay lại chi tiết
          </Button>
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'departmentcommissionpool')}
      >
        {poolData && (
          <div className="bg-background-2 flex-grow overflow-y-auto px-[28px] pt-[16px] pb-[80px]">
            <div className="border-border-1 bg-surface-primary-default flex flex-col overflow-hidden rounded-xl border">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <span className="typo-body-lg-semibold text-content-dark-1">Nhật ký thao tác</span>
              </div>
              {historiesData && historiesData.results?.length > 0 ? (
                <Table
                  columns={historyColumns}
                  data={historiesData.results as unknown as HistoryItem[]}
                  className="px-0"
                  tableContainerClassName="border-0"
                  bordered={false}
                  enablePagination={false}
                />
              ) : (
                <div className="p-8 text-center text-xs text-neutral-400">
                  Chưa ghi nhận lịch sử thao tác nào.
                </div>
              )}
            </div>
          </div>
        )}
      </DetailPageWrapper>
    </div>
  )
}

function logTimestamp(val: unknown): string {
  if (!val) return '—'
  try {
    return format(new Date(val as string), 'dd/MM/yyyy HH:mm')
  } catch {
    return String(val)
  }
}

export default DepartmentMonthlyKpiHistoryPage
