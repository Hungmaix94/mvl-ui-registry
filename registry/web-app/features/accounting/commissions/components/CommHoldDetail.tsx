import { useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { PageTitle, Table, type TableAction, Chip, ColumnDef, Dash } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { IconCheck, IconProhibit } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { COMMISSION_ACTION_PERMISSION } from '../constants/commission-permissions'
import { APP_PATH } from '@/routes'
import { ReferenceCode } from '@/components/commons'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service.tsx'
import { CommissionHoldDialog } from '@/features/accounting/commission-splits/components/CommissionHoldDialog'
import {
  type CommissionHold,
  type CommissionHoldGroup,
  useReleaseCommissionHold,
  useCancelCommissionHold,
} from '@/features/accounting/commission-holds/services/commission-hold-service'
import { splitTaxBaseLabel } from '@/features/accounting/commissions/utils/comm-hold-filters'
import {
  AUTO_HOLD_LOCK_HINT,
  HOLD_KIND_LABELS,
  HOLD_ORIGIN_LABELS,
  buildHoldBreakdown,
  isAutoCertHold,
  resolveBeneficiary,
  resolveHoldReceiptVoucher,
} from '@/features/accounting/commissions/utils/comm-hold-group'
import {
  CommissionHoldStatus as HoldStatus,
  CommissionHoldBeneficiaryType as BeneficiaryType,
} from '@/constants/api-schema-aliases'

// Cùng quy ước màu với list (ACTIVE = cam: tiền vẫn đang bị giữ, cần hành động).
const STATUS_VARIANT: Record<HoldStatus, ColoredValueVariant> = {
  [HoldStatus.ACTIVE]: ColoredValueVariant.ORANGE,
  [HoldStatus.RELEASED]: ColoredValueVariant.GREEN,
  [HoldStatus.CANCELLED]: ColoredValueVariant.GREY,
}

const BENEFICIARY_TYPE_VARIANT: Record<BeneficiaryType, ColoredValueVariant> = {
  [BeneficiaryType.EMPLOYEE]: ColoredValueVariant.BLUE,
  [BeneficiaryType.COLLABORATOR]: ColoredValueVariant.ORANGE,
  [BeneficiaryType.EXCHANGE]: ColoredValueVariant.PURPLE,
}

const HOLD_ORIGIN_VARIANT: Record<string, ColoredValueVariant> = {
  MANUAL: ColoredValueVariant.BLUE,
  AUTO_CERT: ColoredValueVariant.ORANGE,
  CARRYOVER: ColoredValueVariant.GREY,
}

type DialogState = { mode: 'release' | 'cancel'; hold: CommissionHold } | null

type SummaryLine = { label: string; value: string; muted?: boolean }

/** Một ô số trong box header (tổng giữ / trước thuế / sau thuế). */
const SummaryCard = ({
  title,
  amount,
  lines,
}: {
  title: string
  amount: number
  lines?: SummaryLine[]
}) => (
  <div className="border-border-1 bg-neutral-2 flex flex-col gap-2 rounded-lg border p-4">
    <span className="text-content-dark-3 text-xs font-semibold uppercase">{title}</span>
    <span className="text-content-dark-1 text-xl font-bold">{formatCurrencyVND(amount)} ₫</span>
    {lines && lines.length > 0 && (
      <div className="flex flex-col gap-1">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-2 text-xs leading-snug">
            <span className="text-content-dark-3">{line.label}</span>
            <span
              className={
                line.muted
                  ? 'text-content-dark-3 whitespace-nowrap'
                  : 'text-content-dark-1 font-medium whitespace-nowrap'
              }
            >
              {line.value}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
)

type CommHoldDetailProps = {
  group: CommissionHoldGroup
  onBack: () => void
}

/**
 * Màn chi tiết một lệnh tạm giữ theo (người nhận × kỳ HH): box header lặp lại đúng thông tin
 * người nhận + tiền của dòng list, bên dưới là danh sách từng lệnh giữ (row DB) với thao tác
 * giải phóng/huỷ. Bảng này trước đây là phần sổ xuống (collapse) trong list.
 */
export default function CommHoldDetail({ group, onBack }: CommHoldDetailProps) {
  const ability = useAbility()
  const canViewSplitSheet = ability.can('retrieve', 'dealperiodworksheet')
  const canViewReceiptVoucher = ability.can('retrieve', 'receiptvoucher')

  const [dialogState, setDialogState] = useState<DialogState>(null)
  const releaseMutation = useReleaseCommissionHold()
  const cancelMutation = useCancelCommissionHold()
  const invalidateQueries = useInvalidateQueries()

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_STATUS_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_HOLD_REASON_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_BENEFICIARY_TYPE_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_TAX_BASE_CHOICES,
    ],
  })
  const statusLabels = keysMap.get(APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_STATUS_CHOICES) as
    | Record<string, string>
    | undefined
  const reasonLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_HOLD_REASON_CHOICES
  ) as Record<string, string> | undefined
  const beneficiaryTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_BENEFICIARY_TYPE_CHOICES
  ) as Record<string, string> | undefined
  const taxBaseLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_TAX_BASE_CHOICES
  ) as Record<string, string> | undefined

  const { name, code, meta } = resolveBeneficiary(group)
  const typeLabel = beneficiaryTypeLabels?.[group.beneficiary_type] ?? group.beneficiary_type
  const typeVariant = BENEFICIARY_TYPE_VARIANT[group.beneficiary_type] ?? ColoredValueVariant.GREY
  const periodLabel = group.commission_period_year
    ? `${String(group.commission_period_month).padStart(2, '0')}/${group.commission_period_year}`
    : '—'
  const breakdown = buildHoldBreakdown(group)

  const handleCloseDialog = () => setDialogState(null)

  const handleConfirmAction = async (reason: string) => {
    if (!dialogState) return
    try {
      if (dialogState.mode === 'release') {
        await releaseMutation.mutateAsync({ id: dialogState.hold.id, data: { reason } })
        toastService.success('Đã giải phóng khoản tạm giữ hoa hồng')
      } else {
        await cancelMutation.mutateAsync({ id: dialogState.hold.id, data: { reason } })
        toastService.success('Đã hủy khoản tạm giữ hoa hồng')
      }
      await invalidateQueries.invalidateByPrefix('accounting/commission-holds')
      handleCloseDialog()
    } catch {
      // error is handled by service layer
    }
  }

  const columns: ColumnDef<CommissionHold>[] = useMemo(
    () => [
      {
        id: 'hold_kind',
        header: 'Loại giữ',
        cell: ({ row }) => (
          <span className="text-content-dark-2 text-sm">
            {row.original.hold_kind
              ? (HOLD_KIND_LABELS[row.original.hold_kind] ?? row.original.hold_kind)
              : '—'}
          </span>
        ),
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'hold_origin',
        header: 'Nguồn',
        cell: ({ row }) => {
          const origin = row.original.hold_origin
          if (!origin) return <Dash />
          return (
            <Flex direction="column" gap="1" align="start">
              <Chip
                label={HOLD_ORIGIN_LABELS[origin] ?? origin}
                variant={HOLD_ORIGIN_VARIANT[origin] ?? ColoredValueVariant.GREY}
                size="small"
                showDot
              />
              {isAutoCertHold(row.original) && row.original.status === HoldStatus.ACTIVE && (
                <span className="text-content-dark-4 text-xs leading-snug">
                  {AUTO_HOLD_LOCK_HINT}
                </span>
              )}
            </Flex>
          )
        },
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'hold_amount',
        header: 'Số tiền giữ',
        cell: ({ row }) => (
          <Flex direction="column" gap="0.5" align="end">
            <span className="text-content-dark-1 text-sm font-semibold">
              {formatCurrencyVND(Number(row.original.hold_amount || 0))} ₫
            </span>
            {Number(row.original.hold_pct || 0) > 0 && (
              <span className="text-content-dark-4 text-xs">
                {formatNumber(Number(row.original.hold_pct) * 100)}% trên{' '}
                {formatCurrencyVND(Number(row.original.original_amount || 0))} ₫
              </span>
            )}
          </Flex>
        ),
        meta: { width: 'w-[170px]', align: 'right' },
      },
      {
        id: 'tax_base',
        header: 'Trước/sau thuế',
        cell: ({ row }) => {
          const taxBase = row.original.tax_base
          if (!taxBase) return <Dash />
          const label = splitTaxBaseLabel(String(taxBaseLabels?.[taxBase] ?? taxBase))
          return (
            <span className="text-content-dark-2 text-sm" title={String(taxBase)}>
              {label.head}
            </span>
          )
        },
        meta: { width: 'w-[130px]' },
      },
      {
        id: 'hold_reason',
        header: 'Lý do giữ',
        cell: ({ row }) => (
          <span className="text-content-dark-2 text-sm">
            {row.original.hold_reason
              ? (reasonLabels?.[row.original.hold_reason] ?? row.original.hold_reason)
              : '—'}
          </span>
        ),
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'receipt_voucher',
        header: 'Phiếu thu',
        cell: ({ row }) => {
          // Một worksheet trải nhiều phiếu thu (mỗi phiếu thu 1 PBTV) mà cấu hình chia dùng
          // chung → phải nêu rõ lệnh giữ này nằm trên lần thu nào.
          const receipt = resolveHoldReceiptVoucher(row.original)
          if (!receipt) return <Dash />
          return (
            <Flex direction="column" gap="0.5" align="start">
              <ReferenceCode
                code={receipt.code}
                linkTo={
                  canViewReceiptVoucher && receipt.id
                    ? APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', String(receipt.id))
                    : undefined
                }
              />
              {receipt.date && (
                <span className="text-content-dark-4 text-xs">{formatDate(receipt.date)}</span>
              )}
            </Flex>
          )
        },
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'source_pbtv',
        header: 'Phiếu chia',
        cell: ({ row }) => {
          const pbtv = row.original.source_pbtv_detail
          // `:id` của route là id WORKSHEET cha, không phải id PBTV (2 màn đọc chung worksheet).
          const pbtvUrl = pbtv?.worksheet
            ? APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL.replace(':id', String(pbtv.worksheet))
            : null
          if (pbtv?.id) {
            return (
              <ReferenceCode
                code={pbtv.code || `#${pbtv.id}`}
                linkTo={canViewSplitSheet && pbtvUrl ? pbtvUrl : undefined}
              />
            )
          }
          return row.original.deal ? (
            <Dash />
          ) : (
            <span className="text-content-dark-4 text-xs">Theo kỳ tháng</span>
          )
        },
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'held_at',
        header: 'Ngày giữ',
        cell: ({ row }) => (
          <span className="text-content-dark-2 text-sm">
            {row.original.held_at ? formatDate(row.original.held_at) : '—'}
          </span>
        ),
        meta: { width: 'w-[110px]' },
      },
      {
        id: 'released_at',
        header: 'Giải phóng',
        cell: ({ row }) => {
          if (!row.original.released_at) return <Dash />
          return (
            <Flex direction="column" gap="0.5" align="start">
              <span className="text-content-dark-2 text-sm">
                {formatDate(row.original.released_at)}
              </span>
              {row.original.release_reason && (
                <span
                  className="text-content-dark-4 line-clamp-2 text-xs"
                  title={row.original.release_reason}
                >
                  {row.original.release_reason}
                </span>
              )}
            </Flex>
          )
        },
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'note',
        header: 'Ghi chú',
        cell: ({ row }) =>
          row.original.note ? (
            <span className="text-content-dark-3 line-clamp-2 text-xs" title={row.original.note}>
              {row.original.note}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Chip
            variant={STATUS_VARIANT[row.original.status as HoldStatus] ?? ColoredValueVariant.GREY}
            label={String(statusLabels?.[String(row.original.status)] ?? row.original.status)}
            size="small"
            showDot
          />
        ),
        meta: { width: 'w-[140px]', align: 'center', frozenRight: true },
      },
    ],
    [canViewSplitSheet, canViewReceiptVoucher, reasonLabels, taxBaseLabels, statusLabels]
  )

  // Hold tự động (CCMG) không có thao tác tay: vòng đời do trigger chứng chỉ ở BE quyết định.
  // Cả Giải phóng lẫn Huỷ đều làm tiền thoát khỏi lệnh giữ nên phải khoá cả hai.
  // Hai mục gọi HAI endpoint khác nhau (`/release/` và `/cancel/`) nên ăn HAI mã khác nhau — gộp
  // chung một mã là hoặc giấu nút của người chỉ có một quyền, hoặc cho họ bấm rồi ăn 403.
  const actions: TableAction<CommissionHold>[] = useMemo(
    () => [
      {
        label: 'Giải phóng',
        icon: <IconCheck color="green" size={16} />,
        show: (hold) =>
          ability.can(
            COMMISSION_ACTION_PERMISSION.RELEASE_HOLD.action,
            COMMISSION_ACTION_PERMISSION.RELEASE_HOLD.subject
          ) &&
          hold.status === HoldStatus.ACTIVE &&
          !isAutoCertHold(hold),
        onClick: (hold) => setDialogState({ mode: 'release', hold }),
      },
      {
        label: 'Hủy tạm giữ',
        icon: <IconProhibit color="red" size={16} />,
        variant: 'danger',
        show: (hold) =>
          ability.can(
            COMMISSION_ACTION_PERMISSION.CANCEL_HOLD.action,
            COMMISSION_ACTION_PERMISSION.CANCEL_HOLD.subject
          ) &&
          hold.status === HoldStatus.ACTIVE &&
          !isAutoCertHold(hold),
        onClick: (hold) => setDialogState({ mode: 'cancel', hold }),
      },
    ],
    [ability]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title={`Chi tiết tạm giữ — ${name}`} enableBackButton handleBackButton={onBack} />

      <div className="flex flex-grow flex-col gap-4 overflow-y-auto pt-4 pb-6">
        {/* Box header: người bị tạm giữ + số tiền (đúng thông tin dòng list) */}
        <div className="px-7">
          <div className="border-border-1 grid grid-cols-1 gap-4 rounded-lg border p-5 lg:grid-cols-[minmax(260px,1fr)_2fr]">
            <Flex direction="column" gap="2" align="start">
              <span className="text-content-dark-1 text-lg leading-snug font-semibold break-words">
                {name}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Chip label={String(typeLabel)} variant={typeVariant} size="small" showDot />
                {code && <span className="text-content-dark-4 text-xs">{code}</span>}
                <span className="text-content-dark-2 text-sm font-medium">Kỳ {periodLabel}</span>
              </div>
              {meta.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {meta.map((m) => (
                    <div key={m.label} className="flex gap-1 text-xs leading-snug">
                      <span className="text-content-dark-4 shrink-0">{m.label}:</span>
                      <span className="text-content-dark-2 break-words">{m.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1 text-xs leading-snug">
                <span className="text-content-dark-4 shrink-0">Giữ gần nhất:</span>
                <span className="text-content-dark-2">
                  {group.latest_held_at ? formatDate(group.latest_held_at) : '—'}
                </span>
              </div>
            </Flex>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SummaryCard
                title="Tổng đang giữ"
                amount={Number(group.total_hold_amount || 0)}
                lines={[
                  { label: 'Đang giữ', value: `${group.active_count} lệnh` },
                  { label: 'Đã giải phóng', value: `${group.released_count} lệnh`, muted: true },
                  { label: 'Đã hủy', value: `${group.cancelled_count} lệnh`, muted: true },
                ]}
              />
              <SummaryCard
                title="Chi tiết giữ (đang giữ)"
                amount={Number(group.total_hold_amount || 0)}
                lines={
                  breakdown.length > 0
                    ? breakdown.map((item) => ({
                        label: item.label,
                        value: `${formatCurrencyVND(item.amount)} ₫`,
                      }))
                    : [{ label: 'Không còn lệnh giữ nào', value: '—', muted: true }]
                }
              />
              <div className="md:col-span-2">
                <SummaryCard
                  title="Trước / sau thuế"
                  amount={Number(group.pre_tax_amount || 0) + Number(group.post_tax_amount || 0)}
                  lines={[
                    {
                      label: 'Trước thuế',
                      value: `${formatCurrencyVND(Number(group.pre_tax_amount || 0))} ₫`,
                    },
                    {
                      label: 'Sau thuế',
                      value: `${formatCurrencyVND(Number(group.post_tax_amount || 0))} ₫`,
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách từng lệnh tạm giữ (row DB) */}
        <div className="flex flex-col gap-2">
          <span className="text-content-dark-1 px-7 text-sm font-semibold">
            Danh sách tạm giữ chi tiết ({group.holds.length})
          </span>
          <Table
            data={group.holds}
            columns={columns}
            totalRecords={group.holds.length}
            showSTT
            sttFrozen
            showActions
            rowActions={actions}
            disableInnerOverflow={true}
            paginationPosition="static"
          />
        </div>
      </div>

      {dialogState && (
        <CommissionHoldDialog
          isOpen={!!dialogState}
          onClose={handleCloseDialog}
          recipientName={name}
          amount={dialogState.hold.hold_amount || 0}
          mode={dialogState.mode}
          loading={releaseMutation.isPending || cancelMutation.isPending}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  )
}
