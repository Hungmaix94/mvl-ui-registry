import { Flex } from '@radix-ui/themes'

import { Text } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { formatDate } from '@/utils/date-utils'
import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'

import InvestorReconciliationStatusBadge from './InvestorReconciliationStatusBadge'
import ReconDocumentTotalCheckView from './ReconDocumentTotalCheckView'
import { sheetDocumentTotalCheck } from './recon-document-total-check'

export interface ReconSheetMetaViewProps {
  data: InvestorReconciliationSheet
}

/**
 * Read-only sheet metadata header shown at the top of the CĐT detail screen (view mode of
 * {@link InvestorReconciliationForm}). Replaces the editable "Thông tin chung" Select grid with a
 * proven DetailRow rendering fed straight off the saved sheet — code/status/audit fields that have
 * no editable counterpart live here, while the rich per-căn cards come from the form body below.
 *
 * Extracted verbatim from the old `InvestorReconciliationDetail` top block (metadata only — no draft
 * synthesis), so it stays a small presentational component.
 */
function ReconSheetMetaView({ data }: ReconSheetMetaViewProps) {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.STATUS_CHOICES,
    ],
  })

  const sourceTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES
  ) as Record<string, string> | undefined

  // Chỉ có trên sheet DETAIL — danh sách không trả field này. `null` = phiếu chưa khai tổng chứng từ.
  const documentTotalCheck = sheetDocumentTotalCheck(data)

  return (
    <Flex direction="column" gap="3">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin phiếu đối chiếu</Text>

      <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
        <Flex direction="column" gap="2">
          <DetailRow label="Mã đối chiếu" value={data.code} />
          <DetailRow label="Dự án" value={data.project_detail?.name} />
          <DetailRow
            label="Loại nguồn"
            value={
              data.source_type ? (sourceTypeLabels?.[data.source_type] ?? data.source_type) : '-'
            }
          />
          <DetailRow
            label="Nguồn hàng"
            value={
              data.source_exchange_detail?.code || data.source_exchange_detail?.name
                ? `${data.source_exchange_detail?.code} - ${data.source_exchange_detail?.name}`
                : '-'
            }
          />
          <DetailRow
            label="Chủ đầu tư"
            value={
              data.investor_detail?.code || data.investor_detail?.name
                ? `${data.investor_detail?.code} - ${data.investor_detail?.name}`
                : '-'
            }
          />
          <DetailRow label="Ghi chú" value={data.note ?? '-'} className="md:col-span-2" />
        </Flex>
        <Flex direction="column" gap="2">
          <DetailRow
            label="Trạng thái"
            value={data.status ? <InvestorReconciliationStatusBadge status={data.status} /> : '-'}
          />
          <DetailRow label="Ngày đối chiếu" value={formatDate(data.reconciliation_date) ?? '-'} />
          <DetailRow label="Ngày tạo" value={data.created_at ? formatDate(data.created_at) : '-'} />
          <DetailRow
            label="Ngày cập nhật"
            value={data.updated_at ? formatDate(data.updated_at) : '-'}
          />
          <DetailRow
            label="Người tạo"
            value={
              data.created_by?.code || data.created_by?.fullname
                ? `${data.created_by?.code} - ${data.created_by?.fullname}`
                : '-'
            }
          />
          <DetailRow
            label="Tổng theo chứng từ CĐT"
            isDisplayInlineRow={false}
            value={<ReconDocumentTotalCheckView check={documentTotalCheck} />}
          />
        </Flex>
      </div>
    </Flex>
  )
}

export default ReconSheetMetaView
