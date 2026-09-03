import React, { useMemo } from 'react'
import { Table } from '@radix-ui/themes'
import { SubHead } from '@/components/commons/SubHead'
import { SkeletonBar } from '@/components/commons/Skeleton'
import {
  useDealCommissionShares,
  useDealRevenueAllocations,
} from '@/features/sales/deals/services/deal-service'
import { formatCurrencyVND, formatPercent, formatPct } from '@/utils/common'
import { Trash2 } from 'lucide-react'
import { TableActionMenu } from '@/components/ui/table/TableActionMenu'
import { useDialog } from '@/hooks/useDialog'
import { EditCommissionShareForm } from './EditCommissionShareForm'
import { CommissionHistoryList } from './CommissionHistoryList'
import { History } from 'lucide-react'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EditableCommissionCell } from './EditableCommissionCell'
import useAppConstant from '@/hooks/useAppConstant'
import { Plus } from 'lucide-react'
import { AddCommissionShareForm } from './AddCommissionShareForm'
import { TableEmpty } from '@/components/ui/table/TableEmpty'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { CreateShareRequestRecipient_kind } from '@/api/schema'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import {
  formatAmt,
  getParticipantName,
  getRecipientIdentity,
} from '@/features/sales/deal-v3/utils/commission-recipient'
import { getF2SourceDisplay } from '@/features/sales/deal-v3/utils/f2-source-display'

const COMMISSION_PCT_TYPES = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

interface DealSplitSectionProps {
  dealId: number
  pricing?: any
  /**
   * Accounting embed (split-sheet screen): amount columns become read-only, the
   * "Thêm đối tượng" action, the participation-total row and the investor-diff footer
   * are hidden. Default false keeps the full editable deal-detail behavior.
   */
  readOnly?: boolean
  /** When set, show a numbered section badge before the title (accounting embed). */
  sectionNo?: string | number
}

export const getRoleKind = (share: any, salesKeysMap?: any) => {
  if (salesKeysMap && share.recipient_kind) {
    const choices = salesKeysMap.get(APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND_CHOICES)
    if (choices) {
      if (Array.isArray(choices)) {
        const match = choices.find((c: any) => c.value === share.recipient_kind)
        if (match) return match.label
      } else if (typeof choices === 'object') {
        const label = choices[share.recipient_kind]
        if (typeof label === 'string') return label
        if (label && label.label) return label.label
      }
    }
  }
  return 'Không xác định'
}

const ORG_PATH_FIELDS = ['branch', 'block', 'department', 'position'] as const

const getOrgPath = (share: any) => {
  const identity = getRecipientIdentity(share)
  const target = (identity ? share[identity.kind] : null) || share

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

export const getShareContribPct = (share: any, alloc?: any) => {
  if (!share) return null
  const detailsMap = share.details || share.commissions || {}
  return (
    detailsMap?.[COMMISSION_PCT_TYPES.F1_SALE.pct]?.contribution_percentage ??
    detailsMap?.[COMMISSION_PCT_TYPES.F1_BONUS.pct]?.contribution_percentage ??
    detailsMap?.[COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct]?.contribution_percentage ??
    detailsMap?.[COMMISSION_PCT_TYPES.F2_SALE.pct]?.contribution_percentage ??
    detailsMap?.[COMMISSION_PCT_TYPES.F2_BONUS.pct]?.contribution_percentage ??
    detailsMap?.[COMMISSION_PCT_TYPES.F2_MV_BONUS.pct]?.contribution_percentage ??
    alloc?.participation_percentage ??
    alloc?.percentage ??
    share.contribution_percentage ??
    share.participation_percentage ??
    share.percentage ??
    null
  )
}

const STAFF_INCENTIVE_PCT_TYPE = 'staff_incentive'

const getActiveRecord = (details: any, keys: string[]) => {
  if (!details) return null

  // First, check if any has is_custom_override
  for (const key of keys) {
    if (details[key]?.is_custom_override) {
      return { ...details[key], pct_type: key }
    }
  }

  // Next, check if any has a positive percentage or fixed amount
  for (const key of keys) {
    const rec = details[key]
    if (!rec) continue
    if (
      Number(rec.percentage) > 0 ||
      Number(rec.actual_rate_percentage) > 0 ||
      Number(rec.rate) > 0 ||
      Number(rec.fixed_amount) > 0 ||
      Number(rec.calculated_amount) > 0 ||
      Number(rec.amount) > 0
    ) {
      return { ...rec, pct_type: key }
    }
  }

  // Fallback to the first existing one
  for (const key of keys) {
    if (details[key]) {
      return { ...details[key], pct_type: key }
    }
  }

  return null
}

const FALLBACK_EXCHANGE_LABEL = 'Sàn liên kết'

/** Short recipient-type tag shown next to the name (merged column): Sale / F2 / CTV. */
const getRoleAbbr = (share: any): string => {
  const identity = getRecipientIdentity(share)
  if (identity?.kind === 'exchange') return 'F2'
  if (identity?.kind === 'collaborator') return 'CTV'
  return 'Sale'
}

/**
 * Định danh đối tượng nhận HH, xếp HAI DÒNG: dòng trên là **mã + chip loại**, dòng dưới là
 * **tên**. Cả khối là TEXT LINK mở TAB MỚI sang hồ sơ tương ứng.
 *
 * Trước đây chip đứng riêng một dòng còn "mã - tên" dồn chung một dòng, nên chuỗi dài như
 * "MV000003385 - Lưu Thị Lệ" bị bẻ giữa chừng, rất khó đọc. Tách theo đúng vai: mã (thứ để
 * tra cứu) đi cùng chip loại; tên người đứng riêng một dòng.
 *
 * Ba loại đối tượng đi CHUNG một đường dựng link tại chỗ, không mượn `EmployeeProfileLink`
 * cho nhánh nhân viên: component đó ghim `hover:underline` lên chính thẻ `<a>`, nên rê chuột
 * là gạch chân luôn cả chip loại. Phép kiểm quyền vẫn y hệt (`employee.retrieve`).
 *
 * Mỗi loại đối tượng một quyền riêng; thiếu quyền thì rơi về chữ thường — vẫn đọc đủ mã và
 * tên, chỉ mất khả năng bấm sang hồ sơ.
 */

const ShareIdentityLink: React.FC<{ share: any; roleAbbr: string }> = ({ share, roleAbbr }) => {
  const ability = useAbility()
  const identity = getRecipientIdentity(share)
  const ref = identity ? share[identity.kind] : null
  const code: string = ref?.code || ''
  const name: string = ref?.fullname || ref?.name || getParticipantName(share)

  // `group-hover:underline` đặt trên hai cụm CHỮ chứ không trên cả thẻ `<a>`: chip là nhãn,
  // gạch chân nó lúc rê chuột trông như chip cũng bấm được.
  const body = (
    <>
      <span className="flex items-center gap-1.5">
        {code && (
          <span className="font-mono text-[12px] font-bold group-hover:underline">{code}</span>
        )}
        <span className="border-red-30 bg-red-10 text-action-primary-red-default inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold">
          {roleAbbr}
        </span>
      </span>
      <span className="typo-body-base-semibold mt-0.5 block">{name}</span>
    </>
  )

  const linked = (href: string) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-action-primary-red-default group block no-underline"
    >
      {body}
    </a>
  )

  const plain = <span className="text-content-dark-1 group block">{body}</span>

  if (identity?.kind === 'employee' && share.employee?.id) {
    return ability.can('retrieve', 'employee')
      ? linked(APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(share.employee.id)))
      : plain
  }
  if (identity?.kind === 'exchange' && share.exchange?.id) {
    return ability.can('retrieve', 'exchange')
      ? linked(APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(':id', String(share.exchange.id)))
      : plain
  }
  if (identity?.kind === 'collaborator' && share.collaborator?.id) {
    return ability.can('retrieve', 'collaborator')
      ? linked(APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(share.collaborator.id)))
      : plain
  }
  return plain
}

export const DealSplitSection: React.FC<DealSplitSectionProps> = ({
  dealId,
  pricing,
  readOnly = false,
  sectionNo,
}) => {
  const { displayFormContent } = useDialog()
  const { data: sectionData, isLoading: isSharesLoading } = useDealCommissionShares(dealId, 'split')
  const { data: revAllocData } = useDealRevenueAllocations(dealId)

  const revenueAllocationsMap = useMemo(() => {
    let arr: any[] = []
    if (Array.isArray(revAllocData)) {
      arr = revAllocData
    } else if (revAllocData && typeof revAllocData === 'object') {
      const dataAsAny = revAllocData as any
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
  }, [revAllocData])

  const ability = useAbility()

  const canCreate = ability.can('shares_split_create', 'deal')
  const canUpdate = ability.can('shares_split_update', 'deal')

  const { keysMap: salesKeysMap } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.DEAL_REVENUE_ALLOCATION.SALE_TYPE_CHOICES,
      APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND_CHOICES,
    ],
  })

  const { keysMap: realestateKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE],
  })

  const f2SourceLabels = realestateKeysMap.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) as
    | Record<string, string>
    | undefined

  const partnerLabel =
    salesKeysMap.get(APP_CONSTANT_KEY.SALES.DEAL_REVENUE_ALLOCATION.SALE_TYPE_CHOICES)?.partner ||
    'Đối tác ngoài'

  // @ts-ignore
  const handleEdit = (share: any) => {
    const participantName = getParticipantName(share)
    const participantRole = share.department?.name || share.position?.name || '—'
    const description =
      participantRole !== '—'
        ? `Đang chỉnh sửa: ${participantName} (${participantRole})`
        : `Đang chỉnh sửa: ${participantName}`

    displayFormContent({
      title: 'Chỉnh sửa đối tượng tham gia',
      description,
      hideFooter: true,
      content: <EditCommissionShareForm dealId={dealId} share={share} />,
    })
  }

  const getRowActions = (_share: any) => [
    {
      label: 'Xóa',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'danger' as const,
      onClick: () => {},
    },
  ]

  const displayRows = React.useMemo(() => {
    return (sectionData as any)?.rows || sectionData?.commission_shares || []
  }, [sectionData])

  const totalParticipate = displayRows.reduce((sum: number, s: any) => {
    const identity = getRecipientIdentity(s)
    const allocKey = identity ? `${identity.kind}-${identity.id}` : null
    const alloc = allocKey ? revenueAllocationsMap.get(allocKey) : null
    const contrib = getShareContribPct(s, alloc)
    return sum + Number(contrib ?? 0)
  }, 0)

  const totalInternal = displayRows.reduce((sum: number, s: any) => {
    if (!s.exchange && !s.collaborator) {
      return sum + Number(s.total_calculated_amount || 0)
    }
    return sum
  }, 0)

  const totalCollaborator = displayRows.reduce((sum: number, s: any) => {
    if (s.collaborator) {
      return sum + Number(s.total_calculated_amount || 0)
    }
    return sum
  }, 0)

  const totalExchange = displayRows.reduce((sum: number, s: any) => {
    if (s.exchange) {
      return sum + Number(s.total_calculated_amount || 0)
    }
    return sum
  }, 0)

  const totalAll =
    Number(
      sectionData?.summary?.calculated_amount ||
        sectionData?.raw_data?.totals?.calculated_amount ||
        0
    ) || totalInternal + totalExchange + totalCollaborator

  const totalCdt = parseFloat(pricing?.total_amount || '0')

  const diffAll = totalCdt - totalAll

  return (
    <div className="flex flex-col">
      {/* Dùng chung `SubHead` với 5 mục còn lại của màn Chia HH. Trước đây mục này tự dựng
          header riêng (chữ to hơn, không có dải nền xám) và cả khối bị bọc trong `p-5`, nên
          bảng của nó thụt vào 20px so với các mục khác — đúng hai thứ làm màn nhìn lệch tông. */}
      <SubHead
        n={sectionNo}
        title="Phân chia HH — Các bên tham gia"
        right={
          <div className="flex items-center gap-[10px]">
            <Sheet>
              <SheetTrigger asChild>
                <button className="border-border-1 hover:bg-data-light-grey-hover flex items-center gap-[6px] rounded border px-3 py-1.5 text-xs text-neutral-600 shadow-2xs transition-colors">
                  <History className="h-[14px] w-[14px]" />
                  Xem lịch sử
                </button>
              </SheetTrigger>
              {/* Khớp đúng 3 drawer "Xem lịch sử" đã có ở màn deal detail (`DealCommissionTab`,
                  `DealMgmtSection`, `DealPricingBlock`): rộng 400px, header 2 dòng. Trước đây
                  chỗ này để 800px trong khi `CommissionHistoryList` chỉ chiếm ~450px, nên nửa
                  phải là khoảng trắng chết — chị Nhung bắt ở task 86eyk3dmx và lấy chính drawer
                  màn deal detail làm mẫu. Sửa cho giống hẳn, đừng đẻ thêm biến thể thứ 4. */}
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
            {canCreate && !readOnly && (
              <button
                className="text-action-primary-default border-action-primary-default hover:text-action-primary-hover flex items-center gap-1.5 transition-colors"
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
        }
      />
      {isSharesLoading ? (
        /* Đang tải thì KHÔNG được rơi vào nhánh "Chưa có dữ liệu": empty state lúc này là
           nói sai — người dùng đọc thành "giao dịch này không có ai tham gia" rồi đi báo lỗi.
           Ba thanh xương giữ chỗ đúng chiều cao mấy dòng đầu nên trang không giật khi về. */
        <div className="bg-surface-primary-default flex flex-col gap-3 px-4 py-5">
          <SkeletonBar className="h-6 w-full" />
          <SkeletonBar className="h-6 w-full" />
          <SkeletonBar className="h-6 w-full" />
        </div>
      ) : displayRows.length === 0 ? (
        <div className="bg-surface-primary-default border-border-1 rounded border shadow-sm">
          <TableEmpty message="Chưa có dữ liệu" />
        </div>
      ) : (
        <div className="bg-surface-primary-default flex flex-col">
          <div className="relative w-full overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table.Root className="w-full min-w-[1000px] border-collapse bg-white text-left outline-none">
                <Table.Header className="bg-background-2 border-border-1 border-b">
                  <Table.Row>
                    <Table.ColumnHeaderCell className="border-border-1 w-[200px] max-w-[200px] px-4 py-[10px] text-[13px] font-medium text-neutral-500">
                      Người / Đơn vị nhận
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="border-border-1 w-[160px] max-w-[160px] px-4 py-[10px] text-[13px] font-medium text-neutral-500">
                      Phòng ban / Nguồn
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="border-border-1 py-[10px] pr-6 pl-4 text-right text-[13px] font-medium text-neutral-500">
                      Tham gia
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="border-border-1 py-[10px] pr-6 pl-4 text-right text-[13px] font-medium text-neutral-500">
                      Phí từng sale
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="border-border-1 py-[10px] pr-6 pl-4 text-right text-[13px] font-medium text-neutral-500">
                      Thưởng từng sale
                    </Table.ColumnHeaderCell>
                    {/* Thưởng MV: MV tự bỏ tiền theo đợt (LAD), KHÔNG sửa tay ở đây —
                        `staff_incentive` không nằm trong _SECTION_PCT_TYPES["split"] của BE nên
                        mọi create/update qua màn này sẽ bị 400. Chỉ hiển thị. */}
                    <Table.ColumnHeaderCell className="border-border-1 py-[10px] pr-6 pl-4 text-right text-[13px] font-medium text-neutral-500">
                      Thưởng MV
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="border-border-1 py-[10px] pr-6 pl-4 text-right text-[13px] font-medium text-neutral-500">
                      Giảm trừ
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="border-border-1 py-[10px] pr-6 pl-4 text-right text-[13px] font-medium text-neutral-500">
                      Tổng nhận
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="border-border-1 w-[120px] max-w-[120px] py-[10px] pr-6 pl-4 text-right text-[13px] font-medium whitespace-normal text-neutral-500">
                      Thành tiền doanh thu cá nhân
                    </Table.ColumnHeaderCell>
                    {!readOnly && (
                      <Table.ColumnHeaderCell className="w-12 border-b border-transparent bg-transparent text-center"></Table.ColumnHeaderCell>
                    )}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {displayRows.map((share: any) => {
                    const detailsMap = share.details || share.commissions || {}
                    const identity = getRecipientIdentity(share)
                    const recipientKind = identity?.kind
                    const recipientId = identity?.id
                    const isSale =
                      recipientKind === CreateShareRequestRecipient_kind.employee ||
                      recipientKind === CreateShareRequestRecipient_kind.collaborator

                    const allocKey = identity ? `${identity.kind}-${identity.id}` : null
                    const alloc = allocKey ? revenueAllocationsMap.get(allocKey) : null

                    const hasF2Keys =
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F2_SALE.pct] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F2_SALE.amt] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F2_BONUS.pct] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F2_BONUS.amt] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F2_MV_BONUS.pct] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F2_MV_BONUS.amt] ||
                      !!detailsMap?.pct_fee_deduction_to_f2

                    const hasF1Keys =
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F1_SALE.pct] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F1_SALE.amt] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F1_BONUS.pct] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F1_BONUS.amt] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct] ||
                      !!detailsMap?.[COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.amt] ||
                      !!detailsMap?.pct_fee_deduction_to_sale

                    let isF2 = false
                    if (
                      recipientKind === 'employee' ||
                      recipientKind === 'department' ||
                      recipientKind === 'position' ||
                      share.recipient_kind === CreateShareRequestRecipient_kind.employee ||
                      share.recipient_kind === CreateShareRequestRecipient_kind.department ||
                      share.recipient_kind === CreateShareRequestRecipient_kind.position
                    ) {
                      isF2 = false
                    } else if (hasF2Keys) {
                      isF2 = true
                    } else if (hasF1Keys) {
                      isF2 = false
                    } else {
                      isF2 =
                        recipientKind === 'exchange' ||
                        share.recipient_kind === 'f2_exchange' ||
                        share.recipient_kind === 'f2_agency' ||
                        share.recipient_kind === CreateShareRequestRecipient_kind.exchange
                    }

                    const baseCommKeys = isF2
                      ? [COMMISSION_PCT_TYPES.F2_SALE.pct, COMMISSION_PCT_TYPES.F2_SALE.amt]
                      : [COMMISSION_PCT_TYPES.F1_SALE.pct, COMMISSION_PCT_TYPES.F1_SALE.amt]

                    const bonusCommKeys = isF2
                      ? [COMMISSION_PCT_TYPES.F2_BONUS.pct, COMMISSION_PCT_TYPES.F2_BONUS.amt]
                      : [
                          COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct,
                          COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.amt,
                        ]

                    const deductionKeys = isF2
                      ? ['pct_fee_deduction_to_f2', 'fee_deduction']
                      : ['pct_fee_deduction_to_sale', 'fee_deduction']

                    const baseCommRecord = getActiveRecord(detailsMap, baseCommKeys)
                    const bonusCommRecord = getActiveRecord(detailsMap, bonusCommKeys)
                    const deductionRecord = getActiveRecord(detailsMap, deductionKeys)
                    // Số tiền đã nhân tỷ lệ tham gia và đã cân cho khớp tổng đợt (BE làm).
                    const incentiveRecord = getActiveRecord(detailsMap, [STAFF_INCENTIVE_PCT_TYPE])
                    // build_split_recipient_table trả tiền ở khoá `amount` (đã nhân tỷ lệ tham gia);
                    // hai khoá kia chỉ là dự phòng cho payload cũ.
                    const incentiveAmount =
                      incentiveRecord?.amount ??
                      incentiveRecord?.calculated_amount ??
                      incentiveRecord?.fixed_amount

                    const fallbackShare = {
                      employee: share.employee,
                      exchange: share.exchange,
                      collaborator: share.collaborator,
                      department: share.department,
                      position: share.position,
                      fixed_amount: null,
                      percentage: null,
                      actual_rate_percentage: null,
                      contribution_percentage: null,
                      isEmpty: true,
                    }

                    const contribPct = getShareContribPct(share, alloc)

                    const baseComm = {
                      ...(baseCommRecord || {
                        ...fallbackShare,
                        pct_type: !isF2
                          ? COMMISSION_PCT_TYPES.F1_SALE.pct
                          : COMMISSION_PCT_TYPES.F2_SALE.pct,
                        contribution_percentage: contribPct,
                      }),
                    }

                    const bonusComm = {
                      ...(bonusCommRecord || {
                        ...fallbackShare,
                        pct_type: isF2
                          ? COMMISSION_PCT_TYPES.F2_BONUS.pct
                          : COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct,
                        contribution_percentage: contribPct,
                      }),
                    }

                    const deductionComm = {
                      ...(deductionRecord || {
                        ...fallbackShare,
                        pct_type: !isF2 ? 'pct_fee_deduction_to_sale' : 'pct_fee_deduction_to_f2',
                        contribution_percentage: contribPct,
                      }),
                    }

                    return (
                      <Table.Row
                        key={share.id}
                        className="border-border-1 hover:bg-data-light-grey-hover border-b transition-colors"
                      >
                        <Table.Cell className="border-border-1 px-4 py-3 align-middle">
                          {/* Một nhánh duy nhất cho cả ba loại đối tượng: trước đây sàn F2 hiện
                              "tên (mã)" còn nhân viên chỉ hiện tên, và không cái nào bấm được.
                              Chip loại nay nằm CÙNG DÒNG với mã (do ShareIdentityLink dựng),
                              không còn chiếm riêng một dòng phía trên. */}
                          <ShareIdentityLink share={share} roleAbbr={getRoleAbbr(share)} />
                          {share.exchange && (
                            <div className="text-content-dark-3 mt-1 text-[11px]">
                              {salesKeysMap.get(
                                APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND_CHOICES
                              )?.[share.recipient_kind] || FALLBACK_EXCHANGE_LABEL}{' '}
                              &middot; {partnerLabel}
                            </div>
                          )}
                        </Table.Cell>
                        <Table.Cell className="border-border-1 px-4 py-3 align-middle">
                          <div className="typo-body-base text-content-dark-1">
                            {getOrgPath(share)}
                          </div>
                          {/* Nguồn F2 của CHÍNH dòng này (86eya66m0) — đường tổ chức phía
                              trên là phòng SLK dùng chung cho mọi dòng F2. */}
                          {(() => {
                            const f2SourceText = getF2SourceDisplay(
                              share,
                              share.recipient_kind ===
                                APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND.F2_EXCHANGE,
                              f2SourceLabels
                            )
                            return f2SourceText ? (
                              <div className="typo-body-small text-content-dark-3 mt-0.5">
                                <b>{f2SourceText}</b>
                              </div>
                            ) : null
                          })()}
                        </Table.Cell>
                        <Table.Cell className="border-border-1 !p-0 align-middle">
                          <div className="typo-body-base text-content-dark-1 flex h-full w-full items-center justify-end py-3 pr-6 pl-4 text-right">
                            {contribPct != null ? (
                              formatPct(contribPct)
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="border-border-1 !p-0 align-middle">
                          <EditableCommissionCell
                            share={baseComm}
                            field="percentage"
                            dealId={dealId}
                            section="split"
                            label="PHÍ TỪNG SALE (%)"
                            isCreate={baseComm.isEmpty}
                            pctType={baseComm.pct_type}
                            recipientKind={recipientKind}
                            recipientId={recipientId}
                            recipientInfo={share}
                            recipientSubtitle={getOrgPath(share)}
                            readonly={!canUpdate || readOnly}
                          />
                        </Table.Cell>
                        <Table.Cell className="border-border-1 !p-0 align-middle">
                          <EditableCommissionCell
                            share={bonusComm}
                            field={
                              (bonusComm.actual_rate_percentage ?? bonusComm.percentage) != null ||
                              !bonusComm.isEmpty
                                ? 'percentage'
                                : 'fixed_amount'
                            }
                            dealId={dealId}
                            section="split"
                            label={
                              (bonusComm.actual_rate_percentage ?? bonusComm.percentage) != null ||
                              !bonusComm.isEmpty
                                ? 'THƯỞNG TỪNG SALE (%)'
                                : 'THƯỞNG TỪNG SALE (VND)'
                            }
                            isCreate={bonusComm.isEmpty}
                            pctType={bonusComm.pct_type}
                            recipientKind={recipientKind}
                            recipientId={recipientId}
                            recipientInfo={share}
                            recipientSubtitle={getOrgPath(share)}
                            readonly={!canUpdate || readOnly}
                          />
                        </Table.Cell>
                        <Table.Cell className="border-border-1 py-3 pr-6 pl-4 text-right align-middle">
                          <div className="typo-body-base text-content-dark-1">
                            {incentiveAmount != null && Number(incentiveAmount) !== 0 ? (
                              formatAmt(incentiveAmount)
                            ) : (
                              <span className="text-content-dark-4 opacity-50">—</span>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="border-border-1 !p-0 align-middle">
                          <EditableCommissionCell
                            share={deductionComm}
                            field={
                              (deductionComm.actual_rate_percentage ?? deductionComm.percentage) !=
                                null || !deductionComm.isEmpty
                                ? 'percentage'
                                : 'fixed_amount'
                            }
                            dealId={dealId}
                            section="split"
                            label={
                              (deductionComm.actual_rate_percentage ?? deductionComm.percentage) !=
                                null || !deductionComm.isEmpty
                                ? 'GIẢM TRỪ (%)'
                                : 'GIẢM TRỪ (VND)'
                            }
                            isCreate={deductionComm.isEmpty}
                            pctType={deductionComm.pct_type}
                            recipientKind={recipientKind}
                            recipientId={recipientId}
                            recipientInfo={share}
                            recipientSubtitle={getOrgPath(share)}
                            readonly={!canUpdate || readOnly}
                          />
                        </Table.Cell>
                        <Table.Cell className="border-border-1 bg-surface-primary-default py-3 pr-6 pl-4 text-right align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <span className="typo-body-base-semibold text-content-dark-1">
                              {formatAmt(share.total_calculated_amount)}
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="border-border-1 py-3 pr-6 pl-4 text-right align-middle">
                          <div className="typo-body-base text-content-dark-1">
                            {isSale && alloc ? (
                              formatAmt(alloc.revenue_amount)
                            ) : (
                              <span className="text-content-dark-4 opacity-50">-</span>
                            )}
                          </div>
                        </Table.Cell>
                        {!readOnly && (
                          <Table.Cell className="bg-surface-primary-default px-2 py-3 text-center align-middle">
                            {canUpdate && (
                              <TableActionMenu row={share} actions={getRowActions(share)} />
                            )}
                          </Table.Cell>
                        )}
                      </Table.Row>
                    )
                  })}
                  {!readOnly && (
                    <Table.Row className="bg-[#FCE7E7]">
                      <Table.Cell colSpan={10} className="px-4 py-3.5 text-right align-middle">
                        <div className="flex items-center justify-end gap-8">
                          <div className="inline-flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-[#9C2A2A]">
                              Tổng % tham gia
                            </span>
                            <span className="text-sm font-bold text-[#9C2A2A]">
                              {formatPercent(totalParticipate)}
                            </span>
                          </div>
                          <div className="inline-flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-[#9C2A2A]">
                              Tổng HH sale nội bộ
                            </span>
                            <span className="text-sm font-bold text-[#9C2A2A]">
                              {formatCurrencyVND(totalInternal)}
                            </span>
                          </div>
                          <div className="inline-flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-[#9C2A2A]">
                              Tổng HH CTV
                            </span>
                            <span className="text-sm font-bold text-[#9C2A2A]">
                              {formatCurrencyVND(totalCollaborator)}
                            </span>
                          </div>
                          <div className="inline-flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-[#9C2A2A]">
                              Tổng HH Sàn liên kết
                            </span>
                            <span className="text-sm font-bold text-[#9C2A2A]">
                              {formatCurrencyVND(totalExchange)}
                            </span>
                          </div>
                          <div className="inline-flex items-baseline gap-2">
                            <span className="text-sm font-bold text-[#9C2A2A]">Tổng</span>
                            <span className="text-sm font-bold text-[#9C2A2A]">
                              {formatCurrencyVND(totalAll)}
                            </span>
                          </div>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-8 border-t border-[#CFE5CD] bg-[#F6FAF5] px-4 py-3.5 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="flex-1" />
                <div className="inline-flex items-baseline gap-2.5">
                  <span className="text-data-green-default text-sm font-semibold">
                    Thu CĐT − Tổng =
                  </span>
                  <span className="text-data-green-default text-sm font-bold">
                    {diffAll >= 0 ? '+' : ''}
                    {formatCurrencyVND(diffAll)} VNĐ
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
