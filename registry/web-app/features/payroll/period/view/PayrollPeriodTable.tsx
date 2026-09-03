import { IconPencilsimple, IconSalary, IconTable } from '@/assets/icons'
import { Table, type ColumnDef, type TableAction, Chip } from '@/components/ui'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SalaryPeriodList } from '@/services'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { parseDateTimeFromApi } from '@/utils/date-utils'
import { DATE_FORMAT, DATETIME_FORMAT, TIME_FORMAT } from '@/constants/date-format'
import { format, parse } from 'date-fns'

function DeadlineCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-content-dark-3">-</span>
  const display = parseDateTimeFromApi(value)
  if (!display) return <span className="text-content-dark-3">-</span>
  const parsed = parse(display, DATETIME_FORMAT, new Date())
  const dateText = format(parsed, DATE_FORMAT)
  const timeText = format(parsed, TIME_FORMAT)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="typo-body-base text-content-dark-1">{dateText}</span>
      <span className="typo-body-sm text-content-dark-3">{timeText}</span>
    </div>
  )
}

type PayrollPeriodTableProps = {
  data: SalaryPeriodList[]
  isLoading: boolean
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
}

const PayrollPeriodTable = ({
  data,
  isLoading,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
}: PayrollPeriodTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.SALARY_PERIOD_STATUS],
  })

  const keysMapStatus = useMemo(() => {
    return keysMap.get(APP_CONSTANT_KEY.PAYROLL.SALARY_PERIOD_STATUS) || {}
  }, [keysMap])

  const columns: ColumnDef<SalaryPeriodList>[] = useMemo(
    () => [
      {
        accessorKey: 'month',
        header: 'Kỳ lương',
        cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.month}</span>,
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'proposal_deadline',
        header: 'Thời gian ngừng nhận đề xuất',
        cell: ({ row }) => <DeadlineCell value={row.original.proposal_deadline} />,
        meta: {
          width: 'w-[240px]',
        },
      },
      {
        accessorKey: 'kpi_assessment_deadline',
        header: 'Thời gian ngừng nhận KPI',
        cell: ({ row }) => <DeadlineCell value={row.original.kpi_assessment_deadline} />,
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'total_employees',
        header: 'Số bản ghi',

        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'pending_count',
        header: 'Bản ghi đang chờ',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'ready_count',
        header: 'Bản ghi sẵn sàng',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'hold_count',
        header: 'Bản ghi bị giữ',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'employees_need_email',
        header: 'Số nhân sự cần gửi mail',
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'colored_status',
        header: 'Trạng thái kỳ lương',
        cell: ({ getValue }) => {
          const coloredStatus = getValue() as SalaryPeriodList['colored_status']
          return (
            <>
              <Chip
                label={
                  coloredStatus.value ? keysMapStatus[coloredStatus.value] : coloredStatus.value
                }
                variant={coloredStatus.variant}
              />
            </>
          )
        },
        meta: {
          width: '200px',
        },
      },
    ],
    [keysMapStatus]
  )

  const actions: TableAction<SalaryPeriodList>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết kỳ lương',
        icon: <IconTable size={16} />,
        onClick: (item) => navigate(APP_PATH.PAYROLL_PERIOD_DETAIL.replace(':id', String(item.id))),
        show: () => ability.can('retrieve', 'salary_period'),
      },
      {
        label: 'Xem chi tiết bảng lương',
        icon: <IconSalary size={16} />,
        onClick: (item) =>
          navigate(APP_PATH.PAYROLL_PERIOD_PAYSLIPS.replace(':id', String(item.id))),
        show: () => ability.can('retrieve', 'salary_period'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (item) => navigate(APP_PATH.PAYROLL_PERIOD_EDIT.replace(':id', String(item.id))),
        show: () => ability.can('update', 'salary_period'),
      },
    ],
    [navigate, ability]
  )

  // Sticky header logic - find scroll container from page level
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
      ) as HTMLElement
      if (!scrollContainer) return

      const table = scrollContainer.querySelector('table') as HTMLElement
      if (!table) return

      const thead = table.querySelector('thead') as HTMLElement
      if (!thead) return

      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        }

        thead.style.top = `${topOffset}px`
      }

      updateStickyTop()

      const scrollHandler = () => {
        updateStickyTop()
      }
      scrollContainer.addEventListener('scroll', scrollHandler)
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updateStickyTop)

      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [data])

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1} // Table expects 0-indexed
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      isLoading={isLoading}
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
    />
  )
}

export default PayrollPeriodTable
