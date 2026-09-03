import { Table, Flex } from '@radix-ui/themes'

import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { formatDate } from '@/utils/date-utils'
import { Button, Chip } from '@/components/ui'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { IconPencil, IconTrash } from '@/assets/icons'
import { MoreVertical, Eye, Check, Send, X, RotateCcw } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  useApprovePiTbcCommission,
  useCommissionWorkspacePICore,
  useRejectPiTbcCommission,
  useReopenPiTbcCommission,
  useSubmitPiTbcCommission,
  CommissionPeriodEntry,
  parseCommissionLockError,
} from '@/services/realestate-service'
import { useDeleteProductInventoryTbc } from '@/features/project/product-inventories/services/product-inventory-tbc-service'
import toastService from '@/services/toast-service'
import { formatCurrencyVND, formatPercent } from '@/utils'
import {
  TBC_APPROVAL_STATUS_VARIANTS,
  TBC_EDITABLE_STATUSES,
  TBC_EDIT_SCOPE,
  TBC_EDIT_SCOPE_STYLES,
  TBC_SOURCE,
} from '@/constants/commission'
import { useAbility } from '@/lib/ability'
import { TextArea } from '@/components/ui'
import { TbcApprovalStatus } from '@/constants/api-schema-aliases'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export type ProjectProductInventoryTbcCommissionTableProps = {
  productInventoryId: number
  /** Resolved sale-allocation id of the product inventory — needed to route SA-sourced records to the SA namespace */
  salesAllocationId?: number
  isReadOnly?: boolean
}

const categories = [
  { key: 'agency_fee', label: 'Phí đại lý' },
  { key: 'investor_bonus', label: 'Phí đại lý tăng thêm' },
  { key: 'shared_bonus', label: 'Thưởng đại lý' },
  { key: 'sale_commission', label: 'HH nhân viên bán hàng' },
  { key: 'investor_bonus_to_sale', label: 'Thưởng cho sale' },
  // "Thưởng MV" — mức nền MVL tự bỏ tiền cho mỗi giao dịch. Chỉ có
  // `amt_staff_incentive`; không có `pct_` lẫn cờ VAT.
  { key: 'staff_incentive', label: 'Thưởng MV' },
  { key: 'revenue', label: 'Tỉ lệ doanh thu' },
  { key: 'kpi_revenue_slk', label: 'Doanh thu KPI Sàn liên kết' },
] as const

// Chỉ nhóm "Chủ đầu tư trả MV" mới cho cấu hình VAT — nhóm "Chia cho Sale"
// (sale_commission, investor_bonus_to_sale) LUÔN không VAT theo quy tắc nghiệp
// vụ (HDSD 1.3 Cấu hình hoa hồng, FR-M3) và bị BE ép cứng False khi tính hoa
// hồng thật (deal_commission_config_service._apply_vat_rules), nên dù cột
// is_*_include_vat vẫn tồn tại trong schema, không được hiện chip VAT cho 2
// khoản này — xem ClickUp 86exzg7u1. staff_incentive/revenue/kpi_revenue_slk
// không có cờ VAT trong schema nên vốn đã không thuộc set.
const VAT_AWARE_CATEGORIES = new Set<string>(['agency_fee', 'investor_bonus', 'shared_bonus'])

export default function ProjectProductInventoryTbcCommissionTable({
  productInventoryId,
  salesAllocationId,
  isReadOnly = false,
}: ProjectProductInventoryTbcCommissionTableProps) {
  const navigate = useNavigate()
  const saId = salesAllocationId != null ? String(salesAllocationId) : ''
  const { displayConfirm, displayClose, displayFormContent, setLoading } = useDialog()

  // Nhãn trạng thái duyệt đến từ backend, không phải map tiếng Việt viết tay —
  // xem docs/ai/patterns.md § useAppConstant.
  const { keysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.TIME_BOUND_COMMISSION_APPROVAL_STATUS],
  })
  const approvalStatusLabels = keysMap.get(
    APP_CONSTANT_KEY.REALESTATE.TIME_BOUND_COMMISSION_APPROVAL_STATUS
  ) as Record<string, string> | undefined

  const ability = useAbility()
  const { mutateAsync: submitPiTbc } = useSubmitPiTbcCommission()
  const { mutateAsync: approvePiTbc } = useApprovePiTbcCommission()
  const { mutateAsync: rejectPiTbc } = useRejectPiTbcCommission()
  const { mutateAsync: reopenPiTbc } = useReopenPiTbcCommission()
  const canSubmitTbc = ability.can('submit', 'pi_tbc')
  const canApproveTbc = ability.can('approve', 'pi_tbc')
  const canRejectTbc = ability.can('reject', 'pi_tbc')
  // Mở lại = gỡ chữ ký của người duyệt, nên là quyền của NGƯỜI DUYỆT (TP TKKD /
  // Admin qua bundle `tbc_full`), không phải của thư ký lập cấu hình.
  const canReopenTbc = ability.can('reopen', 'pi_tbc')

  const { data: workspace, isLoading, refetch } = useCommissionWorkspacePICore(productInventoryId)
  const { mutateAsync: deletePeriod } = useDeleteProductInventoryTbc(
    productInventoryId,
    'tbc-commissions'
  )

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    )
  }

  const commissionPeriods = workspace?.periods || []
  const currentCore = workspace?.current

  const handleEdit = (id: number, source: string) => {
    if (source === TBC_SOURCE.SA) {
      navigate(
        APP_PATH.PROJECT_SA_TBC_COMMISSION_EDIT.replace(':saId', saId as string).replace(
          ':id',
          String(id)
        )
      )
    } else {
      navigate(
        APP_PATH.PROJECT_PRODUCT_INVENTORIES_TBC_EDIT.replace(':saId', saId as string)
          .replace(':id', String(productInventoryId))
          .replace(':tbcId', String(id))
      )
    }
  }

  const handleCreate = (cloneId?: number, source?: string) => {
    let path = APP_PATH.PROJECT_PRODUCT_INVENTORIES_TBC_CREATE.replace(
      ':saId',
      saId as string
    ).replace(':id', String(productInventoryId))
    if (cloneId) {
      path += `?cloneFrom=${cloneId}`
      if (source) {
        path += `&cloneFromType=${source}`
      }
    }
    navigate(path)
  }

  const handleDelete = async (id: number) => {
    displayConfirm({
      title: 'Xóa cấu hình',
      description: 'Bạn có chắc chắn muốn xóa cấu hình bộ Phí & Thưởng này không?',
      onConfirm: async () => {
        try {
          await deletePeriod(id)
          toastService.success('Đã xóa thành công!')
          displayClose()
          refetch()
        } catch (error) {
          const lockError = parseCommissionLockError(error)
          if (lockError.recommended_action === 'clone_new_period') {
            displayConfirm({
              title: 'Cấu hình đang bị khóa',
              description: `${lockError.lock_reason}. Bạn có muốn tạo mới cấu hình từ đây không?`,
              confirmText: 'Tạo period mới',
              onConfirm: () => {
                handleCreate(id, workspace?.periods?.[0]?.record?.tbc_source || TBC_SOURCE.SA)
                displayClose()
              },
            })
          } else if (lockError.recommended_action === 'historical_correction') {
            toastService.warning(
              'Cấu hình đã khóa do đã phát sinh hoa hồng. Vui lòng liên hệ Admin để điều chỉnh!'
            )
            displayClose()
          } else {
            displayClose()
          }
        }
      },
    })
  }

  // ── Luồng duyệt cho cấu hình RIÊNG của căn (ClickUp 86exm4ud9) ──────
  // Dòng kế thừa từ Bảng hàng không đi qua đây; chúng được quản ở màn Bảng hàng,
  // đúng ranh giới mà nút Sửa/Xoá đã đặt sẵn.
  const runPiApproval = (
    entry: CommissionPeriodEntry,
    action: 'submit' | 'approve' | 'reject' | 'reopen'
  ) => {
    const recordId = entry.record?.id || entry.id
    if (!recordId) return

    if (action === 'reject') {
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
          // Phải NÉM kèm `isValidationError`: `GlobalDialog` đóng dialog sau khi
          // `onConfirm` resolve, `return` sớm chỉ hiện toast rồi vẫn đóng và người
          // dùng mất ô nhập đang gõ dở.
          if (!reason.trim()) {
            toastService.error('Vui lòng nhập lý do từ chối')
            throw Object.assign(new Error('Thiếu lý do từ chối'), { isValidationError: true })
          }
          setLoading(true)
          try {
            await rejectPiTbc({ piPk: productInventoryId, id: recordId, reason: reason.trim() })
            toastService.success('Đã từ chối cấu hình')
            displayClose()
            refetch()
          } finally {
            setLoading(false)
          }
        },
      })
      return
    }

    const configs = {
      submit: {
        title: 'Trình duyệt cấu hình',
        description:
          'Cấu hình sẽ chuyển sang Chờ duyệt và chỉ áp dụng sau khi Trưởng phòng Thư ký dự án duyệt.',
        confirmText: 'Trình duyệt',
        done: 'Đã trình duyệt cấu hình',
        run: () => submitPiTbc({ piPk: productInventoryId, id: recordId }),
      },
      approve: {
        title: 'Duyệt cấu hình',
        description: 'Sau khi duyệt, cấu hình sẽ áp dụng theo đúng khoảng ngày hiệu lực của nó.',
        confirmText: 'Duyệt',
        done: 'Đã duyệt cấu hình',
        run: () => approvePiTbc({ piPk: productInventoryId, id: recordId }),
      },
      // Đây là chỗ DUY NHẤT người dùng được báo rằng cấu hình sắp rời khỏi engine
      // hoa hồng. Backend cố ý không chặn: nó không đoán được ý người dùng, nhưng
      // trong lúc cấu hình ở trạng thái Nháp thì hợp đồng cọc lập mới sẽ rơi xuống
      // cấu hình kế tiếp trong cascade — hoặc bị chặn nếu không còn cấu hình nào.
      reopen: {
        title: 'Mở lại cấu hình',
        description:
          'Cấu hình sẽ về trạng thái Nháp và NGỪNG áp dụng cho hợp đồng cọc lập từ bây giờ, ' +
          'cho tới khi được trình duyệt và duyệt lại.',
        confirmText: 'Mở lại',
        done: 'Đã mở lại cấu hình để chỉnh sửa',
        run: () => reopenPiTbc({ piPk: productInventoryId, id: recordId }),
      },
    } as const
    const config = configs[action]

    displayConfirm({
      title: config.title,
      description: config.description,
      confirmText: config.confirmText,
      cancelText: 'Huỷ',
      onConfirm: async () => {
        // setLoading khoá nút xác nhận trong lúc chờ API — không có nó, bấm đúp là
        // gửi hai lệnh duyệt và lệnh thứ hai trả 400 vì trạng thái đã đổi.
        setLoading(true)
        try {
          await config.run()
          toastService.success(config.done)
          displayClose()
          refetch()
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleRowActionClick = (
    entry: CommissionPeriodEntry,
    action: 'edit' | 'delete' | 'clone' | 'detail'
  ) => {
    const recordId = entry.record?.id || entry.id
    if (!recordId) return

    const source =
      entry.record?.tbc_source ||
      entry.tbc_source ||
      entry.entry?.tbc_source ||
      workspace?.periods?.[0]?.record?.tbc_source ||
      'sa'

    if (action === 'detail') {
      // SA-sourced records (inherited config) live under the sale-allocation
      // endpoint, not the PI one — BE flags them recommended_action
      // 'manage_at_sales_allocation'. Routing them to the PI detail page fetches
      // /product-inventories/:id/tbc-commissions/:id which 404s. Send them to the
      // SA detail page (mirrors SaleAllocationTbcCommissionTable). Only genuine
      // PI overrides use the PI detail route.
      if (source === TBC_SOURCE.SA) {
        navigate(
          APP_PATH.PROJECT_SA_TBC_COMMISSION_DETAIL.replace(':saId', saId as string).replace(
            ':id',
            String(recordId)
          ),
          { state: { from: window.location.pathname + window.location.search } }
        )
      } else {
        navigate(
          `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_TBC_EDIT.replace(':saId', saId as string)
            .replace(':id', String(productInventoryId))
            .replace(':tbcId', String(recordId))}?mode=view`
        )
      }
      return
    }

    if (action === 'edit' || action === 'delete') {
      const isEdit = action === 'edit'
      const canAction = isEdit ? entry.can_edit : entry.can_delete

      if (!canAction) {
        if (entry.recommended_action === 'clone_new_period') {
          displayConfirm({
            title: 'Cấu hình đang bị khóa',
            description: `${entry.lock_reason}. Bạn có muốn tạo mới cấu hình từ đây không?`,
            confirmText: 'Tạo period mới',
            onConfirm: () => {
              const record = entry.record || entry
              handleCreate(
                recordId,
                record?.tbc_source ||
                  entry.tbc_source ||
                  entry.entry?.tbc_source ||
                  workspace?.periods?.[0]?.record?.tbc_source ||
                  'sa'
              )
              displayClose()
            },
          })
          return
        } else if (entry.recommended_action === 'historical_correction') {
          toastService.warning(
            'Cấu hình đã khóa do đã phát sinh hoa hồng. Vui lòng liên hệ Admin để điều chỉnh!'
          )
          return
        } else if (entry.recommended_action === 'reopen') {
          // Khoá vì ĐÃ DUYỆT, chưa có giao dịch nào dùng — gỡ được, nhưng chỉ
          // người duyệt gỡ. Thư ký lập chỉ nhận lời nhắc đi xin, không thấy nút.
          if (canReopenTbc) {
            displayConfirm({
              title: 'Cấu hình đã duyệt',
              description: `${entry.lock_reason} Mở lại ngay để chỉnh sửa?`,
              confirmText: 'Mở lại',
              cancelText: 'Huỷ',
              onConfirm: () => {
                displayClose()
                runPiApproval(entry, 'reopen')
              },
            })
          } else {
            toastService.warning(
              'Cấu hình đã được duyệt. Vui lòng liên hệ Trưởng phòng Thư ký dự án để mở lại.'
            )
          }
          return
        } else {
          toastService.error(entry.lock_reason || 'Không thể thực hiện hành động này!')
          return
        }
      }

      if (isEdit) {
        handleEdit(recordId, source)
      } else {
        handleDelete(recordId)
      }
    } else if (action === 'clone') {
      const record = entry.record || entry
      handleCreate(
        recordId,
        record?.tbc_source ||
          entry.tbc_source ||
          entry.entry?.tbc_source ||
          workspace?.periods?.[0]?.record?.tbc_source ||
          'sa'
      )
    }
  }

  const activeRecord = currentCore?.entry?.record

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="border-border-1 mb-6 rounded-[4px] border bg-[#F8F9FA] p-4">
        <h3 className="text-content-dark-1 mb-3 text-sm font-semibold">
          Cấu hình hoa hồng đang được áp dụng
        </h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const pct = (activeRecord as any)?.[`pct_${cat.key}`]
            const amt = (activeRecord as any)?.[`amt_${cat.key}`]
            const includeVat = (activeRecord as any)?.[`is_${cat.key}_include_vat`]

            return (
              <div key={cat.key} className="flex flex-col">
                <span className="text-content-dark-3 mb-1 text-xs">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-content-dark-1 typo-body-base-medium font-medium">
                    {pct == null && amt == null ? (
                      '---'
                    ) : (
                      <>
                        {amt != null ? `${formatCurrencyVND(Number(amt))} VNĐ` : ''}
                        {pct != null && amt != null ? ' / ' : ''}
                        {pct != null ? formatPercent(pct) : ''}
                      </>
                    )}
                  </span>
                  {VAT_AWARE_CATEGORIES.has(cat.key) && (pct != null || amt != null) && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap ${
                        includeVat === true
                          ? 'bg-data-green-disabled text-data-green-hover'
                          : 'bg-data-light-grey-disabled text-content-dark-3'
                      }`}
                    >
                      {includeVat === true ? 'VAT' : 'Không VAT'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-surface-primary-default">
        <Flex justify="between" align="center" className="mb-4">
          <h3 className="text-content-dark-1 m-0 text-base font-semibold">Lịch sử cấu hình</h3>
          {!isReadOnly && (
            <Button
              type="button"
              onClick={() =>
                handleCreate(
                  activeRecord?.id,
                  activeRecord?.tbc_source ||
                    workspace?.periods?.[0]?.record?.tbc_source ||
                    TBC_SOURCE.SA
                )
              }
              variant="secondary-border"
            >
              Tạo thiết lập mới
            </Button>
          )}
        </Flex>
        <div className="border-border-1 overflow-x-auto rounded-none border">
          <div className="w-full">
            <Table.Root
              className="tbc-management-table table-no-radius h-full w-full"
              variant="surface"
            >
              <Table.Header className="relative z-10 h-[44px] w-full whitespace-nowrap">
                <Table.Row className="bg-background-2 border-border-1 border-b">
                  <Table.ColumnHeaderCell
                    className="border-border-1 text-content-dark-3 sticky left-0 z-[2] border-r bg-[#F0F2F5] px-4 py-3 text-center align-middle font-medium"
                    style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }}
                  >
                    STT
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 sticky left-[50px] z-[2] border-r bg-[#F0F2F5] px-4 py-3 align-middle font-medium shadow-[1px_0_0_#e5e7eb]">
                    Thời gian áp dụng
                  </Table.ColumnHeaderCell>
                  {categories.map((c) => (
                    <Table.ColumnHeaderCell
                      key={c.key}
                      className="border-border-1 text-content-dark-3 border-r bg-[#F0F2F5] px-4 py-3 text-right align-middle font-medium"
                    >
                      {c.label}
                    </Table.ColumnHeaderCell>
                  ))}
                  <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 border-r bg-[#F0F2F5] px-4 py-3 text-center align-middle font-medium">
                    Trạng thái
                  </Table.ColumnHeaderCell>

                  {!isReadOnly && (
                    <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 sticky right-0 z-[1] w-[60px] bg-[#F0F2F5] px-4 py-3 text-center align-middle font-medium shadow-[-1px_0_0_#e5e7eb]"></Table.ColumnHeaderCell>
                  )}
                </Table.Row>
              </Table.Header>
              <Table.Body className="bg-white">
                {commissionPeriods.length === 0 ? (
                  <Table.Row>
                    {/* STT + Thời gian áp dụng + categories + Trạng thái, cộng cột thao tác
                        chỉ khi không read-only — để cứng +4 thì ô "chưa có cấu hình" tràn
                        thêm một cột ở chế độ chỉ đọc. */}
                    <Table.Cell
                      colSpan={categories.length + (isReadOnly ? 3 : 4)}
                      className="py-8 text-center text-gray-500"
                    >
                      Chưa có cấu hình lịch sử
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  commissionPeriods.map((entry: any, index: number) => {
                    // Cột Trạng thái đọc `approval_status` (ClickUp 86exm4ud9), KHÔNG đọc
                    // `period_status`. Màn này và màn Bảng hàng liệt kê CÙNG những bản ghi
                    // TimeBoundCommission; để mỗi màn đọc một trục là cùng một cấu hình hiện
                    // hai trạng thái trái ngược — và bản `period_status` là bản nói dối, vì nó
                    // báo "Đang áp dụng" cho cấu hình mà commission engine không hề nhìn thấy.
                    const approvalStatus = ((entry.record || entry)?.approval_status ??
                      TbcApprovalStatus.draft) as TbcApprovalStatus
                    const statusVariant =
                      TBC_APPROVAL_STATUS_VARIANTS[approvalStatus] ??
                      TBC_APPROVAL_STATUS_VARIANTS[TbcApprovalStatus.draft]
                    const statusLabel = approvalStatusLabels?.[approvalStatus] ?? approvalStatus
                    // Dòng kế thừa từ Bảng hàng (edit_scope = sales_allocation) chỉ được
                    // thao tác ở màn Bảng hàng — giữ đúng ranh giới mà nút Sửa/Xoá đã đặt.
                    const editScopeValue = entry.edit_scope || entry.entry?.edit_scope
                    const isPiOwned = editScopeValue !== TBC_EDIT_SCOPE.SALES_ALLOCATION
                    const activeBg =
                      entry.entry?.is_current || entry.is_current ? 'bg-[#CFFFD5]' : 'bg-white'
                    const record = entry.record || entry
                    const editScope = editScopeValue
                    const editScopeStyle = editScope ? TBC_EDIT_SCOPE_STYLES[editScope] : undefined

                    return (
                      <Table.Row
                        key={record?.id || index}
                        className={`border-border-1 hover:bg-surface-primary-hover border-b transition-colors ${activeBg}`}
                      >
                        <Table.Cell className="border-border-1 sticky left-0 z-[1] border-r bg-inherit px-3 py-4 text-center align-middle font-medium text-gray-500">
                          {index + 1}
                        </Table.Cell>
                        <Table.Cell className="border-border-1 sticky left-[50px] z-[1] border-r bg-inherit px-4 py-4 align-middle whitespace-nowrap shadow-[1px_0_0_#e5e7eb]">
                          <div className="flex flex-col items-start gap-1.5">
                            <span>
                              {record?.effective_from
                                ? `Từ ${formatDate(record.effective_from)}`
                                : 'Từ ...'}
                              {record?.effective_to
                                ? ` đến ${formatDate(record.effective_to)}`
                                : ''}
                            </span>
                            {editScopeStyle && (
                              <Chip
                                variant={editScopeStyle.variant}
                                size="small"
                                label={editScopeStyle.label}
                              />
                            )}
                          </div>
                        </Table.Cell>
                        {categories.map((cat) => {
                          const pct = record?.[`pct_${cat.key}`]
                          const amt = record?.[`amt_${cat.key}`]
                          const includeVat = record?.[`is_${cat.key}_include_vat`]
                          return (
                            <Table.Cell
                              key={cat.key}
                              className="border-border-1 border-r px-4 py-4 text-right align-middle whitespace-nowrap"
                            >
                              <div className="flex flex-col items-end gap-1">
                                <span>
                                  {amt != null ? `${formatCurrencyVND(Number(amt))} VNĐ` : ''}
                                  {pct != null && amt != null ? ' / ' : ''}
                                  {pct != null ? formatPercent(pct) : ''}
                                  {pct == null && amt == null ? '---' : ''}
                                </span>
                                {VAT_AWARE_CATEGORIES.has(cat.key) &&
                                  (pct != null || amt != null) && (
                                    <span
                                      className={`rounded px-1 text-[10px] whitespace-nowrap ${
                                        includeVat === true
                                          ? 'bg-data-green-disabled text-data-green-hover'
                                          : 'bg-data-light-grey-disabled text-content-dark-3'
                                      }`}
                                    >
                                      {includeVat === true ? 'VAT' : 'Không VAT'}
                                    </span>
                                  )}
                              </div>
                            </Table.Cell>
                          )
                        })}
                        <Table.Cell className="border-border-1 border-r px-4 py-4 text-center align-middle">
                          <Chip variant={statusVariant} size="small" label={statusLabel} />
                        </Table.Cell>

                        {!isReadOnly && (
                          <Table.Cell className="border-border-1 sticky right-0 z-[1] w-[60px] bg-inherit px-2 py-4 text-center align-middle shadow-[-1px_0_0_#e5e7eb]">
                            <TooltipProvider delayDuration={200}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="text"
                                    iconOnly
                                    className="text-content-dark-1 hover:bg-background-3 h-8 w-8 px-0"
                                  >
                                    <MoreVertical className="h-5 w-5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContentPrimitive
                                  align="end"
                                  sideOffset={4}
                                  className="border-border-1 z-50 w-[160px] rounded-md border bg-white p-1 shadow-md"
                                >
                                  <div className="flex flex-col space-y-1">
                                    <button
                                      type="button"
                                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                      onClick={() => handleRowActionClick(entry, 'detail')}
                                    >
                                      <span className="flex h-4 w-4 items-center justify-center">
                                        <Eye size={16} />
                                      </span>
                                      <span className="w-fit">Chi tiết</span>
                                    </button>
                                    {/* Action Chỉnh sửa */}
                                    <button
                                      type="button"
                                      className={`hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer ${!entry.can_edit && entry.lock_reason ? 'text-content-dark-3 opacity-50' : 'text-content-dark-1'}`}
                                      onClick={() => handleRowActionClick(entry, 'edit')}
                                    >
                                      <span className="flex h-4 w-4 items-center justify-center">
                                        <IconPencil size={16} />
                                      </span>
                                      <span className="w-fit">Chỉnh sửa</span>
                                    </button>

                                    {/* Luồng duyệt (ClickUp 86exm4ud9) — chỉ cho bản ghi
                                        THUỘC căn này; dòng kế thừa từ Bảng hàng phải thao
                                        tác ở màn Bảng hàng, đúng như nút Sửa/Xoá bên trên. */}
                                    {isPiOwned &&
                                      canSubmitTbc &&
                                      TBC_EDITABLE_STATUSES.includes(approvalStatus) && (
                                        <button
                                          type="button"
                                          className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                          onClick={() => runPiApproval(entry, 'submit')}
                                        >
                                          <span className="flex h-4 w-4 items-center justify-center">
                                            <Send size={16} />
                                          </span>
                                          <span className="w-fit">Trình duyệt</span>
                                        </button>
                                      )}
                                    {/* Mở lại: chỉ hiện khi BE nói được (`can_reopen`) —
                                        đã duyệt, thuộc căn này, và chưa giao dịch nào
                                        còn hiệu lực dùng tới. */}
                                    {isPiOwned && canReopenTbc && entry.can_reopen && (
                                      <button
                                        type="button"
                                        className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                        onClick={() => runPiApproval(entry, 'reopen')}
                                      >
                                        <span className="flex h-4 w-4 items-center justify-center">
                                          <RotateCcw size={16} />
                                        </span>
                                        <span className="w-fit">Mở lại</span>
                                      </button>
                                    )}
                                    {isPiOwned &&
                                      canApproveTbc &&
                                      approvalStatus === TbcApprovalStatus.pending && (
                                        <button
                                          type="button"
                                          className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                          onClick={() => runPiApproval(entry, 'approve')}
                                        >
                                          <span className="flex h-4 w-4 items-center justify-center">
                                            <Check size={16} />
                                          </span>
                                          <span className="w-fit">Duyệt</span>
                                        </button>
                                      )}
                                    {isPiOwned &&
                                      canRejectTbc &&
                                      approvalStatus === TbcApprovalStatus.pending && (
                                        <button
                                          type="button"
                                          className="text-data-red-default hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                          onClick={() => runPiApproval(entry, 'reject')}
                                        >
                                          <span className="flex h-4 w-4 items-center justify-center">
                                            <X size={16} />
                                          </span>
                                          <span className="w-fit">Từ chối</span>
                                        </button>
                                      )}

                                    {/* Action Xóa */}
                                    <button
                                      type="button"
                                      className={`hover:bg-data-red-disabled flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer ${!entry.can_delete && entry.lock_reason ? 'text-content-dark-3 opacity-50' : 'text-data-red-default hover:text-data-red-hover'}`}
                                      onClick={() => handleRowActionClick(entry, 'delete')}
                                    >
                                      <span className="flex h-4 w-4 items-center justify-center">
                                        <IconTrash size={16} />
                                      </span>
                                      <span className="w-fit">Xóa</span>
                                    </button>
                                  </div>
                                </PopoverContentPrimitive>
                              </Popover>
                            </TooltipProvider>
                          </Table.Cell>
                        )}
                      </Table.Row>
                    )
                  })
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      </div>
    </div>
  )
}
