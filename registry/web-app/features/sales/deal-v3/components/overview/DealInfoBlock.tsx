import React from 'react'
import { Flex } from '@radix-ui/themes'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import { ReferenceCode } from '@/components/commons'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'
import { formatDate } from '@/utils/date-utils'
import { APP_PATH } from '@/routes/AppRoute.constant'

import { DealWorkspaceResponse } from '@/features/sales/deals/services/deal-service'

// Deal status -> chip color (mirrors backend DealStatus semantics)
const DEAL_STATUS_VARIANT: Record<string, ColoredValueVariant> = {
  active: ColoredValueVariant.GREEN,
  completed: ColoredValueVariant.GREEN,
  abandoned: ColoredValueVariant.RED,
  refunded: ColoredValueVariant.RED,
  cancelled: ColoredValueVariant.RED,
  cancelled_settled: ColoredValueVariant.RED,
}

// current_rate_source_type -> human label (backend SnapshotType)
const RATE_SOURCE_LABELS: Record<string, string> = {
  initial: 'Khởi tạo',
  recalculation: 'Tính lại',
  price_reconciliation: 'Đối chiếu giá',
  retroactive: 'Điều chỉnh hồi tố',
  manual_override: 'Ghi đè thủ công',
  manual_create: 'Tạo share thủ công',
  target_achievement: 'Đạt mục tiêu',
  cancellation: 'Huỷ',
  recipient_reassignment: 'Đổi người nhận',
}

interface DealInfoBlockProps {
  workspace: DealWorkspaceResponse
}

export const DealInfoBlock: React.FC<DealInfoBlockProps> = ({ workspace }) => {
  const overview = workspace?.overview
  const piInfo = overview?.pi
  const projectInfo = overview?.project
  const sourceInfo = overview?.source
  const header = workspace?.header
  const contractInfo = overview?.deposit_contract
  // Deposit date must come from the deposit contract only; never fall back to a
  // record timestamp such as `created_at` (different concept — a back-dated
  // contract would then display the wrong month).
  const depositDate = contractInfo?.contract_date

  const rateSourceType = header?.current_rate_source_type
  const rateSourceLabel = rateSourceType
    ? RATE_SOURCE_LABELS[rateSourceType] || rateSourceType
    : null

  return (
    <Flex direction="column" gap="4">
      <div className="flex items-center justify-between">
        <Flex align="baseline" gap="2">
          <h3 className="text-content-dark-1 border-none text-lg font-semibold">
            Thông tin giao dịch
          </h3>
        </Flex>
      </div>
      <div className="bg-surface-primary-default flex flex-col">
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          {/* Row 1 */}
          <DisplayFieldRow
            label="Dự án"
            value={
              <div className="text-right">
                <div className="text-content-dark-1 font-semibold">{projectInfo?.name || '-'}</div>
                {projectInfo?.investor_name && (
                  <div className="text-content-dark-3 mt-0.5 text-xs font-normal">
                    Chủ đầu tư: {projectInfo.investor_name}
                  </div>
                )}
              </div>
            }
          />

          {/* Row 2 */}
          <DisplayFieldRow
            label="Tháng cọc"
            value={depositDate ? formatDate(depositDate, 'MM/yyyy') : '-'}
          />
          <DisplayFieldRow
            label="Mã sản phẩm"
            value={
              <ReferenceCode
                code={piInfo?.unit_number}
                linkTo={
                  piInfo?.id
                    ? APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':id', String(piInfo.id))
                    : undefined
                }
              />
            }
          />
          <DisplayFieldRow
            label="Ngày cọc"
            value={depositDate ? formatDate(depositDate, 'dd/MM/yyyy') : '-'}
          />

          {/* Row 3 */}
          <DisplayFieldRow
            label="Nguồn hàng"
            value={
              <div className="flex items-center justify-end gap-2">
                <span>{sourceInfo?.exchange_name || sourceInfo?.type || '-'}</span>
              </div>
            }
          />
          <DisplayFieldRow
            label="Tình trạng"
            value={
              header?.deal_status ? (
                <div className="flex items-center justify-end gap-1.5">
                  <Chip
                    label={header.deal_status.toUpperCase()}
                    variant={DEAL_STATUS_VARIANT[header.deal_status] || ColoredValueVariant.GREY}
                    size="small"
                  />
                </div>
              ) : (
                '-'
              )
            }
          />

          {/* Row: rate source (only when known) */}
          {rateSourceLabel && (
            <DisplayFieldRow label="Nguồn rate" value={rateSourceLabel} className="md:col-span-2" />
          )}

          {/* Row 4 */}
          <DisplayFieldRow
            label="Ghi chú"
            value={
              <div className="text-right">
                <span className="text-content-dark-1 break-words whitespace-pre-wrap">
                  {overview?.deal?.note || '-'}
                </span>
              </div>
            }
            className="border-b-0 md:col-span-2"
          />
        </div>
      </div>
    </Flex>
  )
}
