/**
 * TEMPORARILY NOT WIRED (2026-06-02): the "Nhập Excel" entry in InvestorReconciliationForm is
 * commented out until BE provides the official import { formatPercent } from '@/utils/common'
import template (mau-import-doi-chieu-cdt.xlsx column
 * contract). The component is complete — re-enable by uncommenting the import + usage in
 * InvestorReconciliationForm (search "TODO(BE Excel import)").
 */
import { useCallback, useRef, useState } from 'react'
import { Table } from '@radix-ui/themes'
import * as XLSX from 'xlsx'
import { formatPercent } from '@/utils/common'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'
import toastService from '@/services/toast-service'
import { getRealEstateService } from '@/services/realestate-service'
import { ReconciliationSourceType as SourceType } from '@/constants/api-schema-aliases'
import {
  createEmptyInvestorReconciliationSheetItem,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import {
  RECON_PERIOD_TYPE_LABELS,
  RECON_PERIOD_TYPE_OPTIONS,
} from '@/features/sales/_shared/reconciliation/recon-period-type'

const MAX_IMPORT_ROWS = 200

// Column-mapping note: the import template (mau-import-doi-chieu-cdt.xlsx) has 6 columns —
// mã căn · loại kỳ · % TT đợt · giá tính phí · thưởng · khấu trừ — mapped to the form item as:
// mã căn → product_inventory_id (resolved by code), loại kỳ → period_type,
// % TT đợt (cumulative sau kỳ) → progress_from_pct=0 + progress_to_pct; giá tính phí → fee_calculation_price,
// thưởng → shared_bonus_amount (+ ghi nhận kỳ qua shared_bonus_period_amount), khấu trừ → fee_deduction.

function normalize(value: unknown): string {
  return String(value ?? '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function parseNumber(value: unknown): number {
  if (value == null || value === '') return 0
  const n = Number(String(value).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// Map a "loại kỳ" cell (Vietnamese label, short label, or raw enum value) to the period_type enum.
const PERIOD_TYPE_BY_NORMALIZED = new Map<
  string,
  InvestorReconciliationSheetCreateItemValues['period_type']
>()
RECON_PERIOD_TYPE_OPTIONS.forEach((opt) => {
  PERIOD_TYPE_BY_NORMALIZED.set(normalize(opt.value), opt.value)
  PERIOD_TYPE_BY_NORMALIZED.set(normalize(opt.label), opt.value)
  PERIOD_TYPE_BY_NORMALIZED.set(normalize(opt.short), opt.value)
})

type RowStatus = 'ok' | 'warning' | 'error'

type ParsedRow = {
  rowNumber: number
  rawCode: string
  resolvedId: number | null
  resolvedLabel: string
  periodType: InvestorReconciliationSheetCreateItemValues['period_type'] | null
  progressToPct: number | null
  feeCalculationPrice: number
  supplementaryAmount: number
  feeDeduction: number
  status: RowStatus
  messages: string[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  sourceType?: SourceType
  sourceExchangeId?: number
  onImport: (items: InvestorReconciliationSheetCreateItemValues[]) => void
}

const STATUS_VARIANT: Record<RowStatus, ColoredValueVariant> = {
  ok: ColoredValueVariant.GREEN,
  warning: ColoredValueVariant.YELLOW,
  error: ColoredValueVariant.RED,
}
const STATUS_LABEL: Record<RowStatus, string> = {
  ok: 'Hợp lệ',
  warning: 'Cảnh báo',
  error: 'Lỗi',
}

const InvestorReconciliationImportDialog = ({
  open,
  onOpenChange,
  projectId,
  sourceType,
  sourceExchangeId,
  onImport,
}: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')

  const resolveCode = useCallback(
    async (code: string): Promise<{ id: number | null; label: string }> => {
      try {
        const data = await getRealEstateService().getProductInventoryDropdown({
          page: 1,
          page_size: 20,
          search: code,
          project: projectId,
          source_type: sourceType || undefined,
          source_exchange: sourceType === SourceType.F0 ? sourceExchangeId || undefined : undefined,
        })
        const wanted = normalize(code)
        const match = (data?.results ?? []).find(
          (r) => normalize(r.code) === wanted || normalize(r.unit_number) === wanted
        )
        if (!match) return { id: null, label: '' }
        return { id: match.id, label: match.unit_number || match.code || String(match.id) }
      } catch {
        return { id: null, label: '' }
      }
    },
    [projectId, sourceType, sourceExchangeId]
  )

  const handleFile = useCallback(
    async (file: File) => {
      setIsParsing(true)
      setFileName(file.name)
      try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]!]
        if (!sheet) {
          toastService.error('Không đọc được sheet đầu tiên trong file.')
          setRows([])
          return
        }
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
        const headerRowIndex = matrix.findIndex((r) => r.some((c) => String(c).trim() !== ''))
        if (headerRowIndex === -1) {
          toastService.error('File không có dữ liệu.')
          setRows([])
          return
        }

        const headers = (matrix[headerRowIndex] as unknown[]).map((h) => normalize(h))
        const col = (predicate: (h: string) => boolean) => headers.findIndex(predicate)
        const codeCol = col((h) => h.includes('ma can') || h.includes('macan'))
        const periodCol = col((h) => h.includes('loai ky') || h === 'ky' || h.includes('loaiky'))
        // "% TT đợt" → normalized contains "tt"; no other template column does.
        const pctCol = col((h) => h.includes('tt'))
        const priceCol = col((h) => h.includes('gia'))
        const bonusCol = col((h) => h.includes('thuong'))
        const deductionCol = col((h) => h.includes('khau tru') || h.includes('khautru'))

        if (codeCol === -1) {
          toastService.error('Không tìm thấy cột "Mã căn" trong file. Vui lòng dùng đúng mẫu.')
          setRows([])
          return
        }

        const dataRows = matrix
          .slice(headerRowIndex + 1)
          .filter((r) => String(r[codeCol] ?? '').trim() !== '')

        if (dataRows.length > MAX_IMPORT_ROWS) {
          toastService.warning(
            `File có ${dataRows.length} dòng, chỉ nhập tối đa ${MAX_IMPORT_ROWS} dòng đầu.`
          )
        }
        const limited = dataRows.slice(0, MAX_IMPORT_ROWS)

        const parsed: ParsedRow[] = await Promise.all(
          limited.map(async (r, idx) => {
            const rawCode = String(r[codeCol] ?? '').trim()
            const messages: string[] = []

            const { id, label } = await resolveCode(rawCode)
            if (id == null) messages.push('Không tìm thấy mã căn trong dự án đã chọn')

            const periodCell = periodCol >= 0 ? String(r[periodCol] ?? '').trim() : ''
            let periodType: InvestorReconciliationSheetCreateItemValues['period_type'] | null = null
            if (periodCell === '') {
              periodType = RECON_PERIOD_TYPE_OPTIONS[0]!.value
            } else {
              const mapped = PERIOD_TYPE_BY_NORMALIZED.get(normalize(periodCell))
              if (mapped) periodType = mapped
              else messages.push(`Loại kỳ không hợp lệ: "${periodCell}"`)
            }

            const progressToPct = pctCol >= 0 ? parseNumber(r[pctCol]) : 0
            if (progressToPct > 100) messages.push('% TT đợt > 100, sẽ được giới hạn về 100')

            const feeCalculationPrice = priceCol >= 0 ? parseNumber(r[priceCol]) : 0
            const supplementaryAmount = bonusCol >= 0 ? parseNumber(r[bonusCol]) : 0
            const feeDeduction = deductionCol >= 0 ? parseNumber(r[deductionCol]) : 0

            const hasHardError = id == null || periodType == null
            const status: RowStatus = hasHardError
              ? 'error'
              : messages.length > 0
                ? 'warning'
                : 'ok'

            return {
              rowNumber: idx + 1,
              rawCode,
              resolvedId: id,
              resolvedLabel: label,
              periodType,
              progressToPct: progressToPct > 100 ? 100 : progressToPct,
              feeCalculationPrice,
              supplementaryAmount,
              feeDeduction,
              status,
              messages,
            }
          })
        )

        setRows(parsed)
      } catch {
        toastService.error('Không phân tích được file Excel. Vui lòng kiểm tra định dạng .xlsx.')
        setRows([])
      } finally {
        setIsParsing(false)
      }
    },
    [resolveCode]
  )

  const validRows = rows.filter((r) => r.status !== 'error')
  const errorCount = rows.length - validRows.length

  const handleConfirm = useCallback(() => {
    const items = validRows.map((r) => {
      const base = createEmptyInvestorReconciliationSheetItem()
      return {
        ...base,
        product_inventory_id: r.resolvedId as number,
        period_type: r.periodType ?? base.period_type,
        pct_period_commission:
          r.progressToPct != null && r.progressToPct > 0 ? r.progressToPct : null,
        amt_period_commission: null,
        fee_calculation_price: r.feeCalculationPrice,
        // Cột "thưởng" Excel = tổng thưởng đại lý + ghi nhận luôn kỳ này (1 cột nhập, vào sub_total).
        shared_bonus_amount: r.supplementaryAmount,
        shared_bonus_period_amount: r.supplementaryAmount,
        fee_deduction: r.feeDeduction,
      }
    })
    if (items.length === 0) {
      toastService.warning('Không có dòng hợp lệ để nhập.')
      return
    }
    onImport(items)
    toastService.success(`Đã nhập ${items.length} căn từ Excel.`)
    setRows([])
    setFileName('')
    onOpenChange(false)
  }, [validRows, onImport, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Nhập danh sách căn từ Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              loading={isParsing}
            >
              Chọn file .xlsx
            </Button>
            {fileName && (
              <span className="typo-body-sm-regular text-content-dark-2 truncate">{fileName}</span>
            )}
          </div>

          <p className="typo-body-xs-regular text-content-dark-3">
            Cột: Mã căn · Loại kỳ · % TT đợt · Giá tính phí · Thưởng · Khấu trừ. Tối đa{' '}
            {MAX_IMPORT_ROWS} dòng. Dòng lỗi (mã căn không khớp / loại kỳ sai) sẽ bị bỏ qua.
          </p>

          {rows.length > 0 && (
            <>
              <div className="max-h-[360px] overflow-auto">
                <Table.Root>
                  <Table.Header className="bg-background-2 [&_th]:!align-middle">
                    <Table.Row>
                      <Table.ColumnHeaderCell className="px-3 py-2">TT</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="px-3 py-2">Mã căn</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="px-3 py-2">Loại kỳ</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="px-3 py-2">% TT</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="px-3 py-2">
                        Giá tính phí
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="px-3 py-2">
                        Trạng thái
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((r) => (
                      <Table.Row key={r.rowNumber} className="border-border-1 border-b">
                        <Table.Cell className="px-3 py-2 text-center">{r.rowNumber}</Table.Cell>
                        <Table.Cell className="px-3 py-2">
                          {r.resolvedLabel ? `${r.rawCode} → ${r.resolvedLabel}` : r.rawCode}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2">
                          {r.periodType ? RECON_PERIOD_TYPE_LABELS[r.periodType] : '-'}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2 text-right">
                          {r.progressToPct != null ? formatPercent(r.progressToPct) : '-'}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2 text-right">
                          {r.feeCalculationPrice.toLocaleString('vi-VN')}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <Chip
                              label={STATUS_LABEL[r.status]}
                              variant={STATUS_VARIANT[r.status]}
                              size="small"
                              type="outlined"
                            />
                            {r.messages.length > 0 && (
                              <span className="typo-body-xs-regular text-content-dark-3">
                                {r.messages.join('; ')}
                              </span>
                            )}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
              <p className="typo-body-sm-regular text-content-dark-2">
                Hợp lệ: <b>{validRows.length}</b>
                {errorCount > 0 && (
                  <>
                    {' · '}Bỏ qua (lỗi):{' '}
                    <b className="text-semantic-danger-default">{errorCount}</b>
                  </>
                )}
              </p>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={validRows.length === 0}>
              Nhập {validRows.length > 0 ? `(${validRows.length})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvestorReconciliationImportDialog
