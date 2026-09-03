import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Table, Flex } from '@radix-ui/themes'
import { useNavigate } from 'react-router-dom'
import { Check, Eye, RotateCcw, Send, Undo2, X } from 'lucide-react'

import { APP_PATH } from '@/routes/AppRoute.constant'
import { formatDate } from '@/utils/date-utils'
import { Button, Chip, Text, TextArea } from '@/components/ui'
import { IconPencil } from '@/assets/icons'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import {
  useApproveTbcCommission,
  useCommissionWorkspaceSACore,
  useRejectTbcCommission,
  useReopenTbcCommission,
  useRevertTbcCommissionToDraft,
  useSubmitTbcCommission,
} from '@/services/realestate-service'
import toastService from '@/services/toast-service'
import { ColoredValueVariant, TBCCorePeriodRecommended_action, components } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { TbcApprovalStatus } from '@/constants/api-schema-aliases'
import { TBC_APPROVAL_STATUS_VARIANTS, TBC_EDITABLE_STATUSES } from '@/constants/commission'

import CurrentTbcConfigCard, { type CurrentTbcConfigCardPeriod } from './tbc/CurrentTbcConfigCard'
import { renderTbcValueCell } from './tbc/renderTbcValueCell'

type TimeBoundCommission = components['schemas']['TimeBoundCommission']
// Accepts both the schema shape (`TBCCorePeriod`) and the legacy flat shape
// (`CommissionPeriodEntry`). Normalized to a single internal `NormalizedPeriod`.
type PeriodInput =
  | components['schemas']['TBCCorePeriod']
  | (TimeBoundCommission & {
      period_status?: string
      is_current?: boolean
      can_edit?: boolean
      can_delete?: boolean
      can_reopen?: boolean
      recommended_action?: string
      lock_reason?: string | null
    })

export type SaleAllocationTbcCommissionTableProps = {
  saleAllocationId: number
  isReadOnly?: boolean
  highlightActiveDate?: string | null
  hideCurrentConfig?: boolean
}

// `recommended_action = "reopen"` — BE trả về khi cấu hình bị khoá vì ĐÃ DUYỆT (chứ
// không phải vì đã phát sinh giao dịch). Viết chuỗi thô có chủ đích: giá trị này chưa
// có trong enum `TBCCorePeriodRecommended_action` sinh từ schema.
// TODO(schema): đổi sang `TBCCorePeriodRecommended_action.reopen` sau `yarn api:update`
// đầu tiên chạy sau khi BE deploy.
const REOPEN_ACTION = 'reopen'

// Row tints — applied based on derived row state. Pulled from the data-color token scale.
const ROW_TINT_ACTIVE = 'bg-data-green-disabled' // is_current
const ROW_TINT_PENDING = 'bg-data-orange-disabled' // approval_status = pending
const NOTE_COLUMN_MAX_WIDTH = 'max-w-60' // 240px — keeps long notes wrapped without breaking layout

type NormalizedPeriod = {
  record: TimeBoundCommission
  period_status: string
  /** Trạng thái duyệt của kỳ (ClickUp 86exm4ud9). Đây là cột Trạng thái trên bảng. */
  approval_status: TbcApprovalStatus
  is_current: boolean
  can_edit: boolean
  can_delete: boolean
  /** Cấu hình đã duyệt có gỡ về nháp để sửa lại được không — xem `can_reopen` ở BE. */
  can_reopen: boolean
  recommended_action?: string
  lock_reason?: string | null
  __version: string
  __ts: number
}

function normalizeAndVersionPeriods(periods: PeriodInput[] = []): NormalizedPeriod[] {
  const flat = periods.map((p) => {
    const wrapped = p as unknown as {
      record?: TimeBoundCommission
      period_status?: string
      is_current?: boolean
      can_edit?: boolean
      can_delete?: boolean
      can_reopen?: boolean
      recommended_action?: string
      lock_reason?: string | null
      entry?: {
        record?: TimeBoundCommission
        period_status?: string
        is_current?: boolean
      }
    }

    const record = wrapped.record ?? wrapped.entry?.record ?? ({} as TimeBoundCommission)
    const period_status = wrapped.period_status ?? wrapped.entry?.period_status ?? 'fallback'
    const is_current = !!(wrapped.is_current ?? wrapped.entry?.is_current)

    // Bản ghi có từ trước migration đã được backfill sang phía đã duyệt, nên
    // `approval_status` luôn có mặt. Vẫn để mặc định `draft` phòng khi đọc phải
    // một payload cũ đang nằm trong cache React Query — an toàn theo hướng
    // "coi như chưa duyệt" thay vì lỡ hiện Đang áp dụng cho thứ chưa ai ký.
    const approval_status = (record?.approval_status ??
      TbcApprovalStatus.draft) as TbcApprovalStatus

    return {
      record,
      period_status,
      approval_status,
      is_current,
      can_edit: !!wrapped.can_edit,
      can_delete: !!wrapped.can_delete,
      can_reopen: !!wrapped.can_reopen,
      recommended_action: wrapped.recommended_action,
      lock_reason: wrapped.lock_reason ?? null,
      __ts: record?.effective_from ? new Date(record.effective_from).getTime() : -Infinity,
    }
  })

  // Sort ascending by effective_from to assign v1 = oldest, vN = newest.
  const ascending = [...flat].sort((a, b) => a.__ts - b.__ts)
  const versioned = ascending.map((p, i) => ({ ...p, __version: `v${i + 1}` }))

  // Render newest first.
  return versioned.sort((a, b) => b.__ts - a.__ts)
}

function getRecordId(record: TimeBoundCommission | undefined): number | undefined {
  if (!record) return undefined
  const id = (record as { id?: number }).id
  return typeof id === 'number' ? id : undefined
}

export default function SaleAllocationTbcCommissionTable({
  saleAllocationId,
  isReadOnly = false,
  highlightActiveDate,
  hideCurrentConfig = false,
}: SaleAllocationTbcCommissionTableProps) {
  const navigate = useNavigate()
  const { displayConfirm, displayClose, displayFormContent, setLoading } = useDialog()
  const ability = useAbility()
  const { data: workspace, isLoading } = useCommissionWorkspaceSACore(saleAllocationId)

  // Nhãn trạng thái đến từ backend (`TimeBoundCommission_ApprovalStatus`), không phải
  // từ một map tiếng Việt viết tay ở FE — xem docs/ai/patterns.md § useAppConstant.
  const { keysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.TIME_BOUND_COMMISSION_APPROVAL_STATUS],
  })
  const approvalStatusLabels = keysMap.get(
    APP_CONSTANT_KEY.REALESTATE.TIME_BOUND_COMMISSION_APPROVAL_STATUS
  ) as Record<string, string> | undefined

  const { mutateAsync: submitTbc } = useSubmitTbcCommission()
  const { mutateAsync: approveTbc } = useApproveTbcCommission()
  const { mutateAsync: rejectTbc } = useRejectTbcCommission()
  const { mutateAsync: revertTbc } = useRevertTbcCommissionToDraft()
  const { mutateAsync: reopenTbc } = useReopenTbcCommission()

  // Hai tầng gác, và chúng KHÁC nhau: quyền (vai trò có được làm việc này không) và
  // trạng thái (bản ghi đang ở đâu trong vòng đời). Thiếu tầng quyền thì người lập thấy
  // nút Duyệt rồi ăn 403; thiếu tầng trạng thái thì bấm Duyệt trên bản nháp và ăn 400.
  const canSubmit = ability.can('submit', 'sa_tbc')
  const canApprove = ability.can('approve', 'sa_tbc')
  const canReject = ability.can('reject', 'sa_tbc')
  const canRevert = ability.can('revert_to_draft', 'sa_tbc')
  // Mở lại = gỡ chữ ký của người duyệt, nên là quyền của NGƯỜI DUYỆT (bundle
  // `tbc_full`), không phải của thư ký lập cấu hình — đúng ranh giới mà luồng
  // hợp đồng cọc đã đặt: người sửa không tự bỏ được quyết định của cấp trên.
  const canReopen = ability.can('reopen', 'sa_tbc')

  const allPeriods = useMemo(
    () => normalizeAndVersionPeriods(workspace?.periods ?? []),
    [workspace?.periods]
  )

  const cardCurrent: CurrentTbcConfigCardPeriod | null = useMemo(() => {
    if (hideCurrentConfig) return null
    const current = allPeriods.find((p) => p.is_current)
    if (!current) return null
    return { __version: current.__version, record: current.record }
  }, [allPeriods, hideCurrentConfig])

  // Badge "N chờ duyệt". Trước ClickUp 86exm4ud9 nó đếm `period_status === 'upcoming'`,
  // một giá trị BE CHƯA BAO GIỜ phát ra (`_get_period_status` chỉ trả fallback/scheduled/
  // active/expired) — nên badge này là code chết, không lần nào hiện. Giờ nó đếm đúng số
  // cấu hình đang nằm chờ Trưởng phòng Thư ký dự án bấm duyệt.
  const pendingCount = useMemo(
    () => allPeriods.filter((p) => p.approval_status === TbcApprovalStatus.pending).length,
    [allPeriods]
  )

  const currentRecordId = useMemo(() => {
    const current = allPeriods.find((p) => p.is_current)
    return current ? getRecordId(current.record) : undefined
  }, [allPeriods])

  // Cursor-positioned row action menu (mirrors the generic Table's cursor mode).
  const [activeEntry, setActiveEntry] = useState<NormalizedPeriod | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    )
  }

  const totalColumns = 12 // Phiên bản + Trạng thái + Hiệu lực + 8 categories + Ghi chú

  const handleEdit = (id: number) => {
    navigate(
      APP_PATH.PROJECT_SA_TBC_COMMISSION_EDIT.replace(':saId', String(saleAllocationId)).replace(
        ':id',
        String(id)
      )
    )
  }

  const handleCreate = (cloneId?: number) => {
    let path = APP_PATH.PROJECT_SA_TBC_COMMISSION_CREATE.replace(':saId', String(saleAllocationId))
    if (cloneId) {
      path += `?cloneFrom=${cloneId}`
    }
    navigate(path)
  }

  // Đây là chỗ DUY NHẤT người dùng được báo rằng cấu hình sắp rời khỏi engine hoa
  // hồng. Backend cố ý không chặn — nó không đoán được ý người dùng — nhưng trong
  // lúc cấu hình ở trạng thái Nháp thì hợp đồng cọc lập mới sẽ rơi xuống cấu hình
  // kế tiếp trong cascade, hoặc bị chặn nếu không còn cấu hình nào.
  const runReopen = (entry: NormalizedPeriod) =>
    runApprovalAction(
      entry,
      {
        title: 'Mở lại cấu hình',
        description:
          'Cấu hình sẽ về trạng thái Nháp và NGỪNG áp dụng cho hợp đồng cọc lập từ bây giờ, ' +
          'cho tới khi được trình duyệt và duyệt lại.',
        confirmText: 'Mở lại',
        done: 'Đã mở lại cấu hình để chỉnh sửa',
      },
      (id) => reopenTbc({ saPk: saleAllocationId, id })
    )

  const handleRowActionClick = (entry: NormalizedPeriod, action: 'edit' | 'detail') => {
    const recordId = getRecordId(entry.record)
    if (!recordId) return

    if (action === 'detail') {
      navigate(
        APP_PATH.PROJECT_SA_TBC_COMMISSION_DETAIL.replace(
          ':saId',
          String(saleAllocationId)
        ).replace(':id', String(recordId)),
        { state: { from: window.location.pathname + window.location.search } }
      )
      return
    }

    // action === 'edit' — preserve lock-aware clone flow
    if (!entry.can_edit) {
      if (entry.recommended_action === TBCCorePeriodRecommended_action.clone_new_period) {
        displayConfirm({
          title: 'Cấu hình đang bị khóa',
          description: `${entry.lock_reason || 'Cấu hình đã khóa'}. Bạn có muốn tạo mới cấu hình từ đây không?`,
          confirmText: 'Tạo period mới',
          onConfirm: () => {
            handleCreate(recordId)
            displayClose()
          },
        })
      } else if (
        entry.recommended_action === TBCCorePeriodRecommended_action.historical_correction
      ) {
        toastService.warning(
          'Cấu hình đã khóa do đã phát sinh giao dịch. Vui lòng liên hệ Admin để điều chỉnh!'
        )
      } else if (entry.recommended_action === REOPEN_ACTION) {
        // Khoá vì ĐÃ DUYỆT, chưa giao dịch nào dùng — gỡ được, nhưng chỉ người
        // duyệt gỡ. Thư ký lập chỉ nhận lời nhắc đi xin, không thấy nút.
        if (canReopen) {
          displayConfirm({
            title: 'Cấu hình đã duyệt',
            description: `${entry.lock_reason || 'Cấu hình đã được duyệt.'} Mở lại ngay để chỉnh sửa?`,
            confirmText: 'Mở lại',
            cancelText: 'Huỷ',
            onConfirm: () => {
              displayClose()
              runReopen(entry)
            },
          })
        } else {
          toastService.warning(
            'Cấu hình đã được duyệt. Vui lòng liên hệ Trưởng phòng Thư ký dự án để mở lại.'
          )
        }
      } else {
        toastService.warning(entry.lock_reason || 'Chỉnh sửa đã bị khóa.')
      }
      return
    }

    handleEdit(recordId)
  }

  const closeActionMenu = () => {
    setActiveEntry(null)
    setCursorPos(null)
  }

  // ── Luồng duyệt (ClickUp 86exm4ud9) ─────────────────────────────────
  // Không tự bắt lỗi ở đây: cả bốn hook đã bật `showErrorToast`, nên BE từ chối
  // (thiếu quyền, hoặc người khác vừa đổi trạng thái bản ghi) là người dùng thấy
  // ngay lý do thật thay vì một cú bấm im lặng.

  const runApprovalAction = (
    entry: NormalizedPeriod,
    config: { title: string; description: string; confirmText: string; done: string },
    run: (id: number) => Promise<unknown>
  ) => {
    const recordId = getRecordId(entry.record)
    if (!recordId) return

    displayConfirm({
      title: config.title,
      description: config.description,
      confirmText: config.confirmText,
      cancelText: 'Huỷ',
      onConfirm: async () => {
        // setLoading khoá nút xác nhận trong lúc chờ API. Không có nó, bấm đúp là gửi
        // hai lệnh duyệt: lệnh thứ hai trả 400 vì trạng thái đã đổi, và người dùng nhận
        // một toast lỗi ngay sau một thao tác vừa thành công.
        setLoading(true)
        try {
          await run(recordId)
          toastService.success(config.done)
          displayClose()
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleReject = (entry: NormalizedPeriod) => {
    const recordId = getRecordId(entry.record)
    if (!recordId) return

    let reason = ''
    displayFormContent({
      title: 'Từ chối cấu hình',
      description: 'Lý do sẽ hiện lại cho người lập để họ sửa và trình duyệt lại.',
      content: (
        <div className="p-4">
          <TextArea
            label="Lý do từ chối"
            placeholder="Nhập lý do..."
            rows={4}
            onChange={(value) => {
              reason = value
            }}
          />
        </div>
      ),
      confirmText: 'Từ chối',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        // Bắt buộc nhập: cấu hình bị trả về mà không nói vì sao thì người lập chỉ
        // có thể đoán, và thường sẽ trình lại y nguyên.
        //
        // Phải NÉM lỗi kèm `isValidationError`, không được `return` sớm:
        // `GlobalDialog.handleConfirm` đóng dialog sau khi `onConfirm` resolve, và chỉ
        // giữ nó mở khi bắt được cờ này. Dùng `return` thì toast lỗi hiện lên nhưng
        // dialog vẫn đóng, người dùng mất luôn ô nhập vừa gõ dở (đã đo bằng Chrome MCP).
        if (!reason.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          throw Object.assign(new Error('Thiếu lý do từ chối'), { isValidationError: true })
        }
        try {
          setLoading(true)
          await rejectTbc({ saPk: saleAllocationId, id: recordId, reason: reason.trim() })
          toastService.success('Đã từ chối cấu hình')
          displayClose()
        } finally {
          setLoading(false)
        }
      },
    })
  }

  // Single click opens the action menu at the cursor. A double-click (text
  // selection) cancels the pending open via the debounce timer; an active text
  // selection (drag-select) is also left untouched.
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, entry: NormalizedPeriod) => {
    if (isReadOnly) return

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      return
    }

    const x = event.clientX
    const y = event.clientY

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
      if (window.getSelection()?.toString()) return
      setCursorPos({ x, y })
      setActiveEntry(entry)
    }, 300)
  }

  const handleRowDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {!hideCurrentConfig && <CurrentTbcConfigCard current={cardCurrent} />}

      <div>
        <Flex justify="between" align="center" className="mb-4">
          <Flex gap="3" align="center">
            <h3 className="text-content-dark-1 m-0 text-base font-semibold">Lịch sử cấu hình</h3>
            {pendingCount > 0 && (
              <Chip
                variant={ColoredValueVariant.ORANGE}
                size="small"
                label={`${pendingCount} chờ duyệt`}
              />
            )}
          </Flex>
          {!isReadOnly && (
            <Button
              type="button"
              onClick={() => handleCreate(currentRecordId)}
              variant="secondary-border"
            >
              Tạo thiết lập mới
            </Button>
          )}
        </Flex>

        <div className="border-border-1 overflow-x-auto border bg-white">
          <Table.Root className="tbc-history-table table-no-radius h-full w-full" variant="surface">
            <Table.Header className="relative z-10 w-full whitespace-nowrap">
              {/* Outer header row — grouped underlines */}
              <Table.Row className="bg-background-2 border-border-1 border-b">
                <Table.ColumnHeaderCell
                  rowSpan={2}
                  className="border-border-1 text-content-dark-1 bg-background-2 border-r px-4 py-3 font-medium"
                >
                  <div className="typo-body-sm-semibold flex h-full w-full items-center justify-center text-center">
                    <b>Phiên bản</b>
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  rowSpan={2}
                  className="border-border-1 text-content-dark-1 bg-background-2 border-r px-4 py-3 font-medium"
                >
                  <div className="typo-body-sm-semibold flex h-full w-full items-center justify-center text-center">
                    <b>Trạng thái</b>
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  rowSpan={2}
                  className="border-border-1 text-content-dark-1 bg-background-2 border-r px-4 py-3 font-medium"
                >
                  <div className="typo-body-sm-semibold flex h-full w-full items-center justify-center text-center">
                    <b>Hiệu lực</b>
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  colSpan={3}
                  className="border-border-1 text-content-dark-1 !border-b-data-blue-default bg-background-2 border-r border-b-2 px-4 py-3 text-center align-middle font-medium"
                >
                  <b className={'typo-body-sm-semibold'}>Chủ đầu tư trả MV</b>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  colSpan={3}
                  className="border-border-1 text-content-dark-1 !border-b-data-red-default bg-background-2 border-r border-b-2 px-4 py-3 text-center align-middle font-medium"
                >
                  <b className={'typo-body-sm-semibold'}>Chia cho Sale</b>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  rowSpan={2}
                  className="border-border-1 text-content-dark-1 !border-b-data-green-default bg-background-2 border-r border-b-2 px-4 py-3 font-medium"
                >
                  <div className="flex h-full w-full items-center justify-center text-center">
                    <b className={'typo-body-sm-semibold'}>Tỉ lệ doanh thu</b>
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  rowSpan={2}
                  className="border-border-1 text-content-dark-1 !border-b-data-green-default bg-background-2 border-r border-b-2 px-4 py-3 font-medium"
                >
                  <div className="flex h-full w-full items-center justify-center text-center">
                    <b className={'typo-body-sm-semibold'}>Doanh thu KPI Sàn liên kết</b>
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  rowSpan={2}
                  className="border-border-1 text-content-dark-1 bg-background-2 border-r px-4 py-3 font-medium"
                >
                  <div className="flex h-full w-full items-center justify-center text-center">
                    <b className={'typo-body-sm-semibold'}>Ghi chú</b>
                  </div>
                </Table.ColumnHeaderCell>
              </Table.Row>
              {/* Inner header row — leaf labels for the two grouped sections */}
              <Table.Row className="bg-background-2">
                <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                  <span className={'typo-body-sm-regular'}>Phí đại lý</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                  <span className={'typo-body-sm-regular'}>Phí đại lý tăng thêm</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                  <span className={'typo-body-sm-regular'}>Thưởng đại lý</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                  <span className={'typo-body-sm-regular'}>HH</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                  <span className={'typo-body-sm-regular'}>Thưởng</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                  <span className={'typo-body-sm-regular'}>Thưởng MV</span>
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body className="bg-white">
              {allPeriods.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={totalColumns} className="py-8 text-center text-gray-500">
                    Chưa có cấu hình lịch sử
                  </Table.Cell>
                </Table.Row>
              ) : (
                allPeriods.map((entry, index) => {
                  // Cột Trạng thái đọc `approval_status`, KHÔNG đọc `period_status`
                  // (ClickUp 86exm4ud9). `approval_status` đã bao trùm trục ngày —
                  // approved / active / expired — nên hiện cả hai sẽ mâu thuẫn: một kỳ
                  // đã tới ngày hiệu lực nhưng chưa ai duyệt thì `period_status` nói
                  // "Đang áp dụng" trong khi commission engine không hề thấy nó.
                  const statusVariant =
                    TBC_APPROVAL_STATUS_VARIANTS[entry.approval_status] ??
                    TBC_APPROVAL_STATUS_VARIANTS[TbcApprovalStatus.draft]
                  // Rơi về chính giá trị enum khi chưa nạp được app_constants — thà hiện
                  // 'pending' còn hơn hiện ô trống, vì ô trống đọc như "không có trạng thái".
                  const statusLabel =
                    approvalStatusLabels?.[entry.approval_status] ?? entry.approval_status
                  const { record } = entry

                  let isActive = entry.is_current
                  if (highlightActiveDate) {
                    const refTime = new Date(highlightActiveDate).getTime()
                    const fromTime = record?.effective_from
                      ? new Date(record.effective_from).getTime()
                      : 0
                    const toTime = record?.effective_to
                      ? new Date(record.effective_to).getTime()
                      : Infinity
                    isActive = refTime >= fromTime && refTime <= toTime
                  }

                  const isPending = entry.approval_status === TbcApprovalStatus.pending
                  // Chỉ tô xanh khi kỳ này VỪA đang trong khoảng ngày VỪA đã được duyệt.
                  // Kỳ chưa duyệt mà tô xanh là nói dối: nó không hề chi phối giao dịch nào.
                  const rowTint =
                    isActive && entry.approval_status === TbcApprovalStatus.active
                      ? ROW_TINT_ACTIVE
                      : isPending
                        ? ROW_TINT_PENDING
                        : 'bg-white'

                  return (
                    <Table.Row
                      key={getRecordId(record) ?? index}
                      onClick={(e) => handleRowClick(e, entry)}
                      onDoubleClick={handleRowDoubleClick}
                      className={`border-border-1 hover:bg-surface-primary-hover ${isReadOnly ? '' : 'cursor-pointer'} border-b transition-colors ${rowTint}`}
                    >
                      <Table.Cell className="border-border-1 text-content-dark-1 typo-body-base-medium border-r px-4 py-4 align-middle whitespace-nowrap">
                        {entry.__version}
                      </Table.Cell>
                      <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle whitespace-nowrap">
                        <Chip
                          variant={statusVariant}
                          size="small"
                          label={statusLabel}
                          showDot={entry.approval_status === TbcApprovalStatus.active}
                        />
                      </Table.Cell>
                      <Table.Cell className="border-border-1 text-content-dark-1 typo-body-base-regular border-r px-4 py-4 align-middle whitespace-nowrap">
                        {record?.effective_from ? formatDate(record.effective_from) : '—'}
                        {' → '}
                        {record?.effective_to ? formatDate(record.effective_to) : '—'}
                      </Table.Cell>
                      {/* Chủ đầu tư trả MV */}
                      {renderTbcValueCell(record, 'agency_fee')}
                      {renderTbcValueCell(record, 'investor_bonus')}
                      {renderTbcValueCell(record, 'shared_bonus')}
                      {/* Chia cho Sale — HH = sale_commission, Thưởng = investor_bonus_to_sale,
                          Thưởng MV = staff_incentive (MVL tự chi, chỉ có số tiền) */}
                      {renderTbcValueCell(record, 'sale_commission')}
                      {renderTbcValueCell(record, 'investor_bonus_to_sale')}
                      {renderTbcValueCell(record, 'staff_incentive')}
                      {/* Tỉ lệ doanh thu */}
                      {renderTbcValueCell(record, 'revenue')}
                      {/* Doanh thu KPI Sàn liên kết */}
                      {renderTbcValueCell(record, 'kpi_revenue_slk')}
                      <Table.Cell className="border-border-1 text-content-dark-1 typo-body-base-regular px-4 py-4 align-middle">
                        <Text className={`line-clamp-2 block ${NOTE_COLUMN_MAX_WIDTH}`}>
                          {record?.note || '—'}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )
                })
              )}
            </Table.Body>
          </Table.Root>
        </div>
      </div>

      {/* Cursor-positioned row action menu */}
      {activeEntry &&
        cursorPos &&
        (() => {
          const MENU_WIDTH = 160
          let left = cursorPos.x
          if (typeof window !== 'undefined' && left + MENU_WIDTH > window.innerWidth) {
            left = Math.max(0, left - MENU_WIDTH)
          }
          return (
            <>
              <button
                type="button"
                aria-label="Đóng menu"
                className="animate-in fade-in-0 fixed inset-0 z-40 duration-200"
                onClick={closeActionMenu}
              />
              <div
                role="menu"
                style={{ position: 'fixed', top: cursorPos.y, left }}
                className="border-border-1 animate-in fade-in-0 zoom-in-90 z-50 w-[160px] rounded-md border bg-white p-1 shadow-md duration-300 ease-out"
              >
                <div className="flex flex-col space-y-1">
                  <button
                    type="button"
                    className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                    onClick={() => {
                      handleRowActionClick(activeEntry, 'detail')
                      closeActionMenu()
                    }}
                  >
                    <span className="flex h-4 w-4 items-center justify-center">
                      <Eye size={16} />
                    </span>
                    <span className="w-fit">Xem chi tiết</span>
                  </button>
                  {activeEntry.can_edit && (
                    <button
                      type="button"
                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                      onClick={() => {
                        handleRowActionClick(activeEntry, 'edit')
                        closeActionMenu()
                      }}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        <IconPencil size={16} />
                      </span>
                      <span className="w-fit">Sửa</span>
                    </button>
                  )}

                  {/* Luồng duyệt — mỗi nút chỉ hiện khi CẢ quyền lẫn trạng thái cho phép */}
                  {canSubmit && TBC_EDITABLE_STATUSES.includes(activeEntry.approval_status) && (
                    <button
                      type="button"
                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                      onClick={() => {
                        runApprovalAction(
                          activeEntry,
                          {
                            title: 'Trình duyệt cấu hình',
                            description:
                              'Cấu hình sẽ chuyển sang Chờ duyệt và chỉ áp dụng sau khi Trưởng phòng Thư ký dự án duyệt.',
                            confirmText: 'Trình duyệt',
                            done: 'Đã trình duyệt cấu hình',
                          },
                          (id) => submitTbc({ saPk: saleAllocationId, id })
                        )
                        closeActionMenu()
                      }}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        <Send size={16} />
                      </span>
                      <span className="w-fit">Trình duyệt</span>
                    </button>
                  )}

                  {canApprove && activeEntry.approval_status === TbcApprovalStatus.pending && (
                    <button
                      type="button"
                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                      onClick={() => {
                        runApprovalAction(
                          activeEntry,
                          {
                            title: 'Duyệt cấu hình',
                            description:
                              'Sau khi duyệt, cấu hình sẽ áp dụng theo đúng khoảng ngày hiệu lực của nó.',
                            confirmText: 'Duyệt',
                            done: 'Đã duyệt cấu hình',
                          },
                          (id) => approveTbc({ saPk: saleAllocationId, id })
                        )
                        closeActionMenu()
                      }}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        <Check size={16} />
                      </span>
                      <span className="w-fit">Duyệt</span>
                    </button>
                  )}

                  {canReject && activeEntry.approval_status === TbcApprovalStatus.pending && (
                    <button
                      type="button"
                      className="text-action-primary-red-default hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                      onClick={() => {
                        handleReject(activeEntry)
                        closeActionMenu()
                      }}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        <X size={16} />
                      </span>
                      <span className="w-fit">Từ chối</span>
                    </button>
                  )}

                  {/* Mở lại: chỉ hiện khi BE nói được (`can_reopen`) — đã duyệt và
                      chưa giao dịch nào còn hiệu lực dùng tới. */}
                  {canReopen && activeEntry.can_reopen && (
                    <button
                      type="button"
                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                      onClick={() => {
                        runReopen(activeEntry)
                        closeActionMenu()
                      }}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        <RotateCcw size={16} />
                      </span>
                      <span className="w-fit">Mở lại</span>
                    </button>
                  )}

                  {canRevert && activeEntry.approval_status === TbcApprovalStatus.pending && (
                    <button
                      type="button"
                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                      onClick={() => {
                        runApprovalAction(
                          activeEntry,
                          {
                            title: 'Trả về nháp',
                            description:
                              'Cấu hình rời hàng đợi duyệt và quay lại trạng thái Nháp để sửa tiếp.',
                            confirmText: 'Trả về nháp',
                            done: 'Đã trả cấu hình về nháp',
                          },
                          (id) => revertTbc({ saPk: saleAllocationId, id })
                        )
                        closeActionMenu()
                      }}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        <Undo2 size={16} />
                      </span>
                      <span className="w-fit">Trả về nháp</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )
        })()}
    </div>
  )
}
