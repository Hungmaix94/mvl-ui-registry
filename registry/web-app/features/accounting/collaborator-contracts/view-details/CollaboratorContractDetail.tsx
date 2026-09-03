import { format, parseISO, isValid } from 'date-fns'
import { Link } from 'react-router-dom'

import { IconBuildings, IconFiletext, IconPaperclip, IconPercent, IconUsers } from '@/assets/icons'
import { Chip } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow'
import { ColoredValueVariant } from '@/api/schema'
import { ProductStatus } from '@/constants/api-schema-aliases.ts'
import { APP_PATH } from '@/routes'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { useProductInventory } from '@/services/realestate-service'

import { type CollaboratorContract } from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import ContractStatusChip from '@/features/accounting/collaborator-contracts/_shares/components/ContractStatusChip'
import ContractSectionCard from '@/features/accounting/collaborator-contracts/_shares/components/ContractSectionCard'

type CollaboratorContractDetailProps = {
  contract: CollaboratorContract
}

const PRODUCT_STATUS_VARIANT: Record<string, ColoredValueVariant> = {
  [ProductStatus.available]: ColoredValueVariant.GREEN,
  [ProductStatus.reserved]: ColoredValueVariant.ORANGE,
  [ProductStatus.deposited]: ColoredValueVariant.BLUE,
  [ProductStatus.sold]: ColoredValueVariant.RED,
  [ProductStatus.locked]: ColoredValueVariant.GREY,
}

const formatDateValue = (value?: string | null): string => {
  if (!value) return '-'
  try {
    const d = parseISO(value)
    if (!isValid(d)) return '-'
    return format(d, DATE_FORMAT)
  } catch {
    return '-'
  }
}

const amountValue = (value?: string | null): string =>
  value && Number(value) ? `${formatCurrencyVND(value)} đ` : '-'

// `pct_commission` (và các tỷ lệ cùng nhóm) là numeric(14,10) — trần 3 chữ số thập phân mặc
// định của `formatPercent` sẽ cắt mất phần thập phân thật.
const percentValue = (value?: string | null): string =>
  value && Number(value) ? formatPercent(value, false, 10) : '-'

const CollaboratorContractDetail = ({ contract }: CollaboratorContractDetailProps) => {
  const collaboratorDetail = contract.collaborator_detail
  const employeeDetail = contract.ctv_line_employee_detail
  const departmentDetail = contract.ctv_line_department_detail
  const productNested = contract.product_inventory_detail

  // Enrich the embedded product summary (4 fields only) with the full product
  // inventory so we can surface the actual project (dự án), area and prices.
  const { data: product } = useProductInventory(productNested?.id ?? 0)

  const { keysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES],
  })
  const productStatusLabels = keysMap.get(
    APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES
  ) as Record<string, string> | undefined

  const { keysMap: salesKeysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.CTV_LINE_TYPE_CHOICES],
  })
  const lineTypeLabels = salesKeysMap.get(
    APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.CTV_LINE_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const collaboratorValue = collaboratorDetail ? (
    <Link
      to={APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(contract.collaborator))}
      className="text-action-primary-default font-medium hover:underline"
    >
      {collaboratorDetail.name || collaboratorDetail.code || '-'}
    </Link>
  ) : (
    '-'
  )

  const signedDateValue = contract.signed_date ? formatDateValue(contract.signed_date) : 'Chưa ký'

  const attachmentValue = contract.attachment ? (
    <a
      href={contract.attachment}
      target="_blank"
      rel="noopener noreferrer"
      className="text-action-primary-default font-medium hover:underline"
    >
      Tải xuống
    </a>
  ) : (
    '-'
  )

  const project = product?.project
  const productStatus = product?.status ?? productNested?.status
  const productStatusLabel = productStatus
    ? (productStatusLabels?.[productStatus] ?? productStatus)
    : null

  return (
    <div className="flex w-full flex-col items-stretch gap-5">
      {/* Headline summary */}
      <div className="border-border-1 grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border bg-white p-5 shadow-sm lg:grid-cols-4">
        <SummaryStat label="Mã hợp đồng">
          <span className="text-content-dark-1 typo-body-lg-semibold">{contract.code || '-'}</span>
        </SummaryStat>
        <SummaryStat label="Cộng tác viên">
          <span className="typo-body-lg-semibold">{collaboratorValue}</span>
          {collaboratorDetail?.code && (
            <span className="text-content-dark-3 typo-body-small-regular">
              {collaboratorDetail.code}
            </span>
          )}
        </SummaryStat>
        <SummaryStat label="% Hoa hồng">
          <span className="text-action-primary-default typo-body-xl-semibold">
            {percentValue(contract.pct_commission)}
          </span>
        </SummaryStat>
        <SummaryStat label="Trạng thái">
          <div>
            <ContractStatusChip status={contract.status} size="large" />
          </div>
        </SummaryStat>
      </div>

      {/* Sản phẩm / Dự án */}
      {productNested && (
        <ContractSectionCard
          title="Sản phẩm / Dự án"
          description="Bảng hàng gắn với hợp đồng cộng tác viên"
          icon={<IconBuildings className="h-5 w-5" />}
          accent="blue"
          action={
            productStatusLabel ? (
              <Chip
                variant={PRODUCT_STATUS_VARIANT[productStatus ?? ''] ?? ColoredValueVariant.GREY}
                label={productStatusLabel}
              />
            ) : undefined
          }
        >
          <DetailRow
            label="Dự án"
            value={
              project ? `${project.name || '-'}${project.code ? ` (${project.code})` : ''}` : '-'
            }
          />
          <DetailRow label="Mã bảng hàng" value={productNested.code || '-'} />
          <DetailRow label="Tòa nhà / Phân khu" value={productNested.tower || '-'} />
          <DetailRow label="Số căn" value={productNested.unit_number || '-'} />
          <DetailRow label="Diện tích" value={product?.area ? `${product.area} m²` : '-'} />
          <DetailRow label="Giá niêm yết" value={amountValue(product?.listed_price)} />
          <DetailRow
            label="Giá tính phí"
            value={amountValue(product?.fee_calculation_price)}
            hideBottomBorder
          />
        </ContractSectionCard>
      )}

      {/* Hoa hồng & Thưởng */}
      <ContractSectionCard
        title="Hoa hồng & Thưởng"
        description="Tỉ lệ và khoản thưởng áp dụng cho cộng tác viên"
        icon={<IconPercent className="h-5 w-5" />}
        accent="emerald"
      >
        <DetailRow label="% Hoa hồng" value={percentValue(contract.pct_commission)} />
        <DetailRow label="Số tiền cố định" value={amountValue(contract.fixed_amount)} />
        <DetailRow label="% Thưởng line" value={percentValue(contract.pct_line_bonus)} />
        <DetailRow label="Phí tăng thêm" value={amountValue(contract.amt_supplementary_fee)} />
        <DetailRow
          label="% Phí tăng thêm"
          value={percentValue(contract.pct_supplementary_fee)}
          hideBottomBorder
        />
      </ContractSectionCard>

      {/* Tuyến CTV (Line) */}
      <ContractSectionCard
        title="Tuyến CTV (Line)"
        description="Tuyến giới thiệu và người đứng line"
        icon={<IconUsers className="h-5 w-5" />}
        accent="violet"
      >
        <DetailRow
          label="Loại line"
          value={
            contract.ctv_line_type
              ? (lineTypeLabels?.[contract.ctv_line_type] ?? contract.ctv_line_type)
              : '-'
          }
        />
        <DetailRow
          label="Nhân viên line"
          value={
            employeeDetail?.fullname
              ? `${employeeDetail.fullname}${employeeDetail.code ? ` (${employeeDetail.code})` : ''}`
              : '-'
          }
        />
        <DetailRow label="Chức vụ" value={employeeDetail?.position?.name || '-'} />
        <DetailRow label="Chi nhánh" value={employeeDetail?.branch?.name || '-'} />
        <DetailRow label="Khối" value={employeeDetail?.block?.name || '-'} />
        <DetailRow
          label="Phòng ban line"
          value={departmentDetail?.name || employeeDetail?.department?.name || '-'}
          hideBottomBorder
        />
      </ContractSectionCard>

      {/* Hợp đồng & Tệp đính kèm */}
      <ContractSectionCard
        title="Hợp đồng & Tệp đính kèm"
        description="Thông tin chung và tài liệu hợp đồng"
        icon={<IconFiletext className="h-5 w-5" />}
        accent="slate"
        action={<IconPaperclip className="text-content-dark-3 h-5 w-5" />}
      >
        <DetailRow label="Số HĐ" value={contract.contract_number || '-'} />
        <DetailRow label="Ngày ký" value={signedDateValue} />
        <DetailRow label="Tệp đính kèm" value={attachmentValue} />
        <DetailRow label="Ghi chú" value={contract.note || '-'} />
        <DetailRow label="Ngày tạo" value={formatDateValue(contract.created_at)} />
        <DetailRow
          label="Cập nhật cuối"
          value={formatDateValue(contract.updated_at)}
          hideBottomBorder
        />
      </ContractSectionCard>
    </div>
  )
}

type SummaryStatProps = {
  label: string
  children: React.ReactNode
}

const SummaryStat = ({ label, children }: SummaryStatProps) => (
  <div className="flex flex-col gap-1">
    <span className="text-content-dark-3 text-[11px] font-bold tracking-wider uppercase">
      {label}
    </span>
    <div className="flex flex-col gap-0.5">{children}</div>
  </div>
)

export default CollaboratorContractDetail
