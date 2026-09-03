import React from 'react'
import { Flex, Table } from '@radix-ui/themes'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import Chip from '@/components/ui/chip/Chip'
import { ReferenceCode } from '@/components/commons'
import { ColoredValueVariant } from '@/api/schema'
import { CheckCircle2, History } from 'lucide-react'
import { DealWorkspaceResponse } from '@/features/sales/deals/services/deal-service'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DealRateChangeHistoryList } from './DealRateChangeHistoryList'
import { generatePath } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useAbility } from '@/lib/ability'

interface DealPricingBlockProps {
  dealId: number
  workspace: DealWorkspaceResponse
}

export const DealPricingBlock: React.FC<DealPricingBlockProps> = ({ dealId, workspace }) => {
  const ability = useAbility()
  const pricing = workspace?.pricing
  const officialFeePriceStr = pricing?.fee_calculation_price
  const isOfficialFeePrice = !!officialFeePriceStr && parseFloat(officialFeePriceStr) > 0
  const feePrice = parseFloat(pricing?.fee_calculation_price || '0')
  const listedPrice = parseFloat(pricing?.listed_price || '0')

  const pctRevenue = parseFloat(pricing?.pct_revenue || '0')
  const amtRevenue = parseFloat(pricing?.revenue_amount || pricing?.amt_revenue || '0')

  // Reconciled rates
  const reconciled = pricing?.investor_reconciled
  const mvConfig = pricing?.mv_config

  const hasReconciliation = !!reconciled?.latest_ref_code

  const pctAgencyFeeReconciled = hasReconciliation
    ? parseFloat(reconciled?.pct_agency_fee || '0')
    : parseFloat(mvConfig?.pct_agency_fee || '0')
  // "Mức áp dụng" (rate column) must show the configured fixed amount, not the
  // computed total (agency_fee_amount). Mirrors how extra_bonus uses amt_extra_bonus.
  const amtAgencyFeeReconciled = hasReconciliation
    ? parseFloat(reconciled?.amt_agency_fee || '0')
    : parseFloat(mvConfig?.amt_agency_fee || '0')
  const amtAgencyFeeAmountReconciled = hasReconciliation
    ? parseFloat(reconciled?.agency_fee_amount || '0')
    : parseFloat(mvConfig?.agency_fee_amount || '0')
  const totalSupplementaryAmountReconciled = hasReconciliation
    ? parseFloat(reconciled?.total_shared_bonus_amount || '0')
    : parseFloat(mvConfig?.total_shared_bonus_amount || '0')
  const totalFeeDeductionReconciled = hasReconciliation
    ? parseFloat(reconciled?.deduction || reconciled?.total_fee_deduction || '0')
    : 0
  const totalCdtReconciled = hasReconciliation
    ? parseFloat(reconciled?.total_amount || '0')
    : parseFloat(mvConfig?.total_amount || '0')

  // MV Config rates
  const pctAgencyFeeMv = parseFloat(mvConfig?.pct_agency_fee || '0')
  const amtAgencyFeeMv = parseFloat(mvConfig?.amt_agency_fee || '0')
  const amtAgencyFeeAmountMv = parseFloat(mvConfig?.agency_fee_amount || '0')
  const totalSupplementaryAmountMv = parseFloat(mvConfig?.total_shared_bonus_amount || '0')
  const totalCdtMv = parseFloat(mvConfig?.total_amount || '0')

  // Gap between the reconciled (CĐT) view and MV internal tracking. FE-only
  // subtraction of two backend-computed totals (not a money-from-rate calc).
  const cdtDelta = totalCdtReconciled - totalCdtMv

  const isAgencyFeeIncludeVatReconciled = hasReconciliation
    ? reconciled?.is_agency_fee_include_vat
    : mvConfig?.is_agency_fee_include_vat

  const isTotalSupplementaryAmountIncludeVatReconciled = hasReconciliation
    ? reconciled?.is_shared_bonus_include_vat
    : mvConfig?.is_shared_bonus_include_vat

  // Extra bonus (Thưởng CĐT) reconciled rates
  const pctExtraBonusReconciled = hasReconciliation
    ? parseFloat(reconciled?.pct_extra_bonus || '0')
    : parseFloat(mvConfig?.pct_extra_bonus || '0')
  const amtExtraBonusReconciled = hasReconciliation
    ? parseFloat(reconciled?.amt_extra_bonus || '0')
    : parseFloat(mvConfig?.amt_extra_bonus || '0')
  const amtExtraBonusAmountReconciled = hasReconciliation
    ? parseFloat(reconciled?.extra_bonus_amount || '0')
    : parseFloat(mvConfig?.extra_bonus_amount || '0')

  // Extra bonus (Thưởng CĐT) MV Config rates
  const pctExtraBonusMv = parseFloat(mvConfig?.pct_extra_bonus || '0')
  const amtExtraBonusMv = parseFloat(mvConfig?.amt_extra_bonus || '0')
  const amtExtraBonusAmountMv = parseFloat(mvConfig?.extra_bonus_amount || '0')

  const isExtraBonusIncludeVatReconciled = hasReconciliation
    ? reconciled?.is_extra_bonus_include_vat
    : mvConfig?.is_extra_bonus_include_vat

  return (
    <Flex direction="column" gap="4">
      <div className="flex items-center justify-between">
        <Flex align="baseline" gap="2">
          <h3 className="text-content-dark-1 border-none text-lg font-semibold">
            Giá & Thu từ Chủ đầu tư
          </h3>
        </Flex>
        {ability.can('workspace', 'deal') && (
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-content-dark-3 hover:text-content-dark-1 hover:bg-surface-primary-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors">
                  <History className="h-4 w-4" />
                  Xem lịch sử
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] bg-white p-0 sm:max-w-md">
                <SheetHeader className="border-border-1 space-y-1 border-b bg-white p-6">
                  <p className="text-data-red-default text-xs font-bold uppercase">
                    Lịch sử chỉnh sửa
                  </p>
                  <SheetTitle className="text-content-dark-1 text-xl font-bold">
                    Tỉ lệ doanh thu tính hoa hồng
                  </SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-80px)] overflow-y-auto p-6">
                  <DealRateChangeHistoryList
                    dealId={dealId}
                    fields={['pct_revenue', 'revenue_amount']}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
      <div className="border-border-1 bg-surface-primary-default flex flex-col overflow-hidden border shadow-sm">
        <div className="flex flex-col">
          <div
            className={`border-border-1 flex flex-col justify-between gap-4 px-6 py-5 md:flex-row md:items-start ${
              ability.can('workspace', 'deal') ? 'border-b' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="typo-body-base-medium text-content-dark-3">Giá tạm tính</span>
                <span className="typo-heading-h4 text-content-dark-1 font-bold">
                  {formatCurrencyVND(feePrice)} VNĐ
                </span>
                <div className="flex items-center gap-1.5">
                  {isOfficialFeePrice ? (
                    <>
                      <CheckCircle2 className="text-data-green-default h-4 w-4" />
                      <Chip label="CHÍNH THỨC" variant={ColoredValueVariant.GREEN} size="small" />
                    </>
                  ) : (
                    <Chip label="DỰ KIẾN" variant={ColoredValueVariant.ORANGE} size="small" />
                  )}
                </div>
              </div>

              <div className="text-content-dark-3 mt-1 flex items-center gap-2.5 text-xs">
                <span>Giá dự kiến ban đầu:</span>
                <span className="line-through">{formatCurrencyVND(listedPrice)} VNĐ</span>
                <span>
                  từ HD cọc{' '}
                  {workspace?.overview?.deposit_contract?.id ? (
                    <a
                      href={generatePath(APP_PATH.DEPOSIT_CONTRACT_DETAIL, {
                        id: String(workspace.overview.deposit_contract.id),
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="text-action-primary-blue-default hover:text-action-primary-blue-hover font-medium transition-colors hover:underline"
                    >
                      {workspace?.overview?.deposit_contract?.contract_date
                        ? formatDate(workspace.overview.deposit_contract.contract_date)
                        : workspace.overview.deposit_contract.code || '-'}
                    </a>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <div className="text-content-dark-3 flex flex-wrap items-center gap-2.5 text-sm">
                <span>Tỉ lệ doanh thu tính hoa hồng:</span>
                <span className="text-content-dark-1 font-semibold">
                  {/* pct_revenue là numeric(14,10) — giữ đủ 10 chữ số thập phân, đừng cắt còn 3. */}
                  {pctRevenue > 0
                    ? formatPercent(pctRevenue, false, 10)
                    : `${formatCurrencyVND(amtRevenue)} VNĐ`}
                </span>

                {pctRevenue > 0 && (
                  <span className="text-content-dark-3 text-xs">
                    Thành tiền:{' '}
                    <span className="font-semibold">{formatCurrencyVND(amtRevenue)} VNĐ</span>
                  </span>
                )}
              </div>

              <div className="text-content-dark-3 flex items-center gap-1.5 text-sm md:self-end">
                <span>Nguồn chính thức:</span>
                <div className="flex items-center">
                  {workspace?.header?.deal_code ? (
                    <a
                      href={generatePath(APP_PATH.DEAL_DETAIL, { id: String(dealId) })}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center hover:underline"
                    >
                      <ReferenceCode
                        code={workspace.header.deal_code}
                        enableCopy
                        className="text-action-primary-default font-semibold"
                      />
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <span>
                  {workspace?.header?.completed_at
                    ? formatDate(workspace.header.completed_at)
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Table Section */}
          {ability.can('workspace', 'deal') && (
            <div className="relative w-full">
              <div className="overflow-x-auto">
                <Table.Root className="w-full min-w-[700px] border-collapse bg-white text-left outline-none">
                  <Table.Header className="bg-neutral-20 border-border-1 border-b">
                    <Table.Row>
                      <Table.ColumnHeaderCell
                        rowSpan={2}
                        className="typo-body-base-medium text-content-dark-2 border-border-1 border-r px-4 py-[10px] align-middle font-normal"
                      >
                        Khoản
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell
                        colSpan={2}
                        className="typo-body-base-medium text-content-dark-2 border-border-1 border-r px-4 py-[10px] text-center font-normal"
                      >
                        CĐT đối chiếu
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell
                        colSpan={2}
                        className="typo-body-base-medium text-content-dark-2 px-4 py-[10px] text-center font-normal"
                      >
                        MV nội bộ theo dõi
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                    <Table.Row className="border-border-1 border-b">
                      <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 border-border-1 border-r px-4 py-[10px] font-normal">
                        Mức áp dụng
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 border-border-1 border-r px-4 py-[10px] text-right font-normal">
                        Thành tiền
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 border-border-1 border-r px-4 py-[10px] font-normal">
                        Mức áp dụng
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 px-4 py-[10px] text-right font-normal">
                        Thành tiền
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row className="border-border-1 hover:bg-data-light-grey-hover border-b transition-colors">
                      <Table.Cell className="typo-body-base-semibold text-content-dark-1 border-border-1 border-r px-4 py-4 font-semibold">
                        Phí base
                      </Table.Cell>
                      {/* CĐT đã đối chiếu */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {/* pct_agency_fee là numeric(14,10) — giữ đủ 10 chữ số thập phân. */}
                            {pctAgencyFeeReconciled > 0
                              ? formatPercent(pctAgencyFeeReconciled, false, 10)
                              : formatCurrencyVND(amtAgencyFeeReconciled)}
                          </span>
                          <span className="text-content-dark-3 text-[11px]">
                            {isAgencyFeeIncludeVatReconciled ? '(Đã gồm VAT)' : '(Chưa VAT)'}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4 text-right font-semibold">
                        {formatCurrencyVND(amtAgencyFeeAmountReconciled)}
                      </Table.Cell>
                      {/* MV nội bộ theo dõi */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {/* pct_agency_fee là numeric(14,10) — giữ đủ 10 chữ số thập phân. */}
                            {pctAgencyFeeMv > 0
                              ? formatPercent(pctAgencyFeeMv, false, 10)
                              : formatCurrencyVND(amtAgencyFeeMv)}
                          </span>
                          <span className="text-content-dark-3 text-[11px]">
                            {mvConfig?.is_agency_fee_include_vat ? '(Đã gồm VAT)' : '(Chưa VAT)'}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-content-dark-1 px-4 py-4 text-right font-semibold">
                        {formatCurrencyVND(amtAgencyFeeAmountMv)}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-border-1 hover:bg-data-light-grey-hover border-b transition-colors">
                      <Table.Cell className="typo-body-base-semibold text-content-dark-1 border-border-1 border-r px-4 py-4 font-semibold">
                        Phí tăng thêm
                      </Table.Cell>
                      {/* CĐT đã đối chiếu */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {pctExtraBonusReconciled > 0
                              ? formatPercent(pctExtraBonusReconciled)
                              : formatCurrencyVND(amtExtraBonusReconciled)}
                          </span>
                          <span className="text-content-dark-3 text-[11px]">
                            {isExtraBonusIncludeVatReconciled ? '(Đã gồm VAT)' : '(Chưa VAT)'}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4 text-right font-semibold">
                        {formatCurrencyVND(amtExtraBonusAmountReconciled)}
                      </Table.Cell>
                      {/* MV nội bộ theo dõi */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {pctExtraBonusMv > 0
                              ? formatPercent(pctExtraBonusMv)
                              : formatCurrencyVND(amtExtraBonusMv)}
                          </span>
                          <span className="text-content-dark-3 text-[11px]">
                            {mvConfig?.is_extra_bonus_include_vat ? '(Đã gồm VAT)' : '(Chưa VAT)'}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-content-dark-1 px-4 py-4 text-right font-semibold">
                        {formatCurrencyVND(amtExtraBonusAmountMv)}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-border-1 hover:bg-data-light-grey-hover border-b transition-colors">
                      <Table.Cell className="typo-body-base-semibold text-content-dark-1 border-border-1 border-r px-4 py-4 font-semibold">
                        Thưởng CĐT
                      </Table.Cell>
                      {/* CĐT đã đối chiếu */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span>{formatCurrencyVND(totalSupplementaryAmountReconciled)}</span>
                          <span className="text-content-dark-3 text-[11px]">
                            {isTotalSupplementaryAmountIncludeVatReconciled
                              ? '(Đã gồm VAT)'
                              : '(Chưa VAT)'}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4 text-right font-semibold">
                        {formatCurrencyVND(totalSupplementaryAmountReconciled)}
                      </Table.Cell>
                      {/* MV nội bộ theo dõi */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span>{formatCurrencyVND(totalSupplementaryAmountMv)}</span>
                          <span className="text-content-dark-3 text-[11px]">
                            {mvConfig?.is_shared_bonus_include_vat ? '(Đã gồm VAT)' : '(Chưa VAT)'}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-content-dark-1 px-4 py-4 text-right font-semibold">
                        {formatCurrencyVND(totalSupplementaryAmountMv)}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-border-1 hover:bg-data-light-grey-hover border-b transition-colors">
                      <Table.Cell className="typo-body-base-semibold text-content-dark-1 border-border-1 border-r px-4 py-4 font-semibold">
                        Giảm trừ
                      </Table.Cell>
                      {/* CĐT đã đối chiếu */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        -
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-data-red-default border-border-1 border-r px-4 py-4 text-right font-semibold">
                        {totalFeeDeductionReconciled > 0
                          ? `−${formatCurrencyVND(totalFeeDeductionReconciled)}`
                          : '0'}
                      </Table.Cell>
                      {/* MV nội bộ theo dõi */}
                      <Table.Cell className="typo-body-base text-content-dark-1 border-border-1 border-r px-4 py-4">
                        -
                      </Table.Cell>
                      <Table.Cell className="typo-body-base text-content-dark-1 px-4 py-4 text-right font-semibold">
                        0
                      </Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Root>
              </div>
              <div className="flex h-[48px] items-center justify-end gap-6 bg-[#FCE7E7] px-4 py-[14px]">
                <span className="text-[13px] font-bold text-[#9C2A2A]">
                  Phí và thưởng đang áp dụng
                </span>
                <div className="flex gap-4">
                  <span className="text-[13px] font-medium text-[#9C2A2A]">
                    CĐT đối chiếu:{' '}
                    <strong className="">{formatCurrencyVND(totalCdtReconciled)} VNĐ</strong>
                  </span>
                  <span className="text-[13px] font-medium text-[#9C2A2A]">
                    MV nội bộ theo dõi:{' '}
                    <strong className="">{formatCurrencyVND(totalCdtMv)} VNĐ</strong>
                  </span>
                  {cdtDelta !== 0 && (
                    <span className="text-[13px] font-bold text-[#9C2A2A]">
                      Lệch:{' '}
                      <strong className="">
                        {cdtDelta > 0 ? '+' : '−'}
                        {formatCurrencyVND(Math.abs(cdtDelta))} VNĐ
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Flex>
  )
}
