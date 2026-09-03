import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Flex, Grid, Card, Text } from '@radix-ui/themes'
import { PageTitle, Select, Table } from '@/components/ui'
import { Loading } from '@/components/Loading'
import {
  useBeneficiaryCommissionAllocationReport,
  type BeneficiaryCommissionAllocationRow,
} from '@/features/accounting/reports/services/report-service'
import { useEmployeesByIds } from '@/features/employee/services/employee-service'
import { useCollaborators } from '@/features/accounting/collaborators/services/collaborator-service'
import { useExchanges } from '@/services/realestate-service'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { parsePositiveInt } from '@/utils/common'
import { cn, formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'

type TableDataRow = {
  key: string
  name: string
  mstCmnd: string
  role: string
  gross: number
  exempt: number
  personalDeduction: number
  dependantCount: number
  dependantDeduction: number
  bhxh: number
  taxable: number
  tax: number
  finalTaxPayable: number
  taxVariance: number
  net: number
}

export default function AnnualTaxIncomeReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_BENEFICIARY_TYPE_CHOICES,
    ],
  })

  const beneficiaryTypeLabelMap = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_BENEFICIARY_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const year = parsePositiveInt(searchParams.get('year')) || new Date().getFullYear()

  // Sync year param with URL on mount
  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    if (!actualUrlParams.has('year')) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('year', String(new Date().getFullYear()))
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [searchParams, setSearchParams])

  // Fetch report data for the entire year
  const filters = useMemo(() => {
    return {
      year: year,
    }
  }, [year])

  const { data: reportResponse, isLoading: isLoadingReport } =
    useBeneficiaryCommissionAllocationReport(filters, {
      enabled: isUrlReady,
    })

  const rawRows = useMemo(() => {
    return reportResponse?.results || []
  }, [reportResponse])

  // Aggregate monthly data to annual data per beneficiary
  const aggregatedData = useMemo(() => {
    const map = new Map<
      string,
      {
        beneficiary_type: string
        beneficiary_employee_id: number | null
        beneficiary_collaborator_id: number | null
        beneficiary_exchange_id: number | null
        gross: number
        exempt: number
        personalDeduction: number
        dependantCount: number
        dependantDeduction: number
        bhxh: number
        taxable: number
        tax: number
        finalTaxPayable: number
        taxVariance: number
        net: number
      }
    >()

    rawRows.forEach((row: BeneficiaryCommissionAllocationRow & Record<string, unknown>) => {
      let key = ''
      if (row.beneficiary_type === 'EMPLOYEE') {
        key = `EMP-${row.beneficiary_employee_id}`
      } else if (row.beneficiary_type === 'COLLABORATOR') {
        key = `COL-${row.beneficiary_collaborator_id}`
      } else if (row.beneficiary_type === 'EXCHANGE') {
        key = `EXC-${row.beneficiary_exchange_id}`
      }

      if (!key) return

      const existing = map.get(key) || {
        beneficiary_type: row.beneficiary_type,
        beneficiary_employee_id: row.beneficiary_employee_id,
        beneficiary_collaborator_id: row.beneficiary_collaborator_id,
        beneficiary_exchange_id: row.beneficiary_exchange_id,
        gross: 0,
        exempt: 0,
        personalDeduction: 0,
        dependantCount: 0,
        dependantDeduction: 0,
        bhxh: 0,
        taxable: 0,
        tax: 0,
        finalTaxPayable: 0,
        taxVariance: 0,
        net: 0,
      }

      existing.gross += Number(row.pre_tax_total || 0)
      existing.exempt += Number(row.exempt || row.exempt_income || 0)
      existing.personalDeduction += Number(row.personal_deduction || row.personal_reduction || 0)
      existing.dependantDeduction += Number(row.dependant_deduction || row.dependant_reduction || 0)
      existing.bhxh += Number(row.bhxh || row.insurance_deduction || 0)
      existing.taxable += Number(row.taxable || row.taxable_income || 0)
      existing.tax += Number(row.pit_amount || 0)
      existing.finalTaxPayable += Number(
        row.final_tax_payable || row.tax_payable || row.pit_amount || 0
      )
      existing.taxVariance += Number(row.tax_variance || row.tax_difference || 0)
      existing.net += Number(row.net_payable || 0)

      // Số NPT là ĐẦU NGƯỜI, không phải tiền — không cộng dồn 12 dòng tháng lại. Lấy số
      // lớn nhất trong năm để người đăng ký thêm NPT giữa năm vẫn hiện đúng số cuối cùng,
      // và kết quả không phụ thuộc thứ tự dòng trả về.
      existing.dependantCount = Math.max(
        existing.dependantCount,
        Number(row.dependant_count ?? row.dependants_count ?? 0)
      )

      map.set(key, existing)
    })

    return Array.from(map.values())
  }, [rawRows])

  // Collect unique employee IDs
  interface AggregatedRow {
    beneficiary_type: string
    beneficiary_employee_id: number | null
    beneficiary_collaborator_id: number | null
    beneficiary_exchange_id: number | null
    gross: number
    exempt: number
    personalDeduction: number
    dependantCount: number
    dependantDeduction: number
    bhxh: number
    taxable: number
    tax: number
    finalTaxPayable: number
    taxVariance: number
    net: number
  }

  const employeeIds = useMemo(() => {
    const ids = aggregatedData
      .filter((r: AggregatedRow) => r.beneficiary_type === 'EMPLOYEE' && r.beneficiary_employee_id)
      .map((r: AggregatedRow) => r.beneficiary_employee_id as number)
    return Array.from(new Set(ids))
  }, [aggregatedData])

  // Fetch employee details
  const { data: employeesResponse } = useEmployeesByIds(employeeIds, {
    enabled: employeeIds.length > 0,
  })

  interface ExtendedEmployeeDropdown {
    id: number
    fullname: string
    code: string
    tax_code?: string
    citizen_id?: string
  }

  const employeesMap = useMemo(() => {
    const map = new Map<number, { fullname: string; tax_code: string; citizen_id: string }>()
    if (employeesResponse?.results) {
      const results = employeesResponse.results as unknown as ExtendedEmployeeDropdown[]
      results.forEach((emp) => {
        map.set(emp.id, {
          fullname: emp.fullname || '',
          tax_code: emp.tax_code || '',
          citizen_id: emp.citizen_id || '',
        })
      })
    }
    return map
  }, [employeesResponse])

  // Fetch collaborator details
  const { data: collaboratorsResponse } = useCollaborators({ page_size: 1000 })

  interface ExtendedCollaborator {
    id: number
    name: string
    code: string
    tax_code?: string
    id_number?: string
  }

  const collaboratorsMap = useMemo(() => {
    const map = new Map<number, { fullname: string; tax_code: string; citizen_id: string }>()
    if (collaboratorsResponse?.results) {
      const results = collaboratorsResponse.results as unknown as ExtendedCollaborator[]
      results.forEach((col) => {
        map.set(col.id, {
          fullname: col.name || '',
          tax_code: col.tax_code || '',
          citizen_id: col.id_number || '',
        })
      })
    }
    return map
  }, [collaboratorsResponse])

  // Fetch exchange details
  const { data: exchangesResponse } = useExchanges({ page_size: 1000 })
  const exchangesMap = useMemo(() => {
    const map = new Map<number, { name: string; tax_code: string }>()
    if (exchangesResponse?.results) {
      exchangesResponse.results.forEach((ex) => {
        map.set(ex.id, {
          name: ex.name || '',
          tax_code: ex.tax_code || '',
        })
      })
    }
    return map
  }, [exchangesResponse])

  // Map to final grid rows
  const tableData = useMemo<TableDataRow[]>(() => {
    return aggregatedData.map((row) => {
      let name = ''
      let mstCmnd = ''
      let roleLabel = beneficiaryTypeLabelMap?.[row.beneficiary_type] || ''

      if (row.beneficiary_type === 'EMPLOYEE') {
        const emp = employeesMap.get(row.beneficiary_employee_id || 0)
        name = emp?.fullname || `Nhân viên #${row.beneficiary_employee_id}`
        mstCmnd = emp?.tax_code || emp?.citizen_id || '-'
        if (!roleLabel) roleLabel = 'Nhân viên'
      } else if (row.beneficiary_type === 'COLLABORATOR') {
        const col = collaboratorsMap.get(row.beneficiary_collaborator_id || 0)
        name = col?.fullname || `CTV #${row.beneficiary_collaborator_id}`
        mstCmnd = col?.tax_code || col?.citizen_id || '-'
        if (!roleLabel) roleLabel = 'Cộng tác viên'
      } else if (row.beneficiary_type === 'EXCHANGE') {
        const ex = exchangesMap.get(row.beneficiary_exchange_id || 0)
        name = ex?.name || `Sàn F2 #${row.beneficiary_exchange_id}`
        mstCmnd = ex?.tax_code || '-'
        if (!roleLabel) roleLabel = 'Sàn F2'
      }

      return {
        key: `${row.beneficiary_type}-${row.beneficiary_employee_id || row.beneficiary_collaborator_id || row.beneficiary_exchange_id}`,
        name,
        mstCmnd,
        role: roleLabel,
        gross: row.gross,
        exempt: row.exempt,
        personalDeduction: row.personalDeduction,
        dependantCount: row.dependantCount,
        dependantDeduction: row.dependantDeduction,
        bhxh: row.bhxh,
        taxable: row.taxable,
        tax: row.tax,
        finalTaxPayable: row.finalTaxPayable,
        taxVariance: row.taxVariance,
        net: row.net,
      }
    })
  }, [aggregatedData, employeesMap, collaboratorsMap, exchangesMap])

  const totalSummary = useMemo(() => {
    return tableData.reduce(
      (
        acc: {
          gross: number
          exempt: number
          personalDeduction: number
          dependantCount: number
          dependantDeduction: number
          bhxh: number
          taxable: number
          tax: number
          finalTaxPayable: number
          taxVariance: number
          net: number
        },
        curr: TableDataRow
      ) => {
        acc.gross += curr.gross
        acc.exempt += curr.exempt
        acc.personalDeduction += curr.personalDeduction
        acc.dependantCount += curr.dependantCount
        acc.dependantDeduction += curr.dependantDeduction
        acc.bhxh += curr.bhxh
        acc.taxable += curr.taxable
        acc.tax += curr.tax
        acc.finalTaxPayable += curr.finalTaxPayable
        acc.taxVariance += curr.taxVariance
        acc.net += curr.net
        return acc
      },
      {
        gross: 0,
        exempt: 0,
        personalDeduction: 0,
        dependantCount: 0,
        dependantDeduction: 0,
        bhxh: 0,
        taxable: 0,
        tax: 0,
        finalTaxPayable: 0,
        taxVariance: 0,
        net: 0,
      }
    )
  }, [tableData])

  const handleYearChange = useCallback(
    (value: string | number | (string | number)[] | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (value) {
        newParams.set('year', String(value))
      }
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const columns = useMemo<ColumnDef<TableDataRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nhân viên',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        meta: { sortable: false },
      },
      {
        accessorKey: 'gross',
        header: 'Tổng tiền',
        cell: ({ row }) => (
          <span className={cn('', 'font-semibold')}>{formatCurrencyVND(row.original.gross)}</span>
        ),
        footer: () => formatSummaryCurrency(totalSummary.gross),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'taxable',
        header: 'Thu nhập chịu thuế',
        cell: ({ row }) => (
          <span className="text-gray-700">{formatCurrencyVND(row.original.taxable)}</span>
        ),
        footer: () => formatSummaryCurrency(totalSummary.taxable),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'personalDeduction',
        header: 'Giảm trừ gia cảnh',
        cell: ({ row }) => (
          <span className="text-gray-700">{formatCurrencyVND(row.original.personalDeduction)}</span>
        ),
        footer: () => formatSummaryCurrency(totalSummary.personalDeduction),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'dependantCount',
        header: 'Số NPT',
        cell: ({ row }) => <span className="text-gray-700">{row.original.dependantCount}</span>,
        footer: () => totalSummary.dependantCount,
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'dependantDeduction',
        header: 'Tổng giảm trừ NPT',
        cell: ({ row }) => (
          <span className="text-gray-700">
            {formatCurrencyVND(row.original.dependantDeduction)}
          </span>
        ),
        footer: () => formatSummaryCurrency(totalSummary.dependantDeduction),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'bhxh',
        header: 'BHXH trích theo lương',
        cell: ({ row }) => (
          <span className="text-gray-600">{formatCurrencyVND(row.original.bhxh)}</span>
        ),
        footer: () => formatSummaryCurrency(totalSummary.bhxh),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'tax',
        header: 'Thuế TNCN',
        cell: ({ row }) => (
          <span className={cn('text-data-red-default', 'font-semibold')}>
            {formatCurrencyVND(row.original.tax)}
          </span>
        ),
        footer: () => formatSummaryCurrency(totalSummary.tax),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'net',
        header: 'Tổng tiền nhận',
        cell: ({ row }) => (
          <span className={cn('text-green-600', 'font-semibold')}>
            {formatCurrencyVND(row.original.net)}
          </span>
        ),
        footer: () => formatSummaryCurrency(totalSummary.net),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [totalSummary]
  )

  const YEAR_OPTIONS = [
    { value: '2024', label: 'Năm 2024' },
    { value: '2025', label: 'Năm 2025' },
    { value: '2026', label: 'Năm 2026' },
    { value: '2027', label: 'Năm 2027' },
  ]

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.4 Báo cáo tổng hợp thuế và thu nhập năm"
        toolbarLeftContent={
          <div className="w-48">
            <Select
              placeholder="Chọn năm"
              value={String(year)}
              onChange={handleYearChange}
              options={YEAR_OPTIONS}
              clearable={false}
            />
          </div>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="px-7">
          <Grid columns={{ initial: '1', md: '2' }} gap="4">
            <Card className="border border-green-200 bg-green-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Tổng thu nhập chi trả trong năm
                </Text>
                <Text size="6" className="font-bold text-green-700">
                  {isLoadingReport ? '...' : formatCurrencyVND(totalSummary.gross)}
                </Text>
              </Flex>
            </Card>
            <Card className="border border-red-200 bg-red-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Tổng thuế TNCN đã khấu trừ/tạm giữ
                </Text>
                <Text size="6" className="font-bold text-red-700">
                  {isLoadingReport ? '...' : formatCurrencyVND(totalSummary.tax)}
                </Text>
              </Flex>
            </Card>
          </Grid>
        </div>

        {isLoadingReport ? (
          <div className="flex h-64 items-center justify-center">
            <Loading size="lg" />
          </div>
        ) : tableData.length === 0 ? (
          <div className="border-border-1 bg-content-light-1 mx-7 flex h-64 items-center justify-center rounded-lg border">
            <p className="text-content-dark-3">Không có dữ liệu</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto pt-0 pb-0">
            <Table
              data={tableData}
              columns={columns}
              isLoading={isLoadingReport}
              showSTT={true}
              enablePagination={false}
              manualPagination={true}
              totalRecords={tableData.length}
              pageSize={tableData.length}
              pageCount={1}
              currentPageIndex={0}
              onPaginationChange={() => {}}
              emptyMessage="Không có dữ liệu"
              bordered
              showSummaryRow
              summaryRowCount={tableData.length}
              disableInnerOverflow
              paginationPosition="static"
              stickyHeader
            />
          </div>
        )}
      </div>
    </div>
  )
}
