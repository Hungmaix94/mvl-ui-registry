import { Flex } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { Text } from '@/components/ui'
import { DisplayField } from '@/components/commons/DisplayField'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { APP_PATH } from '@/routes'
import { IconEye } from '@/assets/icons'
import { CustomerDetailCard } from '@/features/sales/components/CustomerDetailCard'
import { ProjectPreviewBox } from '@/features/sales/components/ProjectPreviewBox'
import { EmployeePreviewBox } from '@/features/sales/components/EmployeePreviewBox'
import { ConfirmationLogsTable } from '@/features/sales/components/ConfirmationLogsTable'
import { SalesStaffDetailTable } from '@/features/sales/components/SalesStaffDetailTable'
import { mapContractCustomerData } from '@/features/sales/utils/customer-mapper'
import { DepositContractDetail as DepositContractDetailType } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { getTransferToAccountLabel } from '@/features/sales/deposit-contracts/utils/transfer-account'
import { format } from 'date-fns'
import { formatCurrencyVND, formatPct } from '@/utils/common'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useApiQuery } from '@/hooks/useApiQuery'
import { getRealEstateService, useProjectStaffs } from '@/services/realestate-service'
import { getActiveProjectStaff } from '@/features/sales/utils/projectStaffUtils'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import FeeSupportRequestDocumentStatusBadge from '@/features/sales/fee-support-requests/components/FeeSupportRequestDocumentStatusBadge'
import FeeSupportRequestStatusBadge from '@/features/sales/fee-support-requests/components/FeeSupportRequestStatusBadge'
import { DepositStatus } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { DepositContractPaymentMethod } from '@/constants/api-schema-aliases'
import { getDepositApprovalStatusVariant } from '@/features/sales/deposit-contracts/utils/approval-status'

/** Kênh XOR %/tiền của phiếu hỗ trợ — hiển thị đúng kênh BE trả (D9/D16). */
function renderFeeSupportChannel(pct?: string | null, amount?: string | null): string {
  if (pct) return `${pct}%`
  if (amount) return formatCurrencyVND(Number(amount))
  return '—'
}

const STATUS_VARIANTS: Record<string, ColoredValueVariant> = {
  [DepositStatus.NEW]: ColoredValueVariant.BLUE,
  [DepositStatus.PENDING_CONFIRM]: ColoredValueVariant.ORANGE,
  [DepositStatus.PENDING_MANAGER]: ColoredValueVariant.ORANGE,
  [DepositStatus.PENDING_ACCOUNTANT]: ColoredValueVariant.ORANGE,
  [DepositStatus.PENDING_APPROVAL]: ColoredValueVariant.ORANGE,
  [DepositStatus.APPROVED]: ColoredValueVariant.GREEN,
  [DepositStatus.REJECTED]: ColoredValueVariant.RED,
}

type Props = {
  contract: DepositContractDetailType
}

export const DepositContractDetail = ({ contract }: Props) => {
  const { keysMapOptions, keysMap } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT_SALE.SALE_TYPE_CHOICES,
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES,
    ],
  })

  const statusLabels =
    (keysMap.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES) as Record<
      string,
      string
    >) || {}

  const approvalStatusLabels =
    (keysMap.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES) as Record<
      string,
      string
    >) || {}

  const saleTypeLabel = (type: string) => {
    const options = keysMapOptions.get(
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT_SALE.SALE_TYPE_CHOICES
    )
    return options?.find((opt) => opt.value === type)?.label || type
  }

  const {
    contract_number,

    project_detail,
    booking_details,
    contract_date,
    registration_amount,
    supplementary_amount,
    listed_price,
    fee_calculation_price,
    note,
    sales_staff,
    payment_method,
    source_account_holder_name,
    source_account_number,
    source_bank_name,
    product_inventory_detail,
    status,
    approval_status,
    has_fee_support_proposal,
  } = contract as DepositContractDetailType

  const piId = product_inventory_detail?.id
  const projectId = project_detail?.id

  const { data: staffsResponse } = useProjectStaffs(
    projectId ? { project: projectId } : undefined,
    { enabled: !!projectId }
  )
  const staffs = staffsResponse?.results || []

  const activeDirector =
    contract.project_director || getActiveProjectStaff(staffs, 'project_director', contract_date)
  const activeSecretary =
    contract.project_secretary || getActiveProjectStaff(staffs, 'project_secretary', contract_date)

  const { data: productDetail } = useApiQuery(
    ['realestate', 'product-inventories', piId],
    () => getRealEstateService().getProductInventory(piId!),
    { enabled: !!piId }
  )

  // v3/G11 — dòng nào có rate sau-hỗ-trợ KHÁC rate gốc (phiếu APPROVED áp lên row đó)
  // So sánh phải theo SỐ, không theo chuỗi: BE lưu tỷ lệ ở numeric(14,10) và cắt số 0 thừa
  // khi serialize, nên "7.00" và "7" là cùng một giá trị — số chữ số thập phân chỉ là chi
  // tiết lưu trữ. So chuỗi sẽ báo "phiếu hỗ trợ đã đổi tỷ lệ" trên mọi dòng.
  const afterSupportRows = (sales_staff || [])
    .filter((staff) => {
      const after = staff.pct_commission_after_support
      const base = staff.pct_commission
      if (after === null || after === undefined || after === '') return false
      if (base === null || base === undefined || base === '') return false
      return Number(after) !== Number(base)
    })
    .map((staff) => ({
      id: staff.id,
      name: staff.employee_detail?.fullname || staff.collaborator_name || `NS #${staff.id}`,
      base: staff.pct_commission,
      after: staff.pct_commission_after_support,
    }))

  return (
    <Flex direction="column" gap="5" className="px-10 py-4">
      {/* ────────────────────────────────────────────────────────
                  SECTION — Thông tin BĐS
        CR 86eygvtba: người dùng tra cứu sản phẩm trước tiên nên khối này
        nằm đầu trang, phía trên "Thông tin Hợp đồng".
      ──────────────────────────────────────────────────────── */}
      {productDetail && (
        <>
          <Flex direction="column" gap="4">
            <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin BĐS</Text>
            <div className="group border-border-1 bg-surface-secondary-default flex flex-col gap-6 rounded-xl border p-5 transition-colors hover:border-gray-300">
              <Flex direction="column" gap="1">
                <Text className="text-content-dark-3 typo-body-base-medium">Tên sản phẩm</Text>
                <div className="flex items-center gap-2">
                  <Text className="text-content-dark-1 typo-body-xl-semibold">
                    {productDetail.project?.name
                      ? `${productDetail.project.name} - ${productDetail.unit_number}`
                      : '-'}
                  </Text>
                  {productDetail.id && (
                    <Link
                      to={APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
                        ':id',
                        String(productDetail.id)
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-primary text-gray-400 transition-colors"
                      title="Xem chi tiết BĐS"
                    >
                      <IconEye size={18} />
                    </Link>
                  )}
                </div>
              </Flex>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <DisplayField label="Diện tích (m²)" value={productDetail.area || '---'} />
                <DisplayField
                  label="Giá niêm yết"
                  value={
                    contract.listed_price != null
                      ? `${formatCurrencyVND(Number(contract.listed_price))} VNĐ`
                      : '---'
                  }
                />
                <DisplayField
                  label="Giá tính phí tạm tính"
                  value={
                    contract.fee_calculation_price != null
                      ? `${formatCurrencyVND(Number(contract.fee_calculation_price))} VNĐ`
                      : '---'
                  }
                />
              </div>
            </div>
          </Flex>

          <SeparatorHorizontal />
        </>
      )}

      {/* ────────────────────────────────────────────────────────
                  SECTION 1 — Thông tin Hợp đồng
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin Hợp đồng</Text>
        <div className="border-border-1 bg-surface-primary-default flex flex-col gap-6 rounded-xl border p-6">
          <Flex direction="column" gap="1">
            <Text className="text-content-dark-3 typo-body-base-medium">Mã phiếu đặt cọc</Text>
            <Text className="text-content-dark-1 typo-body-xl-semibold">
              {contract_number || '-'}
            </Text>
          </Flex>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <DisplayField
              label="Ngày ký"
              value={contract_date ? format(new Date(contract_date), 'dd/MM/yyyy') : '-'}
            />
            <DisplayField
              label="Trạng thái"
              value={
                status ? (
                  <Chip
                    label={statusLabels[status] || status}
                    variant={STATUS_VARIANTS[status] || ColoredValueVariant.GREY}
                    size="small"
                  />
                ) : (
                  '-'
                )
              }
            />
            <DisplayField
              label="Trạng thái phê duyệt"
              value={
                approval_status ? (
                  <Chip
                    label={
                      approvalStatusLabels[approval_status] ||
                      statusLabels[approval_status] ||
                      approval_status
                    }
                    variant={getDepositApprovalStatusVariant(approval_status)}
                    size="small"
                  />
                ) : (
                  '-'
                )
              }
            />
            <DisplayField
              label="Hợp đồng đặt chỗ"
              value={
                booking_details?.length
                  ? booking_details.map((b: any, index: number) => (
                      <span key={b.id}>
                        <Link
                          to={APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL.replace(':id', String(b.id))}
                          className="text-brand-primary hover:text-brand-secondary transition-colors"
                          target="_blank"
                        >
                          {b.code}
                        </Link>
                        {index < booking_details.length - 1 ? ', ' : ''}
                      </span>
                    ))
                  : '-'
              }
            />
            <DisplayField
              label="Giá niêm yết"
              value={listed_price ? `${formatCurrencyVND(listed_price)} VNĐ` : '-'}
            />
            <DisplayField
              label="Giá tính phí tạm tính"
              value={
                fee_calculation_price ? `${formatCurrencyVND(fee_calculation_price)} VNĐ` : '-'
              }
            />
            <DisplayField
              label="Tiền đăng ký"
              value={registration_amount ? `${formatCurrencyVND(registration_amount)} VNĐ` : '-'}
            />
            <DisplayField
              label="Tiền bổ sung"
              value={supplementary_amount ? `${formatCurrencyVND(supplementary_amount)} VNĐ` : '-'}
            />
            <DisplayField
              label="Đề xuất hỗ trợ phí bán hàng"
              value={has_fee_support_proposal ? 'Có' : 'Không'}
            />
            <DisplayField label="Người tạo" value={contract.created_by?.fullname || '-'} />
            <DisplayField
              label="Ngày tạo"
              value={
                contract.created_at
                  ? format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm')
                  : '-'
              }
            />
            <DisplayField
              label="Ngày cập nhật cuối cùng"
              value={
                contract.updated_at
                  ? format(new Date(contract.updated_at), 'dd/MM/yyyy HH:mm')
                  : '-'
              }
            />
          </div>
          <div className="flex flex-col">
            <DisplayField label="Ghi chú" value={note || '-'} />
          </div>
        </div>
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION - Thông tin thanh toán
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin thanh toán</Text>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DisplayField
            label="Hình thức thanh toán"
            value={
              payment_method === DepositContractPaymentMethod.transfer
                ? 'Chuyển khoản'
                : payment_method === DepositContractPaymentMethod.cash
                  ? 'Tiền mặt'
                  : '-'
            }
          />
          {/* Nơi nhận tiền hiện với mọi hình thức thanh toán — tiền mặt cũng có nơi nhận. */}
          <DisplayField
            label="Nguồn tiền"
            value={getTransferToAccountLabel((contract as any).transfer_to_account)}
          />
          {payment_method === DepositContractPaymentMethod.transfer && (
            <>
              <DisplayField label="Tên chủ tài khoản" value={source_account_holder_name || '-'} />
              <DisplayField label="Số tài khoản" value={source_account_number || '-'} />
              <DisplayField label="Tên ngân hàng" value={source_bank_name || '-'} />
            </>
          )}
        </div>
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION - Thông tin người xác nhận
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin người xác nhận</Text>
        <Flex direction="column" className="w-full">
          <ConfirmationLogsTable logs={(contract as any).confirmation_logs || []} />
        </Flex>
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 2 — Thông tin khách hàng
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin khách hàng</Text>
        <CustomerDetailCard customer={mapContractCustomerData(contract, undefined)} />
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 3 — Thông tin dự án
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin dự án</Text>
        <ProjectPreviewBox
          projectData={project_detail}
          projectDirector={activeDirector}
          projectSecretary={activeSecretary}
          targetDate={contract_date}
        />
      </Flex>

      <SeparatorHorizontal />

      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Đầu mối dự án</Text>
        {activeDirector || activeSecretary ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activeDirector && (
              <EmployeePreviewBox employeeData={activeDirector} title="Giám đốc dự án" />
            )}
            {activeSecretary && (
              <EmployeePreviewBox employeeData={activeSecretary} title="Thư ký dự án" />
            )}
          </div>
        ) : (
          <Text className="typo-body-base-regular text-[#7E7E7E]">
            Chưa có nhân sự nào được phân công
          </Text>
        )}
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 5 — Nhân sự phụ trách bán
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Nhân sự phụ trách bán</Text>
        <Flex direction="column" className="w-full">
          <SalesStaffDetailTable
            salesStaff={sales_staff || []}
            baseAmount={Number(contract.fee_calculation_price || 0)}
            showSaleType={true}
            saleTypeLabel={saleTypeLabel}
            showConfirmationStatus={true}
          />
        </Flex>
      </Flex>

      {/* ────────────────────────────────────────────────────────
                  SECTION 5b (v3) — Đề xuất hỗ trợ phí (18.8 / G11)
      ──────────────────────────────────────────────────────── */}
      {(contract.fee_support_requests?.length ?? 0) > 0 && (
        <>
          <SeparatorHorizontal />
          <Flex direction="column" gap="4">
            <Text className="typo-body-xl-semibold text-content-dark-1">Đề xuất hỗ trợ phí</Text>
            <div className="flex flex-col gap-3">
              {contract.fee_support_requests.map((fsr) => (
                <Link
                  key={fsr.id}
                  to={APP_PATH.FEE_SUPPORT_PROPOSAL_DETAIL.replace(':id', String(fsr.id))}
                  className="border-border-1 bg-surface-primary-default flex flex-wrap items-center gap-4 rounded-xl border p-4 no-underline transition-colors hover:bg-gray-50"
                >
                  <span className="typo-body-base-semibold text-content-dark-1">{fsr.code}</span>
                  <FeeSupportRequestStatusBadge status={fsr.status} />
                  <FeeSupportRequestDocumentStatusBadge status={fsr.document_status} />
                  <span className="typo-body-sm-regular text-content-dark-3">
                    Hỗ trợ sale:{' '}
                    {renderFeeSupportChannel(fsr.support_sale_pct, fsr.support_sale_amount)}
                    {' · '}Thưởng:{' '}
                    {renderFeeSupportChannel(fsr.support_bonus_pct, fsr.support_bonus_amount)}
                    {' · '}Cắt khách:{' '}
                    {renderFeeSupportChannel(
                      fsr.customer_discount_pct,
                      fsr.customer_discount_amount
                    )}
                  </span>
                  {fsr.hold_full_until_paid && (
                    <Chip
                      label="Giữ tới khi CĐT trả đủ"
                      variant={ColoredValueVariant.ORANGE}
                      size="small"
                    />
                  )}
                </Link>
              ))}
            </div>
            {/* 2a: rate gốc trên DCSale bất biến — cột sau-hỗ-trợ BE tính read-time */}
            {afterSupportRows.length > 0 && (
              <div className="border-border-1 bg-surface-primary-default flex flex-col gap-2 rounded-xl border p-4">
                <span className="typo-body-base-semibold text-content-dark-2">
                  Phí hoa hồng sau hỗ trợ (phiếu đã duyệt)
                </span>
                {afterSupportRows.map((row) => (
                  <span key={row.id} className="typo-body-sm-regular text-content-dark-2">
                    {row.name}: {formatPct(row.base, 10)} →{' '}
                    <strong>{formatPct(row.after, 10)}</strong>
                  </span>
                ))}
              </div>
            )}
          </Flex>
        </>
      )}

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 6 — Tài liệu đính kèm
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Tài liệu đính kèm</Text>
        {contract.attachments && contract.attachments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contract.attachments.map((file: any) => (
              <a
                key={file.id || file.file_name}
                href={file.view_url || file.download_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="border-border-1 bg-surface-primary-default flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-gray-50"
                title={file.file_name}
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-content-dark-1 truncate text-sm font-medium">
                    {file.file_name}
                  </span>
                  {file.size ? (
                    <span className="text-content-dark-3 mt-1 text-xs">
                      {Math.round((file.size || 0) / 1024)} KB
                    </span>
                  ) : null}
                </div>
                <span className="text-action-primary-red-default shrink-0 text-xs font-semibold">
                  Xem
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-content-dark-3 text-sm">Không có tài liệu đính kèm</div>
        )}
      </Flex>
    </Flex>
  )
}

export default DepositContractDetail
