import React from 'react'
import { Flex } from '@radix-ui/themes'
import { formatCurrencyVND, formatPct } from '@/utils/common'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import { IconCheckcircle } from '@/assets/icons'

import { useDealCommissionShares } from '@/features/sales/deals/services/deal-service'
import { useAbility } from '@/lib/ability'
import { getParticipantName } from '@/features/sales/deal-v3/utils/commission-recipient'
import { getShareContribPct } from './DealSplitSection'

interface DealPnLSectionProps {
  dealId: number
  pricing?: any
}

export const DealPnLSection: React.FC<DealPnLSectionProps> = ({ dealId, pricing }) => {
  const agencyFeeRevenue = parseFloat(pricing?.agency_fee_amount || pricing?.amt_agency_fee || '0')
  const bonusRevenue = parseFloat(pricing?.amt_extra_bonus || '0')

  const totalSupplementaryAmount = parseFloat(pricing?.total_shared_bonus_amount || '0')
  const totalFeeDeduction = parseFloat(pricing?.total_fee_deduction || '0')

  const totalRevenue = parseFloat(pricing?.total_amount || '0')
  const totalReconciled = parseFloat(pricing?.total_reconciled || '0')
  const remainingRevenue = totalRevenue - totalReconciled

  const ability = useAbility()
  const canViewSplit = ability.can('commission_shares_split', 'deal')
  const canViewMgmt = ability.can('commission_shares_management', 'deal')

  const { data: splitData } = useDealCommissionShares(dealId, 'split', { enabled: canViewSplit })
  const { data: mgmtData } = useDealCommissionShares(dealId, 'management', { enabled: canViewMgmt })

  const splitShares = ((splitData?.commission_shares as unknown as any[]) || []).filter(
    (s: any) => s.is_active !== false
  )
  const mgmtShares = ((mgmtData?.commission_shares as unknown as any[]) || []).filter(
    (s: any) => s.is_active !== false
  )

  const splitCommissionExpense =
    Number(
      splitData?.summary?.calculated_amount || splitData?.raw_data?.totals?.calculated_amount || 0
    ) ||
    splitShares.reduce(
      (sum: number, s: any) => sum + Number(s.calculated_amount || s.total_calculated_amount || 0),
      0
    )
  const mgmtCommissionExpense =
    Number(
      mgmtData?.summary?.calculated_amount || mgmtData?.raw_data?.totals?.calculated_amount || 0
    ) ||
    mgmtShares.reduce(
      (sum: number, s: any) => sum + Number(s.total_calculated_amount || s.calculated_amount || 0),
      0
    )

  const totalExpense = mgmtCommissionExpense + splitCommissionExpense
  const netProfit = totalRevenue - totalExpense

  return (
    <Flex direction="column" gap="4" className="mb-8">
      <div className="flex items-center justify-between">
        <Flex align="baseline" gap="2">
          <h3 className="text-content-dark-1 border-none text-lg font-semibold">
            Tổng kết tài chính
          </h3>
        </Flex>
      </div>
      <div className="bg-surface-primary-default flex flex-col">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card Thu */}
          <div className="border-border-1 flex flex-col rounded-xl border bg-white p-6 shadow-sm">
            <div className="border-border-1 mb-2 border-b-2 pb-3">
              <span className="typo-body-base-semibold text-content-dark-1">Thu (+)</span>
            </div>
            <div className="flex flex-1 flex-col">
              <DisplayFieldRow
                label="HH đại lý từ CĐT"
                value={
                  <span className="text-data-green-default font-medium">
                    {agencyFeeRevenue > 0 ? `+${formatCurrencyVND(agencyFeeRevenue)}` : '0'}
                  </span>
                }
                className="py-2"
              />
              <DisplayFieldRow
                label="Thưởng từ CĐT"
                value={
                  <span className="text-data-green-default font-medium">
                    {bonusRevenue > 0 ? `+${formatCurrencyVND(bonusRevenue)}` : '0'}
                  </span>
                }
                className="py-2"
              />
              <DisplayFieldRow
                label="Tổng thưởng chia"
                value={
                  <span className="text-data-green-default font-medium">
                    {totalSupplementaryAmount > 0
                      ? `+${formatCurrencyVND(totalSupplementaryAmount)}`
                      : '0'}
                  </span>
                }
                className="py-2"
              />
              <DisplayFieldRow
                label="Phí giảm trừ"
                value={
                  <span className="text-data-red-default font-medium">
                    {totalFeeDeduction > 0 ? `−${formatCurrencyVND(totalFeeDeduction)}` : '0'}
                  </span>
                }
                className="py-2"
              />
            </div>
            <div className="border-border-1 mt-2 flex flex-col gap-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="typo-body-base-semibold text-content-dark-1">
                  Phí và thưởng đang áp dụng
                </span>
                <span className="typo-body-base-semibold text-data-green-default">
                  {formatCurrencyVND(totalRevenue)} VND
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="typo-body-base-semibold text-content-dark-1">
                  Tổng đã đối chiếu
                </span>
                <span className="typo-body-base-semibold text-data-green-default">
                  {formatCurrencyVND(totalReconciled)} VND
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="typo-body-base-semibold text-content-dark-1">Còn lại</span>
                <span className="typo-body-base-semibold text-data-green-default">
                  {formatCurrencyVND(remainingRevenue)} VND
                </span>
              </div>
            </div>
          </div>

          {/* Card Chi */}
          <div className="border-border-1 flex flex-col rounded-xl border bg-white p-6 shadow-sm">
            <div className="border-border-1 mb-2 border-b-2 pb-3">
              <span className="typo-body-base-semibold text-content-dark-1">Chi (−)</span>
            </div>
            <div className="flex flex-1 flex-col">
              <DisplayFieldRow
                label="Thưởng HH Quản lý"
                value={
                  <span className="text-data-red-default font-medium">
                    {mgmtCommissionExpense > 0
                      ? `−${formatCurrencyVND(mgmtCommissionExpense)}`
                      : '0'}
                  </span>
                }
                className="py-2"
              />
              <DisplayFieldRow
                label="Phân chia HH (Các bên)"
                value={
                  <span className="text-data-red-default font-medium">
                    {splitCommissionExpense > 0
                      ? `−${formatCurrencyVND(splitCommissionExpense)}`
                      : '0'}
                  </span>
                }
                className="py-2"
              />
              {splitShares.length > 0 && (
                <div className="mb-2 ml-4 flex flex-col gap-1 border-l border-gray-200 pl-6">
                  {splitShares.map((s: any, idx: number) => {
                    const amount = Number(s.total_calculated_amount || s.calculated_amount || 0)
                    const contrib = getShareContribPct(s)
                    return (
                      <div
                        key={idx}
                        className="text-content-dark-3 flex items-center justify-between py-1 text-xs"
                      >
                        <span>
                          {getParticipantName(s)}
                          {contrib != null && (
                            <span className="text-content-dark-4 ml-1">({formatPct(contrib)})</span>
                          )}
                        </span>
                        <span>{amount > 0 ? `−${formatCurrencyVND(amount)}` : '0'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="border-border-1 mt-2 flex items-center justify-between border-t pt-4">
              <span className="typo-body-base-semibold text-content-dark-1">TỔNG CHI</span>
              <span className="typo-body-base-semibold text-data-red-default">
                {totalExpense > 0 ? `−${formatCurrencyVND(totalExpense)}` : '0'} VND
              </span>
            </div>
          </div>
        </div>

        {/* Lợi nhuận / Lãi ròng */}
        <div className="border-data-green-default bg-data-green-default/5 mt-6 flex flex-col justify-between gap-2 rounded-xl border p-4 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <IconCheckcircle size={24} className="text-data-green-default" />
            <span className="typo-heading-h5 text-content-dark-1 font-bold">
              LỢI NHUẬN TẠM TÍNH (Net MV)
            </span>
          </div>
          <span className="text-data-green-default text-2xl font-bold">
            {formatCurrencyVND(netProfit)} VND
          </span>
        </div>
      </div>
    </Flex>
  )
}
