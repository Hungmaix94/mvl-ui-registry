import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization'

// ─── Helper ───────────────────────────────────────────────────────────────────

const calculateActual = (
  approved: number | string | null | undefined,
  contribution: number | string | null | undefined
) => {
  if (approved === '' || contribution === '' || approved == null || contribution == null) return ''
  const a = Number(approved) || 0
  const c = Number(contribution) || 0
  if (a === 0 || c === 0) return ''
  return ((a * c) / 100).toFixed(2)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContributorDialogValues = {
  branch_id?: number | null
  branch_name?: string
  block_id?: number | null
  block_name?: string
  department_id: number | null
  department_name: string
  position_id: number | null
  position_name: string
  employee_id?: number | null
  employee_name?: string
  contribution_level: string
  actual_rate: string
  inhouse_rate: string
}

export type AddContributorDialogProps = {
  open: boolean
  title?: string
  initialValues?: Partial<ContributorDialogValues>
  /** Tỷ lệ In-house (%) — context inherited from the mechanism row */
  approvedRevenue?: number | null
  /** When true, Chi nhánh + Khối + Phòng ban are all required before confirming. */
  requireOrgPath?: boolean
  /** When true, the Nhân viên field is shown in the cascade and required before confirming. */
  requireEmployee?: boolean
  /** When true, the Nhân viên field is shown but optional. Defaults to `requireEmployee`. */
  showEmployee?: boolean
  /** When true, at least one of Chi nhánh / Khối / Phòng ban must be selected before confirming. */
  requireAnyOrgUnit?: boolean
  onClose: () => void
  onConfirm: (values: ContributorDialogValues) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const AddContributorDialog = ({
  open,
  title = 'Thêm bộ phận đóng góp',
  initialValues,
  approvedRevenue,
  requireOrgPath = false,
  requireEmployee = false,
  showEmployee,
  requireAnyOrgUnit = false,
  onClose,
  onConfirm,
}: AddContributorDialogProps) => {
  const [orgData, setOrgData] = useState<Partial<CascadeSelectFormData>>({
    branch_id: initialValues?.branch_id ?? 0,
    branch_name: initialValues?.branch_name ?? '',
    block_id: initialValues?.block_id ?? 0,
    block_name: initialValues?.block_name ?? '',
    department_id: initialValues?.department_id ?? 0,
    department_name: initialValues?.department_name ?? '',
    position_id: initialValues?.position_id ?? 0,
    position_name: initialValues?.position_name ?? '',
    employee_id: initialValues?.employee_id ?? 0,
    employee_name: initialValues?.employee_name ?? '',
  })
  const [inHouseRate, setInHouseRate] = useState<string>(
    approvedRevenue ? String(approvedRevenue) : ''
  )
  const [contributionLevel, setContributionLevel] = useState<string>(
    initialValues?.contribution_level ? String(initialValues.contribution_level) : ''
  )
  const [actualRate, setActualRate] = useState<string>(
    initialValues?.actual_rate
      ? String(initialValues.actual_rate)
      : calculateActual(approvedRevenue, initialValues?.contribution_level)
  )

  // Reset state when dialog re-opens with different initialValues
  useEffect(() => {
    if (open) {
      setOrgData({
        branch_id: initialValues?.branch_id ?? 0,
        branch_name: initialValues?.branch_name ?? '',
        block_id: initialValues?.block_id ?? 0,
        block_name: initialValues?.block_name ?? '',
        department_id: initialValues?.department_id ?? 0,
        department_name: initialValues?.department_name ?? '',
        position_id: initialValues?.position_id ?? 0,
        position_name: initialValues?.position_name ?? '',
        employee_id: initialValues?.employee_id ?? 0,
        employee_name: initialValues?.employee_name ?? '',
      })

      const initC = initialValues?.contribution_level
        ? String(initialValues.contribution_level)
        : ''
      const initA = initialValues?.actual_rate
        ? String(initialValues.actual_rate)
        : calculateActual(approvedRevenue, initC)
      setInHouseRate(approvedRevenue ? String(approvedRevenue) : '')
      setContributionLevel(initC)
      setActualRate(initA)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues, approvedRevenue])

  const handleInHouseChange = (val: string) => {
    let boundedVal = val
    if (val !== '') {
      const numVal = Number(val)
      if (numVal > 100) boundedVal = '100'
      if (numVal < 0) boundedVal = '0'
    }
    setInHouseRate(boundedVal)
    setActualRate(calculateActual(boundedVal, contributionLevel))
  }

  const handleContributionChange = (val: string) => {
    let boundedVal = val
    if (val !== '') {
      const numVal = Number(val)
      if (numVal > 100) boundedVal = '100'
      if (numVal < 0) boundedVal = '0'
    }
    setContributionLevel(boundedVal)
    setActualRate(calculateActual(inHouseRate, boundedVal))
  }

  const handleConfirm = () => {
    onConfirm({
      branch_id: orgData.branch_id || null,
      branch_name: orgData.branch_name || '',
      block_id: orgData.block_id || null,
      block_name: orgData.block_name || '',
      department_id: orgData.department_id || null,
      department_name: orgData.department_name || '',
      position_id: orgData.position_id || null,
      position_name: orgData.position_name || '',
      employee_id: orgData.employee_id || null,
      employee_name: orgData.employee_name || '',
      contribution_level: contributionLevel || '',
      actual_rate: actualRate || '',
      inhouse_rate: inHouseRate || '',
    })
  }

  const handleClose = () => {
    setOrgData({
      branch_id: 0,
      branch_name: '',
      block_id: 0,
      block_name: '',
      department_id: 0,
      department_name: '',
      position_id: 0,
      position_name: '',
      employee_id: 0,
      employee_name: '',
    })
    setContributionLevel('')
    onClose()
  }

  const hasActual = Number(actualRate) > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="w-full max-w-[580px] overflow-hidden !p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* ── Header ── */}
        <div className="border-border-1 mb-2 border-b px-6 py-4">
          <DialogTitle className="typo-heading-sm text-neutral-90 font-semibold">
            {title}
          </DialogTitle>
        </div>

        {/* ── Body ── */}
        <div className="space-y-6 px-6 py-6">
          {/* Section 1 — Nhân sự */}
          <div className="grid gap-4">
            {open && (
              <CascadeSelectGroupOrganization
                key={`cascade-${initialValues?.department_id ?? 'no-dept'}-${initialValues?.position_id ?? 'no-pos'}-${initialValues?.employee_id ?? 'no-emp'}`}
                layout="grid"
                className="gap-5"
                showEmployee={showEmployee ?? requireEmployee}
                showPosition={true}
                skipValidation={true}
                branchRequired={requireOrgPath}
                blockRequired={requireOrgPath}
                departmentRequired={requireOrgPath}
                employeeRequired={requireEmployee}
                initialValues={
                  initialValues?.branch_id ||
                  initialValues?.block_id ||
                  initialValues?.department_id ||
                  initialValues?.position_id ||
                  initialValues?.employee_id
                    ? {
                        branch: initialValues.branch_id
                          ? String(initialValues.branch_id)
                          : undefined,
                        block: initialValues.block_id ? String(initialValues.block_id) : undefined,
                        department: initialValues.department_id
                          ? String(initialValues.department_id)
                          : undefined,
                        position: initialValues.position_id
                          ? String(initialValues.position_id)
                          : undefined,
                        employee: initialValues.employee_id
                          ? String(initialValues.employee_id)
                          : undefined,
                      }
                    : undefined
                }
                employeeLabel={'Nhân viên'}
                onFormChange={(data) => {
                  setOrgData(data)
                }}
              />
            )}
          </div>

          {/* Section 2 — Tỷ lệ hoa hồng */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {/* Tỷ lệ In-house — editable */}
              <div className="flex flex-col gap-1">
                <label className="typo-body-base-semibold text-neutral-90 flex items-center gap-0.5">
                  Tỷ lệ In-house (%) <span className="text-action-primary-red-default">*</span>
                </label>
                <div className="bg-data-light-grey-default border-neutral-60 flex h-10 items-center overflow-hidden rounded border transition-all focus-within:!border-neutral-100">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={inHouseRate}
                    onChange={(e) => handleInHouseChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e') e.preventDefault()
                    }}
                    placeholder="VD: 50.00"
                    className="placeholder:text-neutral-80 text-neutral-90 h-full flex-1 bg-transparent pr-1 pl-3 text-right text-sm outline-none"
                  />
                  <div className="text-neutral-80 shrink-0 pr-3">%</div>
                </div>
              </div>

              {/* Mức độ đóng góp — editable */}
              <div className="flex flex-col gap-1">
                <label className="typo-body-base-semibold text-neutral-90 flex items-center gap-0.5">
                  Mức độ đóng góp (%) <span className="text-action-primary-red-default">*</span>
                </label>
                <div className="bg-data-light-grey-default border-neutral-60 flex h-10 items-center overflow-hidden rounded border transition-all focus-within:!border-neutral-100">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={contributionLevel}
                    onChange={(e) => handleContributionChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e') e.preventDefault()
                    }}
                    placeholder="VD: 100.00"
                    className="placeholder:text-neutral-80 text-neutral-90 h-full flex-1 bg-transparent pr-1 pl-3 text-right text-sm outline-none"
                  />
                  <div className="text-neutral-80 shrink-0 pr-3">%</div>
                </div>
              </div>

              {/* Tỷ lệ thực tế — disabled */}
              <div className="flex flex-col gap-1">
                <label className="typo-body-base-semibold text-neutral-90 flex items-center gap-0.5">
                  Tỷ lệ thực tế (%)
                </label>
                <div className="bg-neutral-10 border-neutral-60 flex h-10 cursor-not-allowed items-center overflow-hidden rounded border">
                  <input
                    type="number"
                    value={actualRate}
                    disabled
                    readOnly
                    placeholder="0.00"
                    className="placeholder:text-neutral-80 text-content-dark-3 h-full flex-1 cursor-not-allowed bg-transparent pr-1 pl-3 text-right text-sm outline-none"
                  />
                  <div className="text-neutral-80 shrink-0 pr-3">%</div>
                </div>
              </div>
            </div>

            {/* Live formula hint */}
            {hasActual && (
              <p className="typo-body-xs-regular text-neutral-80 mt-2 text-right">
                = {inHouseRate}% In-house × {contributionLevel}% ÷ 100
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-border-1 flex items-center justify-end gap-3 border-t px-6 py-3">
          <Button
            type="button"
            variant="secondary-border"
            onClick={handleClose}
            className="min-w-24"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={
              (requireOrgPath &&
                (!orgData.branch_id || !orgData.block_id || !orgData.department_id)) ||
              (requireEmployee && !orgData.employee_id) ||
              (requireAnyOrgUnit &&
                !orgData.branch_id &&
                !orgData.block_id &&
                !orgData.department_id) ||
              (!requireOrgPath &&
                !requireEmployee &&
                !requireAnyOrgUnit &&
                !orgData.branch_id &&
                !orgData.department_id &&
                !orgData.position_id)
            }
            onClick={handleConfirm}
            className="min-w-24"
          >
            Xác nhận
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddContributorDialog
