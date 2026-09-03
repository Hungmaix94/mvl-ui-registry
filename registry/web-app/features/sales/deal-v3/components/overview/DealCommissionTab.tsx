import React from 'react'
import { Flex } from '@radix-ui/themes'
import { Lock, AlertCircle, CheckCircle2, History, PenLine, Plus } from 'lucide-react'
import {
  useDealWorkspace,
  useDealCommissionShares,
  useDealRevenueAllocations,
} from '@/features/sales/deals/services/deal-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CommissionHistoryList } from './CommissionHistoryList'
import { EditableCommissionCell } from './EditableCommissionCell'
import { useAbility } from '@/lib/ability'
import { CreateShareRequestRecipient_kind } from '@/api/schema'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useDialog } from '@/hooks/useDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { AddCommissionShareForm } from './AddCommissionShareForm'
import { CtvLineSourceForm } from './CtvLineSourceForm'
import { formatMoney, formatPct } from '@/utils/common'
import {
  getRecipientIdentity,
  getParticipantName,
} from '@/features/sales/deal-v3/utils/commission-recipient'
import { getFeeDeductionCell } from '@/features/sales/deal-v3/utils/fee-deduction'
import {
  getBaseCommissionKeys,
  isF2Share,
  sumSplitBasePct,
} from '@/features/sales/deal-v3/utils/split-base-pct'
import { getShareContribPct } from './DealSplitSection'
import { getF2SourceDisplay } from '@/features/sales/deal-v3/utils/f2-source-display'

interface DealCommissionTabProps {
  dealId: number
}

const COMMISSION_PCT_TYPES = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

const DEAL_MGMT_COLUMN_LABELS: Record<string, string> = {
  agency_fee: 'Thưởng quản lý',
  investor_bonus: 'Thưởng quản lý từ CDT',
  mv_bonus: 'Thưởng quản lý bổ sung',
}

const VISIBLE_MGMT_COLUMNS = ['agency_fee', 'investor_bonus', 'mv_bonus'] as const

const getBorderColor = (tag: string) => {
  if (tag === 'MV') return 'var(--color-data-red-default)'
  if (tag === 'F1') return 'var(--color-data-orange-hover)'
  if (tag === 'CTV') return 'var(--color-data-blue-default)'
  if (tag === 'F2') return '#A0A0A0'
  return 'transparent'
}

const getSubtitle = (row: any, payeeTypeMap?: Record<string, string>, actualKind?: string) => {
  if (row.role_tag === 'MV') return 'Sale nội bộ'
  if (row.role_tag === 'F1') return `F1 ôm căn · auto ${formatPct(row.participation_pct)}`
  if (row.role_tag === 'CTV') return 'Cộng tác viên'
  if (row.role_tag === 'F2') return 'Doanh số quy về phòng QL sàn'
  const type = actualKind || row.recipient?.type || row.recipient_kind || row.sale_type
  if (!type) return ''
  const key = type.toUpperCase()
  if (payeeTypeMap?.[key]) return payeeTypeMap[key]
  return type === 'employee'
    ? 'Sale nội bộ'
    : type === 'exchange'
      ? 'Sàn giao dịch'
      : type === 'collaborator'
        ? 'Cộng tác viên'
        : type
}

const getOrgPath = (share: any) => {
  const identity = getRecipientIdentity(share)
  const target = (identity ? share[identity.kind] : null) || share
  const ORG_PATH_FIELDS = ['branch', 'block', 'department', 'position'] as const

  let sourcePrefix = ''
  if (
    share.recipient_kind === APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND.CTV_WITH_SOURCE &&
    share.employee
  ) {
    const empName = share.employee.fullname || share.employee.name
    if (empName) {
      sourcePrefix = `${empName} - `
    }
  }

  const resolveName = (key: (typeof ORG_PATH_FIELDS)[number]) =>
    target[key]?.name || target[`${key}_name`] || share[key]?.name || share[`${key}_name`] || ''

  const uniqueParts = Array.from(new Set(ORG_PATH_FIELDS.map(resolveName).filter(Boolean)))
  const path = uniqueParts.length > 0 ? uniqueParts.join(' / ') : ''
  return sourcePrefix + path || '—'
}

const getActiveRecord = (details: any, keys: string[]) => {
  if (!details) return null
  for (const key of keys) {
    if (details[key]?.is_custom_override) {
      return { ...details[key], pct_type: key }
    }
  }
  for (const key of keys) {
    const rec = details[key]
    if (!rec) continue
    if (
      Number(rec.percentage) > 0 ||
      Number(rec.actual_rate_percentage) > 0 ||
      Number(rec.fixed_amount) > 0 ||
      Number(rec.calculated_amount) > 0
    ) {
      return { ...rec, pct_type: key }
    }
  }
  for (const key of keys) {
    if (details[key]) {
      return { ...details[key], pct_type: key }
    }
  }
  return null
}

const isRestrictedResponse = (obj: unknown): boolean => {
  if (obj && typeof obj === 'object' && 'restricted' in obj) {
    return (obj as Record<string, unknown>).restricted === true
  }
  return false
}

export const DealCommissionTab: React.FC<DealCommissionTabProps> = ({ dealId }) => {
  const ability = useAbility()
  const { displayFormContent } = useDialog()
  const canUpdateSplit = ability.can('shares_split_update', 'deal')
  const canCreateSplit = ability.can('shares_split_create', 'deal')

  const handleEditCtvLineSource = (share: any) => {
    const shareObj = share as Record<string, any>
    displayFormContent({
      title: 'Chỉnh sửa Line CTV',
      content: (
        <CtvLineSourceForm
          dealId={dealId}
          shareId={shareObj.share_id || shareObj.id}
          initialValues={{
            ctv_line_type: shareObj.ctv_line_type,
            ctv_line_employee: shareObj.employee?.id ?? shareObj.ctv_line_employee,
            ctv_line_department: shareObj.department?.id ?? shareObj.ctv_line_department,
            employeeLabel: shareObj.employee?.fullname || shareObj.employee?.code || '',
            departmentLabel: shareObj.department?.name || '',
          }}
        />
      ),
    })
  }

  const { keysMap: accountingKeysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.PAYEE_TYPE],
  })

  const { keysMap: realestateKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_CATEGORY_LABELS,
      APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE,
    ],
  })

  const payeeTypeMap = accountingKeysMap.get(APP_CONSTANT_KEY.ACCOUNTING.PAYEE_TYPE) as
    | Record<string, string>
    | undefined

  const mgmtCategoryLabels = realestateKeysMap.get(
    APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_CATEGORY_LABELS
  ) as Record<string, string> | undefined

  const f2SourceLabels = realestateKeysMap.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) as
    | Record<string, string>
    | undefined

  const getMgmtColumnLabel = (col: string) => {
    return DEAL_MGMT_COLUMN_LABELS[col] || mgmtCategoryLabels?.[col] || ''
  }

  const canViewSplit = ability.can('commission_shares_split', 'deal')
  const canViewMgmt = ability.can('commission_shares_management', 'deal')

  const {
    data: workspaceData,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
  } = useDealWorkspace(dealId)

  const dealStatus = workspaceData?.header?.deal_status || workspaceData?.status

  const {
    data: splitSharesData,
    isLoading: isSplitLoading,
    error: splitError,
  } = useDealCommissionShares(dealId, 'split', {
    enabled: canViewSplit,
  })

  const {
    data: mgmtSharesData,
    isLoading: isMgmtLoading,
    error: mgmtError,
  } = useDealCommissionShares(dealId, 'management', {
    enabled: canViewMgmt,
  })

  const splitShares = React.useMemo(() => {
    return splitSharesData?.commission_shares || []
  }, [splitSharesData])

  const { data: allocationsData } = useDealRevenueAllocations(dealId, {
    enabled: canViewSplit,
  })

  const revenueAllocationsMap = React.useMemo(() => {
    let arr: any[] = []
    if (Array.isArray(allocationsData)) {
      arr = allocationsData
    } else if (allocationsData && typeof allocationsData === 'object') {
      const dataAsAny = allocationsData as any
      if (Array.isArray(dataAsAny.results)) arr = dataAsAny.results
      else if (Array.isArray(dataAsAny.data)) arr = dataAsAny.data
      else if (dataAsAny.id || dataAsAny.revenue_amount) arr = [dataAsAny]
    }

    const map = new Map<string, any>()
    arr.forEach((a: any) => {
      const empId = a.employee?.id ?? a.employee
      if (empId != null) map.set(`employee-${empId}`, a)

      const colId = a.collaborator?.id ?? a.collaborator
      if (colId != null) map.set(`collaborator-${colId}`, a)

      const excId = a.exchange?.id ?? a.exchange
      if (excId != null) map.set(`exchange-${excId}`, a)

      const depId = a.department?.id ?? a.department
      if (depId != null) map.set(`department-${depId}`, a)

      const posId = a.position?.id ?? a.position
      if (posId != null) map.set(`position-${posId}`, a)
    })
    return map
  }, [allocationsData])

  const totalParticipate = React.useMemo(() => {
    return splitShares.reduce((sum: number, s: any) => {
      const identity = getRecipientIdentity(s)
      const allocKey = identity ? `${identity.kind}-${identity.id}` : null
      const alloc = allocKey ? revenueAllocationsMap.get(allocKey) : null
      const contrib = getShareContribPct(s, alloc)
      return sum + Number(contrib ?? 0)
    }, 0)
  }, [splitShares, revenueAllocationsMap])

  const totalInternal = React.useMemo(() => {
    return splitShares.reduce((sum: number, s: any) => {
      if (!s.exchange && !s.collaborator) {
        return sum + Number(s.total_calculated_amount || 0)
      }
      return sum
    }, 0)
  }, [splitShares])

  const totalCollaborator = React.useMemo(() => {
    return splitShares.reduce((sum: number, s: any) => {
      if (s.collaborator) {
        return sum + Number(s.total_calculated_amount || 0)
      }
      return sum
    }, 0)
  }, [splitShares])

  const totalExchange = React.useMemo(() => {
    return splitShares.reduce((sum: number, s: any) => {
      if (s.exchange) {
        return sum + Number(s.total_calculated_amount || 0)
      }
      return sum
    }, 0)
  }, [splitShares])

  // "Tổng phí hoa hồng trả sale" — dòng Tổng của section 5 (CR 86eymaa3v). Cộng đúng
  // những gì cột "Phí HH trả sale" đang hiển thị, qua chung một util với ô của từng dòng.
  const totalBasePct = React.useMemo(() => sumSplitBasePct(splitShares), [splitShares])

  const totalAll = React.useMemo(() => {
    return (
      Number(
        splitSharesData?.summary?.calculated_amount ||
          splitSharesData?.raw_data?.totals?.calculated_amount ||
          0
      ) || totalInternal + totalExchange + totalCollaborator
    )
  }, [splitSharesData, totalInternal, totalExchange, totalCollaborator])

  const mgmtRawData = mgmtSharesData?.raw_data
  const groupedMgmtShares = React.useMemo(() => {
    if (mgmtRawData && mgmtRawData.grouping) {
      const result: any[] = []
      const grouping = mgmtRawData.grouping as any
      const { rows: roleKeys, cols: categoryKeys, labels } = grouping

      for (const roleKey of roleKeys || []) {
        const roleLabel = labels?.rows?.[roleKey] || roleKey
        const recipientsMap = new Map<string, any>()

        const defaultShares: Record<string, any> = {}
        for (const colKey of categoryKeys || []) {
          if (colKey === 'revenue_share') continue
          const rowsArray = (mgmtRawData.rows as any[]) || []
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

        for (const colKey of categoryKeys || []) {
          if (colKey === 'revenue_share') continue
          const rowsArray = (mgmtRawData.rows as any[]) || []
          const rowData = rowsArray.find(
            (r: any) => r?.group_keys?.role === roleKey && r?.group_keys?.category === colKey
          )

          if (rowData && Array.isArray(rowData.recipients) && rowData.recipients.length > 0) {
            for (const r of rowData.recipients) {
              const recipient = r as any
              const key = recipient.employee?.id
                ? `employee_${recipient.employee.id}`
                : recipient.collaborator?.id
                  ? `collaborator_${recipient.collaborator.id}`
                  : recipient.exchange?.id
                    ? `exchange_${recipient.exchange.id}`
                    : recipient.department?.id
                      ? `department_${recipient.department.id}`
                      : recipient.position?.id
                        ? `position_${recipient.position.id}`
                        : `unknown_${recipient.name || recipient.role_label}`

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
  }, [mgmtRawData])

  const categoryPctTypes = React.useMemo(() => {
    const map: Record<string, string> = {}
    const rowsArray = (mgmtRawData?.rows as any[]) || []
    rowsArray.forEach((row) => {
      if (row.pct_type && row.group_keys?.category && row.group_keys?.role) {
        map[`${row.group_keys.role}_${row.group_keys.category}`] = row.pct_type
      }
    })
    return map
  }, [mgmtRawData])

  const renderCell = (share: any, colKey: string, group: any, label?: string) => {
    const pctType = categoryPctTypes[`${group.roleKey}_${colKey}`]

    const canCreateMgmt = ability.can('shares_management_create', 'deal')
    const canUpdateMgmt = ability.can('shares_management_update', 'deal')

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
        const rateVal = share?.in_house_rate
        const amountVal = share?.in_house_amount

        const hasRate = rateVal != null && rateVal !== ''
        const hasAmount = amountVal != null && amountVal !== ''

        let displayVal = '—'
        if (hasRate) {
          displayVal = formatPct(rateVal)
        } else if (hasAmount) {
          displayVal = formatMoney(amountVal)
        }

        return (
          <div
            className={`text-content-dark-3 typo-body-base relative flex h-full w-full items-start justify-end py-3 pr-6 pl-4 text-right transition-colors ${
              canCreateMgmt ? 'group/edit hover:bg-action-primary-red-default/5 cursor-pointer' : ''
            }`}
            onClick={() => {
              if (!canCreateMgmt) return
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
                      roleName: getMgmtColumnLabel(colKey),
                      recipientRoleLabel: group.roleLabel,
                      percentage: share?.in_house_rate || undefined,
                      fixed_amount: share?.in_house_amount || undefined,
                    }}
                  />
                ),
              })
            }}
          >
            <div className="group-hover/edit:border-action-primary-red-default/30 pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors" />
            <span className="relative z-10">{displayVal}</span>
            {canCreateMgmt && (
              <PenLine className="text-content-dark-4 group-hover/edit:text-action-primary-red-default absolute top-1.5 right-1.5 z-10 hidden h-3.5 w-3.5 group-hover/edit:block" />
            )}
          </div>
        )
      }

      return (
        <EditableCommissionCell
          share={
            mappedShare || { isEmpty: true, actual_rate_percentage: null, calculated_amount: null }
          }
          field="percentage"
          dealId={dealId}
          section="management"
          label={label}
          isCreate={true}
          pctType={pctType}
          recipientKind={recipientKind}
          recipientId={recipientId}
          recipientInfo={group?.recipientInfo}
          pctOnly={colKey === 'agency_fee' || colKey === 'project_bonus'}
          readonly={!canCreateMgmt}
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
        pctOnly={colKey === 'agency_fee' || colKey === 'project_bonus'}
        readonly={!canUpdateMgmt}
      />
    )
  }

  // Calculate split commission expense
  const splitCommissionExpense = React.useMemo(() => {
    if (!canViewSplit || !splitSharesData) return 0
    return Number(
      splitSharesData.summary?.calculated_amount ||
        splitSharesData.raw_data?.totals?.calculated_amount ||
        0
    )
  }, [splitSharesData, canViewSplit])

  // Calculate mgmt commission expense
  const mgmtCommissionExpense = React.useMemo(() => {
    if (!canViewMgmt || !mgmtSharesData) return 0
    return Number(
      mgmtSharesData.summary?.calculated_amount ||
        mgmtSharesData.raw_data?.totals?.calculated_amount ||
        0
    )
  }, [mgmtSharesData, canViewMgmt])

  const isInitialLoading =
    isWorkspaceLoading || (canViewSplit && isSplitLoading) || (canViewMgmt && isMgmtLoading)

  const hasFetchError =
    !!workspaceError ||
    (canViewSplit && !!splitError) ||
    (canViewMgmt && !!mgmtError) ||
    !workspaceData

  // `hasPermission={true}` ở hai nhánh dưới là CỐ Ý và là code chết: `DetailPageWrapper` kiểm
  // `isLoading` → `isNotFound` → `isError` TRƯỚC `hasPermission`, mà cả hai nhánh này đều rơi vào
  // một trong ba điều kiện đó. Đây là khung xương chờ tải / khung báo lỗi, không phải cổng quyền —
  // tab này nằm trong màn Deal và quyền đã chặn ở route của màn đó (ClickUp 86eync7g0).
  if (isInitialLoading) {
    return (
      <DetailPageWrapper isLoading={true} isNotFound={false} isError={false} hasPermission={true}>
        <div />
      </DetailPageWrapper>
    )
  }

  if (hasFetchError) {
    return (
      <DetailPageWrapper isLoading={false} isNotFound={false} isError={true} hasPermission={true}>
        <div />
      </DetailPageWrapper>
    )
  }

  const pricing = workspaceData?.pricing
  const totalReconciled = Number(pricing?.total_reconciled || 0)

  const participant_breakdown = (splitSharesData?.raw_data?.rows as any[]) || []
  const management_commission = {
    rows: mgmtRawData?.rows || [],
    total: mgmtRawData?.totals?.calculated_amount || '0',
    remaining_after_management: String(totalReconciled - mgmtCommissionExpense),
    restricted: isRestrictedResponse(mgmtSharesData) || isRestrictedResponse(mgmtRawData),
  }
  const pnl_summary = {
    investor_income: String(totalReconciled),
    participant_payout: String(splitCommissionExpense),
    management_payout: String(mgmtCommissionExpense),
    net_mv: String(totalReconciled - splitCommissionExpense - mgmtCommissionExpense),
  }

  // Check restriction states
  const isSplitRestricted = !canViewSplit || isRestrictedResponse(splitSharesData)
  const isMgmtRestricted = !canViewMgmt || management_commission.restricted
  const isPnlRestricted = !canViewSplit || !canViewMgmt || isSplitRestricted || isMgmtRestricted

  const renderRolePill = (tag: string) => {
    let tone = 'grey'
    if (tag === 'MV') tone = 'red'
    else if (tag === 'F1') tone = 'orange'
    else if (tag === 'CTV') tone = 'blue'
    else if (tag === 'F2') tone = 'grey'
    return <span className={`m4-pill m4-pill-${tone}`}>{tag}</span>
  }

  return (
    <Flex direction="column" gap="6" className="py-4">
      {/* ── Section 05: Participant Breakdown ─────────────────────────────── */}
      <div className="m4-art" id="sec-split">
        <div className="m4-card-head">
          <span className="num-tag">05</span>
          <h4 id="sec-split-title">Phân chia HH — Các bên tham gia</h4>
          <span className="sub">
            &middot; Phân chia chi tiết cho từng nhân sự / đơn vị liên kết
          </span>
          {!isSplitRestricted && (
            <div className="actions">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="text-content-dark-3 hover:text-content-dark-1 hover:bg-surface-primary-hover flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium outline-hidden transition-colors">
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
                      Phân chia HH — Các bên tham gia
                    </SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(100vh-80px)] overflow-y-auto p-6">
                    <CommissionHistoryList dealId={dealId} section="split" />
                  </div>
                </SheetContent>
              </Sheet>
              {canCreateSplit && (
                <button
                  className="text-action-primary-default hover:text-action-primary-hover flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium outline-hidden transition-colors"
                  onClick={() => {
                    displayFormContent({
                      title: 'Thêm đối tượng tham gia',
                      hideFooter: true,
                      content: <AddCommissionShareForm dealId={dealId} section="split" />,
                    })
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Thêm đối tượng
                </button>
              )}
            </div>
          )}
        </div>
        {isSplitRestricted ? (
          <div className="flex items-center gap-3.5 border-t border-gray-100 bg-amber-50/40 p-5 text-amber-800">
            <Lock className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-sm font-bold">Nội dung bị hạn chế</div>
              <div className="mt-0.5 text-xs text-amber-700">
                Bạn không có quyền truy cập thông tin phân chia hoa hồng này.
              </div>
            </div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl m4-tbl">
              <thead>
                <tr>
                  <th>Người / Đơn vị</th>
                  <th>Loại</th>
                  <th>Phòng ban / Nguồn</th>
                  <th className="r">Tham gia</th>
                  <th className="r">Phí HH trả sale</th>
                  <th className="r">Thưởng CĐT</th>
                  {/* Thưởng MV: tiền MV chi theo đợt (LAD), chỉ hiển thị —
                      `staff_incentive` không nằm trong section "split" của BE nên
                      sửa tay ở đây sẽ bị 400. */}
                  <th className="r">Thưởng MV</th>
                  <th className="r">Giảm trừ</th>
                  <th className="r font-semibold">Tổng nhận (net)</th>
                  <th className="r">Thành tiền doanh thu cá nhân</th>
                </tr>
              </thead>
              <tbody>
                {splitShares.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="bg-gray-50/50 px-4 py-8 text-center text-gray-400 italic"
                    >
                      Chưa có dữ liệu phân chia hoa hồng.
                    </td>
                  </tr>
                ) : (
                  splitShares.map((share: any, i) => {
                    const shareObj = share as Record<string, any>
                    const identity = getRecipientIdentity(shareObj)
                    const recipientKind = identity?.kind
                    const recipientId = identity?.id
                    const isSale =
                      recipientKind === CreateShareRequestRecipient_kind.employee ||
                      recipientKind === CreateShareRequestRecipient_kind.collaborator
                    const allocKey = identity ? `${identity.kind}-${identity.id}` : null
                    const alloc = allocKey ? revenueAllocationsMap.get(allocKey) : null

                    const matchedRow = participant_breakdown.find((row: any) => {
                      const shareIdentity = getRecipientIdentity(share)
                      if (!shareIdentity) return false

                      let rowKind = row.recipient?.type || row.recipient_kind || row.sale_type
                      if (rowKind === 'f2_exchange' || rowKind === 'exchange') rowKind = 'exchange'
                      else if (
                        rowKind === 'f2_agency' ||
                        rowKind === 'ctv_with_source' ||
                        rowKind === 'collaborator'
                      )
                        rowKind = 'collaborator'
                      else if (rowKind === 'mv_sale' || rowKind === 'mv' || rowKind === 'employee')
                        rowKind = 'employee'

                      const rowId = String(row.recipient?.id || getRecipientIdentity(row)?.id)

                      // 1. Perfect match on type and ID
                      if (rowKind === shareIdentity.kind && rowId === shareIdentity.id) {
                        return true
                      }

                      // 2. Fallback match on ID and Name to handle role-based type overrides in backend
                      const nameMatches =
                        (row.recipient?.name || getParticipantName(row))?.toLowerCase().trim() ===
                        getParticipantName(share)?.toLowerCase().trim()

                      if (nameMatches && rowId === shareIdentity.id) {
                        return true
                      }

                      return false
                    })

                    const roleTag =
                      matchedRow?.role_tag ||
                      (recipientKind === 'employee'
                        ? 'MV'
                        : recipientKind === 'collaborator'
                          ? 'CTV'
                          : share.recipient_kind === 'f2_exchange'
                            ? 'F2'
                            : 'F1')

                    const recipientName = matchedRow?.recipient?.name || getParticipantName(share)

                    // Nguồn F2 của CHÍNH dòng này (86eya66m0) — `department` bên dưới là
                    // phòng SLK dùng chung cho mọi dòng F2 nên không nói được ai mang sàn về.
                    const f2SourceText = getF2SourceDisplay(
                      shareObj,
                      shareObj?.recipient_kind ===
                        APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND.F2_EXCHANGE,
                      f2SourceLabels
                    )

                    const subtitle = matchedRow
                      ? getSubtitle(matchedRow, payeeTypeMap, recipientKind)
                      : recipientKind === 'employee'
                        ? 'Sale nội bộ'
                        : recipientKind === 'collaborator'
                          ? 'Cộng tác viên'
                          : share.recipient_kind === 'f2_exchange'
                            ? 'Doanh số quy về phòng QL sàn'
                            : payeeTypeMap?.['EXCHANGE'] || 'Sàn liên kết'

                    let baseComm: any = null
                    let bonusComm: any = null
                    let contribPct: number | string | null = null
                    let isF2 = false

                    if (shareObj) {
                      // Kênh F2/F1 và cặp khoá base đi qua util dùng chung với dòng Tổng
                      // (`sumSplitBasePct`) — hai bên tự suy lại là cách chắc chắn nhất
                      // khiến dòng Tổng lệch khỏi các ô nó đang cộng.
                      //
                      // Truyền THẲNG `shareObj`, đúng thứ dòng Tổng cũng truyền. Chuẩn hoá
                      // `recipient_kind` ở đây rồi để dòng Tổng đọc share thô là tự tạo ra
                      // hai đường suy khác nhau cho cùng một share.
                      isF2 = isF2Share(shareObj)

                      const baseCommKeys = getBaseCommissionKeys(shareObj)

                      const bonusCommKeys = isF2
                        ? [COMMISSION_PCT_TYPES.F2_BONUS.pct, COMMISSION_PCT_TYPES.F2_BONUS.amt]
                        : [
                            COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct,
                            COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.amt,
                          ]

                      const baseCommRecord = getActiveRecord(shareObj.details, baseCommKeys)
                      const bonusCommRecord = getActiveRecord(shareObj.details, bonusCommKeys)

                      const fallbackShare = {
                        employee: shareObj.employee,
                        exchange: shareObj.exchange,
                        collaborator: shareObj.collaborator,
                        department: shareObj.department,
                        position: shareObj.position,
                        fixed_amount: null,
                        percentage: null,
                        actual_rate_percentage: null,
                        contribution_percentage: null,
                        isEmpty: true,
                      }

                      contribPct =
                        getShareContribPct(shareObj, alloc) ??
                        matchedRow?.participation_pct ??
                        matchedRow?.commissions?.[COMMISSION_PCT_TYPES.F2_SALE.pct]
                          ?.contribution_percentage ??
                        matchedRow?.commissions?.[COMMISSION_PCT_TYPES.F2_BONUS.pct]
                          ?.contribution_percentage ??
                        matchedRow?.commissions?.[COMMISSION_PCT_TYPES.F2_MV_BONUS.pct]
                          ?.contribution_percentage ??
                        null

                      baseComm = {
                        ...(baseCommRecord || {
                          ...fallbackShare,
                          pct_type: !isF2
                            ? COMMISSION_PCT_TYPES.F1_SALE.pct
                            : COMMISSION_PCT_TYPES.F2_SALE.pct,
                          contribution_percentage: contribPct,
                        }),
                      }

                      bonusComm = {
                        ...(bonusCommRecord || {
                          ...fallbackShare,
                          pct_type: isF2
                            ? COMMISSION_PCT_TYPES.F2_BONUS.pct
                            : COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct,
                          contribution_percentage: contribPct,
                        }),
                      }
                    }

                    return (
                      <tr key={i} className="editable">
                        <td
                          style={{ borderLeft: `4px solid ${getBorderColor(roleTag)}` }}
                          className="align-top"
                        >
                          <span className="strong">{recipientName}</span>
                          {matchedRow?.payment?.commission_payable_code && (
                            <span className="muted" style={{ fontWeight: 500 }}>
                              {' '}
                              ({matchedRow.payment.commission_payable_code})
                            </span>
                          )}
                          <div className="mt-1 flex items-center gap-1.5">
                            <div className="muted" style={{ fontSize: 12 }}>
                              {subtitle}
                            </div>
                            {matchedRow?.payment?.status && (
                              <>
                                <span className="muted">&middot;</span>
                                {(() => {
                                  let tone = 'grey'
                                  let label = 'Chưa chi'
                                  if (matchedRow.payment.status === 'paid') {
                                    tone = 'green'
                                    label = 'Đã chi'
                                  } else if (matchedRow.payment.status === 'partial') {
                                    tone = 'orange'
                                    label = 'Chi một phần'
                                  } else if (matchedRow.payment.status === 'unpaid') {
                                    tone = 'red'
                                    label = 'Chưa chi'
                                  }
                                  return (
                                    <span className={`m4-pill m4-pill-${tone} !px-1.5 !py-0.5`}>
                                      {label}
                                    </span>
                                  )
                                })()}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="align-top">{renderRolePill(roleTag)}</td>
                        <td className="align-top">
                          <div className="flex items-center gap-1.5">
                            {roleTag === 'CTV' &&
                            (share.employee?.fullname || share.employee?.code) ? (
                              <div style={{ fontSize: 13 }}>
                                Line: <b>{share.employee.fullname || share.employee.code}</b>
                              </div>
                            ) : share.department?.name ? (
                              <div style={{ fontSize: 13 }}>
                                <b>{share.department.name}</b>
                              </div>
                            ) : roleTag === 'MV' ? (
                              <div style={{ fontSize: 13 }}>
                                <b>Phòng kinh doanh</b>
                              </div>
                            ) : (
                              <span style={{ fontSize: 13 }}>
                                <b>{getOrgPath(share)}</b>
                              </span>
                            )}
                            {roleTag === 'CTV' &&
                              dealStatus === 'active' &&
                              ability.can('ctv_line_source', 'deal') && (
                                <button
                                  type="button"
                                  onClick={() => handleEditCtvLineSource(share)}
                                  className="text-action-primary-default hover:text-action-primary-hover transition-colors outline-none focus:outline-none"
                                  title="Chỉnh sửa Line CTV"
                                >
                                  <PenLine className="h-3.5 w-3.5" />
                                </button>
                              )}
                          </div>
                          {f2SourceText && (
                            <div className="text-content-dark-3 mt-0.5" style={{ fontSize: 12 }}>
                              <b>{f2SourceText}</b>
                            </div>
                          )}
                        </td>
                        <td className="r align-top">
                          {formatPct(contribPct)}
                          {roleTag === 'F1' && (
                            <span className="muted" style={{ fontSize: 11, marginLeft: 2 }}>
                              auto
                            </span>
                          )}
                        </td>
                        <td className="r !p-0 align-top" style={{ height: '1px' }}>
                          {share && baseComm ? (
                            <EditableCommissionCell
                              share={baseComm}
                              field="percentage"
                              dealId={dealId}
                              section="split"
                              label="PHÍ HH TRẢ SALE (%)"
                              isCreate={baseComm.isEmpty}
                              pctType={baseComm.pct_type}
                              recipientKind={recipientKind}
                              recipientId={recipientId}
                              recipientInfo={share}
                              recipientSubtitle={getOrgPath(share)}
                              readonly={!canUpdateSplit}
                              allowFraction
                            />
                          ) : (
                            <div className="flex h-full w-full items-start justify-end py-3 pr-6 pl-4 text-right">
                              <span>{formatPct(matchedRow?.pct_base_commission)}</span>
                            </div>
                          )}
                        </td>
                        <td className="r !p-0 align-top" style={{ height: '1px' }}>
                          {share && bonusComm ? (
                            <EditableCommissionCell
                              share={bonusComm}
                              field={
                                (bonusComm.actual_rate_percentage ?? bonusComm.percentage) !=
                                  null || !bonusComm.isEmpty
                                  ? 'percentage'
                                  : 'fixed_amount'
                              }
                              dealId={dealId}
                              section="split"
                              label={
                                (bonusComm.actual_rate_percentage ?? bonusComm.percentage) !=
                                  null || !bonusComm.isEmpty
                                  ? 'THƯỞNG CĐT (%)'
                                  : 'THƯỞNG CĐT (VND)'
                              }
                              isCreate={bonusComm.isEmpty}
                              pctType={bonusComm.pct_type}
                              recipientKind={recipientKind}
                              recipientId={recipientId}
                              recipientInfo={share}
                              recipientSubtitle={getOrgPath(share)}
                              readonly={!canUpdateSplit}
                            />
                          ) : (
                            <div className="flex h-full w-full items-start justify-end py-3 pr-6 pl-4 text-right">
                              {(() => {
                                const key = isF2
                                  ? COMMISSION_PCT_TYPES.F2_BONUS.pct
                                  : COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct
                                const cell = matchedRow?.commissions?.[key]
                                return cell && Number(cell.amount || 0) > 0 ? (
                                  <span className="m4-num m4-money-bonus">
                                    +{formatMoney(cell.amount)}
                                  </span>
                                ) : (
                                  <span className="muted">—</span>
                                )
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="r align-top">
                          <div className="flex h-full w-full items-start justify-end py-3 pr-6 pl-4 text-right">
                            {(() => {
                              // Số tiền đã nhân tỷ lệ tham gia và đã cân khớp tổng đợt ở BE;
                              // khoá tiền của bảng split là `amount`.
                              const cell = matchedRow?.commissions?.staff_incentive
                              return cell && Number(cell.amount || 0) !== 0 ? (
                                <span className="m4-num m4-money-bonus">
                                  +{formatMoney(cell.amount)}
                                </span>
                              ) : (
                                <span className="muted">—</span>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="r align-top">
                          {(() => {
                            // Reconciliation fee-deduction cell. The backend sends the amount as a
                            // signed-negative CommissionShare cell keyed by recipient side, with a
                            // legacy matchedRow.deduction fallback; the resolver returns a
                            // sign-agnostic magnitude + hasValue (see utils/fee-deduction).
                            const { amountMagnitude, pct, hasValue } = getFeeDeductionCell(
                              matchedRow,
                              isF2
                            )
                            if (!hasValue) return <span className="muted">—</span>
                            return (
                              <>
                                <span className="m4-num m4-money-deduct">
                                  −{formatMoney(amountMagnitude)}
                                </span>
                                {pct != null && (
                                  <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
                                    ({formatPct(pct)})
                                  </div>
                                )}
                                {matchedRow?.deduction?.source && (
                                  <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
                                    {matchedRow.deduction.source}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </td>
                        <td className="r strong align-top font-semibold">
                          <span className="m4-num text-content-dark-1">
                            {formatMoney(
                              matchedRow
                                ? (matchedRow.totals?.amount ?? matchedRow.net_received)
                                : share.total_calculated_amount
                            )}
                          </span>
                          <span className="m4-vnd">VND</span>
                        </td>
                        <td className="r align-top">
                          {isSale && alloc ? (
                            <>
                              <span className="m4-num text-content-dark-1">
                                {formatMoney(alloc.revenue_amount)}
                              </span>
                              <span className="m4-vnd">VND</span>
                            </>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
                {!isSplitRestricted && splitShares.length > 0 && (
                  <tr className="total-row bg-[#FCE7E7] font-semibold text-[#9C2A2A]">
                    <td colSpan={10} className="px-4 py-3.5 text-right align-middle">
                      <div className="flex items-center justify-end gap-8 text-sm">
                        <div className="inline-flex items-baseline gap-2">
                          <span>Tổng % tham gia</span>
                          <span className="font-bold">{formatPct(totalParticipate)}</span>
                        </div>
                        <div className="inline-flex items-baseline gap-2">
                          <span>Tổng phí hoa hồng trả sale</span>
                          <span className="font-bold">{formatPct(totalBasePct)}</span>
                        </div>
                        <div className="inline-flex items-baseline gap-2">
                          <span>Tổng HH sale nội bộ</span>
                          <span className="font-bold">
                            {formatMoney(totalInternal)}{' '}
                            <span className="text-xs font-normal">VND</span>
                          </span>
                        </div>
                        <div className="inline-flex items-baseline gap-2">
                          <span>Tổng HH CTV</span>
                          <span className="font-bold">
                            {formatMoney(totalCollaborator)}{' '}
                            <span className="text-xs font-normal">VND</span>
                          </span>
                        </div>
                        <div className="inline-flex items-baseline gap-2">
                          <span>Tổng HH Sàn liên kết</span>
                          <span className="font-bold">
                            {formatMoney(totalExchange)}{' '}
                            <span className="text-xs font-normal">VND</span>
                          </span>
                        </div>
                        <div className="inline-flex items-baseline gap-2">
                          <span className="font-bold uppercase">Tổng</span>
                          <span className="font-bold text-red-700">
                            {formatMoney(totalAll)} <span className="text-xs font-normal">VND</span>
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 06: Management Commission ────────────────────────────── */}
      <div className="m4-art" id="sec-mgmt">
        <div className="m4-card-head">
          <span className="num-tag">06</span>
          <h4 id="sec-mgmt-title">Thưởng HH Quản lý</h4>
          <div className="actions">
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-content-dark-3 hover:text-content-dark-1 hover:bg-surface-primary-hover flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium outline-hidden transition-colors">
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
        {isMgmtRestricted ? (
          <div className="flex items-center gap-3.5 border-t border-gray-100 bg-amber-50/40 p-5 text-amber-800">
            <Lock className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-sm font-bold">Nội dung bị hạn chế</div>
              <div className="mt-0.5 text-xs text-amber-700">
                Bạn không có quyền truy cập thông tin thưởng hoa hồng quản lý của giao dịch này.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl m4-tbl">
                <thead>
                  <tr>
                    <th>Người nhận</th>
                    {VISIBLE_MGMT_COLUMNS.map((colKey) => (
                      <th key={colKey} className="r">
                        {getMgmtColumnLabel(colKey)}
                      </th>
                    ))}
                    <th className="r">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedMgmtShares.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="bg-gray-50/50 px-4 py-8 text-center text-gray-400 italic"
                      >
                        Chưa có dữ liệu thưởng hoa hồng quản lý.
                      </td>
                    </tr>
                  ) : (
                    groupedMgmtShares.map((group: any, i: number) => {
                      return (
                        <tr key={i} className="editable">
                          <td className="align-top">
                            {group.isEmpty ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  color: 'var(--color-data-orange-hover)',
                                  fontStyle: 'italic',
                                  fontWeight: 500,
                                }}
                              >
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> (chưa gán)
                              </span>
                            ) : (
                              <div className="strong">
                                {getParticipantName(group.recipientInfo)}
                              </div>
                            )}
                            <div
                              className="muted mt-0.5 flex items-center gap-1.5"
                              style={{ fontSize: 12 }}
                            >
                              <span>{group.roleLabel}</span>
                              {group.recipientInfo?.payment?.status && (
                                <>
                                  <span>&middot;</span>
                                  {(() => {
                                    let tone = 'grey'
                                    let label = 'Chưa chi'
                                    if (group.recipientInfo.payment.status === 'paid') {
                                      tone = 'green'
                                      label = 'Đã chi'
                                    } else if (group.recipientInfo.payment.status === 'partial') {
                                      tone = 'orange'
                                      label = 'Chi một phần'
                                    } else if (group.recipientInfo.payment.status === 'unpaid') {
                                      tone = 'red'
                                      label = 'Chưa chi'
                                    }
                                    return (
                                      <span className={`m4-pill m4-pill-${tone} !px-1.5 !py-0.5`}>
                                        {label}
                                      </span>
                                    )
                                  })()}
                                </>
                              )}
                            </div>
                          </td>
                          {VISIBLE_MGMT_COLUMNS.map((colKey) => (
                            <td key={colKey} className="r !p-0 align-top" style={{ height: '1px' }}>
                              {renderCell(
                                group.shares[colKey],
                                colKey,
                                group,
                                getMgmtColumnLabel(colKey)
                              )}
                            </td>
                          ))}
                          <td className="r strong align-top font-semibold">
                            <span className="m4-num text-content-dark-1">
                              {formatMoney(group.totalAmount)}
                            </span>
                            <span className="m4-vnd">VND</span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                  {!isMgmtRestricted && groupedMgmtShares.length > 0 && (
                    <tr className="total-row">
                      <td colSpan={4}>TỔNG THƯỞNG HH QUẢN LÝ</td>
                      <td className="r font-bold" style={{ fontSize: 15 }}>
                        {formatMoney(management_commission.total)} <span className="u">VND</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!isMgmtRestricted && management_commission.rows?.length > 0 && (
              <div className="tbl-foot brand">
                <span className="spacer flex-1" />
                <span>
                  <span className="k">Còn lại sau Thưởng HH Quản lý =</span>
                  <span
                    className="v lg brand num ml-2 font-bold text-blue-700"
                    style={{ fontSize: 16 }}
                  >
                    {formatMoney(management_commission.remaining_after_management)} VND
                  </span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Section 08: PNL Summary ──────────────────────────────────────── */}
      <div className="m4-art" id="sec-pnl">
        <div className="m4-card-head">
          <span className="num-tag">08</span>
          <h4 id="sec-pnl-title">Tổng kết tài chính (P&L)</h4>
        </div>
        {isPnlRestricted ? (
          <div className="flex items-center gap-3.5 border-t border-gray-100 bg-amber-50/40 p-5 text-amber-800">
            <Lock className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-sm font-bold">Nội dung bị hạn chế</div>
              <div className="mt-0.5 text-xs text-amber-700">
                Bạn không có quyền truy cập thông tin tổng kết tài chính của giao dịch này.
              </div>
            </div>
          </div>
        ) : (
          <div className="card-pad border-t border-gray-100 bg-white p-5">
            <div className="pl-flow mb-4">
              <div className="pl-flow-row">
                <span className="pl-flow-dot in bg-green-500" />
                <span className="pl-flow-lbl">
                  Thu thực từ CĐT
                  <span className="pl-flow-note ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    đã đối chiếu
                  </span>
                </span>
                <span className="pl-flow-val pos font-semibold text-green-600">
                  +{formatMoney(pnl_summary.investor_income)}
                </span>
              </div>
              <div className="pl-flow-row">
                <span className="pl-flow-dot out bg-red-500" />
                <span className="pl-flow-lbl">Chia HH các bên tham gia</span>
                <span className="pl-flow-val neg text-gray-800">
                  −{formatMoney(pnl_summary.participant_payout)}
                </span>
              </div>
              <div className="pl-flow-row">
                <span className="pl-flow-dot out bg-red-500" />
                <span className="pl-flow-lbl">Thưởng HH Quản lý</span>
                <span className="pl-flow-val neg text-gray-800">
                  −{formatMoney(pnl_summary.management_payout)}
                </span>
              </div>
            </div>
            {(() => {
              const netVal = Number(pnl_summary.net_mv || 0)
              const isPositive = netVal >= 0
              return (
                <div
                  className="pl-net flex items-center gap-4 rounded border p-4.5"
                  style={
                    isPositive
                      ? {
                          background: 'var(--color-background-4)',
                          borderColor: 'var(--color-data-green-disabled)',
                        }
                      : {
                          background: 'var(--color-data-red-disabled)',
                          borderColor: 'var(--color-data-red-focus)',
                        }
                  }
                >
                  <span
                    className="ic"
                    style={isPositive ? {} : { color: 'var(--color-data-red-default)' }}
                  >
                    {isPositive ? (
                      <CheckCircle2 className="h-6.5 w-6.5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6.5 w-6.5 text-red-600" />
                    )}
                  </span>
                  <span
                    className="lbl flex flex-1 flex-col gap-0.5"
                    style={isPositive ? {} : { color: 'var(--color-data-red-default)' }}
                  >
                    <span
                      className={`t text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                    >
                      Phần còn lại (Net MV)
                    </span>
                    <span className="s text-xs text-gray-500">
                      Thu CĐT trừ toàn bộ chi phân chia
                    </span>
                  </span>
                  <span
                    className={`val text-xl font-extrabold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isPositive ? '+' : ''}
                    {formatMoney(pnl_summary.net_mv)}
                    <span className="u ml-1 text-xs font-semibold text-gray-500">VND</span>
                  </span>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </Flex>
  )
}
