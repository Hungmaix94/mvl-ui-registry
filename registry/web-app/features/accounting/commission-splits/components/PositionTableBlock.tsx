import { useState, useMemo, useEffect } from 'react'
import { Controller, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  IconPlus,
  IconPencilsimple,
  IconLock,
  IconLockopen,
  IconTrash,
  IconCheck,
  IconX,
} from '@/assets/icons'
import { FullCellNumberInput, EmployeeProfileLink, ReferenceCode } from '@/components/commons'
import { Select } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { CommissionHoldDialog } from './CommissionHoldDialog'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { APP_PATH } from '@/routes'
import { cn } from '@/utils'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import {
  useHoldShare,
  useUpdateRecipients,
  useReleaseShareHold,
} from '../services/commission-splits-service'
import { parseNumberSafe } from '@/features/accounting/_shares/utils/recipient-utils'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { redistributePercentages } from '../utils/split-helpers'
import { netAfterHold } from '../utils/payout-math'

type Props = {
  posIdx: number
  cardIndex?: number
  posData: any
  isEditing: boolean
  loadEmployeeOptions: any
  form: any
  onRefresh?: () => void
  sortedAllocations?: any[]
  pbtvId?: string
  totalDealCommission?: number
  activeLabel?: string
  isKT?: boolean
  cardLess?: boolean
  localPct?: number
}

export function PositionTableBlock({
  posIdx,
  cardIndex = 1,
  posData,
  isEditing,
  loadEmployeeOptions,
  form,
  onRefresh,
  sortedAllocations = [],
  pbtvId,
  totalDealCommission,
  activeLabel = 'kỳ này',
  isKT,
  cardLess,
  localPct,
}: Props) {
  const expected = useMemo(() => {
    if (isEditing && localPct !== undefined) {
      return Number(posData.share_full_amount || 0) * (localPct / 100)
    }
    return Number(posData.expected_amount || 0)
  }, [isEditing, localPct, posData.share_full_amount, posData.expected_amount])

  const canFullEdit = isEditing && !posData.is_earmarked_prepaid
  const canPartialEdit = false
  const navigate = useNavigate()
  const { id: idStr } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const worksheetIdParam = searchParams.get('worksheet_id')
  const worksheetId = worksheetIdParam ? Number(worksheetIdParam) : Number(idStr)

  const { mutateAsync: holdShare, isPending: isHolding } = useHoldShare()
  const { mutateAsync: releaseShareHold, isPending: isReleasing } = useReleaseShareHold()
  const { mutateAsync: updateRecipients, isPending: isUpdatingRecipients } = useUpdateRecipients()

  const [holdDialogOpen, setHoldDialogOpen] = useState(false)
  const [holdTarget, setHoldTarget] = useState<any>(null)

  const [editingRIdx, setEditingRIdx] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editReason, setEditReason] = useState('')

  const handleStartEdit = (r: any, rIdx: number) => {
    setEditingRIdx(rIdx)
    setEditAmount(String(r.amount || '0'))
    setEditReason(r.reason || '')
  }

  const handleCancelEdit = () => {
    setEditingRIdx(null)
    setEditAmount('')
    setEditReason('')
  }

  const handleSaveInlineRow = async (rIdx: number) => {
    if (!worksheetId) {
      toastService.error('Không tìm thấy ID bảng tính hoa hồng')
      return
    }

    const cleanAmount = parseNumberSafe(editAmount)

    if (cleanAmount < 0) {
      toastService.error('Số tiền chia không hợp lệ')
      return
    }

    try {
      // 1. Construct the list of splits for this group
      const rawSplits = (posData.recipients || []).map((r: any, idx: number) => {
        if (idx === rIdx) {
          const base_amount = isCommission ? cleanAmount.toString() : '0'
          const bonus_amount = isCommission ? '0' : cleanAmount.toString()
          return {
            employee_id: r.employee_id ? Number(r.employee_id) : null,
            collaborator_id: r.collaborator_id ? Number(r.collaborator_id) : null,
            exchange_id: r.exchange_id ? Number(r.exchange_id) : null,
            amount: cleanAmount.toString(),
            base_amount,
            bonus_amount,
            pct_of_parent: '0.00',
            reason: editReason,
          }
        }
        return {
          employee_id: r.employee_id ? Number(r.employee_id) : null,
          collaborator_id: r.collaborator_id ? Number(r.collaborator_id) : null,
          exchange_id: r.exchange_id ? Number(r.exchange_id) : null,
          amount: Number(r.amount || 0).toString(),
          base_amount: Number(r.base_amount || 0).toString(),
          bonus_amount: Number(r.bonus_amount || 0).toString(),
          pct_of_parent: '0.00',
          reason: r.reason || '',
        }
      })

      const recalculatedSplits = redistributePercentages(rawSplits) as any[]

      const updatedSplits = recalculatedSplits

      const totalShared = updatedSplits.reduce(
        (sum: number, r: any) => sum + parseNumberSafe(r.amount),
        0
      )
      if (Math.abs(totalShared - Math.round(expected)) > 1) {
        toastService.error(
          `Tổng số tiền đã chia (${formatCurrencyVND(totalShared)} đ) phải bằng số tiền phân bổ của nhóm (${formatCurrencyVND(expected)} đ)`
        )
        return
      }

      // 2. Call updateRecipients
      await updateRecipients({
        id: worksheetId,
        data: {
          groups: [
            {
              recipient_type: posData.recipient_type,
              recipient_id: posData.recipient_id,
              pct_type: posData.pct_type,
              splits: updatedSplits,
            },
          ],
        },
      })

      toastService.success('Cập nhật thành công')
      handleCancelEdit()
      onRefresh?.()
    } catch (err: any) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const getRelatedShareIdsAndAmount = (r: any) => {
    const positions = form.getValues().positions || []
    const ids: number[] = []
    let totalAmount = 0
    let isHeld = false
    let holdReason = ''
    let taxBase: 'PRE_TAX' | 'POST_TAX' = 'PRE_TAX'

    positions.forEach((pos: any) => {
      if (!pos.commission_share_id) return
      const matchedRec = pos.recipients?.find((otherR: any) => {
        if (r.employee_id && otherR.employee_id === r.employee_id) return true
        if (r.collaborator_id && otherR.collaborator_id === r.collaborator_id) return true
        if (r.exchange_id && otherR.exchange_id === r.exchange_id) return true
        return false
      })

      if (matchedRec) {
        ids.push(pos.commission_share_id)
        totalAmount += parseNumberSafe(matchedRec.amount)
        if (matchedRec.is_held) {
          isHeld = true
          holdReason = matchedRec.hold_reason || matchedRec.reason || holdReason
          if (matchedRec.tax_base) {
            taxBase = matchedRec.tax_base as 'PRE_TAX' | 'POST_TAX'
          }
        }
      }
    })

    return { ids, totalAmount, isHeld, holdReason, taxBase }
  }

  const handleOpenHoldDialog = (r: any) => {
    setHoldTarget(r)
    setHoldDialogOpen(true)
  }

  const handleConfirmHold = async (reason: string, taxBase?: 'PRE_TAX' | 'POST_TAX') => {
    if (!holdTarget) return
    const { ids, isHeld } = getRelatedShareIdsAndAmount(holdTarget)

    if (!pbtvId) {
      toastService.error('Không tìm thấy ID phân bổ thực nhận')
      return
    }

    if (ids.length === 0) {
      toastService.error('Không tìm thấy ID commission share')
      return
    }

    try {
      if (isHeld) {
        await releaseShareHold({
          id: Number(pbtvId),
          data: {
            commission_share_ids: ids,
            reason,
          },
        })
        toastService.success('Đã mở tạm giữ hoa hồng thành công')
      } else {
        await holdShare({
          id: Number(pbtvId),
          data: {
            commission_share_ids: ids,
            hold_reason: reason,
            tax_base: taxBase,
          },
        })
        toastService.success('Đã tạm giữ hoa hồng thành công')
      }
      setHoldDialogOpen(false)
      onRefresh?.()
    } catch (err: any) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const {
    fields: recipientFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: `positions.${posIdx}.recipients`,
  })

  const { keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_BENEFICIARY_TYPE_CHOICES],
  })
  const recipientTypeOptions =
    keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_BENEFICIARY_TYPE_CHOICES) ?? []

  const { keysMap: salesKeysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.BOOKING.COMMISSION_PCT_TYPE],
  })
  const pctTypeLabels = salesKeysMap.get(APP_CONSTANT_KEY.SALES.BOOKING.COMMISSION_PCT_TYPE) as
    | Record<string, string>
    | undefined
  const displayLabel = pctTypeLabels?.[posData.pct_type || ''] || posData.pct_type

  const { loadCollaboratorOptions } = useCollaboratorSelect()
  const { loadExchangeOptions } = useExchangeSelect({ valueType: 'id' })

  const [activeRecipientIdx, setActiveRecipientIdx] = useState<number | null>(null)

  const COMMISSION_TYPES = [
    'pct_sale_commission',
    'amt_sale_commission',
    'pct_f2_commission',
    'amt_f2_commission',
  ]
  const isCommission = COMMISSION_TYPES.includes(posData.pct_type || '')

  useEffect(() => {
    if (!isCommission || !canFullEdit || localPct === undefined) return
    recipientFields.forEach((r: any, rIdx: number) => {
      const pctVal = r.pct_of_parent || posData.pct || '0'
      const calculatedAmount = Math.round(expected * (parseFloat(pctVal) / 100))

      const currentVal = form.getValues(`positions.${posIdx}.recipients.${rIdx}.amount`)
      if (Number(currentVal) !== calculatedAmount) {
        form.setValue(
          `positions.${posIdx}.recipients.${rIdx}.amount`,
          calculatedAmount.toString(),
          {
            shouldDirty: true,
          }
        )
        form.setValue(
          `positions.${posIdx}.recipients.${rIdx}.base_amount`,
          calculatedAmount.toString(),
          {
            shouldDirty: true,
          }
        )
        form.setValue(`positions.${posIdx}.recipients.${rIdx}.bonus_amount`, '0', {
          shouldDirty: true,
        })
      }
    })
  }, [expected, recipientFields, isCommission, isEditing, posIdx, form, localPct, posData.pct])

  const handleAmountChange = (rIdx: number, val: string) => {
    const cleanVal = val || '0'
    form.setValue(`positions.${posIdx}.recipients.${rIdx}.amount`, cleanVal, { shouldDirty: true })
    if (isCommission) {
      form.setValue(`positions.${posIdx}.recipients.${rIdx}.base_amount`, cleanVal, {
        shouldDirty: true,
      })
      form.setValue(`positions.${posIdx}.recipients.${rIdx}.bonus_amount`, '0', {
        shouldDirty: true,
      })
    } else {
      form.setValue(`positions.${posIdx}.recipients.${rIdx}.base_amount`, '0', {
        shouldDirty: true,
      })
      form.setValue(`positions.${posIdx}.recipients.${rIdx}.bonus_amount`, cleanVal, {
        shouldDirty: true,
      })
    }

    form.trigger(`positions.${posIdx}.recipients.${rIdx}.amount`)
  }
  const [selectedType, setSelectedType] = useState<'EMPLOYEE' | 'COLLABORATOR' | 'EXCHANGE'>(
    'EMPLOYEE'
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string>('')

  const handleOpenDialog = (rIdx: number) => {
    const r = posData.recipients?.[rIdx] || {}
    let type: 'EMPLOYEE' | 'COLLABORATOR' | 'EXCHANGE' = 'EMPLOYEE'
    let id = null
    if (r.collaborator_id) {
      type = 'COLLABORATOR'
      id = r.collaborator_id
    } else if (r.exchange_id) {
      type = 'EXCHANGE'
      id = r.exchange_id
    } else {
      type = 'EMPLOYEE'
      id = r.employee_id
    }
    setSelectedType(type)
    setSelectedId(id ? String(id) : null)
    setSelectedName(r.recipient_name || '')
    setActiveRecipientIdx(rIdx)
  }

  const handleConfirmRecipient = () => {
    if (activeRecipientIdx === null) return

    form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.employee_id`, null)
    form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.collaborator_id`, null)
    form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.exchange_id`, null)

    if (selectedType === 'EMPLOYEE') {
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.employee_id`, selectedId)
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.recipient_type_label`, '')
    } else if (selectedType === 'COLLABORATOR') {
      form.setValue(
        `positions.${posIdx}.recipients.${activeRecipientIdx}.collaborator_id`,
        selectedId
      )
      form.setValue(
        `positions.${posIdx}.recipients.${activeRecipientIdx}.recipient_type_label`,
        'CTV ngoài'
      )
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.hold_amount`, '0')
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.is_held`, false)
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.reason`, '')
    } else if (selectedType === 'EXCHANGE') {
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.exchange_id`, selectedId)
      form.setValue(
        `positions.${posIdx}.recipients.${activeRecipientIdx}.recipient_type_label`,
        'Sàn F2'
      )
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.hold_amount`, '0')
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.is_held`, false)
      form.setValue(`positions.${posIdx}.recipients.${activeRecipientIdx}.reason`, '')
    }

    form.setValue(
      `positions.${posIdx}.recipients.${activeRecipientIdx}.recipient_name`,
      selectedName
    )

    form.trigger(`positions.${posIdx}.recipients.${activeRecipientIdx}.employee_id`)
    setActiveRecipientIdx(null)
  }

  const activeIdx = useMemo(() => {
    if (!sortedAllocations || !pbtvId) return -1
    return sortedAllocations.findIndex((a) => Number(a.id) === Number(pbtvId))
  }, [sortedAllocations, pbtvId])

  const allocationsToProcess = useMemo(() => {
    if (!sortedAllocations) return []
    if (activeIdx !== -1) {
      return sortedAllocations.slice(0, activeIdx + 1)
    }
    return sortedAllocations
  }, [sortedAllocations, activeIdx])

  const ledger = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        name: string
        typeLabel: string
        role: 'employee' | 'collaborator' | 'exchange'
        total: number
        byAllocId: Record<number, number>
      }
    >()

    allocationsToProcess.forEach((alloc) => {
      const isCurrent = Number(alloc.id) === Number(pbtvId)

      if (isCurrent) {
        const recs = posData.recipients || []
        recs.forEach((r: any) => {
          let key = ''
          let role: 'employee' | 'collaborator' | 'exchange' = 'employee'
          let typeLabel = ''
          if (r.employee_id) {
            key = `employee_${r.employee_id}`
            role = 'employee'
            typeLabel = 'Nhân viên'
          } else if (r.collaborator_id) {
            key = `collaborator_${r.collaborator_id}`
            role = 'collaborator'
            typeLabel = 'CTV ngoài'
          } else if (r.exchange_id) {
            key = `exchange_${r.exchange_id}`
            role = 'exchange'
            typeLabel = 'Sàn F2'
          }
          if (!key) return

          const amount = parseNumberSafe(r.amount)
          const name = r.recipient_name || '—'

          const existing = map.get(key)
          if (existing) {
            existing.total += amount
            existing.byAllocId[alloc.id!] = (existing.byAllocId[alloc.id!] || 0) + amount
          } else {
            map.set(key, {
              key,
              name,
              typeLabel,
              role,
              total: amount,
              byAllocId: { [alloc.id!]: amount },
            })
          }
        })
      } else {
        const recipientLines = alloc.recipient_lines || []
        recipientLines.forEach((line: any) => {
          if (line.pct_type !== posData.pct_type) return

          let key = ''
          let role: 'employee' | 'collaborator' | 'exchange' = 'employee'
          let typeLabel = ''
          let name = ''

          if (line.recipient_employee) {
            key = `employee_${line.recipient_employee}`
            role = 'employee'
            typeLabel = 'Nhân viên'
            name = line.recipient_employee_detail?.fullname || line.recipient_name || '—'
          } else if (line.recipient_collaborator) {
            key = `collaborator_${line.recipient_collaborator}`
            role = 'collaborator'
            typeLabel = 'CTV ngoài'
            name = line.recipient_collaborator_detail?.name || line.recipient_name || '—'
          } else if (line.recipient_exchange) {
            key = `exchange_${line.recipient_exchange}`
            role = 'exchange'
            typeLabel = 'Sàn F2'
            name = line.recipient_exchange_detail?.name || line.recipient_name || '—'
          }

          if (!key) return

          const amount = parseNumberSafe(line.allocated_amount)

          const existing = map.get(key)
          if (existing) {
            existing.total += amount
            existing.byAllocId[alloc.id!] = (existing.byAllocId[alloc.id!] || 0) + amount
          } else {
            map.set(key, {
              key,
              name,
              typeLabel,
              role,
              total: amount,
              byAllocId: { [alloc.id!]: amount },
            })
          }
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [allocationsToProcess, pbtvId, posData.recipients, posData.pct_type])

  const totalShared =
    posData.recipients?.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0) || 0

  const isF2 =
    posData.pct_type === APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.F2_SALE.pct ||
    posData.pct_type === APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.F2_SALE.amt ||
    String(displayLabel).toLowerCase().includes('f2')
  const isCtv =
    String(displayLabel).toLowerCase().includes('ctv') ||
    String(posData.pct_type || '')
      .toLowerCase()
      .includes('ctv')
  void cardIndex
  void activeLabel
  void cardLess
  void isKT
  // Sale — suất chính — lấy ĐỎ primary thay cho xanh info cũ. CTV/F2 giữ tím/cam để ba vai
  // vẫn phân biệt được. Dùng token qua `var()` được là nhờ nền mờ bên dưới đã chuyển sang
  // `color-mix`; trước đây nó nối chuỗi `accent + '0D'` nên bắt buộc phải là hex 6 ký tự.
  const accent = isCtv ? '#9858AF' : isF2 ? '#D28A35' : 'var(--color-action-primary-red-default)'

  const posCum = useMemo(() => {
    return ledger.reduce((sum, e) => sum + e.total, 0)
  }, [ledger])

  const ownerDetailPath =
    posData.recipient_type === 'employee'
      ? APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(posData.recipient_id))
      : posData.recipient_type === 'collaborator'
        ? APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(posData.recipient_id))
        : null

  const totalPosCommission = useMemo(() => {
    if (totalDealCommission == null || posData.pct == null) return 0
    return (totalDealCommission * Number(posData.pct)) / 100
  }, [totalDealCommission, posData.pct])

  return (
    <>
      <div
        className="border-border-1 overflow-hidden rounded border bg-white shadow-sm"
        style={{ borderLeft: `4px solid ${accent}` }}
      >
        <div className="border-border-1 overflow-x-auto border-b">
          <div
            className="grid min-w-[800px] items-center gap-3 px-3.5 py-3"
            style={{
              gridTemplateColumns: 'minmax(220px, 1fr) 150px 150px 150px',
              backgroundColor: `color-mix(in srgb, ${accent} 5%, transparent)`,
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium" style={{ color: accent }}>
                    {displayLabel}{' '}
                    {posData.pct != null && Number(posData.pct) > 0
                      ? `· ${formatPercent(posData.pct)}`
                      : ''}
                  </span>
                  {posData.is_earmarked_prepaid && (
                    <span className="inline-flex items-center rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                      Đã tạm ứng — Khóa
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[11px] font-medium text-neutral-500">Đứng doanh số:</span>
                  {ownerDetailPath ? (
                    posData.recipient_type === 'employee' ? (
                      <EmployeeProfileLink
                        employeeId={posData.recipient_id}
                        className="text-brand-primary-default text-[13px] font-medium hover:underline"
                      >
                        {posData.owner_name || '—'}
                      </EmployeeProfileLink>
                    ) : (
                      <a
                        href={ownerDetailPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary-default text-[13px] font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {posData.owner_name || '—'}
                      </a>
                    )
                  ) : (
                    <span className="text-[13px] font-medium text-neutral-900">
                      {posData.owner_name || '—'}
                    </span>
                  )}
                  <ReferenceCode code={posData.owner_code} enableCopy={false} />
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-medium text-neutral-500">Tổng HH theo căn</div>
              <span className="mt-1 block text-[15px] font-medium text-neutral-900">
                {formatCurrencyVND(totalPosCommission)} ₫
              </span>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-medium text-neutral-500">HH gốc kỳ này</div>
              <span className="mt-1 block text-[15px] font-medium text-neutral-900">
                {formatCurrencyVND(expected)} ₫
              </span>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-medium text-[#6B7280]">Lũy kế hết kỳ</div>
              <span className="mt-1 block text-[15px] font-medium text-[#16A34A]">
                {formatCurrencyVND(posCum)} ₫
              </span>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-[14px] [&_td]:align-middle [&_th]:align-middle">
          <thead>
            <tr className="border-border-1 border-b bg-[#F9F9F9] text-[14px] whitespace-nowrap text-[#4B4B4B]">
              <th className="w-12 py-3 pr-2 pl-5 font-medium"></th>
              <th className="w-[220px] px-3 py-3 font-medium">Người thực nhận</th>
              <th className="w-[150px] px-3 py-3 text-right font-medium">Thưởng sales</th>
              <th className="w-[100px] px-3 py-3 text-right font-medium">Đã tạm ứng</th>
              <th className="w-[150px] px-3 py-3 text-right font-medium">Phí trả sales</th>
              <th className="w-[180px] px-3 py-3 text-right font-medium">Thành tiền trả sale</th>
              <th className="w-[180px] px-3 py-3 text-right font-medium">Thành tiền nhận về</th>
              <th className="w-[140px] px-3 py-3 text-right font-medium">Thực nhận</th>
              <th className="w-[135px] px-3 py-3 text-right font-medium">Tạm giữ trước thuế</th>
              <th className="w-[135px] px-3 py-3 text-right font-medium">Tạm giữ sau thuế</th>
              <th className="w-[140px] px-3 py-3 text-right font-medium">Còn lại</th>
              <th className="w-[200px] py-3 pr-5 pl-3 font-medium">Ghi chú</th>
              {canFullEdit && <th className="w-[120px] py-3 pr-5 text-right font-medium"></th>}
            </tr>
          </thead>
          <tbody className="border-border-1 divide-border-1 divide-y border-t bg-white">
            {recipientFields.length === 0 ? (
              <tr>
                <td colSpan={canFullEdit ? 13 : 12} className="py-4 text-center text-neutral-400">
                  Không có người nhận
                </td>
              </tr>
            ) : (
              recipientFields.map((rec, rIdx) => {
                const r = posData.recipients?.[rIdx] || {}
                const recipientId = r.employee_id
                  ? `NV-${r.employee_id}`
                  : r.collaborator_id
                    ? `CTV-${r.collaborator_id}`
                    : r.exchange_id
                      ? `Sàn-${r.exchange_id}`
                      : '—'
                const isOwner =
                  (r.employee_id && String(r.employee_id) === String(posData.recipient_id)) ||
                  (r.collaborator_id &&
                    String(r.collaborator_id) === String(posData.recipient_id)) ||
                  (r.exchange_id && String(r.exchange_id) === String(posData.recipient_id))

                if (canFullEdit) {
                  const recipientError =
                    form.formState.errors.positions?.[posIdx]?.recipients?.[rIdx]?.employee_id
                      ?.message

                  return (
                    <tr key={rec.id} className="hover:bg-neutral-50/50">
                      <td className="w-12 py-3 pr-2 pl-5 text-neutral-500">{rIdx + 1}</td>
                      <td className="border-border-1 h-px w-[220px] p-0">
                        <div
                          onClick={() => handleOpenDialog(rIdx)}
                          className={cn(
                            'group/edit hover:bg-action-primary-red-default/5 relative flex h-full min-h-[46px] w-full cursor-pointer flex-col justify-center px-3 py-1.5 transition-colors',
                            recipientError && 'bg-data-red-default/5'
                          )}
                        >
                          <div className="group-hover/edit:border-action-primary-red-default/30 pointer-events-none absolute inset-0 z-10 border border-dashed border-transparent transition-colors" />
                          {r.recipient_name ? (
                            <div className="flex items-center gap-2">
                              <span className="max-w-[120px] truncate font-medium text-neutral-900">
                                {r.recipient_name}
                              </span>
                              <span className="text-[11px] font-medium text-neutral-400">
                                {recipientId}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                'text-content-light-4 text-[13px]',
                                recipientError && 'text-data-red-default'
                              )}
                            >
                              Chọn người nhận...
                            </span>
                          )}
                          {recipientError && (
                            <span className="text-data-red-default mt-0.5 text-[11px] font-medium">
                              {recipientError}
                            </span>
                          )}
                          <IconPencilsimple className="text-content-dark-4 group-hover/edit:text-action-primary-red-default pointer-events-none absolute top-1.5 right-1.5 z-30 hidden h-3.5 w-3.5 group-hover/edit:block" />
                        </div>
                      </td>

                      <td className="border-border-1 h-px w-[150px] p-0 text-right">
                        {!isCommission ? (
                          <Controller
                            name={`positions.${posIdx}.recipients.${rIdx}.amount`}
                            control={form.control}
                            render={({ field, fieldState }) => (
                              <FullCellNumberInput
                                {...field}
                                value={
                                  field.value !== undefined && field.value !== null
                                    ? String(field.value)
                                    : ''
                                }
                                onChange={(e) => {
                                  const val = e.target.value || '0'
                                  handleAmountChange(rIdx, val)
                                }}
                                placeholder="0"
                                isError={!!fieldState.error}
                                suffix="₫"
                                variant="editable"
                                className="text-action-primary-red-default text-right font-bold"
                              />
                            )}
                          />
                        ) : (
                          <span className="px-3 text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="border-border-1 w-[100px] px-3 py-3 text-right text-neutral-400">
                        —
                      </td>
                      <td className="border-border-1 w-[150px] px-3 py-3 text-right text-neutral-700">
                        {isCommission
                          ? r.pct_of_parent
                            ? `${parseFloat(r.pct_of_parent)}%`
                            : posData.pct
                              ? `${parseFloat(posData.pct)}%`
                              : '—'
                          : '—'}
                      </td>
                      <td className="border-border-1 text-action-primary-red-default w-[180px] px-3 py-3 text-right font-semibold">
                        {isCommission ? (
                          `${formatCurrencyVND(
                            Math.round(
                              expected * (parseFloat(r.pct_of_parent || posData.pct || '0') / 100)
                            )
                          )} ₫`
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="border-border-1 w-[180px] px-3 py-3 text-right font-semibold text-neutral-900">
                        {formatCurrencyVND(Number(r.amount || 0))} ₫
                      </td>
                      <td className="border-border-1 w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                        {formatCurrencyVND(
                          netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount))
                        )}{' '}
                        ₫
                      </td>
                      <td className="border-border-1 w-[130px] px-3 py-3 text-right font-medium font-semibold text-red-600">
                        {r.hold_amount && Number(r.hold_amount) > 0
                          ? `-${formatCurrencyVND(Number(r.hold_amount))} ₫`
                          : '—'}
                      </td>
                      <td className="border-border-1 w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                        {formatCurrencyVND(
                          netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount))
                        )}{' '}
                        ₫
                      </td>
                      <td className="border-border-1 h-px w-[200px] p-0">
                        <Controller
                          name={`positions.${posIdx}.recipients.${rIdx}.reason`}
                          control={form.control}
                          render={({ field }) => (
                            <div className="relative flex h-full w-full items-center px-3 py-0">
                              <input
                                {...field}
                                value={field.value || ''}
                                placeholder="VD: Lý do tạm giữ..."
                                readOnly={true}
                                className="text-content-dark-4 h-full min-h-[46px] w-full cursor-default border-none bg-transparent py-0 text-left text-[14px] transition-colors outline-none focus:ring-0"
                              />
                            </div>
                          )}
                        />
                      </td>
                      <td className="w-[120px] py-3 pr-5 text-right font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenHoldDialog(r)}
                            title={r.is_held ? 'Bỏ tạm giữ' : 'Tạm giữ'}
                            className={cn(
                              'hover:bg-neutral-30 rounded p-1.5 transition-colors',
                              r.is_held ? 'text-[#D97706]' : 'text-neutral-500'
                            )}
                          >
                            {r.is_held ? (
                              <IconLock className="h-4 w-4" />
                            ) : (
                              <IconLockopen className="h-4 w-4" />
                            )}
                          </button>
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => remove(rIdx)}
                              title="Xóa"
                              className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (canPartialEdit) {
                  return (
                    <tr key={rec.id} className="hover:bg-neutral-50/50">
                      <td className="w-12 py-3 pr-2 pl-5 text-neutral-500">{rIdx + 1}</td>
                      <td className="border-border-1 w-[220px] px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-900">
                              {r.recipient_name || '—'}
                            </span>
                            <span className="text-[11px] font-medium text-neutral-400">
                              {recipientId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="border-border-1 w-[150px] px-3 py-3 text-right text-neutral-700">
                        {!isCommission ? `${formatCurrencyVND(Number(r.amount || 0))} ₫` : '—'}
                      </td>
                      <td className="border-border-1 w-[100px] px-3 py-3 text-right text-neutral-400">
                        —
                      </td>
                      <td className="border-border-1 w-[150px] px-3 py-3 text-right text-neutral-700">
                        {isCommission
                          ? r.pct_of_parent
                            ? `${parseFloat(r.pct_of_parent)}%`
                            : posData.pct
                              ? `${parseFloat(posData.pct)}%`
                              : '—'
                          : '—'}
                      </td>
                      <td className="border-border-1 w-[180px] px-3 py-3 text-right text-neutral-700">
                        {isCommission ? `${formatCurrencyVND(Number(r.amount || 0))} ₫` : '—'}
                      </td>
                      <td className="border-border-1 w-[180px] px-3 py-3 text-right font-semibold text-neutral-900">
                        {formatCurrencyVND(Number(r.amount || 0))} ₫
                      </td>
                      <td className="border-border-1 w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                        {formatCurrencyVND(
                          netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount))
                        )}{' '}
                        ₫
                      </td>
                      <td className="border-border-1 w-[130px] px-3 py-3 text-right font-medium font-semibold text-red-600">
                        {r.hold_amount && Number(r.hold_amount) > 0
                          ? `-${formatCurrencyVND(Number(r.hold_amount))} ₫`
                          : '—'}
                      </td>
                      <td className="border-border-1 w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                        {formatCurrencyVND(
                          netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount))
                        )}{' '}
                        ₫
                      </td>
                      <td className="border-border-1 h-px w-[200px] p-0">
                        <Controller
                          name={`positions.${posIdx}.recipients.${rIdx}.reason`}
                          control={form.control}
                          render={({ field }) => (
                            <div className="relative flex h-full w-full items-center px-3 py-0">
                              <input
                                {...field}
                                value={field.value || ''}
                                placeholder="VD: Lý do tạm giữ..."
                                readOnly={true}
                                className="text-content-dark-4 h-full min-h-[46px] w-full cursor-default border-none bg-transparent py-0 text-left text-[14px] transition-colors outline-none focus:ring-0"
                              />
                            </div>
                          )}
                        />
                      </td>
                      <td className="w-[120px] py-3 pr-5 text-right font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenHoldDialog(r)}
                            title={r.is_held ? 'Bỏ tạm giữ' : 'Tạm giữ'}
                            className={cn(
                              'hover:bg-neutral-30 rounded p-1.5 transition-colors',
                              r.is_held ? 'text-[#D97706]' : 'text-neutral-500'
                            )}
                          >
                            {r.is_held ? (
                              <IconLock className="h-4 w-4" />
                            ) : (
                              <IconLockopen className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                const recipientDetailPath = r.employee_id
                  ? APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', r.employee_id.toString())
                  : r.collaborator_id
                    ? APP_PATH.COLLABORATOR_DETAIL.replace(':id', r.collaborator_id.toString())
                    : null

                const isEditingRow = editingRIdx === rIdx

                if (isEditingRow) {
                  return (
                    <tr key={rec.id} className="bg-[#FFF6F2]/30 hover:bg-[#FFF6F2]/50">
                      <td className="w-12 py-3 pr-2 pl-5 text-neutral-500">{rIdx + 1}</td>
                      <td className="w-[220px] px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-900">
                              {r.recipient_name || '—'}
                            </span>
                            <span className="text-[11px] font-medium text-neutral-400">
                              {recipientId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="border-border-1 h-px w-[150px] p-0 text-right">
                        {!isCommission ? (
                          <FullCellNumberInput
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value || '0')}
                            placeholder="0"
                            suffix="₫"
                            variant="editable"
                            className="text-action-primary-red-default text-right font-bold"
                          />
                        ) : (
                          <span className="px-3 text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="border-border-1 w-[100px] px-3 py-3 text-right text-neutral-400">
                        —
                      </td>
                      <td className="border-border-1 w-[150px] px-3 py-3 text-right font-semibold text-neutral-700 text-neutral-900">
                        {isCommission
                          ? r.pct_of_parent
                            ? `${String(parseFloat(r.pct_of_parent)).replace('.', ',')}%`
                            : posData.pct
                              ? `${String(parseFloat(posData.pct)).replace('.', ',')}%`
                              : '—'
                          : '—'}
                      </td>
                      <td className="border-border-1 h-px w-[180px] p-0 text-right">
                        {isCommission ? (
                          <FullCellNumberInput
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value || '0')}
                            placeholder="0"
                            suffix="₫"
                            variant="editable"
                            className="text-action-primary-red-default text-right font-bold"
                          />
                        ) : (
                          <span className="px-3 text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="border-border-1 w-[180px] px-3 py-3 text-right font-semibold text-neutral-900">
                        {formatCurrencyVND(Number(editAmount || 0))} ₫
                      </td>
                      <td className="border-border-1 w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                        {formatCurrencyVND(
                          netAfterHold(Number(editAmount || 0), parseNumberSafe(r.hold_amount))
                        )}{' '}
                        ₫
                      </td>
                      <td className="border-border-1 w-[135px] px-3 py-3 text-right font-medium font-semibold text-red-600">
                        {r.pre_tax_hold_amount && Number(r.pre_tax_hold_amount) > 0
                          ? `-${formatCurrencyVND(Number(r.pre_tax_hold_amount))} ₫`
                          : '—'}
                      </td>
                      <td className="border-border-1 w-[135px] px-3 py-3 text-right font-medium font-semibold text-red-600">
                        {r.post_tax_hold_amount && Number(r.post_tax_hold_amount) > 0
                          ? `-${formatCurrencyVND(Number(r.post_tax_hold_amount))} ₫`
                          : '—'}
                      </td>
                      <td className="border-border-1 w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                        {formatCurrencyVND(
                          netAfterHold(Number(editAmount || 0), parseNumberSafe(r.hold_amount))
                        )}{' '}
                        ₫
                      </td>
                      <td className="border-border-1 h-px w-[200px] p-0">
                        <div className="relative flex h-full w-full items-center px-3 py-0">
                          <input
                            value={editReason}
                            placeholder="VD: Lý do tạm giữ..."
                            readOnly={true}
                            className="text-content-dark-4 h-full min-h-[46px] w-full cursor-default border-none bg-transparent py-0 text-left text-[14px] outline-none focus:ring-0"
                          />
                        </div>
                      </td>
                      <td className="w-[120px] py-3 pr-5 text-right font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveInlineRow(rIdx)}
                            disabled={isUpdatingRecipients || isHolding}
                            title="Lưu"
                            className="rounded p-1.5 text-[#16A34A] transition-colors hover:bg-[#16A34A]/10 disabled:opacity-50"
                          >
                            <IconCheck className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            title="Hủy"
                            className="hover:bg-neutral-30 rounded p-1.5 text-neutral-500 transition-colors"
                          >
                            <IconX className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={rec.id} className="hover:bg-neutral-50/50">
                    <td className="w-12 py-3 pr-2 pl-5 text-neutral-500">{rIdx + 1}</td>
                    <td className="w-[220px] px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {recipientDetailPath ? (
                            <span
                              className={`cursor-pointer font-medium hover:underline ${r.recipient_type_label ? 'text-amber-700' : 'text-brand-primary-default'}`}
                              onClick={() => navigate(recipientDetailPath)}
                            >
                              {r.recipient_name || '—'}
                            </span>
                          ) : (
                            <span
                              className={`font-medium ${r.recipient_type_label ? 'text-amber-700' : 'text-neutral-900'}`}
                            >
                              {r.recipient_name || '—'}
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-neutral-400">
                            {recipientId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="w-[150px] px-3 py-3 text-right font-medium text-neutral-700">
                      {!isCommission ? `${formatCurrencyVND(Number(r.amount || 0))} ₫` : '—'}
                    </td>
                    <td className="w-[100px] px-3 py-3 text-right text-neutral-400">—</td>
                    <td className="w-[150px] px-3 py-3 text-right font-semibold text-neutral-700 text-neutral-900">
                      {isCommission
                        ? r.pct_of_parent
                          ? `${String(parseFloat(r.pct_of_parent)).replace('.', ',')}%`
                          : posData.pct
                            ? `${String(parseFloat(posData.pct)).replace('.', ',')}%`
                            : '—'
                        : '—'}
                    </td>
                    <td className="w-[180px] px-3 py-3 text-right font-medium text-neutral-700">
                      {isCommission ? `${formatCurrencyVND(Number(r.amount || 0))} ₫` : '—'}
                    </td>
                    <td className="w-[180px] px-3 py-3 text-right font-semibold text-neutral-900">
                      {formatCurrencyVND(Number(r.amount || 0))} ₫
                    </td>
                    <td className="w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                      {formatCurrencyVND(
                        netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount))
                      )}{' '}
                      ₫
                    </td>
                    <td className="w-[135px] px-3 py-3 text-right font-medium font-semibold text-red-600">
                      {r.pre_tax_hold_amount && Number(r.pre_tax_hold_amount) > 0
                        ? `-${formatCurrencyVND(Number(r.pre_tax_hold_amount))} ₫`
                        : '—'}
                    </td>
                    <td className="w-[135px] px-3 py-3 text-right font-medium font-semibold text-red-600">
                      {r.post_tax_hold_amount && Number(r.post_tax_hold_amount) > 0
                        ? `-${formatCurrencyVND(Number(r.post_tax_hold_amount))} ₫`
                        : '—'}
                    </td>
                    <td className="w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                      {formatCurrencyVND(
                        netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount))
                      )}{' '}
                      ₫
                    </td>
                    <td className="w-[200px] px-3 py-3 text-[12px] text-neutral-500">
                      {r.reason || '—'}
                    </td>
                    {canFullEdit && (
                      <td className="w-[120px] py-3 pr-5 text-right font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(r, rIdx)}
                            title="Sửa"
                            className="hover:bg-neutral-30 rounded p-1.5 text-neutral-500 transition-colors"
                          >
                            <IconPencilsimple className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenHoldDialog(r)}
                            title={r.is_held ? 'Bỏ tạm giữ' : 'Tạm giữ'}
                            className={cn(
                              'hover:bg-neutral-30 rounded p-1.5 transition-colors',
                              r.is_held ? 'text-[#D97706]' : 'text-neutral-500'
                            )}
                          >
                            {r.is_held ? (
                              <IconLock className="h-4 w-4" />
                            ) : (
                              <IconLockopen className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
          <tfoot className="border-border-1 border-t bg-neutral-50/70">
            <tr>
              <td
                colSpan={6}
                className="py-3 pr-3 pl-5 text-right text-[12px] font-medium text-neutral-500"
              >
                {canFullEdit ? (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="border-action-primary-red-default bg-neutral-10 text-action-primary-red-default hover:bg-neutral-20 hover:text-action-primary-red-hover flex items-center justify-center gap-1.5 rounded border border-dashed px-3.5 py-1.5 text-xs font-medium transition-colors"
                      onClick={() =>
                        append({
                          employee_id: null,
                          collaborator_id: null,
                          exchange_id: null,
                          amount: '0',
                          base_amount: '0',
                          bonus_amount: '0',
                          pct_of_parent: null,
                          hold_amount: '0',
                          reason: '',
                          recipient_name: '',
                          recipient_type_label: '',
                        })
                      }
                    >
                      <IconPlus className="h-3.5 w-3.5" />
                      Chia thêm cho người khác
                    </button>
                    <span>Tổng đã chia:</span>
                  </div>
                ) : (
                  'Tổng đã chia:'
                )}
              </td>
              <td className="w-[180px] px-3 py-3 text-right">
                {(() => {
                  const diff = expected - totalShared
                  const isMatched = Math.abs(diff) <= 1
                  return (
                    <div className="flex flex-col items-end">
                      {isMatched ? (
                        <div className="text-data-green-default flex items-center gap-1">
                          <IconCheck className="h-4 w-4 shrink-0 fill-current" />
                          <span className="font-semibold">{formatCurrencyVND(totalShared)} ₫</span>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold text-red-500">
                            {formatCurrencyVND(totalShared)} ₫
                          </span>
                          <span className="mt-0.5 text-[10px] font-medium text-red-500">
                            {diff > 0
                              ? `Còn thiếu ${formatCurrencyVND(diff)} ₫`
                              : `Vượt ${formatCurrencyVND(-diff)} ₫`}
                          </span>
                        </>
                      )}
                    </div>
                  )
                })()}
              </td>
              <td className="w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                {(() => {
                  const totalNet =
                    posData.recipients?.reduce(
                      (sum: number, r: any) =>
                        sum + netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount)),
                      0
                    ) || 0
                  return `${formatCurrencyVND(totalNet)} ₫`
                })()}
              </td>
              <td className="w-[135px] px-3 py-3 text-right font-medium text-neutral-400">
                {(() => {
                  const totalPreTaxHold =
                    posData.recipients?.reduce(
                      (sum: number, r: any) => sum + parseNumberSafe(r.pre_tax_hold_amount),
                      0
                    ) || 0
                  return totalPreTaxHold > 0 ? (
                    <span className="font-medium text-red-600">
                      -{formatCurrencyVND(totalPreTaxHold)} ₫
                    </span>
                  ) : (
                    '—'
                  )
                })()}
              </td>
              <td className="w-[135px] px-3 py-3 text-right font-medium text-neutral-400">
                {(() => {
                  const totalPostTaxHold =
                    posData.recipients?.reduce(
                      (sum: number, r: any) => sum + parseNumberSafe(r.post_tax_hold_amount),
                      0
                    ) || 0
                  return totalPostTaxHold > 0 ? (
                    <span className="font-medium text-red-600">
                      -{formatCurrencyVND(totalPostTaxHold)} ₫
                    </span>
                  ) : (
                    '—'
                  )
                })()}
              </td>
              <td className="w-[140px] px-3 py-3 text-right font-semibold text-neutral-700">
                {(() => {
                  const totalNet =
                    posData.recipients?.reduce(
                      (sum: number, r: any) =>
                        sum + netAfterHold(Number(r.amount || 0), parseNumberSafe(r.hold_amount)),
                      0
                    ) || 0
                  return `${formatCurrencyVND(totalNet)} ₫`
                })()}
              </td>
              <td></td>
              {canFullEdit && <td className="w-11"></td>}
            </tr>
          </tfoot>
        </table>
      </div>
      {activeRecipientIdx !== null && (
        <AppDialog
          open={activeRecipientIdx !== null}
          onOpenChange={(open) => {
            if (!open) setActiveRecipientIdx(null)
          }}
          title="Chọn người thực nhận"
          variant="custom"
          isHideCancelButton={false}
          onCancel={() => setActiveRecipientIdx(null)}
          onConfirm={handleConfirmRecipient}
          confirmText="Xác nhận"
          content={
            <div className="flex min-w-[450px] flex-col gap-4 py-4">
              <Select
                label="Loại đối tác"
                options={recipientTypeOptions}
                value={selectedType}
                onChange={(val: any) => {
                  setSelectedType(val)
                  setSelectedId(null)
                  setSelectedName('')
                }}
                clearable={false}
              />

              {selectedType === 'EMPLOYEE' && (
                <Select
                  key="employee"
                  label="Nhân viên / Sale"
                  placeholder="Tìm kiếm nhân viên..."
                  value={selectedId}
                  loadOptions={loadEmployeeOptions}
                  enableSearch
                  clearable
                  onChange={(val: any) => setSelectedId(val ? String(val) : null)}
                  onChangeOption={(opt) => {
                    if (opt) {
                      const name = opt.label.split(' - ').slice(1).join(' - ') || opt.label
                      setSelectedName(name)
                    } else {
                      setSelectedName('')
                    }
                  }}
                />
              )}

              {selectedType === 'COLLABORATOR' && (
                <Select
                  key="collaborator"
                  label="Cộng tác viên ngoài (CTV)"
                  placeholder="Tìm kiếm cộng tác viên..."
                  value={selectedId}
                  loadOptions={loadCollaboratorOptions}
                  enableSearch
                  clearable
                  onChange={(val: any) => setSelectedId(val ? String(val) : null)}
                  onChangeOption={(opt) => {
                    if (opt) {
                      const name = opt.label.split(' - ').slice(1).join(' - ') || opt.label
                      setSelectedName(name)
                    } else {
                      setSelectedName('')
                    }
                  }}
                />
              )}

              {selectedType === 'EXCHANGE' && (
                <Select
                  key="exchange"
                  label="Sàn F2"
                  placeholder="Tìm kiếm sàn giao dịch..."
                  value={selectedId}
                  loadOptions={loadExchangeOptions}
                  enableSearch
                  clearable
                  onChange={(val: any) => setSelectedId(val ? String(val) : null)}
                  onChangeOption={(opt) => {
                    setSelectedName(opt ? opt.label : '')
                  }}
                />
              )}
            </div>
          }
        />
      )}
      {holdDialogOpen && holdTarget && (
        <CommissionHoldDialog
          isOpen={holdDialogOpen}
          onClose={() => setHoldDialogOpen(false)}
          recipientName={holdTarget.recipient_name}
          amount={(() => {
            const { totalAmount } = getRelatedShareIdsAndAmount(holdTarget)
            return totalAmount
          })()}
          initialReason={(() => {
            const { holdReason } = getRelatedShareIdsAndAmount(holdTarget)
            return holdReason
          })()}
          initialTaxBase={(() => {
            const { taxBase } = getRelatedShareIdsAndAmount(holdTarget)
            return taxBase
          })()}
          loading={isHolding || isReleasing}
          onConfirm={handleConfirmHold}
          mode={holdTarget.is_held ? 'release' : 'hold'}
        />
      )}
    </>
  )
}
