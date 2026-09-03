import React, { useState } from 'react'
import { Select as RadixSelect, Table as RadixTable, Flex, Button, Text } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import Select from '@/components/ui/select/Select'
import { useBranchSelect } from '@/hooks/useBranchSelect'
import {
  useBangHangDetailReport,
  exportBangHangDetailXlsx,
  type MonthGroup,
  type BangHangDetailRow,
} from '@/features/sales/bang-hang-detail-report/bang-hang-detail-service'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)
const PAGE_SIZE = 20

export default function BangHangDetailReportPage() {
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const [branch, setBranch] = useState<number | undefined>()
  const [isExporting, setIsExporting] = useState(false)

  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

  const { data, isLoading } = useBangHangDetailReport({ year, branch })

  const monthGroups = data?.month_groups ?? []
  const rows = data?.results ?? []

  // Number of static columns before dynamic ones (for colSpan on empty/loading rows)
  const staticColCount = 16
  const dynamicColCount = monthGroups.reduce((acc, mg) => acc + 1 + (mg.has_f2 ? 1 : 0), 0)
  const totalColCount = staticColCount + dynamicColCount + 3 // +3 for summary cols

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportBangHangDetailXlsx({ year, branch })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <PageTitle
        title="BC Chi tiết Bảng hàng (Full cột)"
        toolbarLeftContent={
          <Flex gap="3" align="center">
            <RadixSelect.Root value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <RadixSelect.Trigger placeholder="Năm" />
              <RadixSelect.Content>
                {YEAR_OPTIONS.map((y) => (
                  <RadixSelect.Item key={y} value={String(y)}>
                    {y}
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Content>
            </RadixSelect.Root>

            <div className="w-56">
              <Select
                placeholder="Tất cả chi nhánh"
                value={branch ?? null}
                onChange={(next) => setBranch(typeof next === 'number' ? next : undefined)}
                loadOptions={loadBranchOptions}
                loadInitialOptions={loadInitialBranchOptions}
                pageSize={PAGE_SIZE}
                enableSearch
                clearable
              />
            </div>
          </Flex>
        }
        customActions={
          <Button
            variant="outline"
            loading={isExporting}
            disabled={isLoading || !data}
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
        }
      />

      <div style={{ overflowX: 'auto' }}>
        <RadixTable.Root size="1" variant="surface" style={{ minWidth: 'max-content' }}>
          <RadixTable.Header>
            <RadixTable.Row>
              <RadixTable.ColumnHeaderCell>STT</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Dự án</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Mã căn</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Ngày cọc</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Mã NV</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Nhân viên</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Khối</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Bộ phận</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Chi nhánh</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>PTBH</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">Giá niêm yết</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">Giá tính phí</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">% Tham gia</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">Tiền hàng</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">% ĐC</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">Phải nhận</RadixTable.ColumnHeaderCell>

              {monthGroups.map((mg) => (
                <React.Fragment key={mg.key}>
                  <RadixTable.ColumnHeaderCell align="right">
                    {mg.label}
                  </RadixTable.ColumnHeaderCell>
                  {mg.has_f2 && (
                    <RadixTable.ColumnHeaderCell align="right">
                      {mg.label} — F2
                    </RadixTable.ColumnHeaderCell>
                  )}
                </React.Fragment>
              ))}

              <RadixTable.ColumnHeaderCell align="right">Tổng đã ĐC</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">Còn lại</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">% Còn lại</RadixTable.ColumnHeaderCell>
            </RadixTable.Row>
          </RadixTable.Header>

          <RadixTable.Body>
            {isLoading && (
              <RadixTable.Row>
                <RadixTable.Cell colSpan={totalColCount}>
                  <Text color="gray">Đang tải...</Text>
                </RadixTable.Cell>
              </RadixTable.Row>
            )}

            {!isLoading && rows.length === 0 && (
              <RadixTable.Row>
                <RadixTable.Cell colSpan={totalColCount}>
                  <Text color="gray">Không có dữ liệu</Text>
                </RadixTable.Cell>
              </RadixTable.Row>
            )}

            {rows.map((row, idx) => (
              <BangHangDetailTableRow
                key={idx}
                index={idx + 1}
                row={row}
                monthGroups={monthGroups}
              />
            ))}
          </RadixTable.Body>
        </RadixTable.Root>
      </div>
    </div>
  )
}

type RowProps = {
  index: number
  row: BangHangDetailRow
  monthGroups: MonthGroup[]
}

function BangHangDetailTableRow({ index, row, monthGroups }: RowProps) {
  return (
    <RadixTable.Row>
      <RadixTable.Cell>{index}</RadixTable.Cell>
      <RadixTable.Cell>{row.project_name}</RadixTable.Cell>
      <RadixTable.Cell>{row.unit_number}</RadixTable.Cell>
      <RadixTable.Cell>{row.deposit_date}</RadixTable.Cell>
      <RadixTable.Cell>{row.employee_code}</RadixTable.Cell>
      <RadixTable.Cell>{row.employee_name}</RadixTable.Cell>
      <RadixTable.Cell>{row.block_name}</RadixTable.Cell>
      <RadixTable.Cell>{row.department_name}</RadixTable.Cell>
      <RadixTable.Cell>{row.branch_name}</RadixTable.Cell>
      <RadixTable.Cell>{row.sales_allocation_name}</RadixTable.Cell>
      <RadixTable.Cell align="right">{fmtAmt(row.listed_price as number | null)}</RadixTable.Cell>
      <RadixTable.Cell align="right">
        {fmtAmt(row.fee_calculation_price as number | null)}
      </RadixTable.Cell>
      <RadixTable.Cell align="right">{fmtPct(row.participation_pct as number)}</RadixTable.Cell>
      <RadixTable.Cell align="right">
        {fmtAmt(row.goods_value_detail as number | null)}
      </RadixTable.Cell>
      <RadixTable.Cell align="right">{fmtPct(row.pct_reconciliation as number)}</RadixTable.Cell>
      <RadixTable.Cell align="right">{fmtAmt(row.reconciliation_amount as number)}</RadixTable.Cell>

      {monthGroups.map((mg) => (
        <React.Fragment key={mg.key}>
          <RadixTable.Cell align="right">
            {fmtAmt(row[`recon_amt_${mg.key}`] as number | null)}
          </RadixTable.Cell>
          {mg.has_f2 && (
            <RadixTable.Cell align="right">
              {fmtAmt(row[`recon_f2_${mg.key}`] as number | null)}
            </RadixTable.Cell>
          )}
        </React.Fragment>
      ))}

      <RadixTable.Cell align="right">{fmtAmt(row.total_reconciled as number)}</RadixTable.Cell>
      <RadixTable.Cell align="right">{fmtAmt(row.remaining as number)}</RadixTable.Cell>
      <RadixTable.Cell align="right">{fmtPct(row.remaining_pct as number)}</RadixTable.Cell>
    </RadixTable.Row>
  )
}

function fmtAmt(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(value)
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${(Number(value) * 100).toFixed(1)}%`
}
