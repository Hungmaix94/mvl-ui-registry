import { useMemo, useState } from 'react'
import { Table } from '@radix-ui/themes'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui'
import { FullCellNumberInput } from '@/components/commons'
import { formatNumber } from '@/utils/common'
import { IconPencil, IconPlus, IconTrash } from '@/assets/icons'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  useDepartmentsDropdown,
  getDepartmentService,
} from '@/features/org/services/department-service'
import { usePositionsDropdown } from '@/features/org/services/position-service'
import { useBranchesDropdown } from '@/features/org/services/branch-service'
import { useBlocksDropdown, getBlockService } from '@/features/org/services/block-service'
import { useEmployeesDropdown } from '@/features/employee/services/employee-service'
import AddContributorDialog, {
  type ContributorDialogValues,
} from '@/features/project/sale-allocations/components/AddContributorDialog'
import { PROMOTION_REVENUE_COLUMN_LABEL } from '@/features/project/promotion-commission-config/constants/promotion-commission-config-constants'
import {
  recipientRowToDialogValues,
  type PromotionConfigFormValues,
  type PromotionRecipientRow,
} from '@/features/project/promotion-commission-config/types/promotion-commission-config-types'

/** Parent-resolving maps built from the org dropdowns (each dropdown row carries its parent chain). */
type DepartmentInfo = {
  name: string
  branchId?: number | null
  branchName?: string
  blockId?: number | null
  blockName?: string
}
type BlockInfo = { name: string; branchId?: number | null }
type EmployeeInfo = {
  name: string
  branchId?: number | null
  branchName?: string
  blockId?: number | null
  blockName?: string
  departmentId?: number | null
  departmentName?: string
  positionId?: number | null
  positionName?: string
}
type OrgMaps = {
  departments: Map<number, DepartmentInfo>
  blocks: Map<number, BlockInfo>
  branches: Map<number, string>
  positions: Map<number, string>
  employees: Map<number, EmployeeInfo>
}

const calculateActual = (
  approved: number | string | null | undefined,
  contribution: number | string | null | undefined
) => {
  const a = Number(approved) || 0
  const c = Number(contribution) || 0
  if (a === 0 || c === 0) return '0.00'
  return ((a * c) / 100).toFixed(2)
}

type OrgItem = {
  department?: number | null
  department_name?: string
  branch?: number | null
  branch_name?: string
  block?: number | null
  block_name?: string
  position?: number | null
  position_name?: string
  employee?: number | null
  employee_name?: string
}

/**
 * Recipients persist only the smallest chosen scope. The BE rule is exactly one of
 * `employee | department | branch | block | position` (plus an optional parent scope for
 * positions). Resolve the full chain from the dropdown maps, which each carry their parent:
 * EmployeeDropdown nests branch/block/department/position; DepartmentDropdown nests
 * branch+block; BlockDropdown nests branch. Names from the dialog (item.*_name) win first.
 */
const resolveOrgHierarchy = (item: OrgItem, maps: OrgMaps) => {
  let branchName = item.branch_name || undefined
  let blockName = item.block_name || undefined
  let departmentName = item.department_name || undefined
  let positionName = item.position_name || undefined
  let employeeName = item.employee_name || undefined

  if (item.employee != null) {
    const emp = maps.employees.get(item.employee)
    employeeName = employeeName || emp?.name
    departmentName = departmentName || emp?.departmentName
    blockName = blockName || emp?.blockName
    branchName = branchName || emp?.branchName
    positionName = positionName || emp?.positionName
  } else if (item.department != null) {
    const dept = maps.departments.get(item.department)
    departmentName = departmentName || dept?.name
    blockName = blockName || dept?.blockName
    branchName = branchName || dept?.branchName
  } else if (item.block != null) {
    const block = maps.blocks.get(item.block)
    blockName = blockName || block?.name
    if (block?.branchId != null) branchName = branchName || maps.branches.get(block.branchId)
  } else if (item.branch != null) {
    branchName = branchName || maps.branches.get(item.branch)
  }

  if (!positionName && item.position != null) positionName = maps.positions.get(item.position)

  return { branchName, blockName, departmentName, positionName, employeeName }
}

/** Vertical, labeled view of a recipient's org assignment (chi nhánh / khối / phòng ban / vị trí / nhân viên). */
const OrgHierarchyCell = ({ item, orgMaps }: { item: OrgItem; orgMaps: OrgMaps }) => {
  const { branchName, blockName, departmentName, positionName, employeeName } = resolveOrgHierarchy(
    item,
    orgMaps
  )

  const lines: Array<[string, string]> = []
  if (branchName) lines.push(['Chi nhánh', branchName])
  if (blockName) lines.push(['Khối', blockName])
  if (departmentName) lines.push(['Phòng ban', departmentName])
  if (positionName) lines.push(['Vị trí', positionName])
  if (employeeName) lines.push(['Nhân viên', employeeName])

  if (lines.length === 0) {
    return <span className="typo-body-base-regular text-content-dark-3">—</span>
  }

  return (
    <div className="flex flex-col gap-0.5">
      {lines.map(([label, value]) => (
        <div key={label} className="typo-body-base-regular leading-snug">
          <span className="text-content-dark-3">{label}: </span>
          <span className="text-content-dark-1 font-medium">{value}</span>
        </div>
      ))}
    </div>
  )
}

type ConfigRowGroupProps = {
  mechIndex: number
  isFirstGroup: boolean
  totalBodyRows: number
  isEditing: boolean
  pctTypeLabels: Record<string, string>
  orgMaps: OrgMaps
}

const ConfigRowGroup = ({
  mechIndex,
  isFirstGroup,
  totalBodyRows,
  isEditing,
  pctTypeLabels,
  orgMaps,
}: ConfigRowGroupProps) => {
  const { control, setValue } = useFormContext<PromotionConfigFormValues>()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editDialogValues, setEditDialogValues] =
    useState<ReturnType<typeof recipientRowToDialogValues>>(undefined)

  const {
    fields: contributors,
    append,
    remove,
    update,
  } = useFieldArray({ control, name: `groups.${mechIndex}.recipients` })

  const watchedPctType = useWatch({ control, name: `groups.${mechIndex}.pct_type` })
  const approvedRevenue = useWatch({ control, name: watchedPctType })
  const promoRevenue = useWatch({ control, name: 'pct_promotion_revenue' })
  const watchedContributors = useWatch({ control, name: `groups.${mechIndex}.recipients` })

  const rowSpan = Math.max(1, contributors.length)
  // No real recipients yet → the single rendered row is just a visual placeholder. It must NOT
  // bind editable recipient inputs, otherwise RHF registers a phantom recipient[0] (contribution
  // only, no department) that shows up as a stray "default" row next to the first real one.
  const isPlaceholderRow = contributors.length === 0

  // Per-pct_type contribution check (backend requires the total to be exactly 100 when there are
  // recipients). Surfaced as a red subtotal under the group label so the user can fix it pre-save.
  const contributionSum = (watchedContributors ?? []).reduce(
    (sum, r) => sum + (Number(r?.contribution_level) || 0),
    0
  )
  const roundedContributionSum = Math.round(contributionSum * 100) / 100
  const isContributionValid = isPlaceholderRow || Math.abs(contributionSum - 100) < 0.001

  const pctTypeLabel = useMemo(
    () => pctTypeLabels[watchedPctType] ?? watchedPctType,
    [watchedPctType, pctTypeLabels]
  )

  const handleAddDept = (values: ContributorDialogValues) => {
    append({
      contribution_level: values.contribution_level,
      branch: values.branch_id,
      branch_name: values.branch_name,
      block: values.block_id,
      block_name: values.block_name,
      department: values.department_id,
      department_name: values.department_name,
      position: values.position_id,
      position_name: values.position_name,
      employee: values.employee_id,
      employee_name: values.employee_name,
    })
    if (values.inhouse_rate !== undefined && values.inhouse_rate !== '') {
      setValue(watchedPctType, Number(values.inhouse_rate), { shouldDirty: true })
    }
    setAddDialogOpen(false)
  }

  const handleEditDept = (values: ContributorDialogValues) => {
    if (editIndex == null) return
    const current = watchedContributors?.[editIndex]
    update(editIndex, {
      ...current,
      branch: values.branch_id,
      branch_name: values.branch_name,
      block: values.block_id,
      block_name: values.block_name,
      department: values.department_id,
      department_name: values.department_name,
      position: values.position_id,
      position_name: values.position_name,
      employee: values.employee_id,
      employee_name: values.employee_name,
      contribution_level: values.contribution_level,
    })
    if (values.inhouse_rate !== undefined && values.inhouse_rate !== '') {
      setValue(watchedPctType, Number(values.inhouse_rate), { shouldDirty: true })
    }
    setEditIndex(null)
  }

  // Recipients persist only the smallest scope. Before opening the edit dialog, reverse-resolve
  // the parent chain so the cascade renders the full path:
  //  - employee → branch/block/department/position (synchronous, from EmployeeDropdown map)
  //  - department → block/branch (fetched, since the dropdown map only carries them when listed)
  //  - block → branch (fetched)
  const handleStartEdit = async (cIndex: number) => {
    const row = watchedContributors?.[cIndex]
    const enriched: PromotionRecipientRow = { ...(row ?? {}) }
    try {
      if (enriched.employee != null) {
        const emp = orgMaps.employees.get(enriched.employee)
        if (emp) {
          enriched.department = enriched.department ?? emp.departmentId ?? null
          enriched.block = enriched.block ?? emp.blockId ?? null
          enriched.branch = enriched.branch ?? emp.branchId ?? null
          enriched.position = enriched.position ?? emp.positionId ?? null
          enriched.employee_name = enriched.employee_name ?? emp.name
          enriched.department_name = enriched.department_name ?? emp.departmentName
          enriched.block_name = enriched.block_name ?? emp.blockName
          enriched.branch_name = enriched.branch_name ?? emp.branchName
          enriched.position_name = enriched.position_name ?? emp.positionName
        }
      } else if (
        enriched.department != null &&
        (enriched.block == null || enriched.branch == null)
      ) {
        const dept = await getDepartmentService().getDepartment(enriched.department)
        enriched.block = enriched.block ?? dept?.block?.id ?? null
        enriched.branch = enriched.branch ?? dept?.branch?.id ?? null
      } else if (enriched.block != null && enriched.branch == null) {
        const block = await getBlockService().getBlock(enriched.block)
        enriched.branch = enriched.branch ?? block?.branch?.id ?? null
      }
    } catch {
      // Fall back to whatever scope we already have.
    }
    setEditDialogValues(recipientRowToDialogValues(enriched))
    setEditIndex(cIndex)
  }

  return (
    <>
      <AddContributorDialog
        open={addDialogOpen}
        title="Thêm bộ phận đóng góp"
        approvedRevenue={approvedRevenue != null ? Number(approvedRevenue) : null}
        showEmployee
        requireAnyOrgUnit
        onClose={() => setAddDialogOpen(false)}
        onConfirm={handleAddDept}
      />
      <AddContributorDialog
        open={editIndex != null}
        title="Chỉnh sửa bộ phận đóng góp"
        approvedRevenue={approvedRevenue != null ? Number(approvedRevenue) : null}
        showEmployee
        requireAnyOrgUnit
        initialValues={editDialogValues}
        onClose={() => setEditIndex(null)}
        onConfirm={handleEditDept}
      />
      {(contributors.length > 0 ? contributors : [{ id: `empty-${mechIndex}` }]).map(
        (contributor, cIndex) => {
          const item = watchedContributors?.[cIndex] ?? {}
          const actualPct = calculateActual(approvedRevenue, item.contribution_level)

          return (
            <Table.Row
              key={contributor.id || cIndex}
              className="border-border-1 hover:bg-surface-primary-hover border-b bg-white transition-colors last:border-b-0"
            >
              {isFirstGroup && cIndex === 0 && (
                <Table.Cell
                  rowSpan={totalBodyRows}
                  className="border-border-1 h-full border-r bg-white !p-0 align-middle"
                  style={{ width: '128px', minWidth: '128px' }}
                >
                  {isEditing ? (
                    <Controller
                      control={control}
                      name="pct_promotion_revenue"
                      render={({ field }) => (
                        <FullCellNumberInput
                          ref={field.ref}
                          name={field.name}
                          value={field.value ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            field.onChange(e.target.value !== '' ? e.target.value : null)
                          }
                          placeholder="0.00"
                          min={0}
                          max={100}
                        />
                      )}
                    />
                  ) : (
                    <div className="flex h-full min-h-[48px] items-center justify-center px-3 font-semibold text-[#E5202B]">
                      {promoRevenue != null && promoRevenue !== '' ? `${formatNumber(promoRevenue, { maximumFractionDigits: 2 })}%` : '—'}
                    </div>
                  )}
                </Table.Cell>
              )}
              {isEditing && cIndex === 0 && (
                <Table.Cell
                  rowSpan={rowSpan}
                  className="border-border-1 h-full border-r bg-white !p-0 align-middle"
                  style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
                >
                  <div className="flex h-full min-h-[48px] items-center justify-center px-2 py-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setAddDialogOpen(true)}
                      className="bg-neutral-30 h-9 w-9 p-2.5"
                      title="Thêm phòng ban đóng góp"
                    >
                      <IconPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </Table.Cell>
              )}
              {cIndex === 0 && (
                <Table.Cell
                  rowSpan={rowSpan}
                  className="border-border-1 typo-body-base-medium border-r bg-white !p-0 align-middle font-medium text-gray-700"
                  style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                >
                  <div className="flex h-full min-h-[48px] flex-col justify-center gap-1 px-4 py-3">
                    <span>{pctTypeLabel}</span>
                    {isEditing && !isPlaceholderRow && (
                      <span
                        className={`typo-body-xs-regular ${
                          isContributionValid ? 'text-content-dark-3' : 'text-data-red-default'
                        }`}
                      >
                        Tổng đóng góp: {roundedContributionSum}%
                        {isContributionValid ? '' : ' (cần 100%)'}
                      </span>
                    )}
                  </div>
                </Table.Cell>
              )}
              {cIndex === 0 && (
                <Table.Cell
                  rowSpan={rowSpan}
                  className="border-border-1 h-full border-r bg-white !p-0 align-middle"
                  style={{ width: '116px' }}
                >
                  {isEditing ? (
                    <Controller
                      control={control}
                      name={watchedPctType}
                      render={({ field }) => (
                        <FullCellNumberInput
                          ref={field.ref}
                          name={field.name}
                          value={field.value ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            field.onChange(e.target.value !== '' ? e.target.value : null)
                          }
                          placeholder="0.00"
                          min={0}
                          max={100}
                        />
                      )}
                    />
                  ) : (
                    <div className="flex h-full min-h-[48px] items-center justify-end px-3 font-semibold text-[#E5202B]">
                      {approvedRevenue != null ? `${formatNumber(approvedRevenue, { maximumFractionDigits: 2 })}%` : '—'}
                    </div>
                  )}
                </Table.Cell>
              )}
              <Table.Cell
                className="border-border-1 h-full border-r !p-0 align-middle"
                style={{ width: '116px' }}
              >
                {isEditing && !isPlaceholderRow ? (
                  <Controller
                    control={control}
                    name={`groups.${mechIndex}.recipients.${cIndex}.contribution_level`}
                    render={({ field }) => (
                      <FullCellNumberInput
                        ref={field.ref}
                        name={field.name}
                        value={field.value ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          field.onChange(e.target.value !== '' ? e.target.value : null)
                        }
                        placeholder="0.00"
                        min={0}
                        max={100}
                      />
                    )}
                  />
                ) : (
                  <div className="flex h-full min-h-[44px] items-center justify-end px-3">
                    {item.contribution_level != null ? `${formatNumber(item.contribution_level, { maximumFractionDigits: 2 })}%` : '—'}
                  </div>
                )}
              </Table.Cell>
              <Table.Cell
                className="border-border-1 h-full border-r !p-0 align-middle"
                style={{ width: '116px' }}
              >
                <div className="flex h-full min-h-[44px] items-center justify-end px-3 font-semibold text-[#E5202B]">
                  {formatNumber(actualPct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </div>
              </Table.Cell>
              <Table.Cell className="border-border-1 border-r px-4 py-3 align-middle">
                <OrgHierarchyCell item={item} orgMaps={orgMaps} />
              </Table.Cell>
              {isEditing && (
                <Table.Cell
                  className="px-1 py-2 text-center align-middle"
                  style={{ width: '52px', minWidth: '52px', maxWidth: '52px' }}
                >
                  {item && Object.keys(item).length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        iconOnly
                        onClick={() => handleStartEdit(cIndex)}
                        className="bg-neutral-30 hover:bg-neutral-40 h-7 w-7 p-0"
                        title="Chỉnh sửa bộ phận"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        iconOnly
                        onClick={() => remove(cIndex)}
                        className="bg-neutral-30 hover:bg-neutral-40 text-data-red-default hover:text-data-red-hover h-7 w-7 p-0"
                        title="Xóa dòng này"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </Table.Cell>
              )}
            </Table.Row>
          )
        }
      )}
    </>
  )
}

export type PromotionCommissionConfigTableProps = {
  isEditing: boolean
}

export const PromotionCommissionConfigTable = ({
  isEditing,
}: PromotionCommissionConfigTableProps) => {
  const { control, watch } = useFormContext<PromotionConfigFormValues>()
  const { fields } = useFieldArray({ control, name: 'groups' })

  const watchedGroups = watch('groups')

  // Recipients persist only `employee` (department/branch/block/position arrive null, and the
  // *_name fields are not hydrated from the config). The org column resolves the full chain from
  // the employee dropdown, so fetch EXACTLY the recipient employees by id__in — a flat
  // page_size:1000 silently dropped high IDs that fall outside the first page. Sorted+deduped so
  // the JSON-stringified query key stays stable across re-renders (no refetch churn while editing).
  const recipientEmployeeIds = useMemo(() => {
    const ids = new Set<number>()
    ;(watchedGroups ?? []).forEach((g) =>
      (g.recipients ?? []).forEach((r) => {
        if (r.employee != null) ids.add(r.employee)
      })
    )
    return Array.from(ids).sort((a, b) => a - b)
  }, [watchedGroups])

  const { data: deptData } = useDepartmentsDropdown({ page_size: 1000 })
  const { data: posData } = usePositionsDropdown({ page_size: 1000 })
  const { data: branchData } = useBranchesDropdown({ page_size: 1000 })
  const { data: blockData } = useBlocksDropdown({ page_size: 1000 })
  const { data: empData } = useEmployeesDropdown(
    { id__in: recipientEmployeeIds, page_size: recipientEmployeeIds.length || 1 },
    { enabled: recipientEmployeeIds.length > 0 }
  )

  // Build id → {name, parent chain} maps from the dropdowns. EmployeeDropdown nests
  // branch+block+department+position, DepartmentDropdown nests branch+block, BlockDropdown
  // nests its branch — enough to render the full hierarchy from the smallest persisted
  // scope without any per-row detail fetch.
  const orgMaps = useMemo<OrgMaps>(() => {
    const departments = new Map<number, DepartmentInfo>()
    deptData?.results?.forEach((d) =>
      departments.set(d.id, {
        name: d.name,
        branchId: d.branch?.id ?? null,
        branchName: d.branch?.name,
        blockId: d.block?.id ?? null,
        blockName: d.block?.name,
      })
    )

    const blocks = new Map<number, BlockInfo>()
    blockData?.results?.forEach((b) =>
      blocks.set(b.id, { name: b.name, branchId: b.branch ?? null })
    )

    const branches = new Map<number, string>()
    branchData?.results?.forEach((b) => branches.set(b.id, b.name))

    const positions = new Map<number, string>()
    posData?.results?.forEach((p) => positions.set(p.id, p.name))

    const employees = new Map<number, EmployeeInfo>()
    empData?.results?.forEach((e) =>
      employees.set(e.id, {
        name: e.fullname,
        branchId: e.branch?.id ?? null,
        branchName: e.branch?.name,
        blockId: e.block?.id ?? null,
        blockName: e.block?.name,
        departmentId: e.department?.id ?? null,
        departmentName: e.department?.name,
        positionId: e.position?.id ?? null,
        positionName: e.position?.name,
      })
    )

    return { departments, blocks, branches, positions, employees }
  }, [deptData, blockData, branchData, posData, empData])

  // "Diễn giải" labels (pct_relationship → "Đầu mối quan hệ", …) come from the server-side
  // SECTION_PCT_TYPE_LABELS map (object keyed by pct_type), not a hardcoded VN map.
  const { keysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.SECTION_PCT_TYPE_LABELS],
  })
  const pctTypeLabels = useMemo<Record<string, string>>(() => {
    const map = keysMap.get(
      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.SECTION_PCT_TYPE_LABELS
    )
    return map && typeof map === 'object' ? (map as Record<string, string>) : {}
  }, [keysMap])

  const watchedForm = watch()

  const totalBodyRows = useMemo(
    () =>
      (watchedGroups ?? []).reduce((acc, g) => acc + Math.max(1, (g.recipients ?? []).length), 0),
    [watchedGroups]
  )

  const totalActual = useMemo(() => {
    return (watchedGroups ?? [])
      .reduce((acc, group) => {
        const approvedRevenue = watchedForm[group.pct_type]
        const groupTotal = (group.recipients ?? []).reduce(
          (sum, r) => sum + (Number(calculateActual(approvedRevenue, r.contribution_level)) || 0),
          0
        )
        return acc + groupTotal
      }, 0)
      .toFixed(2)
  }, [watchedGroups, watchedForm])

  return (
    <div className="border-border-1 relative w-full overflow-hidden border shadow-sm">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle outline-none">
          <Table.Root className="w-full min-w-[940px] border-collapse bg-white outline-none">
            <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
              <Table.Row>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-semibold text-content-dark-1 border-r px-3 py-3 text-center align-middle font-semibold"
                  style={{ width: '128px', minWidth: '128px' }}
                >
                  <div className="flex h-full min-h-[40px] items-center justify-center text-center">
                    {PROMOTION_REVENUE_COLUMN_LABEL}
                  </div>
                </Table.ColumnHeaderCell>
                {isEditing && (
                  <Table.ColumnHeaderCell
                    className="typo-body-base-semibold border-border-1 border-r px-3 py-3 text-center align-middle"
                    style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
                  >
                    <span className="sr-only">Thêm</span>
                  </Table.ColumnHeaderCell>
                )}
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-semibold text-content-dark-1 border-r px-4 py-3 text-center align-middle font-semibold"
                  style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                >
                  <div className="flex h-full min-h-[40px] items-center justify-center text-center">
                    Diễn giải
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-semibold text-content-dark-1 border-r px-3 py-3 text-center align-middle font-semibold"
                  style={{ width: '116px' }}
                >
                  <div className="flex h-full min-h-[40px] items-center justify-center text-center">
                    Tỷ lệ In-house (%)
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-semibold text-content-dark-1 border-r px-3 py-3 text-center align-middle font-semibold"
                  style={{ width: '116px' }}
                >
                  <div className="flex h-full min-h-[40px] items-center justify-center text-center">
                    Mức độ đóng góp (%)
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-semibold text-content-dark-1 border-r px-3 py-3 text-center align-middle font-semibold"
                  style={{ width: '116px' }}
                >
                  <div className="flex h-full min-h-[40px] items-center justify-center text-center">
                    Tỷ lệ thực tế (%)
                  </div>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-semibold text-content-dark-1 border-r px-4 py-3 text-center align-middle font-semibold"
                  style={{ minWidth: '220px' }}
                >
                  <div className="flex h-full min-h-[40px] items-center justify-center text-center">
                    Bộ phận / Phòng ban
                  </div>
                </Table.ColumnHeaderCell>
                {isEditing && (
                  <Table.ColumnHeaderCell
                    style={{ width: '52px', minWidth: '52px', maxWidth: '52px' }}
                    className="typo-body-base-medium border-border-1 border-r px-2 py-3 align-middle"
                  >
                    <span className="sr-only">Hành động</span>
                  </Table.ColumnHeaderCell>
                )}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {fields.map((field, index) => (
                <ConfigRowGroup
                  key={field.id}
                  mechIndex={index}
                  isFirstGroup={index === 0}
                  totalBodyRows={totalBodyRows}
                  isEditing={isEditing}
                  pctTypeLabels={pctTypeLabels}
                  orgMaps={orgMaps}
                />
              ))}
            </Table.Body>

            <Table.Body>
              <Table.Row className="bg-[#F0F2F5]">
                {/* Label spans every column left of "Tỷ lệ thực tế"; trailing spans Bộ phận
                    (+ Hành động only when editing) — both shrink by one in view mode. */}
                <Table.Cell
                  colSpan={isEditing ? 5 : 4}
                  className="border-border-1 typo-body-base-semibold border-t border-r px-4 py-3 text-right align-middle text-[#4B4B4B]"
                >
                  Tổng cộng
                </Table.Cell>
                <Table.Cell className="border-border-1 typo-body-base-semibold text-primary-default border-t border-r px-3 py-3 text-right align-middle">
                  {formatNumber(totalActual, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </Table.Cell>
                <Table.Cell
                  colSpan={isEditing ? 2 : 1}
                  className="border-border-1 border-t px-3 py-3 align-middle"
                />
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    </div>
  )
}

export default PromotionCommissionConfigTable
