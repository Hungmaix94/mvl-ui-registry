import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { IconButton, Table } from '@/components/ui'
import { IconPencilsimple } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { formatCurrencyVND } from '@/utils/common'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import type { components } from '@/api/schema'
import {
  useUpdatePayoutBatchLine,
  type PayoutBatchLinePatch,
} from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import { EditableNetCell } from '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchLineCells'
import {
  EditPayoutLineBankDialog,
  type PayoutLineBankTarget,
} from '@/features/accounting/employee-payout-batches/components/EditPayoutLineBankDialog'
import { EmployeePayoutBatchStatus as EmployeeCommissionPayoutBatchStatus } from '@/constants/api-schema-aliases'

type EmployeeCommissionPayoutBatch = components['schemas']['EmployeeCommissionPayoutBatch']
type EmployeeCommissionPayoutBatchLine = components['schemas']['EmployeeCommissionPayoutBatchLine']

type Props = {
  record: EmployeeCommissionPayoutBatch
}

type LineRow = EmployeeCommissionPayoutBatchLine & {
  net: number
  total: number
  pit: number
  basic: number
  bonus: number
}

function LinesTable({ record }: { record: EmployeeCommissionPayoutBatch }) {
  const lines = record.lines ?? []
  const queryClient = useQueryClient()
  const { mutateAsync: updateLine } = useUpdatePayoutBatchLine()
  const [editingLine, setEditingLine] = useState<PayoutLineBankTarget | null>(null)

  const ability = useAbility()
  // Both edit affordances (the inline "Thực nhận" cell and the bank dialog) hit
  // `PATCH /employee-payout-batch-lines/{id}/`, so without this permission they must not render at
  // all — otherwise the accountant types a value and only then eats a 403.
  const canEditLine = ability.can('partial_update', 'employeepayoutbatchline')

  const isDraft = record.status === EmployeeCommissionPayoutBatchStatus.DRAFT
  // Bank details move no money, so they stay correctable for as long as the batch itself is open
  // (CR STT13) — only PAID / CANCELLED freezes them. Deliberately NOT gated on the line's
  // `payment_voucher`: `post()` is the only writer of that FK and it also flips the batch to PAID,
  // so the status check already covers the audit-trail case. Gating on the FK as well only locked
  // lines whose batch was rolled back out of PAID — exactly the rows accounting needs to fix.
  const isBatchOpenForBankEdit =
    canEditLine &&
    record.status !== EmployeeCommissionPayoutBatchStatus.PAID &&
    record.status !== EmployeeCommissionPayoutBatchStatus.CANCELLED

  /**
   * Commit one line patch. Rejects with the raw error so the caller can decide where to surface it
   * — the dialog renders the BE message inline, the inline cell has no such surface and toasts.
   */
  const patchLine = useCallback(
    async (lineId: number, patch: PayoutBatchLinePatch) => {
      await updateLine({ id: lineId, patch })
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.DETAIL(record.id),
      })
      toastService.success('Cập nhật thành công')
    },
    [updateLine, queryClient, record.id]
  )

  const handleSaveLine = useCallback(
    async (lineId: number, patch: PayoutBatchLinePatch) => {
      try {
        await patchLine(lineId, patch)
      } catch (err) {
        toastService.error(extractErrorMessage(err))
        throw err
      }
    },
    [patchLine]
  )

  const data = useMemo<LineRow[]>(() => {
    return lines.map((line) => {
      const net = Number(line.amount || 0)
      const total = Math.round(net / 0.9)
      const pit = total - net
      const basic = total
      const bonus = 0
      return {
        ...line,
        net,
        total,
        pit,
        basic,
        bonus,
      }
    })
  }, [lines])

  const columns = useMemo<ColumnDef<LineRow>[]>(
    () => [
      {
        accessorKey: 'payee_name_snapshot',
        header: 'Người nhận',
        cell: ({ row }) => (
          <span className="font-semibold text-neutral-900">
            {row.original.payee_name_snapshot ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'basic',
        header: () => <div className="text-right">HH cơ bản</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium text-neutral-900">
            {formatCurrencyVND(row.original.basic)}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        accessorKey: 'bonus',
        header: () => <div className="text-right">HH thưởng</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium text-neutral-900">
            {formatCurrencyVND(row.original.bonus)}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        accessorKey: 'total',
        header: () => <div className="text-right">Tổng HH</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-neutral-900">
            {formatCurrencyVND(row.original.total)}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        accessorKey: 'pit',
        header: () => <div className="text-right">Thuế TNCN</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium text-red-600">
            -{formatCurrencyVND(row.original.pit)}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        accessorKey: 'net',
        header: () => <div className="text-right">Thực nhận</div>,
        // On DRAFT batches, lines without a posted voucher can be edited (partial/installment pay).
        cell: ({ row }) =>
          isDraft && canEditLine && !row.original.payment_voucher ? (
            <EditableNetCell line={row.original} onSave={handleSaveLine} />
          ) : (
            <div className="text-right font-bold text-green-700">
              {formatCurrencyVND(row.original.net)}
            </div>
          ),
        meta: { align: 'right' },
      },
      {
        accessorKey: 'payee_account_snapshot',
        header: 'Số tài khoản',
        cell: ({ row }) => (
          <code className="bg-neutral-30 rounded px-1.5 py-0.5 text-xs text-neutral-600">
            {row.original.payee_account_snapshot || '-'}
          </code>
        ),
      },
      {
        accessorKey: 'payee_bank_name_snapshot',
        header: 'Ngân hàng',
        cell: ({ row }) => (
          <div className="text-neutral-600">{row.original.payee_bank_name_snapshot || '-'}</div>
        ),
      },
      // Bank details are corrected through a dialog rather than inline cells: the two values are
      // sent as one PATCH, and an explicit Save avoids the stray commit-on-blur an inline cell
      // fires when the accountant just tabs through the row.
      {
        id: 'actions',
        header: '',
        size: 56,
        cell: ({ row }) =>
          isBatchOpenForBankEdit ? (
            <IconButton
              type="button"
              variant="ghost"
              size="small"
              aria-label="Sửa số tài khoản và ngân hàng"
              title="Sửa số tài khoản và ngân hàng"
              onClick={() => setEditingLine(row.original)}
            >
              <IconPencilsimple size={16} />
            </IconButton>
          ) : null,
      },
    ],
    [isDraft, canEditLine, isBatchOpenForBankEdit, handleSaveLine]
  )

  const totalBasic = data.reduce((acc, curr) => acc + curr.basic, 0)
  const totalBonus = data.reduce((acc, curr) => acc + curr.bonus, 0)
  const totalTotal = data.reduce((acc, curr) => acc + curr.total, 0)
  const totalPit = data.reduce((acc, curr) => acc + curr.pit, 0)
  const totalNet = data.reduce((acc, curr) => acc + curr.net, 0)

  return (
    <div className="flex flex-col gap-4">
      <Table
        columns={columns}
        data={data}
        className="px-0"
        tableContainerClassName="border-0 shadow-none rounded-none"
        enableRowSelection={false}
      />
      {data.length > 0 && (
        <div className="border-border-1 flex items-center justify-between rounded-md border bg-neutral-50 px-6 py-4 shadow-sm">
          <div className="font-bold text-neutral-900">TỔNG CỘNG</div>
          <div className="flex gap-8 text-sm">
            <div className="flex flex-col items-end gap-1">
              <span className="text-neutral-500">HH cơ bản</span>
              <span className="font-bold text-neutral-900">{formatCurrencyVND(totalBasic)}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-neutral-500">HH thưởng</span>
              <span className="font-bold text-neutral-900">{formatCurrencyVND(totalBonus)}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-neutral-500">Tổng HH</span>
              <span className="font-bold text-neutral-900">{formatCurrencyVND(totalTotal)}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-neutral-500">Thuế TNCN</span>
              <span className="font-bold text-red-600">-{formatCurrencyVND(totalPit)}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-neutral-500">Thực nhận</span>
              <span className="font-bold text-green-700">{formatCurrencyVND(totalNet)}</span>
            </div>
          </div>
        </div>
      )}
      {/* Mounted only while a row is open: seeds fresh from that row, and keeps the bank master out
          of the request waterfall for the (common) view-only visit. `patchLine`, not
          `handleSaveLine` — the dialog renders the BE message inline, so a toast on top of it would
          duplicate the failure and then vanish. */}
      {editingLine && (
        <EditPayoutLineBankDialog
          line={editingLine}
          onClose={() => setEditingLine(null)}
          onSave={patchLine}
        />
      )}
    </div>
  )
}

export function EmployeePayoutBatchDetailLines({ record }: Props) {
  const lines = record.lines ?? []

  return (
    <div className="border-border-1 flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
      <div className="border-border-1 mb-2 flex items-center justify-between border-b pb-3">
        <h3 className="text-[14px] font-bold text-neutral-800">Danh sách thanh toán</h3>
        <span className="text-sm font-medium text-neutral-500">
          Tổng số: {lines.length} nhân sự
        </span>
      </div>
      <LinesTable record={record} />
    </div>
  )
}
