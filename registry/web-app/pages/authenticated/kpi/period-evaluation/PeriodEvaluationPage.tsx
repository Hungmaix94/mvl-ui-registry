import { PageTitle, Table } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { usePayrollKPIPeriods } from '@/features/kpi/services/kpi-assessment-service'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useDebounceValue } from 'usehooks-ts'
import { Flex } from '@radix-ui/themes'

const PeriodEvaluationPage = () => {
  const navigate = useNavigate()
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  })
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounceValue(search, 500)

  const { data, isLoading } = usePayrollKPIPeriods({
    page: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
    search: debouncedSearch,
  })

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'month',
        header: 'Kỳ đánh giá',
        cell: ({ getValue }) => {
          const month = getValue() as string
          if (!month) return '-'
          return `Tháng ${month}`
        },
        size: 200,
      },
      {
        accessorKey: 'employee_self_assessed_count',
        header: 'Số phiếu nhân viên đã nộp',
        cell: ({ row }) => {
          const item = row.original
          return `${item.employee_self_assessed_count || 0}/${item.employee_count || 0}`
        },
        meta: {
          align: 'center',
        },
      },
      {
        accessorKey: 'manager_assessed_count',
        header: 'Số phiếu trưởng phòng đã đánh giá',
        cell: ({ row }) => {
          const item = row.original
          return `${item.manager_assessed_count || 0}/${item.employee_count || 0}`
        },
        meta: {
          align: 'center',
        },
      },
    ],
    []
  )

  const actions = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record: any) => {
          navigate(APP_PATH.KPI_PERIOD_EVALUATION_DETAIL.replace(':id', String(record.id)))
        },
      },
    ],
    []
  )

  const handlePaginationChange = useCallback((pageIndex: number, pageSize: number) => {
    setPagination({ pageIndex, pageSize })
  }, [])

  return (
    <>
      <PageTitle
        title="Phiếu đánh giá KPI theo kỳ"
        breadcrumb={[
          {
            label: 'Đánh giá KPI',
            href: APP_PATH.HOME,
          },
          {
            label: 'Phiếu đánh giá KPI theo kỳ',
            href: APP_PATH.KPI_PERIOD_EVALUATION,
          },
        ]}
        searchValue={search}
        handleSearch={(value: string) => setSearch(value)}
        searchPlaceholder="Tìm kiếm kỳ đánh giá..."
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <Table
          columns={columns}
          data={data?.results || []}
          isLoading={isLoading}
          totalRecords={data?.count || 0}
          pageSize={pagination.pageSize}
          currentPageIndex={pagination.pageIndex}
          onPaginationChange={handlePaginationChange}
          showSTT
          enablePagination
          manualPagination
          pageCount={data ? Math.ceil(data.count / pagination.pageSize) : 0}
          showActions
          rowActions={actions}
          actionRenderType="direct"
        />
      </Flex>
    </>
  )
}

export default PeriodEvaluationPage
