import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { IconEnvelopesimple } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import {
  MONTHLY_SUMMARY_ACTION,
  MONTHLY_SUMMARY_SUBJECT,
} from '../constants/commission-permissions'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { useEmployeesByIds } from '@/features/employee/services/employee-service'
import type { MonthlyBeneficiaryCommissionSummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import {
  ROLE_LABELS,
  SourceRole,
} from '@/features/accounting/monthly-summaries/components/MonthlySummaryConstants'
import { useCommissionEmailDialogs } from '@/features/accounting/commissions/hooks/useCommissionEmailDialogs'
import { PitMethod, MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

export interface CommEmployeeTableProps {
  data: MonthlyBeneficiaryCommissionSummary[]
  page: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onViewDetail?: (id: number) => void
  onRowClick?: (record: MonthlyBeneficiaryCommissionSummary) => void
  isLoading?: boolean
  error?: Error | null
}

export const CommEmployeeTable = ({
  data,
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onRowClick,
  isLoading,
  error,
}: CommEmployeeTableProps) => {
  const ability = useAbility()
  const employeeIds = useMemo(() => {
    const ids = new Set<number>()
    data.forEach((item) => {
      if (item.beneficiary_employee) ids.add(item.beneficiary_employee)
    })
    return Array.from(ids)
  }, [data])

  const { openSingle: openEmailDialog, dialogs: emailDialogs } =
    useCommissionEmailDialogs('employees')

  const { data: employeesResponse } = useEmployeesByIds(employeeIds)
  const allEmployees = employeesResponse?.results || []

  // Create mapping from ID to Name
  const employeeMap = useMemo(() => {
    const map = new Map<number, (typeof allEmployees)[number]>()
    allEmployees.forEach((emp) => {
      map.set(emp.id, emp)
    })
    return map
  }, [allEmployees])

  const columns = useMemo<ColumnDef<MonthlyBeneficiaryCommissionSummary>[]>(
    () => [
      {
        id: 'employee',
        header: 'Nhân viên',
        cell: ({ row }) => {
          const empId = row.original.beneficiary_employee
          if (!empId) return '-'
          const emp = employeeMap.get(empId)
          if (!emp) return <span className="font-normal text-neutral-900">ID: {empId}</span>

          return (
            <div className="flex flex-col">
              <span className="font-normal text-neutral-900">{emp.fullname}</span>
              <span className="text-[13px] text-neutral-500">{emp.code}</span>
            </div>
          )
        },
        meta: { width: 'w-[220px]', sortable: false, frozen: true },
      },
      {
        id: 'department',
        header: 'Phòng ban',
        cell: ({ row }) => {
          const empId = row.original.beneficiary_employee
          if (!empId) return '-'
          const emp = employeeMap.get(empId)
          if (!emp?.department) return '-'
          return (
            <div className="flex flex-col">
              <span className="text-neutral-900">{emp.department.name}</span>
            </div>
          )
        },
        meta: { width: 'w-[160px]', sortable: false },
      },
      {
        id: 'period',
        header: 'Kỳ tháng',
        cell: ({ row }) => (
          <span className="text-neutral-900">
            {String(row.original.month).padStart(2, '0')}/{row.original.year}
          </span>
        ),
        meta: { width: 'w-[100px]', sortable: false },
      },
      {
        accessorKey: 'sale_total',
        header: 'HH Bán hàng',
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">
            {row.original.sale_total && Number(row.original.sale_total) > 0
              ? formatCurrencyVND(Number(row.original.sale_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'mgmt_total',
        header: 'TBC',
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">
            {row.original.mgmt_total && Number(row.original.mgmt_total) > 0
              ? formatCurrencyVND(Number(row.original.mgmt_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'hhql_total',
        header: 'HHQL',
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">
            {row.original.hhql_total && Number(row.original.hhql_total) > 0
              ? formatCurrencyVND(Number(row.original.hhql_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'f2_total',
        header: 'HH F2',
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">
            {row.original.f2_total && Number(row.original.f2_total) > 0
              ? formatCurrencyVND(Number(row.original.f2_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'slk_total',
        header: 'HH SLK',
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">
            {row.original.slk_total && Number(row.original.slk_total) > 0
              ? formatCurrencyVND(Number(row.original.slk_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'promo_total',
        // Same source as the detail screen (ROLE_LABELS[PROMO]) so the two cannot drift.
        // "Hỗ trợ quảng cáo" is the AD_SUPPORT bonus type, not this field — ClickUp 86eykqe00.
        header: ROLE_LABELS[SourceRole.PROMO],
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">
            {row.original.promo_total && Number(row.original.promo_total) > 0
              ? formatCurrencyVND(Number(row.original.promo_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[150px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'bonus_total',
        header: 'Thưởng',
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">
            {row.original.bonus_total && Number(row.original.bonus_total) > 0
              ? formatCurrencyVND(Number(row.original.bonus_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'pre_tax_total',
        header: 'Tổng trước thuế',
        cell: ({ row }) => (
          <span className="font-bold text-neutral-900">
            {row.original.pre_tax_total
              ? formatCurrencyVND(Number(row.original.pre_tax_total))
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        id: 'pit_method',
        header: 'Cách tính PIT',
        cell: ({ row }) => {
          const method = row.original.pit_method
          if (!method || method === PitMethod.NONE) return '-'
          const labels: Record<string, string> = {
            [PitMethod.FLAT_10]: 'Khấu trừ 10%',
            [PitMethod.PROGRESSIVE]: 'Lũy tiến',
          }
          return <span className="text-xs text-gray-600">{labels[method] || method}</span>
        },
        meta: { width: 'w-[130px]', sortable: false, align: 'center' },
      },
      {
        id: 'pit_rate',
        header: 'Tỷ lệ PIT',
        cell: ({ row }) => {
          const rate = row.original.pit_rate
          if (rate == null) return '-'
          const pct = Number(rate) * 100
          return <span className="font-medium text-gray-600">{formatNumber(pct)}%</span>
        },
        meta: { width: 'w-[100px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'pit_amount',
        header: 'Thuế TNCN',
        cell: ({ row }) => (
          <span className="font-medium text-red-600">
            {row.original.pit_amount && Number(row.original.pit_amount) > 0
              ? `-${formatCurrencyVND(Number(row.original.pit_amount))}`
              : '-'}
          </span>
        ),
        meta: { width: 'w-[120px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'hold_amount',
        header: 'Tạm giữ',
        cell: ({ row }) => (
          <span className="font-medium text-orange-600">
            {row.original.hold_amount && Number(row.original.hold_amount) > 0
              ? `-${formatCurrencyVND(Number(row.original.hold_amount))}`
              : '-'}
          </span>
        ),
        meta: { width: 'w-[120px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'recovered_advance_amount',
        header: 'Thu hồi tạm ứng',
        cell: ({ row }) => (
          <span className="font-medium text-orange-600">
            {row.original.recovered_advance_amount &&
            Number(row.original.recovered_advance_amount) > 0
              ? `-${formatCurrencyVND(Number(row.original.recovered_advance_amount))}`
              : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'net_payable',
        header: 'Thực nhận',
        cell: ({ row }) => (
          <span className="font-bold text-green-700">
            {row.original.net_payable ? formatCurrencyVND(Number(row.original.net_payable)) : '-'}
          </span>
        ),
        meta: { width: 'w-[130px]', sortable: false, align: 'right' },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <MonthlySummaryStatusBadge status={row.original.status as any} />,
        meta: { width: 'w-[120px]', sortable: false },
      },
    ],
    [employeeMap]
  )

  // Bảng này đọc ViewSet `employees` (List 8 — tổng hợp HH của nhân viên), nên subject là
  // `employeemonthlycommissionsummary` — KHÔNG phải subject của bảng Sale dù nhãn giống nhau.
  // "Chi tiết" điều hướng `MONTHLY_COMMISSION_SUMMARY_DETAIL` (route khai `.retrieve`).
  const rowActions = useMemo(() => {
    const S = MONTHLY_SUMMARY_SUBJECT.employees
    return [
      {
        label: 'Chi tiết',
        show: () => ability.can(MONTHLY_SUMMARY_ACTION.RETRIEVE, S),
        onClick: (row: MonthlyBeneficiaryCommissionSummary) => {
          if (onViewDetail) onViewDetail(row.id)
        },
      },
      {
        label: 'Gửi email đối chiếu',
        icon: <IconEnvelopesimple size={16} />,
        show: (row: MonthlyBeneficiaryCommissionSummary) =>
          ability.can(MONTHLY_SUMMARY_ACTION.SEND_EMAIL_PREVIEW, S) &&
          row.status !== MonthlyStatus.DRAFT,
        onClick: (row: MonthlyBeneficiaryCommissionSummary) => openEmailDialog({ id: row.id }),
      },
    ]
  }, [ability, onViewDetail, openEmailDialog])

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Có lỗi xảy ra khi tải dữ liệu: {(error as any)?.message || 'Unknown error'}
      </div>
    )
  }

  return (
    <>
      {emailDialogs}
      <Table
        tableContainerClassName="rounded-lg shadow-sm bg-white"
        data={data}
        columns={columns}
        isLoading={isLoading}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
        currentPageIndex={page}
        onPaginationChange={(pageIndex, sz) => {
          if (sz !== pageSize) onPageSizeChange(sz)
          onPageChange(pageIndex)
        }}
        enablePagination
        manualPagination
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        showSTT
        showActions
        rowActions={rowActions}
        onRowClick={onRowClick}
      />
    </>
  )
}

export default CommEmployeeTable
