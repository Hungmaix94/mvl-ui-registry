import { useMemo } from 'react'
import { resolveInvestorBonusAndDeduction } from '@/features/sales/deal-v3/utils/reconciliation-resolver'

import { Flex, Table } from '@radix-ui/themes'
import { useDealCommissionShares } from '@/features/sales/deals/services/deal-service'
import { formatCurrencyVND } from '@/utils/common'
import { History, PenLine } from 'lucide-react'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { CommissionHistoryList } from './CommissionHistoryList'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EditableCommissionCell } from './EditableCommissionCell'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AddCommissionShareForm } from './AddCommissionShareForm'
import { TableEmpty } from '@/components/ui/table/TableEmpty'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import {
  formatAmt,
  getParticipantName,
  getRecipientIdentity,
  getRecipientKey,
} from '@/features/sales/deal-v3/utils/commission-recipient'

interface MgmtCategory {
  key: 'agency_fee' | 'project_bonus' | 'investor_bonus' | 'mv_bonus'
  tooltip: string
  pctOnly: boolean
}

const MGMT_CATEGORIES: readonly MgmtCategory[] = [
  {
    key: 'agency_fee',
    tooltip:
      'Tỷ lệ hoa hồng được bổ sung cho quản lý. Tỷ lệ này được nhân với giá tính phí và phí đại lý.',
    pctOnly: true,
  },
  {
    key: 'project_bonus',
    tooltip: 'Tỷ lệ hoa hồng bổ sung theo từng dự án. Tỷ lệ này được nhân với giá tính phí.',
    pctOnly: true,
  },
  {
    key: 'investor_bonus',
    tooltip: 'Thưởng quản lý từ CĐT. Nếu là phần trăm được nhân với giá tính phí',
    pctOnly: false,
  },
  {
    key: 'mv_bonus',
    tooltip: 'Thưởng quản lý từ MVL. Nếu là phần trăm được nhân với giá tính phí',
    pctOnly: false,
  },
] as const

const DEAL_MGMT_COLUMN_LABELS: Record<string, string> = {
  agency_fee: 'Thưởng quản lý',
  investor_bonus: 'Thưởng quản lý từ CDT',
  mv_bonus: 'Thưởng quản lý bổ sung',
}

const CategoryHeaderCell: React.FC<{ title: string; tooltip: string }> = ({ title, tooltip }) => (
  <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 border-border-1 border-r py-[10px] pr-6 pl-4 text-right font-normal">
    <div className="flex items-center justify-end gap-1.5">
      <span>{title}</span>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-neutral-400" />
          </TooltipTrigger>
          <TooltipContent className="bg-neutral-90 text-neutral-10 max-w-[200px] border-0 text-xs font-normal">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </Table.ColumnHeaderCell>
)

interface DealMgmtSectionProps {
  dealId: number
  pricing?: any
}

export const DealMgmtSection: React.FC<DealMgmtSectionProps> = ({ dealId, pricing }) => {
  const { displayFormContent } = useDialog()
  const { data: sectionData } = useDealCommissionShares(dealId, 'management')
  const rawData = sectionData?.raw_data
  const ability = useAbility()

  const { keysMap: realestateKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_CATEGORY_LABELS],
  })

  const mgmtCategoryLabels = realestateKeysMap.get(
    APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_CATEGORY_LABELS
  ) as Record<string, string> | undefined

  const canCreate = ability.can('shares_management_create', 'deal')
  const canUpdate = ability.can('shares_management_update', 'deal')

  const groupedMgmtShares = useMemo(() => {
    if (rawData && rawData.grouping) {
      const result: any[] = []
      const grouping = rawData.grouping as any
      const { rows: roleKeys, cols: categoryKeys, labels } = grouping

      for (const roleKey of roleKeys || []) {
        const roleLabel = labels?.rows?.[roleKey] || roleKey
        const recipientsMap = new Map<string, any>()

        const defaultShares: Record<string, any> = {}
        for (const colKey of categoryKeys || []) {
          if (colKey === 'revenue_share') continue
          const rowsArray = (rawData.rows as any[]) || []
          const rowData = rowsArray.find(
            (r: any) => r?.group_keys?.role === roleKey && r?.group_keys?.category === colKey
          )
          defaultShares[colKey] = rowData
            ? {
                isEmpty: true,
                in_house_rate: rowData.in_house_rate,
                in_house_amount: rowData.in_house_amount,
                pct_type: rowData.pct_type,
              }
            : null
        }

        // Find all recipients for this role across all categories
        for (const colKey of categoryKeys || []) {
          if (colKey === 'revenue_share') continue
          const rowsArray = (rawData.rows as any[]) || []
          const rowData = rowsArray.find(
            (r: any) => r?.group_keys?.role === roleKey && r?.group_keys?.category === colKey
          )

          if (rowData && Array.isArray(rowData.recipients) && rowData.recipients.length > 0) {
            for (const r of rowData.recipients) {
              const recipient = r as any
              const key = getRecipientKey(recipient)

              if (!recipientsMap.has(key)) {
                recipientsMap.set(key, {
                  id: key,
                  recipientInfo: recipient,
                  roleLabel: roleLabel,
                  roleKey: roleKey,
                  isEmpty: false,
                  totalAmount: 0,
                  shares: { ...defaultShares },
                })
              }

              const group = recipientsMap.get(key)
              group.totalAmount += Number(recipient.calculated_amount || 0)

              // Map the recipient data to the correct category slot
              const fakeShare = {
                ...recipient,
                id: recipient.share_id,
                pct_type: rowData.pct_type,
                percentage: recipient.actual_rate_percentage,
                fixed_amount: recipient.fixed_amount || null,
                in_house_rate: rowData.in_house_rate,
                in_house_amount: rowData.in_house_amount,
              }

              if (colKey === 'agency_fee') group.shares.agency_fee = fakeShare
              else if (colKey === 'project_bonus') group.shares.project_bonus = fakeShare
              else if (colKey === 'investor_bonus') group.shares.investor_bonus = fakeShare
              else if (colKey === 'mv_bonus') group.shares.mv_bonus = fakeShare
            }
          }
        }

        if (recipientsMap.size === 0) {
          // No recipients for this role
          result.push({
            id: `empty_${roleKey}`,
            recipientInfo: null,
            roleLabel: roleLabel,
            roleKey: roleKey,
            isEmpty: true,
            totalAmount: 0,
            shares: { ...defaultShares },
          })
        } else {
          result.push(...Array.from(recipientsMap.values()))
        }
      }
      return result
    }

    return []
  }, [rawData])

  const { data: splitData } = useDealCommissionShares(dealId, 'split')
  const splitShares = ((splitData?.commission_shares as unknown as any[]) || []).filter(
    (s: any) => s.is_active !== false
  )
  const totalAll = splitShares.reduce(
    (sum: number, s: any) => sum + Number(s.calculated_amount || 0),
    0
  )

  const resolvedPricing = resolveInvestorBonusAndDeduction(pricing)
  const totalCdt = resolvedPricing.agencyFee + resolvedPricing.bonus

  const diffAll = totalCdt - totalAll
  const totalMgmtAmt = Number(
    sectionData?.summary?.calculated_amount || rawData?.totals?.calculated_amount || 0
  )
  const remainingAfterMgmt = diffAll - totalMgmtAmt

  const categoryPctTypes = useMemo(() => {
    const map: Record<string, string> = {}
    const rowsArray = (rawData?.rows as any[]) || []
    rowsArray.forEach((row) => {
      if (row.pct_type && row.group_keys?.category && row.group_keys?.role) {
        map[`${row.group_keys.role}_${row.group_keys.category}`] = row.pct_type
      }
    })
    return map
  }, [rawData])

  const renderCell = (group: any, cfg: MgmtCategory) => {
    const colKey = cfg.key
    const share = group.shares[colKey]
    const pctType = categoryPctTypes[`${group.roleKey}_${colKey}`]
    const label = DEAL_MGMT_COLUMN_LABELS[colKey] || mgmtCategoryLabels?.[colKey] || ''

    const mappedShare = share
      ? {
          ...share,
          percentage: share.percentage ?? share.actual_rate_percentage ?? share.in_house_rate,
          fixed_amount: share.fixed_amount ?? share.calculated_amount ?? share.in_house_amount,
        }
      : null

    if (!share || share.isEmpty) {
      const employeeLabel = group?.recipientInfo
        ? getParticipantName(group.recipientInfo)
        : undefined

      const identity = getRecipientIdentity(group?.recipientInfo)
      const recipientKind = identity?.kind
      const recipientId = identity?.id

      if (!recipientId || !recipientKind) {
        return (
          <div
            className={`text-content-dark-3 typo-body-base relative flex h-full w-full items-start justify-end py-3 pr-6 pl-4 text-right transition-colors ${
              canCreate ? 'group/edit hover:bg-action-primary-red-default/5 cursor-pointer' : ''
            }`}
            onClick={() => {
              if (!canCreate) return
              displayFormContent({
                title: 'Thêm đối tượng tham gia',
                hideFooter: true,
                content: (
                  <AddCommissionShareForm
                    dealId={dealId}
                    section="management"
                    initialValues={{
                      role: pctType,
                      participant_id: recipientId,
                      employeeLabel: employeeLabel,
                      roleName: label,
                      recipientRoleLabel: group.roleLabel,
                    }}
                  />
                ),
              })
            }}
          >
            <div className="group-hover/edit:border-action-primary-red-default/30 pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors" />
            <span className="relative z-10">—</span>
            {canCreate && (
              <PenLine className="text-content-dark-4 group-hover/edit:text-action-primary-red-default absolute top-1.5 right-1.5 z-10 hidden h-3.5 w-3.5 group-hover/edit:block" />
            )}
          </div>
        )
      }

      return (
        <EditableCommissionCell
          share={mappedShare || { isEmpty: true, percentage: null, calculated_amount: null }}
          field="percentage"
          dealId={dealId}
          section="management"
          label={label}
          isCreate={true}
          pctType={pctType}
          recipientKind={recipientKind}
          recipientId={recipientId}
          recipientInfo={group?.recipientInfo}
          pctOnly={cfg.pctOnly}
          readonly={!canCreate}
        />
      )
    }
    return (
      <EditableCommissionCell
        share={mappedShare}
        field="percentage"
        dealId={dealId}
        section="management"
        label={label}
        pctType={pctType}
        pctOnly={cfg.pctOnly}
        readonly={!canUpdate}
      />
    )
  }

  return (
    <Flex direction="column" gap="4">
      <div className="flex items-center justify-between">
        <Flex align="baseline" gap="2">
          <h3 className="text-content-dark-1 border-none text-lg font-semibold">
            Thưởng HH Quản lý — Phòng ban / Cá nhân
          </h3>
        </Flex>
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
                  Thưởng HH Quản lý
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-80px)] overflow-y-auto p-6">
                <CommissionHistoryList dealId={dealId} section="management" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {groupedMgmtShares.length === 0 ? (
        <div className="bg-surface-primary-default border-border-1 rounded border shadow-sm">
          <TableEmpty message="Chưa có dữ liệu" />
        </div>
      ) : (
        <div className="bg-surface-primary-default flex flex-col">
          <div className="border-border-1 relative w-full overflow-hidden border shadow-sm">
            <div className="overflow-x-auto">
              <Table.Root className="w-full min-w-[700px] border-collapse bg-white text-left outline-none">
                <Table.Header className="bg-neutral-20 border-border-1 border-b">
                  <Table.Row>
                    <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 border-border-1 border-r px-4 py-[10px] font-normal">
                      Chức vụ / Người nhận
                    </Table.ColumnHeaderCell>
                    {MGMT_CATEGORIES.filter((cfg) => cfg.key !== 'project_bonus').map((cfg) => {
                      const dynamicLabel =
                        DEAL_MGMT_COLUMN_LABELS[cfg.key] || mgmtCategoryLabels?.[cfg.key] || ''
                      return (
                        <CategoryHeaderCell
                          key={cfg.key}
                          title={dynamicLabel}
                          tooltip={cfg.tooltip}
                        />
                      )
                    })}
                    <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-2 py-[10px] pr-6 pl-4 text-right font-normal">
                      Thành tiền
                    </Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {groupedMgmtShares.map((group: any) => (
                    <Table.Row
                      key={group.id}
                      className="hover:bg-data-light-grey-hover border-border-1 border-b transition-colors"
                    >
                      <Table.Cell className="border-border-1 border-r px-4 py-4 align-top">
                        {group.isEmpty ? (
                          <div className="group/add-participant flex items-start justify-between">
                            <div className="typo-body-base-semibold text-content-dark-3 italic">
                              {group.roleLabel}
                              <div className="text-content-dark-4 mt-1 text-xs font-normal">
                                Chưa bổ nhiệm
                              </div>
                            </div>
                            {canCreate && (
                              <button
                                className="text-action-primary-default hover:bg-action-primary-default/10 rounded p-1.5 opacity-0 transition-colors group-hover/add-participant:opacity-100"
                                onClick={() => {
                                  displayFormContent({
                                    title: 'Thêm đối tượng tham gia',
                                    hideFooter: true,
                                    content: (
                                      <AddCommissionShareForm
                                        dealId={dealId}
                                        section="management"
                                        initialValues={{
                                          role: group.roleKey,
                                          recipientRoleLabel: group.roleLabel,
                                        }}
                                      />
                                    ),
                                  })
                                }}
                              ></button>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="typo-body-base-semibold text-content-dark-1 group/edit-participant flex items-center gap-1">
                              {getParticipantName(group.recipientInfo)}
                              {canUpdate && (
                                <PenLine
                                  className="text-content-dark-4 hover:text-action-primary-default hidden h-3.5 w-3.5 cursor-pointer transition-colors group-hover/edit-participant:block"
                                  onClick={() => {
                                    const recipientId = getRecipientIdentity(
                                      group?.recipientInfo
                                    )?.id

                                    displayFormContent({
                                      title: 'Sửa đối tượng tham gia',
                                      hideFooter: true,
                                      content: (
                                        <AddCommissionShareForm
                                          dealId={dealId}
                                          section="management"
                                          initialValues={{
                                            role: group.roleKey,
                                            participant_id: recipientId,
                                            employeeLabel: getParticipantName(group.recipientInfo),
                                            recipientRoleLabel: group.roleLabel,
                                            isEditingParticipant: true,
                                          }}
                                        />
                                      ),
                                    })
                                  }}
                                />
                              )}
                            </div>
                            <div className="text-content-dark-3 mt-1 text-xs">
                              {group.roleLabel}
                            </div>
                          </>
                        )}
                      </Table.Cell>
                      {MGMT_CATEGORIES.filter((cfg) => cfg.key !== 'project_bonus').map((cfg) => (
                        <Table.Cell
                          key={cfg.key}
                          className="border-border-1 border-r !p-0 align-top"
                        >
                          {renderCell(group, cfg)}
                        </Table.Cell>
                      ))}
                      <Table.Cell className="border-border-1 bg-surface-primary-default py-4 pr-6 pl-4 text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <span className="typo-body-base-semibold text-content-dark-1">
                            {formatAmt(group.totalAmount)}
                          </span>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </div>
            {groupedMgmtShares.length > 0 && (
              <div className="flex flex-wrap items-center gap-8 border-b border-[#F4C7C7] bg-[#FCE7E7] px-4 py-3.5 text-sm">
                <div className="flex-1" />
                <div className="inline-flex items-baseline gap-2">
                  <span className="text-sm font-bold tracking-wider text-[#9C2A2A]">
                    Tổng Thưởng HH Quản lý
                  </span>
                  <span className="text-sm font-bold text-[#9C2A2A]">
                    {formatCurrencyVND(totalMgmtAmt)} VNĐ
                  </span>
                </div>
              </div>
            )}
            <div
              className={`flex flex-wrap items-center gap-8 border-t px-4 py-3.5 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${remainingAfterMgmt >= 0 ? 'border-data-green-default/30 bg-data-green-default/5' : 'border-data-red-default/30 bg-data-red-default/5'}`}
            >
              <div className="flex-1" />
              <div className="inline-flex items-baseline gap-2.5">
                <span
                  className={`text-sm font-semibold ${remainingAfterMgmt >= 0 ? 'text-data-green-default' : 'text-data-red-default'}`}
                >
                  Còn lại sau Thưởng HH Quản lý =
                </span>
                <span
                  className={`text-sm font-bold ${remainingAfterMgmt >= 0 ? 'text-data-green-default' : 'text-data-red-default'}`}
                >
                  {remainingAfterMgmt >= 0 ? '+' : ''}
                  {formatCurrencyVND(remainingAfterMgmt)} VNĐ
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Flex>
  )
}
