import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'

import { IconTrash, IconPlus, IconInfo } from '@/assets/icons'
import { Button, Select } from '@/components/ui'
import { cn } from '@/utils'
import { formatCurrencyVND } from '@/utils/common'
import { useToast } from '@/hooks/useToast'
import {
  useCreateLinkedExchangeRevenueRule,
  useUpdateLinkedExchangeRevenueRule,
  useDeleteLinkedExchangeRevenueRule,
  type LinkedExchangeRevenueRule,
} from '@/features/accounting/linked-exchange-targets/services/linked-exchange-revenue-rule.service'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'

type EditableTier = {
  id: number
  name: string
  note: string // Used for "Ngưỡng"
  revenue: string
  operator: 'GT' | 'GTE'
  commission_rate: string
  pct_for_linked_department: string
  pct_for_secretary_department: string
  pct_for_ceo: string
}

// The three role weights are a DISTRIBUTION of the pool (they must sum to 100%);
// each recipient's effective rate = commission_rate × (weight / 100).
const DIST_ROLES: { key: keyof EditableTier; label: string }[] = [
  { key: 'pct_for_linked_department', label: 'Phòng Sàn liên kết' },
  { key: 'pct_for_secretary_department', label: 'Phòng thư ký dự án' },
  { key: 'pct_for_ceo', label: 'Tổng giám đốc' },
]

const SPLIT_TOTAL = 100
const EPS = 1e-6

function splitTotal(tier: EditableTier | LinkedExchangeRevenueRule): number {
  return (
    Number(tier.pct_for_linked_department || 0) +
    Number(tier.pct_for_secretary_department || 0) +
    Number(tier.pct_for_ceo || 0)
  )
}

export interface SLKRatePolicyMatrixProps {
  rules: LinkedExchangeRevenueRule[]
  /** Retained for API compatibility; the three role columns are always shown. */
  canViewRelatedRoles?: boolean
  isEditMode: boolean
  onEditModeChange: (isEditMode: boolean) => void
}

export interface SLKRatePolicyMatrixRef {
  save: () => Promise<boolean>
}

export const SLKRatePolicyMatrix = forwardRef<SLKRatePolicyMatrixRef, SLKRatePolicyMatrixProps>(
  ({ rules, isEditMode, onEditModeChange }, ref) => {
    const { success, error: showError } = useToast()
    const [editingTiers, setEditingTiers] = useState<EditableTier[]>([])

    const createMutation = useCreateLinkedExchangeRevenueRule()
    const updateMutation = useUpdateLinkedExchangeRevenueRule()
    const deleteMutation = useDeleteLinkedExchangeRevenueRule()

    useEffect(() => {
      if (isEditMode) {
        setEditingTiers(
          rules.map((r) => ({
            id: r.id,
            name: r.name,
            note: r.note || '',
            revenue: r.revenue,
            operator: r.operator as 'GT' | 'GTE',
            commission_rate: r.commission_rate ?? '',
            pct_for_linked_department: r.pct_for_linked_department,
            pct_for_secretary_department: r.pct_for_secretary_department,
            pct_for_ceo: r.pct_for_ceo,
          }))
        )
      } else {
        setEditingTiers([])
      }
    }, [isEditMode, rules])

    useImperativeHandle(ref, () => ({
      save: async () => {
        // Client-side guard: the pool rate must be positive and the three role
        // weights must sum to exactly 100 (BE enforces the same as a safety net).
        const badRate = editingTiers.filter((t) => !(Number(t.commission_rate) > 0))
        if (badRate.length > 0) {
          showError(
            `Tỷ lệ tính hoa hồng phải lớn hơn 0. Kiểm tra: ${badRate.map((t) => t.name).join(', ')}`
          )
          return false
        }
        const badSplit = editingTiers.filter((t) => Math.abs(splitTotal(t) - SPLIT_TOTAL) > EPS)
        if (badSplit.length > 0) {
          showError(
            `Tổng tỷ lệ hưởng của 3 vị trí phải bằng 100%. Kiểm tra: ${badSplit
              .map((t) => t.name)
              .join(', ')}`
          )
          return false
        }

        try {
          const deletedRules = rules.filter((r) => !editingTiers.find((t) => t.id === r.id))
          const createdTiers = editingTiers.filter((t) => t.id < 0)
          const updatedTiers = editingTiers.filter((t) => t.id > 0)

          await Promise.all([
            ...deletedRules.map((r) => deleteMutation.mutateAsync(r.id)),
            ...createdTiers.map((t) =>
              createMutation.mutateAsync({
                name: t.name,
                note: t.note,
                revenue: t.revenue,
                operator: t.operator as any,
                commission_rate: t.commission_rate,
                pct_for_linked_department: t.pct_for_linked_department,
                pct_for_secretary_department: t.pct_for_secretary_department,
                pct_for_ceo: t.pct_for_ceo,
              })
            ),
            ...updatedTiers.map((t) =>
              updateMutation.mutateAsync({
                id: t.id,
                payload: {
                  name: t.name,
                  note: t.note,
                  revenue: t.revenue,
                  operator: t.operator as any,
                  commission_rate: t.commission_rate,
                  pct_for_linked_department: t.pct_for_linked_department,
                  pct_for_secretary_department: t.pct_for_secretary_department,
                  pct_for_ceo: t.pct_for_ceo,
                },
              })
            ),
          ])

          success('Đã lưu quy định thành công')
          onEditModeChange(false)
          return true
        } catch (err) {
          showError('Lưu thất bại. Vui lòng kiểm tra lại định dạng số.')
          return false
        }
      },
    }))

    const handleAddTier = () => {
      const newTier: EditableTier = {
        id: -Date.now(),
        name: 'Mức target mới',
        note: '',
        revenue: '0',
        operator: 'GTE',
        commission_rate: '0',
        pct_for_linked_department: '0',
        pct_for_secretary_department: '0',
        pct_for_ceo: '0',
      }
      setEditingTiers([...editingTiers, newTier])
    }

    const handleRemoveTier = (tierId: number) => {
      setEditingTiers(editingTiers.filter((t) => t.id !== tierId))
    }

    const handleChangeField = (tierId: number, field: keyof EditableTier, value: string) => {
      setEditingTiers(editingTiers.map((t) => (t.id === tierId ? { ...t, [field]: value } : t)))
    }

    const displayTiers = isEditMode ? editingTiers : rules

    // Rows whose split does not sum to 100 (edit mode only) — surfaced in a banner
    // and highlighted inline so the user knows exactly which tier to fix.
    const invalidSplitTiers = isEditMode
      ? editingTiers.filter((t) => Math.abs(splitTotal(t) - SPLIT_TOTAL) > EPS)
      : []

    // name, operator, revenue, commission_rate + 3 distribution + optional trash
    const bodyColSpan = 4 + DIST_ROLES.length + (isEditMode ? 1 : 0)

    return (
      <div className="flex flex-col gap-4">
        {/* Info banner */}
        <div className="flex items-center justify-between">
          <div className="flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <IconInfo className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <b>Cách áp dụng:</b> Ứng với mỗi mức target doanh thu, <b>Tỷ lệ tính hoa hồng</b> là %
              trên doanh thu để ra tổng quỹ hoa hồng. Quỹ này được chia cho 3 vị trí (Phòng Sàn liên
              kết · Phòng thư ký dự án · Tổng giám đốc) theo <b>Tỷ lệ hưởng</b> — tổng 3 cột phải
              bằng <b>100%</b>.
            </div>
          </div>
        </div>

        {/* Validation banner (edit mode) */}
        {invalidSplitTiers.length > 0 && (
          <div className="bg-data-red-disabled text-data-red-default flex items-start gap-2 rounded-md border border-red-200 p-3 text-sm">
            <IconInfo className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              Tổng tỷ lệ hưởng của mỗi mức phải bằng 100%. Chưa đạt:{' '}
              {invalidSplitTiers.map((t) => `${t.name} (${splitTotal(t)}%)`).join(', ')}.
            </div>
          </div>
        )}

        {/* Matrix Table */}
        <div className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-content-light-1 border-border-1 border-b">
              <tr className="!bg-neutral-20">
                <th className="border-border-1 w-[180px] border-r px-3 py-[10px]" rowSpan={2}>
                  <span className="text-content-dark-2 typo-body-base-medium font-normal">
                    Target doanh thu
                  </span>
                </th>
                <th
                  className="border-border-1 w-[120px] border-r px-3 py-[10px] text-center"
                  rowSpan={2}
                >
                  <span className="text-content-dark-2 typo-body-base-medium font-normal">
                    Điều kiện
                  </span>
                </th>
                <th
                  className="border-border-1 w-[160px] border-r px-3 py-[10px] text-right"
                  rowSpan={2}
                >
                  <span className="text-content-dark-2 typo-body-base-medium font-normal">
                    Chỉ tiêu tiền
                  </span>
                </th>
                <th
                  className="border-border-1 w-[150px] border-r px-3 py-[10px] text-center"
                  rowSpan={2}
                >
                  <span className="text-content-dark-2 typo-body-base-medium font-normal">
                    Tỷ lệ tính hoa hồng
                  </span>
                </th>
                <th
                  colSpan={DIST_ROLES.length}
                  className="border-border-1 border-b px-3 py-[10px] text-center"
                >
                  <span className="text-content-dark-2 typo-body-base-medium font-normal">
                    Tỷ lệ hưởng (%)
                  </span>
                </th>
                {isEditMode && <th className="border-border-1 w-[60px] border-b" rowSpan={2}></th>}
              </tr>
              <tr className="!bg-neutral-20">
                {DIST_ROLES.map((role, idx) => (
                  <th
                    key={role.key}
                    className={cn(
                      'border-border-1 border-r border-b px-3 py-[10px] text-center whitespace-nowrap',
                      idx === DIST_ROLES.length - 1 && !isEditMode && 'border-r-0'
                    )}
                  >
                    <span className="text-content-dark-2 typo-body-base-medium font-normal">
                      {role.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTiers.length === 0 ? (
                <tr className="border-border-1 border-b">
                  <td colSpan={bodyColSpan} className="py-8 text-center text-neutral-500">
                    Chưa có quy định nào
                  </td>
                </tr>
              ) : (
                displayTiers.map((tier) => {
                  const total = splitTotal(tier)
                  const isSplitInvalid = isEditMode && Math.abs(total - SPLIT_TOTAL) > EPS
                  return (
                    <tr key={tier.id} className="border-border-1 border-b hover:bg-neutral-50/50">
                      <td className="border-border-1 h-[1px] border-r !p-0 align-top font-medium">
                        {isEditMode ? (
                          <div className="group/edit hover:bg-action-primary-red-default/5 relative h-full min-h-[44px] transition-colors focus-within:bg-[#FFF6F2]">
                            <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
                            <input
                              type="text"
                              className="relative z-10 h-full min-h-[44px] w-full bg-transparent px-3 outline-none"
                              value={tier.name}
                              onChange={(e) => handleChangeField(tier.id, 'name', e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="px-3 py-[10px]">{tier.name}</div>
                        )}
                      </td>
                      <td className="border-border-1 h-[1px] border-r !p-0 text-center align-top">
                        {isEditMode ? (
                          <div className="group/edit hover:bg-action-primary-red-default/5 relative h-full min-h-[44px] transition-colors focus-within:bg-[#FFF6F2]">
                            <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
                            <Select
                              className="relative z-10 h-full min-h-[44px] w-full rounded-none border-none bg-transparent shadow-none focus:ring-0"
                              value={tier.operator}
                              onChange={(val) =>
                                handleChangeField(tier.id, 'operator', val as string)
                              }
                              options={[
                                { label: '>', value: 'GT' },
                                { label: '>=', value: 'GTE' },
                              ]}
                              clearable={false}
                            />
                          </div>
                        ) : (
                          <div className="px-3 py-[10px]">{tier.operator === 'GT' ? '>' : '≥'}</div>
                        )}
                      </td>
                      <td className="border-border-1 h-[1px] border-r !p-0 text-right align-top">
                        {isEditMode ? (
                          <div className="group/edit hover:bg-action-primary-red-default/5 relative h-full min-h-[44px] transition-colors focus-within:bg-[#FFF6F2]">
                            <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
                            <FullCellNumberInput
                              className="relative z-10 h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white"
                              suffix="VNĐ"
                              value={tier.revenue}
                              onChange={(e) =>
                                handleChangeField(tier.id, 'revenue', e.target.value)
                              }
                            />
                          </div>
                        ) : (
                          <div className="px-3 py-[10px]">
                            {formatCurrencyVND(Number(tier.revenue))}
                          </div>
                        )}
                      </td>

                      {/* Tỷ lệ tính hoa hồng (commission_rate) */}
                      <td className="border-border-1 h-[1px] border-r !p-0 text-center align-top">
                        {isEditMode ? (
                          <div className="group/edit hover:bg-action-primary-red-default/5 relative h-full min-h-[44px] transition-colors focus-within:bg-[#FFF6F2]">
                            <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
                            <div className="relative flex h-full min-h-[44px] w-full items-center justify-center">
                              <input
                                type="number"
                                step="0.1"
                                min={0}
                                max={100}
                                className="relative z-10 h-full min-h-[44px] w-full bg-transparent py-2 pr-6 pl-3 text-center outline-none ring-inset focus-within:bg-white"
                                value={String(tier.commission_rate ?? '')}
                                onChange={(e) =>
                                  handleChangeField(tier.id, 'commission_rate', e.target.value)
                                }
                              />
                              <span className="pointer-events-none absolute right-2 z-20 text-sm text-neutral-500">
                                %
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-content-dark-1 flex min-h-[44px] items-center justify-center px-3 py-[10px] font-semibold">
                            {tier.commission_rate === '' || tier.commission_rate == null
                              ? '-'
                              : `${Number(tier.commission_rate)}%`}
                          </div>
                        )}
                      </td>

                      {/* Tỷ lệ hưởng: 3-way distribution (sum must be 100%) */}
                      {DIST_ROLES.map((role, idx) => (
                        <td
                          key={role.key}
                          className={cn(
                            'border-border-1 h-[1px] border-r !p-0 text-center align-top',
                            idx === DIST_ROLES.length - 1 && !isEditMode && 'border-r-0'
                          )}
                        >
                          {isEditMode ? (
                            <div
                              className={cn(
                                'group/edit hover:bg-action-primary-red-default/5 relative h-full min-h-[44px] transition-colors focus-within:bg-[#FFF6F2]',
                                isSplitInvalid && 'bg-data-red-disabled/60'
                              )}
                            >
                              <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
                              <div className="relative flex h-full min-h-[44px] w-full items-center justify-center">
                                <input
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  max={100}
                                  className="relative z-10 h-full min-h-[44px] w-full bg-transparent py-2 pr-6 pl-3 text-center outline-none ring-inset focus-within:bg-white"
                                  value={String(tier[role.key] ?? '')}
                                  onChange={(e) =>
                                    handleChangeField(tier.id, role.key, e.target.value)
                                  }
                                />
                                <span className="pointer-events-none absolute right-2 z-20 text-sm text-neutral-500">
                                  %
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-h-[44px] items-center justify-center px-3 py-[10px] font-semibold text-purple-700">
                              {Number(tier[role.key as keyof typeof tier])}%
                            </div>
                          )}
                        </td>
                      ))}

                      {isEditMode && (
                        <td className="w-[60px] p-2 text-center align-middle">
                          <button
                            type="button"
                            className="text-data-red-default hover:text-data-red-hover flex h-full min-h-[44px] w-full items-center justify-center transition-colors"
                            onClick={() => handleRemoveTier(tier.id)}
                            title="Xóa mức target này"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {isEditMode && (
          <div className="flex justify-start">
            <Button variant="text" size="small" onClick={handleAddTier} leftIcon={<IconPlus />}>
              + Thêm mức target
            </Button>
          </div>
        )}
      </div>
    )
  }
)
