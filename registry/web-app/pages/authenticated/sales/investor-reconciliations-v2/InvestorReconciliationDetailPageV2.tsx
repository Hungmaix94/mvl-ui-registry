import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'

import { Button, PageTitle } from '@/components/ui'
import { Separator } from '@/components/ui/separator'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { IconCheck, IconPencilsimple, IconSelectionslash, IconTrash, IconX } from '@/assets/icons'
import { IconArrowcounterclockwise } from '@/assets/icons/arrows'
import { IconFile } from '@/assets/icons/office-editing'
import { IconProhibit } from '@/assets/icons/security-warnings'
import { APP_PATH } from '@/routes'
import { useDialog } from '@/hooks/useDialog'
import ReconSheetMetaView from '@/features/sales/_shared/reconciliation/ReconSheetMetaView'
import AddInvestorReconciliationUnitDialogV2 from '@/features/sales/investor-reconciliations-v2/components/AddInvestorReconciliationUnitDialogV2'
import EditInvestorReconciliationMetaV2, {
  type EditReconMetaValues,
} from '@/features/sales/investor-reconciliations-v2/components/EditInvestorReconciliationMetaV2'
import InvestorReconciliationUnitCard from '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationUnitCard'
import InvestorReconciliationSheetTotalV2 from '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationSheetTotalV2'
import RevertInvestorReconciliationDialog from '@/features/sales/investor-reconciliations-v2/components/RevertInvestorReconciliationDialog'
import VoidInvestorReconciliationDialog from '@/features/sales/investor-reconciliations-v2/components/VoidInvestorReconciliationDialog'
import {
  useConfirmInvestorReconciliationSheet,
  useInvestorReconciliationSheet,
  useUpdateInvestorReconciliationSheet,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import {
  mapSheetToFormValues,
  toUpdateInvestorReconciliationSheetMetaPayload,
} from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-adapter'
import useInvestorReconciliationDelete from '@/features/sales/investor-reconciliations/hooks/useInvestorReconciliationDelete'
import { useReconLinesImport } from '@/features/sales/investor-reconciliations-v2/hooks/useReconLinesImport'
import type { InvestorReconciliationLine } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import { showReconciliationWarnings } from '@/features/sales/investor-reconciliations/utils/reconciliation-warnings'
import { useCreateSalesInvoiceFromReconciliation } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'
import { withRememberedSearch } from '@/utils/list-url-memory'

const PENDING_BACKEND_MESSAGE = 'Chức năng đang chờ Backend hoàn thiện và sẽ được kết nối sau.'

const ICON_BUTTON_RED_CLASS = 'bg-data-red-disabled text-data-red-default hover:bg-data-red-focus'
const ICON_BUTTON_GREEN_CLASS =
  'bg-data-green-disabled text-data-green-default hover:bg-data-green-focus'

/**
 * Đối chiếu chủ đầu tư (bản 2.0 — bản duy nhất còn định tuyến) — màn "Chi tiết". Tái sử dụng nguyên service/hook của v1
 * (useInvestorReconciliationSheet, useConfirmInvestorReconciliationSheet, useInvestorReconciliationDelete)
 * và `ReconSheetMetaView` (info-grid "Thông tin phiếu đối chiếu" — không phải form). Giao diện mới:
 * hàng action icon (Xoá/Từ chối/Duyệt) + nút "Chỉnh sửa thông tin chung", và block "Chi tiết căn" với
 * empty-state riêng khi phiếu chưa có căn nào. "Từ chối" chưa có API sheet-level (chỉ F2/CTV có `void`)
 * nên tạm hiện toast chờ BE, theo đúng pattern PENDING_BACKEND_MESSAGE đã có trong
 * InvestorReconciliationActions.tsx.
 *
 * KHÔNG có route edit riêng: bấm "Chỉnh sửa thông tin chung" đổi block meta (ReconSheetMetaView) sang form
 * sửa tại chỗ (EditInvestorReconciliationMetaV2 — chỉ Ngày đối chiếu + Ghi chú, PATCH meta); phần "Chi
 * tiết căn" + "Tổng kết phiếu" bên dưới GIỮ NGUYÊN hiển thị. Route Chi tiết không đổi.
 */
const InvestorReconciliationDetailPageV2 = () => {
  const navigate = useNavigate()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const ability = useAbility()
  const queryClient = useQueryClient()

  const { data: record, isLoading, error } = useInvestorReconciliationSheet(id, { enabled: !!id })
  const { mutateAsync: confirmSheet, isPending: isConfirming } =
    useConfirmInvestorReconciliationSheet()
  const { mutateAsync: updateSheet, isPending: isUpdatingMeta } =
    useUpdateInvestorReconciliationSheet()
  const { mutateAsync: createInvoice, isPending: isCreatingInvoice } =
    useCreateSalesInvoiceFromReconciliation()
  const { openDeleteDialog } = useInvestorReconciliationDelete(() =>
    navigate(APP_PATH.INVESTOR_RECONCILIATION)
  )
  const { displayFormContent, displayCustom, displayClose } = useDialog()

  // Sửa "Thông tin chung" tại chỗ (không có route edit 2.0): bật cờ → block meta đổi từ view read-only
  // (ReconSheetMetaView) sang form sửa (EditInvestorReconciliationMetaV2); phần dưới giữ nguyên.
  const [isEditingMeta, setIsEditingMeta] = useState(false)

  const isNotFound = !isLoading && !record && !!error
  const isError = !isLoading && !!error && !isNotFound
  const isDraft = record?.status === ReconciliationStatus.draft
  const unitCount = record?.reconciliations?.length ?? 0
  const hasUnits = unitCount > 0
  // Cùng điều kiện cho nút "Thêm căn" và Sửa/Xoá trên từng card — chỉ mở khi phiếu còn draft.
  const canManageUnits = isDraft && ability.can('update', 'investor_reconciliation_sheet')

  const handleBack = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.INVESTOR_RECONCILIATION))
  }, [navigate])

  const handleEditMeta = useCallback(() => {
    setIsEditingMeta(true)
  }, [])

  const handleCancelEditMeta = useCallback(() => {
    setIsEditingMeta(false)
  }, [])

  // "Cập nhật thông tin chung": chỉ PATCH metadata phiếu (căn quản lý riêng qua dialog/lines). Chỉ Ngày
  // đối chiếu + Ghi chú đổi được (form khoá Dự án/Nguồn) → build payload = base từ `record` + 2 field này.
  // Không try/catch — lỗi bubble lên form để map field (handleApiError); các dòng sau `await` chỉ chạy khi
  // update resolve. Học theo v1 (InvestorReconciliationEditPage), nhưng ở lại route Chi tiết.
  const handleSubmitMeta = useCallback(
    async ({
      reconciliation_date,
      note,
      doc_total_amount,
      doc_total_basis,
    }: EditReconMetaValues) => {
      if (!record) return
      await updateSheet({
        id,
        data: toUpdateInvestorReconciliationSheetMetaPayload(
          {
            ...mapSheetToFormValues(record),
            reconciliation_date,
            note,
          },
          { doc_total_amount, doc_total_basis }
        ),
      })
      toastService.success('Cập nhật thông tin chung thành công')
      queryClient.invalidateQueries({ queryKey: ['sales', 'investor-reconciliation-sheets'] })
      setIsEditingMeta(false)
    },
    [id, record, updateSheet, queryClient]
  )

  const handleConfirm = useCallback(async () => {
    try {
      const result = await confirmSheet(id)
      queryClient.invalidateQueries({ queryKey: ['sales', 'investor-reconciliation-sheets'] })
      toastService.success('Phê duyệt đối chiếu thành công')
      showReconciliationWarnings(result)
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }, [confirmSheet, id, queryClient])

  const handleReject = useCallback(() => {
    toastService.info(PENDING_BACKEND_MESSAGE)
  }, [])

  // Đưa phiếu đã xác nhận về nháp để sửa — KHÔNG phải huỷ phiếu: các dòng căn
  // giữ nguyên mã và số liệu. Mở được cả khi đang bị chặn — dialog chính là chỗ
  // người dùng đọc lý do bị chặn và việc phải làm trước, ẩn nút đi thì họ mù.
  const handleRevert = useCallback(() => {
    if (!record) return
    displayCustom({
      title: 'Đưa phiếu đối chiếu về nháp để sửa',
      size: 'lg',
      hideFooter: true,
      content: (
        <RevertInvestorReconciliationDialog
          sheetId={record.id}
          sheetCode={record.code}
          onClose={displayClose}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['sales', 'investor-reconciliation-sheets'],
            })
          }}
        />
      ),
    })
  }, [record, displayCustom, displayClose, queryClient])

  // Huỷ bỏ phiếu nháp. Không phải xoá: phiếu từng xác nhận vẫn còn hoá đơn đã huỷ và
  // phiếu F2/CTV lịch sử trỏ vào bằng PROTECT, nên DELETE không bao giờ qua được — huỷ
  // bỏ đánh dấu phiếu chết mà giữ nguyên các chứng từ đó. Mở được cả khi đang bị chặn,
  // cùng lý do như nút đưa về nháp.
  const handleVoid = useCallback(() => {
    if (!record) return
    displayCustom({
      title: 'Huỷ bỏ phiếu đối chiếu',
      size: 'lg',
      hideFooter: true,
      content: (
        <VoidInvestorReconciliationDialog
          sheetId={record.id}
          sheetCode={record.code}
          onClose={displayClose}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['sales', 'investor-reconciliation-sheets'],
            })
          }}
        />
      ),
    })
  }, [record, displayCustom, displayClose, queryClient])

  // Tạo hoá đơn bán ra từ phiếu đối chiếu đã duyệt (mirror v1): BE dựng hoá đơn từ
  // reconciliation_id, thành công thì điều hướng sang chi tiết hoá đơn vừa tạo.
  const handleCreateInvoice = useCallback(async () => {
    try {
      const res = await createInvoice({ reconciliation_id: id })
      toastService.success('Tạo hóa đơn thành công!')
      if (res?.id) {
        navigate(APP_PATH.SALES_INVOICE_DETAIL.replace(':id', String(res.id)))
      }
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }, [createInvoice, id, navigate])

  const handleUnitsChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sales', 'investor-reconciliation-sheets'] })
  }, [queryClient])

  // "Nhập Excel": tải tệp mẫu / tải lên danh sách căn — BE tính toán từng dòng
  // giống hệt khi thêm căn thủ công (cùng một endpoint tính toán).
  const { openImportDialog } = useReconLinesImport(id, handleUnitsChanged)

  const handleAddUnit = useCallback(() => {
    if (!record) return
    displayFormContent({
      title: 'Thêm căn',
      size: 'full',
      hideFooter: true,
      dialogContentClassName: 'p-0',
      content: (
        <AddInvestorReconciliationUnitDialogV2
          sheetId={record.id}
          projectId={record.project_detail.id}
          investorId={record.investor_detail?.id}
          excludedProductInventoryIds={(record.reconciliations ?? []).map(
            (line) => line.product_inventory
          )}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sales', 'investor-reconciliation-sheets'] })
          }}
        />
      ),
    })
  }, [record, displayFormContent, queryClient])

  const handleEditUnit = useCallback(
    (line: InvestorReconciliationLine) => {
      if (!record) return
      displayFormContent({
        title: 'Sửa căn',
        size: 'full',
        hideFooter: true,
        dialogContentClassName: 'p-0',
        content: (
          <AddInvestorReconciliationUnitDialogV2
            sheetId={record.id}
            projectId={record.project_detail.id}
            investorId={record.investor_detail?.id}
            editingLine={line}
            excludedProductInventoryIds={(record.reconciliations ?? [])
              .filter((l) => l.id !== line.id)
              .map((l) => l.product_inventory)}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ['sales', 'investor-reconciliation-sheets'],
              })
            }}
          />
        ),
      })
    },
    [record, displayFormContent, queryClient]
  )

  return (
    <>
      <PageTitle
        title="Chi tiết đối chiếu"
        idLabel={record?.code ?? '-'}
        enableBackButton
        handleBackButton={handleBack}
        customActions={
          record && (
            <Flex gap="2" align="center">
              {ability.can('destroy', 'investor_reconciliation_sheet') &&
                record.status !== ReconciliationStatus.confirmed && (
                  <Button
                    variant="secondary"
                    iconOnly
                    size="large"
                    leftIcon={<IconTrash />}
                    onClick={() => openDeleteDialog(record)}
                    className={ICON_BUTTON_RED_CLASS}
                    title="Xoá"
                  />
                )}

              {isDraft && ability.can('confirm', 'investor_reconciliation_sheet') && (
                <Button
                  variant="secondary"
                  iconOnly
                  size="large"
                  leftIcon={<IconX size={32} />}
                  onClick={handleReject}
                  className={ICON_BUTTON_RED_CLASS}
                  title="Từ chối"
                />
              )}

              {isDraft && ability.can('confirm', 'investor_reconciliation_sheet') && (
                <Button
                  variant="secondary"
                  iconOnly
                  size="large"
                  loading={isConfirming}
                  leftIcon={<IconCheck size={32} />}
                  onClick={handleConfirm}
                  className={ICON_BUTTON_GREEN_CLASS}
                  title="Phê duyệt"
                />
              )}

              {!isEditingMeta &&
                isDraft &&
                ability.can('update', 'investor_reconciliation_sheet') && (
                  <Button
                    variant="primary"
                    leftIcon={<IconPencilsimple />}
                    onClick={handleEditMeta}
                    title="Chỉnh sửa thông tin chung"
                  >
                    Chỉnh sửa thông tin chung
                  </Button>
                )}

              {isDraft && ability.can('void', 'investor_reconciliation_sheet') && (
                <Button
                  variant="secondary"
                  leftIcon={<IconProhibit size={20} />}
                  onClick={handleVoid}
                  title="Huỷ bỏ phiếu nháp — phiếu vẫn được lưu để tra cứu nhưng không dùng lại được"
                >
                  Huỷ bỏ
                </Button>
              )}

              {record.status === ReconciliationStatus.confirmed &&
                ability.can('revert', 'investor_reconciliation_sheet') && (
                  <Button
                    variant="secondary"
                    leftIcon={<IconArrowcounterclockwise size={20} />}
                    onClick={handleRevert}
                    title="Đưa phiếu về nháp để sửa rồi duyệt lại — không xoá dòng căn nào"
                  >
                    Đưa về nháp để sửa
                  </Button>
                )}

              {record.status === ReconciliationStatus.confirmed &&
                ability.can('create', 'salesinvoice') && (
                  <Button
                    variant="primary"
                    loading={isCreatingInvoice}
                    onClick={handleCreateInvoice}
                    title="Tạo hóa đơn"
                  >
                    Tạo hóa đơn
                  </Button>
                )}
            </Flex>
          )
        }
      />

      <Flex direction="column" className="flex-1 px-7 py-4">
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={ability.can('retrieve', 'investor_reconciliation_sheet')}
        >
          {record && (
            <Flex direction="column" gap="6">
              {isEditingMeta ? (
                <EditInvestorReconciliationMetaV2
                  record={record}
                  onSubmit={handleSubmitMeta}
                  onCancel={handleCancelEditMeta}
                  isSubmitting={isUpdatingMeta}
                />
              ) : (
                <ReconSheetMetaView data={record} />
              )}

              <Separator />

              <Flex direction="column" gap="3">
                <Flex align="center" justify="between">
                  <span className="typo-body-xl-semibold text-content-dark-1">
                    {hasUnits ? `Chi tiết căn (${unitCount})` : 'Chi tiết căn'}
                  </span>
                  {hasUnits && canManageUnits && (
                    <Flex gap="2">
                      <Button
                        variant="secondary-border"
                        size="small"
                        leftIcon={<IconFile size={16} />}
                        onClick={openImportDialog}
                      >
                        Nhập Excel
                      </Button>
                      <Button variant="primary" size="small" onClick={handleAddUnit}>
                        Thêm căn
                      </Button>
                    </Flex>
                  )}
                </Flex>

                {hasUnits ? (
                  <Flex direction="column" gap="3">
                    {(record.reconciliations ?? []).map((line) => (
                      <InvestorReconciliationUnitCard
                        key={line.id}
                        sheetId={record.id}
                        item={line}
                        canManage={canManageUnits}
                        onEdit={handleEditUnit}
                      />
                    ))}
                  </Flex>
                ) : (
                  <div className="border-border-1 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-16">
                    <IconSelectionslash
                      className="text-content-dark-3 h-10 w-10"
                      strokeWidth={1.5}
                    />
                    <p className="typo-body-base-semibold text-content-dark-1">
                      Không có thông tin căn
                    </p>
                    <p className="typo-body-sm-regular text-content-dark-3">
                      Không có thông tin căn trong đối chiếu.
                    </p>
                    {canManageUnits && (
                      <Flex gap="2">
                        <Button
                          variant="secondary-border"
                          size="small"
                          leftIcon={<IconFile size={16} />}
                          onClick={openImportDialog}
                        >
                          Nhập Excel
                        </Button>
                        <Button variant="primary" size="small" onClick={handleAddUnit}>
                          Thêm căn
                        </Button>
                      </Flex>
                    )}
                  </div>
                )}
              </Flex>

              {hasUnits && (
                <>
                  <Separator />
                  <InvestorReconciliationSheetTotalV2 sheet={record} />
                </>
              )}
            </Flex>
          )}
        </DetailPageWrapper>
      </Flex>
    </>
  )
}

export default InvestorReconciliationDetailPageV2
