import { ColumnDef, Table, TableAction } from '@/components/ui'
import { useEffect, useMemo, useState } from 'react'
import { IconEye } from '@/assets/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { HistoriesPaths, useHistories } from '@/services/histories-service.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import TableError from '@/components/ui/table/TableError'

export type BaseRecord = {
  id: string
  employeeCode: string
  employeeName: string
  action: string
  targetObject: string
  timestamp: Date
}

export type BaseViewHistoryTableProps = {
  path: HistoriesPaths
  extraParams: number
  detailPathTemplate?: string
  searchQuery?: string
  filterParams?: any
  onClearAll?: () => void
  objectName?: (objectName?: string | null) => void
  detailSearchParams?: Record<string, string>
}

const HistoryTable = ({
  extraParams,
  searchQuery,
  filterParams,
  onClearAll,
  path,
  objectName,
  detailSearchParams,
}: BaseViewHistoryTableProps) => {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const flatParams = useMemo(() => {
    const params: Record<string, any> = {
      page: currentPage,
      page_size: pageSize,
      search: searchQuery || undefined,
    }

    if (filterParams.action) {
      params.action = filterParams.action
    }
    if (filterParams?.dateRange?.from) {
      params.from_date = formatDateToApi(filterParams.dateRange.from)
    }
    if (filterParams.dateRange?.to) {
      params.to_date = formatDateToApi(filterParams.dateRange.to)
    }

    return params
  }, [currentPage, pageSize, searchQuery, filterParams])

  const { keysMap } = useAppConstant({
    module: 'audit_logging',
    keys: [APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION],
  })

  const logActionMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION) || {},
    [keysMap]
  )

  const { data, isLoading, error } = useHistories(path, String(id), flatParams)

  const { tableData, totalRecords, pageCount } = useMemo(() => {
    if (!data) {
      return { tableData: [], totalRecords: 0, pageCount: 1 }
    }

    // Narrow type to access results and count safely
    const dataWithResults = 'results' in data ? data : { results: [], count: 0 }

    const results = (dataWithResults.results ?? []).map((log: any) => ({
      id: log.log_id || '-',
      employeeCode: log.employee_code || '-',
      employeeName: log.full_name || log.username || '-',
      action: log.action || '-',
      targetObject: log.object_type || '-',
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    }))
    const total = dataWithResults.count ?? 0
    return {
      tableData: results,
      totalRecords: total,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
    }
  }, [data, pageSize])

  useEffect(() => {
    if (data && 'object_name' in data && data.object_name) {
      objectName?.(data.object_name as string)
    }
  }, [data, objectName])

  const columns: ColumnDef<BaseRecord>[] = useMemo(
    () => [
      {
        accessorKey: 'employeeCode',
        header: 'Mã nhân viên',
        meta: { frozen: true, width: 'w-32' },
      },
      {
        accessorKey: 'employeeName',
        header: 'Họ tên người thực hiện',
        meta: { frozen: true, width: 'w-48' },
      },
      {
        accessorKey: 'action',
        header: 'Hành động',
        cell: ({ getValue }) => {
          const action = getValue() as BaseRecord['action']
          return <span className="text-sm">{logActionMapping[action] || action}</span>
        },
        meta: { width: 'w-40' },
      },
      { accessorKey: 'targetObject', header: 'Đối tượng bị tác động', meta: { width: 'w-48' } },
      {
        accessorKey: 'timestamp',
        header: 'Thời gian',
        cell: ({ getValue }) => {
          const date = getValue() as Date
          return (
            <span className="text-sm">
              {date.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )
        },
        meta: { width: 'w-40' },
      },
    ],
    [logActionMapping]
  )

  const actions: TableAction<BaseRecord>[] = useMemo(() => {
    return [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          let currentPath = location.pathname
          if (!currentPath.endsWith('/')) {
            currentPath += '/'
          }
          // Add search params if provided
          let searchParams = ''
          if (detailSearchParams && Object.keys(detailSearchParams).length > 0) {
            const params = new URLSearchParams()
            Object.entries(detailSearchParams).forEach(([key, value]) => {
              if (value) {
                params.append(key, value)
              }
            })
            searchParams = params.toString() ? `?${params.toString()}` : ''
          }
          navigate(`${currentPath}${record.id}${searchParams}`)
        },
      },
    ]
  }, [navigate, location.pathname, detailSearchParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterParams, extraParams])

  const handlePaginationChange = (pageIndex: number, newPageSize: number) => {
    setCurrentPage(pageIndex + 1)
    setPageSize(newPageSize)
  }

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={tableData}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      enablePagination
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      totalRecords={totalRecords}
      onPaginationChange={handlePaginationChange}
      isLoading={isLoading}
      emptyMessage="Không có dữ liệu"
      className="flex-1"
      onClearFilter={onClearAll}
    />
  )
}

export default HistoryTable
