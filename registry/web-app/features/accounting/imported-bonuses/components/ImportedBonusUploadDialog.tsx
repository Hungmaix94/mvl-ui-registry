import { useState } from 'react'
import * as XLSX from 'xlsx'
import AppDialog from '@/components/dialog/AppDialog'
import { Button, Select, TextField } from '@/components/ui'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (data: {
    year: number
    month: number
    note: string
    entries: Array<{
      employee_id: string
      bonus_type: 'AD_SUPPORT' | 'RECOGNITION' | 'TET' | 'OTHER'
      amount: string
      is_taxable: boolean
      already_paid_externally: boolean
      note: string
    }>
  }) => void | Promise<void>
  loading?: boolean
}

const BONUS_TYPE_MAP: Record<string, 'AD_SUPPORT' | 'RECOGNITION' | 'TET' | 'OTHER'> = {
  'hỗ trợ quảng cáo': 'AD_SUPPORT',
  ad_support: 'AD_SUPPORT',
  'vinh danh': 'RECOGNITION',
  'thưởng vinh danh': 'RECOGNITION',
  recognition: 'RECOGNITION',
  'lễ tết': 'TET',
  'thưởng lễ tết': 'TET',
  tet: 'TET',
  khác: 'OTHER',
  'thưởng khác': 'OTHER',
  other: 'OTHER',
}

export default function ImportedBonusUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  loading,
}: Props) {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [note, setNote] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [parsedEntries, setParsedEntries] = useState<any[] | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        if (data.length <= 1) {
          toastService.error('Tệp Excel trống hoặc không có dòng dữ liệu')
          return
        }

        const entries: any[] = []
        // Skip header row
        for (let i = 1; i < data.length; i++) {
          const row = data[i]
          if (row.length === 0 || !row[0]) continue

          const rawEmpId = String(row[0] || '').trim()
          const rawType = String(row[1] || '')
            .trim()
            .toLowerCase()
          const rawAmount = row[2]
          const rowNote = String(row[3] || '').trim()
          const rawPit = row[4]

          if (!rawEmpId) {
            toastService.warning(`Dòng ${i + 1}: Mã nhân viên không được để trống`)
            continue
          }
          const employee_id = rawEmpId

          const bonus_type = BONUS_TYPE_MAP[rawType]
          if (!bonus_type) {
            toastService.warning(`Dòng ${i + 1}: Loại thưởng không hợp lệ: ${row[1]}`)
            continue
          }

          const amountVal = Number(rawAmount)
          if (isNaN(amountVal) || amountVal < 0) {
            toastService.warning(`Dòng ${i + 1}: Số tiền không hợp lệ: ${rawAmount}`)
            continue
          }

          const pitVal = rawPit !== undefined && rawPit !== null ? Number(rawPit) : 0
          const pit_withheld_at_payment = isNaN(pitVal) || pitVal < 0 ? '0' : pitVal.toString()

          entries.push({
            employee_id,
            bonus_type,
            amount: amountVal.toString(),
            is_taxable: true,
            already_paid_externally: bonus_type === 'TET',
            note: rowNote || `Import ${bonus_type}`,
            pit_withheld_at_payment,
          })
        }

        setParsedEntries(entries)
        toastService.success(`Đã đọc thành công ${entries.length} dòng dữ liệu từ file Excel`)
      } catch (err) {
        toastService.error('Có lỗi xảy ra khi đọc tệp Excel')
        console.error(err)
      }
    }
    reader.readAsBinaryString(selectedFile)
  }

  const handleConfirm = async () => {
    if (!year || !month) {
      const message = 'Vui lòng chọn kỳ tháng/năm'
      toastService.error(message)
      // AppDialog đóng dialog khi onConfirm kết thúc bình thường — throw kèm cờ
      // isValidationError để giữ dialog mở, không thì mất hết file/kỳ vừa chọn.
      throw Object.assign(new Error(message), { isValidationError: true })
    }
    if (!parsedEntries || parsedEntries.length === 0) {
      const message = 'Chưa có dữ liệu Excel hợp lệ được chọn'
      toastService.error(message)
      throw Object.assign(new Error(message), { isValidationError: true })
    }

    try {
      await onSuccess({
        year: Number(year),
        month: Number(month),
        note: note || `Đợt thưởng imported tháng ${month}/${year}`,
        entries: parsedEntries,
      })
    } catch (err) {
      const detail = extractErrorMessage(err)
      toastService.error(detail)
      // Giữ dialog mở để sửa lại (vd đổi kỳ tháng) thay vì phải chọn lại file từ đầu.
      throw Object.assign(new Error(detail), { isApiError: true })
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = (new Date().getFullYear() - 2 + i).toString()
    return { value: y, label: y }
  })

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString()
    return { value: m, label: `Tháng ${m.padStart(2, '0')}` }
  })

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const wsData = [
      ['Mã nhân viên', 'Loại thưởng', 'Số tiền (VND)', 'Ghi chú', 'Thuế đã khấu (VND)'],
      ['MV000000715', 'AD_SUPPORT', 1500000, 'Hỗ trợ chi phí chạy Ads dự án A', 0],
      ['MV000000203', 'RECOGNITION', 5000000, 'Thưởng vinh danh Best Seller tháng', 500000],
      ['MV000001910', 'TET', 2000000, 'Thưởng Tết dương lịch', 0],
      ['MV000004193', 'OTHER', 1000000, 'Thưởng nóng ngoài giao dịch', 0],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_imported_bonuses.xlsx')
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import danh sách Thưởng & hỗ trợ quảng cáo"
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleConfirm}
      confirmText="Import dữ liệu"
      loading={loading}
      content={
        <div className="flex min-w-[500px] flex-col gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Chọn năm"
              options={yearOptions}
              value={year}
              onChange={(val) => setYear(String(val || ''))}
              clearable={false}
            />
            <Select
              label="Chọn tháng"
              options={monthOptions}
              value={month}
              onChange={(val) => setMonth(String(val || ''))}
              clearable={false}
            />
          </div>

          <TextField
            label="Ghi chú đợt"
            placeholder="VD: Đợt thưởng Vinh danh & chạy Ads tháng này"
            value={note}
            onChange={(val) => setNote(val)}
          />

          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-neutral-700">Chọn file Excel</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="text-sm text-neutral-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            {parsedEntries && (
              <span className="mt-1.5 text-xs font-semibold text-green-600">
                ✓ Đã nạp {parsedEntries.length} bản ghi hợp lệ từ: {file?.name}
              </span>
            )}
          </div>

          <div className="border-border-1 mt-2 flex items-center justify-between border-t pt-3">
            <span className="text-[12px] text-neutral-500">
              * Loại thưởng hợp lệ: AD_SUPPORT, RECOGNITION, TET, OTHER
            </span>
            <Button
              variant="link"
              size="small"
              className="p-0 font-bold text-blue-600"
              onClick={handleDownloadTemplate}
            >
              Tải file mẫu template.xlsx
            </Button>
          </div>
        </div>
      }
    />
  )
}
