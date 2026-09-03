import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import AppDialog from '@/components/dialog/AppDialog'
import { Button, CurrencyInput, IconButton, Select, TextField } from '@/components/ui'
import { IconPlus, IconTrash } from '@/assets/icons'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import {
  useCommissionTransfer,
  useCommissionTransferCaps,
  useCreateCommissionTransfer,
  useSetCommissionTransferTargets,
  type CommissionTransfer,
  TransferSourceBucket,
} from '@/features/accounting/monthly-summaries/services/commission-transfer-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatCurrencyVND } from '@/utils/common'

/**
 * "Khấu trừ hoa hồng quản lý để thưởng".
 *
 * Một phiếu = một người bị khấu trừ + N người được thưởng, tổng hai bên luôn khớp vì
 * backend neo chúng vào cùng một phiếu. Số nhập là tiền TRƯỚC THUẾ nên thuế TNCN của cả
 * hai bên đều được tính lại — đó là lý do có dòng cảnh báo, và là lý do chỉ sửa được khi
 * bảng tổng hợp còn DRAFT.
 *
 * Cap lấy từ endpoint `caps`: nó đã trừ sẵn các phiếu khấu trừ khác của cùng rổ, nên
 * thanh tiến trình phản ánh đúng số còn khấu trừ được.
 */

const MIN_REASON_LENGTH = 30

type TargetRow = {
  employeeId: number | null
  amount: number
  note: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
  /** Người bị khấu trừ. */
  employeeId: number
  /** Truyền vào để sửa phiếu đang có; bỏ trống là tạo mới. */
  transfer?: CommissionTransfer
  /** Id phiếu cần sửa — dialog tự nạp (mục khấu trừ chỉ có id, không có danh sách người nhận). */
  transferId?: number
  onSuccess?: () => void
}

const emptyRow = (): TargetRow => ({ employeeId: null, amount: 0, note: '' })

export default function CommissionTransferDialog({
  open,
  onOpenChange,
  year,
  month,
  employeeId,
  transfer: transferProp,
  transferId,
  onSuccess,
}: Props) {
  const { data: fetchedTransfer } = useCommissionTransfer(transferId, {
    enabled: open && !!transferId,
  })
  const transfer = transferProp || fetchedTransfer
  const isEdit = !!transfer
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<TargetRow[]>([emptyRow()])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()

  const createMutation = useCreateCommissionTransfer()
  const setTargetsMutation = useSetCommissionTransferTargets()
  const { data: caps } = useCommissionTransferCaps(
    { employee: employeeId, year, month },
    { enabled: open }
  )

  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
  })

  useEffect(() => {
    if (!open) return
    if (transfer) {
      setRows(
        (transfer.targets || []).map((t) => ({
          employeeId: t.target_employee?.id ?? null,
          amount: Number(t.amount || 0),
          note: t.note || '',
        }))
      )
      setReason(transfer.reason || '')
    } else {
      setRows([emptyRow()])
      setReason('')
    }
    setError(undefined)
  }, [open, transfer])

  const hhqlCap = useMemo(() => {
    const bucket = caps?.buckets?.find((b) => b.bucket === 'MGMT')
    return {
      cap: Number(bucket?.cap || 0),
      // Khi sửa phiếu, phần của chính phiếu này không tính là "đã dùng".
      used: Number(bucket?.used || 0) - (isEdit ? Number(transfer?.total_amount || 0) : 0),
    }
  }, [caps, isEdit, transfer])

  const entered = useMemo(() => rows.reduce((sum, r) => sum + Number(r.amount || 0), 0), [rows])
  const available = Math.max(hhqlCap.cap - hhqlCap.used, 0)
  const overCap = entered > available
  const progressPct = available > 0 ? Math.min((entered / available) * 100, 100) : 0

  const updateRow = (index: number, patch: Partial<TargetRow>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const validate = (): string | undefined => {
    if (rows.length === 0) return 'Phải có ít nhất một người được thưởng.'
    if (rows.some((r) => !r.employeeId)) return 'Vui lòng chọn người được thưởng cho mọi dòng.'
    if (rows.some((r) => Number(r.amount || 0) <= 0)) return 'Số tiền mỗi dòng phải lớn hơn 0.'
    if (rows.some((r) => r.employeeId === employeeId))
      return 'Không thể khấu trừ để thưởng cho chính người đó.'
    const ids = rows.map((r) => r.employeeId)
    if (new Set(ids).size !== ids.length) return 'Có người được thưởng bị nhập trùng.'
    if (reason.trim().length < MIN_REASON_LENGTH) return `Lý do phải từ ${MIN_REASON_LENGTH} ký tự.`
    if (overCap)
      return `Tổng khấu trừ vượt hoa hồng quản lý còn lại của kỳ (${formatCurrencyVND(available)}).`
    return undefined
  }

  const handleConfirm = async () => {
    const message = validate()
    if (message) {
      setError(message)
      // AppDialog đóng dialog khi handler kết thúc bình thường; phải THROW kèm cờ
      // isValidationError thì nó mới giữ dialog lại để người dùng đọc lỗi và sửa,
      // nếu không kế toán sẽ tưởng đã lưu thành công.
      throw Object.assign(new Error(message), { isValidationError: true })
    }
    setError(undefined)

    const targets = rows.map((row) => ({
      target_employee: row.employeeId as number,
      amount: String(row.amount),
      note: row.note,
    }))

    try {
      if (isEdit && transfer) {
        await setTargetsMutation.mutateAsync({ id: transfer.id, data: { targets } })
      } else {
        await createMutation.mutateAsync({
          year,
          month,
          source_employee: employeeId,
          source_bucket: TransferSourceBucket.MGMT,
          reason: reason.trim(),
          targets,
        })
      }
      // KHÔNG gọi aggregate_all: service đã re-aggregate đúng người bị khấu trừ + từng
      // người được thưởng trong transaction.on_commit. Gọi thêm ở đây vừa thừa (chạy lại
      // CẢ kỳ) vừa deadlock với lần aggregate đang chạy — đã gặp 500 trên dev.
      queryClient.invalidateQueries({ queryKey: ['commission-transfers'] })
      toastService.success(isEdit ? 'Đã cập nhật phiếu khấu trừ' : 'Đã tạo phiếu khấu trừ')
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      const detail = extractErrorMessage(err)
      setError(detail)
      toastService.error(detail)
      // Giữ dialog mở để sửa lại thay vì mất hết dữ liệu vừa nhập.
      throw Object.assign(new Error(detail), { isApiError: true })
    }
  }

  const isPending = createMutation.isPending || setTargetsMutation.isPending

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Sửa phiếu khấu trừ HHQL để thưởng' : 'Khấu trừ hoa hồng quản lý để thưởng'}
      size="2xl"
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleConfirm}
      confirmText={isEdit ? 'Lưu thay đổi' : 'Lưu khấu trừ'}
      loading={isPending}
      content={
        <div className="flex w-full flex-col gap-4 py-4">
          <div className="border-border-1 bg-background-2 rounded-md border p-3.5 text-sm">
            <div className="flex justify-between">
              <span className="text-content-dark-3">Hoa hồng quản lý kỳ này</span>
              <span className="text-content-dark-1 font-medium">
                {formatCurrencyVND(hhqlCap.cap)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-dark-3">Còn khấu trừ được</span>
              <span className="text-content-dark-1 font-medium">
                {formatCurrencyVND(available)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-content-dark-3">Đã nhập</span>
              <span
                className={
                  overCap
                    ? 'text-action-primary-red-default font-semibold'
                    : 'text-content-dark-1 font-medium'
                }
              >
                {formatCurrencyVND(entered)}
              </span>
            </div>
            <div className="bg-background-3 mt-2 h-2 w-full overflow-hidden rounded">
              <div
                className={
                  overCap ? 'bg-action-primary-red-default h-full' : 'bg-data-green-default h-full'
                }
                style={{ width: `${overCap ? 100 : progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="text-content-dark-2 flex items-center gap-2 px-0.5 text-xs font-semibold">
              <div className="min-w-0 flex-1">Thưởng cho</div>
              <div className="w-36">Số tiền</div>
              <div className="w-40">Ghi chú</div>
              <div className="w-9 text-center">Xóa</div>
            </div>

            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    label=""
                    value={row.employeeId ? String(row.employeeId) : null}
                    onChange={(val) => updateRow(index, { employeeId: val ? Number(val) : null })}
                    loadOptions={async (params) => {
                      const res = await loadEmployeeOptions(params)
                      const excludeIds = new Set([
                        String(employeeId),
                        ...rows
                          .filter((_, i) => i !== index && _.employeeId)
                          .map((r) => String(r.employeeId)),
                      ])
                      return {
                        ...res,
                        items: res.items.filter((item) => !excludeIds.has(String(item.value))),
                      }
                    }}
                    loadInitialOptions={loadInitialEmployeeOptions}
                    placeholder="Chọn nhân viên"
                    searchPlaceholder="Tìm kiếm nhân viên..."
                    enableSearch
                    clearable
                  />
                </div>
                <div className="w-36">
                  <CurrencyInput
                    label=""
                    value={row.amount}
                    hideZero
                    onChange={(val) => updateRow(index, { amount: Number(val || 0) })}
                    suffix="VNĐ"
                  />
                </div>
                <div className="w-40">
                  <TextField
                    label=""
                    value={row.note}
                    onChange={(val) => updateRow(index, { note: val })}
                  />
                </div>
                <div className="flex w-9 justify-center">
                  <IconButton
                    type="button"
                    aria-label="Xóa dòng"
                    variant="text"
                    showBackground
                    disabled={rows.length === 1}
                    className="text-action-primary-red-default hover:bg-background-6 disabled:opacity-40"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary-border"
              size="small"
              className="border-action-primary-red-default text-action-primary-red-default hover:bg-background-6 mt-1 flex w-full items-center justify-center border border-dashed bg-transparent"
              childrenClassName="flex items-center justify-center gap-1.5"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <IconPlus size={16} />
              <span>Thêm người được thưởng</span>
            </Button>
          </div>

          <TextField
            label={`Lý do khấu trừ (tối thiểu ${MIN_REASON_LENGTH} ký tự)`}
            placeholder="Ví dụ: Khấu trừ HHQL T7/2026 thưởng nhóm hỗ trợ theo QĐ 15/QĐ-MVL"
            value={reason}
            onChange={setReason}
            required
          />

          <p className="text-content-dark-3 text-xs">
            Khấu trừ TRƯỚC thuế: thuế TNCN của cả người bị khấu trừ và người được thưởng sẽ được
            tính lại. Tiền đi theo đợt chi quản lý, giống nguồn HHQL.
          </p>

          {error && <p className="text-action-primary-red-default text-xs font-medium">{error}</p>}
        </div>
      }
    />
  )
}
