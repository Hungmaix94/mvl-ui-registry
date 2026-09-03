import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import AppDialog from '@/components/dialog/AppDialog'
import { ReferenceCode } from '@/components/commons'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { DisplayField } from '@/components/commons/DisplayField'
import { PageTitle, TextArea } from '@/components/ui'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { IconInfo } from '@/assets/icons/security-warnings/IconInfo'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import { formatCurrencyVND, formatPct } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils'

import { useDealWorkspace } from '@/features/sales/deals/services/deal-service'
import { useDepositContract } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import FeeSupportRequestActions from '@/features/sales/fee-support-requests/components/FeeSupportRequestActions'
import FeeSupportCalculationTable from '@/features/sales/fee-support-requests/components/FeeSupportCalculationTable'
import FeeSupportRequestApprovalLadder from '@/features/sales/fee-support-requests/components/FeeSupportRequestApprovalLadder'
import FeeSupportRequestDocumentSection from '@/features/sales/fee-support-requests/components/FeeSupportRequestDocumentSection'
import FeeSupportRequestDocumentStatusBadge from '@/features/sales/fee-support-requests/components/FeeSupportRequestDocumentStatusBadge'
import FeeSupportRequestConsentTable from '@/features/sales/fee-support-requests/components/FeeSupportRequestConsentTable'
import FeeSupportRequestOriginBadge from '@/features/sales/fee-support-requests/components/FeeSupportRequestOriginBadge'
import FeeSupportRequestStatusBadge from '@/features/sales/fee-support-requests/components/FeeSupportRequestStatusBadge'
import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_PERMISSION_SUBJECT,
  FeeSupportRequestOrigin,
} from '@/features/sales/fee-support-requests/constants/fee-support-request-constants'
import {
  useApproveFeeSupportRequest,
  useFeeSupportConfirmationLogs,
  useFeeSupportRequest,
  useRejectFeeSupportRequest,
} from '@/features/sales/fee-support-requests/services/fee-support-request-service'
import { useFeeSupportRequestEditor } from '@/features/sales/fee-support-requests/hooks/useFeeSupportRequestEditor'
import {
  feeSupportCustomerCollaboratorLabel,
  feeSupportCustomerLabel,
  feeSupportProjectName,
  feeSupportUnitNumber,
} from '@/features/sales/fee-support-requests/utils/fee-support-record-display'
import { ConfirmationLogsTable } from '@/features/sales/components/ConfirmationLogsTable'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { withRememberedSearch } from '@/utils/list-url-memory'

/** Hiển thị kênh XOR đúng như BE trả — không quy đổi %↔tiền (D9/D16). */
function renderPctOrAmount(pct?: string | null, amount?: string | null): string {
  if (pct) return `${pct}%`
  if (amount) return `${formatCurrencyVND(Number(amount))} VNĐ`
  return '—'
}

/**
 * Chi tiết đề xuất hỗ trợ phí (18.8). Các mục "Mức phí hiện tại" / "Mức hỗ trợ đề
 * xuất" map THẲNG từ BE — FE không tự tính mức HH mới / doanh số giảm / tổng %
 * trần (BE chưa trả các field đó, xem
 * docs/fe_changes_fee_support_request_18_8_20260702.md §6–7).
 *
 * Nhãn dự án / mã căn lấy từ SNAPSHOT trên chính phiếu (CR STT16 — phiếu neo hợp
 * đồng cọc nên không được phụ thuộc deal-workspace); tên khách nay lấy từ
 * `customer_detail` ngay trên phiếu, workspace chỉ còn là fallback cho bản ghi cũ.
 * Khối sao kê (`record.calculation`) do BE tính sẵn — FE chỉ render, tuyệt đối
 * không tính lại tiền.
 *
 * Audit từng cấp KHÔNG còn là BE gap (86ey4vjmp): nhật ký nằm ở endpoint con
 * `/confirmation-logs/`, đọc qua `useFeeSupportConfirmationLogs` và render bằng
 * `ConfirmationLogsTable` dùng chung — đừng đi tìm `confirmation_logs` trên
 * `record`, serializer của phiếu này KHÔNG nhúng nó.
 */
export default function FeeSupportRequestDetailPage() {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const ability = useAbility()
  const queryClient = useQueryClient()

  const { data: record, isLoading, error } = useFeeSupportRequest(id, { enabled: !!id })

  /**
   * Người duyệt từng cấp. Khác HĐ cọc / phiếu TT giao dịch / hoàn cọc (nhúng
   * `confirmation_logs` vào chính serializer), phiếu hỗ trợ phí phơi nhật ký qua
   * ENDPOINT CON nên phải gọi riêng — trước 20/08/2026 màn này không gọi, và đó
   * là toàn bộ lý do "Luồng duyệt" chỉ có tên bước chứ không có tên người.
   */
  const { data: confirmationLogsPage } = useFeeSupportConfirmationLogs(id, { enabled: !!id })
  const confirmationLogs = confirmationLogsPage?.results ?? []

  // Nhãn vai trò lấy từ app-constant: bộ mặc định của bảng dùng chung thiếu
  // `creator` / `sale_director` vốn CHỈ phiếu hỗ trợ phí mới có.
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.CONFIRMATION_TYPE_CHOICES],
  })
  const confirmationTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.CONFIRMATION_TYPE_CHOICES
  ) as Record<string, string> | undefined

  /**
   * CR STT16 — hợp đồng cọc là NEO của phiếu (`record.deposit_contract`), lấy
   * thẳng thay vì đi vòng qua deal-workspace: phiếu tạo từ HĐ cọc có `deal = null`
   * nên đường vòng cũ làm rỗng cả Dự án / Mã căn / nhân sự đồng thuận.
   * Workspace chỉ còn dùng để resolve tên khách của giao dịch (khi đã có deal).
   */
  const depositContractId = record?.deposit_contract ?? 0
  const { data: workspace } = useDealWorkspace(record?.deal ?? 0, { enabled: !!record?.deal })
  const { data: depositContract, isLoading: isLoadingContract } = useDepositContract(
    depositContractId,
    { enabled: !!depositContractId }
  )

  const projectName = feeSupportProjectName(record) ?? workspace?.overview?.project?.name ?? null
  const unitNumber =
    feeSupportUnitNumber(record) ??
    depositContract?.product_inventory_detail?.unit_number ??
    workspace?.overview?.pi?.unit_number ??
    null

  const approveMutation = useApproveFeeSupportRequest()
  const rejectMutation = useRejectFeeSupportRequest()
  const { openEditDialog } = useFeeSupportRequestEditor()

  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const isNotFound = useMemo(() => !isLoading && !record, [isLoading, record])

  const handleBack = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.FEE_SUPPORT_PROPOSAL))
  }, [navigate])

  const closeActionDialog = useCallback(() => {
    setActionType(null)
    setRejectReason('')
  }, [])

  const handleAction = useCallback(async () => {
    if (!record || !actionType) return

    try {
      if (actionType === 'APPROVE') {
        await approveMutation.mutateAsync(id)
        toastService.success('Duyệt đề xuất hỗ trợ phí thành công')
      } else {
        if (!rejectReason.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          return
        }
        await rejectMutation.mutateAsync({ id, data: { reason: rejectReason.trim() } })
        toastService.success('Từ chối đề xuất hỗ trợ phí thành công')
      }

      closeActionDialog()
      queryClient.invalidateQueries({ queryKey: ['sales', 'fee-support-requests'] })
    } catch (err) {
      // Sai cấp/luồng duyệt → BE trả ValidationError; surface nguyên văn qua toast
      handleApiError(err)
    }
  }, [
    record,
    actionType,
    id,
    rejectReason,
    approveMutation,
    rejectMutation,
    queryClient,
    closeActionDialog,
  ])

  const customerName = useMemo(() => {
    if (!record?.customer) return null
    const workspaceCustomer = workspace?.overview?.customer
    if (workspaceCustomer?.id === record.customer) {
      return workspaceCustomer?.name || workspaceCustomer?.full_name || null
    }
    return null
  }, [record?.customer, workspace])

  const isMobileOrigin = record?.origin === FeeSupportRequestOrigin.mobile_sale

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Chi tiết đề xuất hỗ trợ phí"
        idLabel={record?.code || ''}
        enableBackButton
        handleBackButton={handleBack}
        customActions={
          record && (
            <FeeSupportRequestActions
              status={record.status}
              origin={record.origin}
              createdBy={record.created_by}
              onApprove={() => setActionType('APPROVE')}
              onReject={() => setActionType('REJECT')}
              onEdit={() => openEditDialog(record, depositContract?.sales_staff ?? [])}
            />
          )
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={!!error}
        hasPermission={ability.can(FEE_SUPPORT_ACTION.RETRIEVE, FEE_SUPPORT_PERMISSION_SUBJECT)}
      >
        {record && (
          <div className="flex flex-col gap-5 px-10 py-4">
            {/* Section 1: Thông tin chung */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <DisplayField label="Mã đề xuất" value={record.code} />
                  <DisplayField
                    label="Trạng thái"
                    value={
                      <span className="flex flex-wrap items-center gap-2">
                        <FeeSupportRequestStatusBadge status={record.status} />
                        <FeeSupportRequestDocumentStatusBadge status={record.document_status} />
                      </span>
                    }
                  />
                  <DisplayField
                    label="Nguồn tạo"
                    value={<FeeSupportRequestOriginBadge origin={record.origin} />}
                  />
                  <DisplayField
                    label="Ngày tạo"
                    value={record.created_at ? formatDate(record.created_at) : '—'}
                  />
                  {/* Phiếu tạo từ HĐ cọc chưa sinh deal → neo về hợp đồng cọc thay vì bỏ trống. */}
                  <DisplayField
                    label="Giao dịch"
                    value={
                      record.deal ? (
                        <ReferenceCode
                          code={`GD #${record.deal}`}
                          linkTo={APP_PATH.DEAL_DETAIL.replace(':id', String(record.deal))}
                        />
                      ) : depositContractId ? (
                        <span className="flex flex-col gap-0.5">
                          <ReferenceCode
                            code={depositContract?.code || `HĐ cọc #${depositContractId}`}
                            linkTo={APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(
                              ':id',
                              String(depositContractId)
                            )}
                          />
                          <span className="typo-body-sm-regular text-content-dark-3">
                            Chưa sinh giao dịch
                          </span>
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <DisplayField label="Dự án" value={projectName || '—'} />
                  <DisplayField label="Mã căn" value={unitNumber || '—'} />
                  <DisplayField
                    label="Duyệt hiệu lực lúc"
                    value={record.approved_at ? formatDate(record.approved_at) : '—'}
                  />
                </div>
              </div>
            </div>

            <SeparatorHorizontal />

            {/* Section 2: Mức phí hiện tại (snapshot BE chụp lúc tạo — chỉ xem).
                Snapshot chỉ đại diện 1 sale (anchor), không phải trung bình/từng
                sale — help text giải thích để tránh hiểu nhầm khi deal có nhiều
                sale tham gia hoặc khi BE chưa resolve được (hiện "—"), theo phát
                hiện ở ClickUp 86ey4vqak. */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1 inline-flex items-center gap-1.5">
                Mức phí hiện tại (tại thời điểm tạo phiếu)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Giải thích: Mức phí hiện tại"
                      className="text-neutral-80 inline-flex cursor-help items-center focus:outline-none"
                    >
                      <IconInfo size={14} className="shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-[280px]">
                    Mức phí này lấy theo 1 sale đại diện của giao dịch, không phải trung bình hay
                    của từng sale. Nếu giao dịch có nhiều sale tham gia, mức phí của các sale khác
                    có thể khác và chưa hiển thị riêng ở đây. Hiển thị &quot;—&quot; khi hệ thống
                    chưa xác định được mức phí hiện tại (ví dụ phiếu tạo trước khi có giao dịch,
                    hoặc chưa có cấu hình hoa hồng áp dụng cho ngày hợp đồng).
                  </TooltipContent>
                </Tooltip>
              </span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Hai tỷ lệ này là numeric(14,10): in thẳng chuỗi BE sẽ ra "3.3333333333"
                      (dấu chấm, không theo locale vi-VN). formatPct trả về '—' khi rỗng,
                      trùng đúng ô trống cũ. */}
                  <DisplayField
                    label="Hoa hồng sale hiện tại (%)"
                    value={formatPct(record.current_pct_sale_commission, 10)}
                  />
                  <DisplayField
                    label="Thưởng CĐT cho sale hiện tại (%)"
                    value={formatPct(record.current_pct_bonus_to_sale, 10)}
                  />
                </div>
              </div>
            </div>

            <SeparatorHorizontal />

            {/* Section 3: Mức hỗ trợ đề xuất & chiết khấu khách */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">
                Mức hỗ trợ đề xuất & Chiết khấu khách
              </span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <DisplayField
                    label="Hỗ trợ hoa hồng sale"
                    value={renderPctOrAmount(record.support_sale_pct, record.support_sale_amount)}
                  />
                  <DisplayField
                    label="Hỗ trợ thưởng"
                    value={renderPctOrAmount(record.support_bonus_pct, record.support_bonus_amount)}
                  />
                  <DisplayField
                    label="Chiết khấu khách hàng"
                    value={renderPctOrAmount(
                      record.customer_discount_pct,
                      record.customer_discount_amount
                    )}
                  />
                  <DisplayField
                    label="Khách hàng nhận chiết khấu"
                    value={
                      record.customer
                        ? (feeSupportCustomerLabel(record, customerName) ??
                          `KH #${record.customer}`)
                        : '—'
                    }
                  />
                  <DisplayField
                    label="Khách đã thành CTV"
                    value={
                      record.customer_collaborator
                        ? (feeSupportCustomerCollaboratorLabel(record) ??
                          `CTV #${record.customer_collaborator}`)
                        : '—'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section 3b: Bảng tính hỗ trợ phí — BE tính sẵn, chỉ có ở detail.
                Separator nằm TRONG guard (như Section 5): `calculation` null mà để
                separator ngoài thì màn hiện hai gạch chồng nhau. */}
            {record.calculation && (
              <>
                <SeparatorHorizontal />
                <FeeSupportCalculationTable
                  calculation={record.calculation}
                  projectName={projectName}
                  unitNumber={unitNumber}
                  // CR54 — mode của kênh thưởng chỉ đọc được từ chính phiếu: cặp
                  // pct/amount là XOR nên có `support_bonus_amount` tức phiếu xin
                  // theo số tiền, và khi đó cột % của dòng đó bị ẩn ở sao kê.
                  bonusSupportIsAmountMode={record.support_bonus_amount != null}
                />
              </>
            )}

            <SeparatorHorizontal />

            {/* Section 4: Luồng duyệt */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">Luồng duyệt</span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <FeeSupportRequestApprovalLadder
                  origin={record.origin}
                  status={record.status}
                  approvedAt={record.approved_at}
                />
              </div>
            </div>

            <SeparatorHorizontal />

            {/* Section 4b: Thông tin người xác nhận (86ey4vjmp) — cùng khối và
                cùng tiêu đề với HĐ cọc / Phiếu TT giao dịch / Hoàn cọc. Bảng tự
                hiện dòng "Không có dữ liệu" nên KHÔNG guard rỗng: phiếu duyệt
                trước khi có cơ chế log (vd FSR-2026-000002) không có dòng nào, và
                khối trống vẫn phải nói ra điều đó thay vì biến mất. */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">
                Thông tin người xác nhận
              </span>
              <div className="flex w-full flex-col">
                <ConfirmationLogsTable
                  logs={confirmationLogs}
                  roleLabels={confirmationTypeLabels}
                />
              </div>
            </div>

            {/* Section 5: Đồng thuận co-seller — chỉ phiếu tạo từ App (D3) */}
            {isMobileOrigin && (
              <>
                <SeparatorHorizontal />
                <div className="flex flex-col gap-5">
                  <span className="typo-body-xl-semibold text-content-dark-1">
                    Đồng thuận của nhân sự tham gia
                  </span>
                  {/* Table tự dựng khung viền + bo góc; bọc thêm div có border ở
                      đây sẽ ra hai khung lồng nhau (và `border` không kèm màu sẽ
                      lấy currentColor → viền đen lạc khỏi hệ token). */}
                  <FeeSupportRequestConsentTable
                    lines={record.lines || []}
                    salesStaff={depositContract?.sales_staff}
                    isLoadingStaff={isLoadingContract}
                  />
                </div>
              </>
            )}

            <SeparatorHorizontal />

            {/* Section 6 (v3): tuyến hồ sơ cắt khách — kế toán duyệt thủ tục,
                bổ sung hồ sơ + người-nhận-hộ, hold gate D22, release hold-full. */}
            <FeeSupportRequestDocumentSection
              record={record}
              onChanged={() =>
                queryClient.invalidateQueries({ queryKey: ['sales', 'fee-support-requests'] })
              }
            />

            <SeparatorHorizontal />

            {/* Section 7: Lý do đề xuất (tài liệu đã hiển thị ở khối hồ sơ v3). */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">Lý do đề xuất</span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col gap-6 rounded-xl border p-6">
                <DisplayField label="Lý do" value={record.reason} />
              </div>
            </div>
          </div>
        )}
      </DetailPageWrapper>

      <AppDialog
        open={!!actionType}
        onOpenChange={(open) => {
          if (!open) closeActionDialog()
        }}
        onCancel={closeActionDialog}
        title={actionType === 'APPROVE' ? 'Duyệt đề xuất' : 'Từ chối đề xuất'}
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleAction}
        loading={approveMutation.isPending || rejectMutation.isPending}
        confirmText={actionType === 'APPROVE' ? 'Duyệt' : 'Từ chối'}
        cancelText="Hủy"
        content={
          <div className="flex flex-col gap-4 pt-4">
            {actionType === 'REJECT' ? (
              <div className="flex flex-col gap-3">
                <span className="typo-body-base-semibold text-content-dark-3">
                  Lý do từ chối <span className="text-action-primary-red-default">*</span>
                </span>
                <TextArea
                  placeholder="Vui lòng nhập lý do từ chối..."
                  value={rejectReason}
                  onChange={(val) => setRejectReason(val)}
                  rows={4}
                  maxCharacters={1000}
                />
                <span className="text-content-dark-3 typo-body-sm-regular">
                  Từ chối là quyết định cuối — phiếu sẽ bị hủy và không thể sửa lại (BR7).
                </span>
              </div>
            ) : (
              <p className="typo-body-base text-content-dark-1">
                Bạn có chắc chắn muốn duyệt đề xuất hỗ trợ phí <strong>{record?.code}</strong> ở cấp
                hiện hành không?
              </p>
            )}
          </div>
        }
      />
    </div>
  )
}
