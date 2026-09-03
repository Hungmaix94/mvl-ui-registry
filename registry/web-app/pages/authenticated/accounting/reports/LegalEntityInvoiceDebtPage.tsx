import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'
import * as TableComponents from '@radix-ui/themes'
import { Button, PageTitle } from '@/components/ui'
import { IconDownload } from '@/assets/icons'
import {
  useLegalEntityInvoiceDebt,
  type LegalEntityInvoiceDebtRow,
} from '@/features/accounting/reports/services/legal-entity-report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { Loading } from '@/components/Loading'
import { cn, formatCurrencyVND } from '@/utils'

const LegalEntityInvoiceDebtPage = () => {
  const { data: listResponse, isLoading, error } = useLegalEntityInvoiceDebt()

  const results = useMemo(() => listResponse?.results ?? [], [listResponse])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/legal-entity-invoice-debt/',
    'cong-no-hoa-don-phap-nhan.xlsx'
  )

  const getNetColor = (netVal: number) => {
    if (netVal > 0) return 'text-green-600 font-bold'
    if (netVal < 0) return 'text-red-600 font-bold'
    return 'text-content-dark-1 font-semibold'
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Báo cáo công nợ hóa đơn theo pháp nhân"
        customActions={
          <Button
            variant="secondary"
            size="small"
            leftIcon={<IconDownload />}
            onClick={() => openExportDialog({})}
            disabled={!results.length}
          >
            Xuất Excel
          </Button>
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="px-7 pt-4 pb-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading size="lg" />
          </div>
        ) : error ? (
          <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
            <p className="text-content-dark-3 text-red-500">
              Có lỗi xảy ra: {(error as any)?.message}
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
            <p className="text-content-dark-3">Không có dữ liệu</p>
          </div>
        ) : (
          <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
            <TableComponents.Table.Root className="w-full border-collapse text-sm">
              <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
                <TableComponents.Table.Row>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
                    ID Pháp Nhân
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
                    Tên Pháp Nhân
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-left !shadow-none">
                    Mã Số Thuế
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
                    Tổng phải thu
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 border-r px-3 py-[10px] text-right !shadow-none">
                    Tổng phải trả
                  </TableComponents.Table.ColumnHeaderCell>
                  <TableComponents.Table.ColumnHeaderCell className="text-content-dark-2 typo-body-base-semibold border-border-1 px-3 py-[10px] text-right !shadow-none">
                    Công nợ ròng
                  </TableComponents.Table.ColumnHeaderCell>
                </TableComponents.Table.Row>
              </TableComponents.Table.Header>
              <TableComponents.Table.Body>
                {results.map((row: LegalEntityInvoiceDebtRow, rowIdx: number) => (
                  <TableComponents.Table.Row
                    key={row.legal_entity_id || rowIdx}
                    className={cn(
                      'border-border-1 border-b bg-white transition-colors',
                      'last:border-b-0',
                      'hover:bg-data-light-grey-hover',
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                    )}
                  >
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.legal_entity_id}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.name}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-left">
                      {row.tax_code || '—'}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right">
                      {formatCurrencyVND(Number(row.receivable_total || 0))}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell className="border-border-1 text-content-dark-1 border-r px-3 py-[10px] text-right">
                      {formatCurrencyVND(Number(row.payable_total || 0))}
                    </TableComponents.Table.Cell>
                    <TableComponents.Table.Cell
                      className={cn(
                        'border-border-1 px-3 py-[10px] text-right',
                        getNetColor(Number(row.net || 0))
                      )}
                    >
                      {formatCurrencyVND(Number(row.net || 0))}
                    </TableComponents.Table.Cell>
                  </TableComponents.Table.Row>
                ))}
              </TableComponents.Table.Body>
            </TableComponents.Table.Root>
          </div>
        )}
      </Flex>
    </div>
  )
}

export default LegalEntityInvoiceDebtPage
