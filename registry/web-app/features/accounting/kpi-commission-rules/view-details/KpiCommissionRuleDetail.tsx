import { Chip } from '@/components/ui'
import { Table as RT } from '@radix-ui/themes'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { formatNumber } from '@/utils/common'
import { KpiCommissionStructure } from '../types/kpi-commission-rule-types'
import DetailRow from '@/components/commons/DetailRow'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

type KpiCommissionRuleDetailProps = {
  rule: KpiCommissionStructure
}

const KpiCommissionRuleDetail = ({ rule }: KpiCommissionRuleDetailProps) => {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.KPI_STRUCTURE_STATUS,
      APP_CONSTANT_KEY.ACCOUNTING.KPI_TARGET_ROLE,
    ],
  })

  const statusMap =
    (keysMap.get(APP_CONSTANT_KEY.ACCOUNTING.KPI_STRUCTURE_STATUS) as Record<string, string>) || {}
  const roleMap =
    (keysMap.get(APP_CONSTANT_KEY.ACCOUNTING.KPI_TARGET_ROLE) as Record<string, string>) || {}

  const codeNode = rule.code ? <code>{rule.code}</code> : '-'

  let variant = ColoredValueVariant.GREY
  if (rule.status === 'ACTIVE') variant = ColoredValueVariant.GREEN
  if (rule.status === 'EXPIRED') variant = ColoredValueVariant.RED

  const statusNode = (
    <Chip
      variant={variant}
      label={(statusMap[rule.status || ''] || rule.status) as string}
      size="small"
    />
  )

  return (
    <div className="flex w-full flex-col items-start gap-9">
      {/* Section 1: Thông tin chung */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</p>
        <div className="grid w-full grid-cols-1 gap-x-8 md:grid-cols-2">
          <DetailRow label="Mã quy tắc" value={codeNode} />
          <DetailRow label="Tên quy tắc" value={rule.name} />
          <DetailRow
            label="Đối tượng áp dụng"
            value={roleMap[rule.target_role] || rule.target_role}
          />
          <DetailRow label="Trạng thái" value={statusNode} />
          <DetailRow label="Hiệu lực từ" value={formatDate(rule.effective_from)} hideBottomBorder />
          <DetailRow label="Hiệu lực đến" value={formatDate(rule.effective_to)} hideBottomBorder />
          <DetailRow label="Ngày tạo" value={formatDate(rule.created_at)} hideBottomBorder />
          <DetailRow label="Ngày cập nhật" value={formatDate(rule.updated_at)} hideBottomBorder />
        </div>
      </div>

      {/* Section 2: Ngưỡng hoa hồng */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Cấu hình ngưỡng hoa hồng</p>
        <div className="border-border-1 w-full overflow-hidden rounded-md border">
          <RT.Root>
            <RT.Header>
              <RT.Row className="bg-neutral-30">
                <RT.ColumnHeaderCell className="border-border-1 w-[50px] border-r px-3 py-3 text-center">
                  <span className="typo-body-base-medium text-[#4B4B4B]">#</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell className="border-border-1 min-w-[150px] border-r px-3 py-3 text-right">
                  <span className="typo-body-base-medium text-[#4B4B4B]">% Hoàn thành từ</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell className="border-border-1 min-w-[150px] border-r px-3 py-3 text-right">
                  <span className="typo-body-base-medium text-[#4B4B4B]">% Hoàn thành đến</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell className="border-border-1 min-w-[150px] border-r px-3 py-3 text-right">
                  <span className="typo-body-base-medium text-[#4B4B4B]">% Hoa hồng</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell className="px-3 py-3">
                  <span className="typo-body-base-medium text-[#4B4B4B]">Ghi chú</span>
                </RT.ColumnHeaderCell>
              </RT.Row>
            </RT.Header>
            <RT.Body>
              {rule.tiers.map((tier, index) => (
                <RT.Row key={tier.id || index} className="hover:bg-neutral-10">
                  <RT.Cell className="border-border-1 border-r px-3 py-3 text-center align-middle">
                    <span className="typo-body-base-regular text-content-dark-3">{index + 1}</span>
                  </RT.Cell>
                  <RT.Cell className="border-border-1 border-r px-3 py-3 text-right align-middle">
                    <span className="typo-body-base-regular text-content-dark-1">
                      {tier.min_completion_pct != null
                        ? formatNumber(tier.min_completion_pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '-'}
                      %
                    </span>
                  </RT.Cell>
                  <RT.Cell className="border-border-1 border-r px-3 py-3 text-right align-middle">
                    <span className="typo-body-base-regular text-content-dark-1">
                      {tier.max_completion_pct != null
                        ? `${formatNumber(tier.max_completion_pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                        : '-'}
                    </span>
                  </RT.Cell>
                  <RT.Cell className="border-border-1 border-r px-3 py-3 text-right align-middle">
                    <span className="typo-body-base-semibold text-content-dark-1">
                      {tier.commission_pct != null ? formatNumber(tier.commission_pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}%
                    </span>
                  </RT.Cell>
                  <RT.Cell className="px-3 py-3 align-middle">
                    <span className="typo-body-base-regular text-content-dark-1">
                      {tier.note || '-'}
                    </span>
                  </RT.Cell>
                </RT.Row>
              ))}
            </RT.Body>
          </RT.Root>
        </div>
      </div>

      {/* Section 3: Ghi chú */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Ghi chú</p>
        <div className="flex w-full flex-col items-start">
          <DetailRow label="Ghi chú chung" value={rule.note} hideBottomBorder />
        </div>
      </div>
    </div>
  )
}

export default KpiCommissionRuleDetail
