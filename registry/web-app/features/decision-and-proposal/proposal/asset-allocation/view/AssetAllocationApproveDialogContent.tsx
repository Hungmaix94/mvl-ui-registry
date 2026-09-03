import { useCallback, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Button, Select, TextArea, TextField } from '@/components/ui'
import { IconPlus, IconTrash } from '@/assets/icons'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ProposalAssetUnit_type, type components } from '@/api/schema.ts'
import type { ProposalAssetAllocationApproveItemRequest } from '@/features/decision-and-proposal/services/proposal-misc-service'

type ProposalAsset = components['schemas']['ProposalAsset']

export type AssetAllocationApproveDialogContentRef = {
  getData: () => {
    approval_note: string | null
    assets: ProposalAssetAllocationApproveItemRequest[]
  } | null
}

type AssetAllocationApproveDialogContentProps = {
  assets: ProposalAsset[]
}

/**
 * One editable asset row in HR's approval payload.
 * - `id` present  -> update the existing asset
 * - `id` absent   -> HR-added asset (create)
 * A removed asset is dropped from `rows` entirely so it is left out of the payload,
 * which the backend flags as `removed_on_approval`.
 */
type AssetRow = {
  rowKey: string
  id?: number
  name: string
  unitType: ProposalAssetUnit_type | null
  quantity: string
  note: string
  // Employee-proposed snapshot (read-only reference); null for HR-added rows.
  proposalName: string | null
  proposalUnitType: ProposalAssetUnit_type | null
  proposalQuantity: number | null
  proposalNote: string | null
}

type AssetRowError = {
  name?: string
  quantity?: string
}

const buildInitialRows = (assets: ProposalAsset[]): AssetRow[] =>
  assets
    .filter((asset) => !asset.removed_on_approval)
    .map((asset) => ({
      rowKey: `asset-${asset.id}`,
      id: asset.id,
      name: asset.name ?? '',
      unitType: asset.unit_type ?? null,
      quantity: asset.quantity != null ? String(asset.quantity) : '',
      note: asset.note ?? '',
      proposalName: asset.proposal_name,
      proposalUnitType: asset.proposal_unit_type,
      proposalQuantity: asset.proposal_quantity,
      proposalNote: asset.proposal_note,
    }))

const AssetAllocationApproveDialogContent = forwardRef<
  AssetAllocationApproveDialogContentRef,
  AssetAllocationApproveDialogContentProps
>(({ assets }, ref) => {
  const { keysMap, keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES],
  })

  const unitTypeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES) ?? [],
    [keysMapOptions]
  )

  const unitTypeLabels = useMemo(
    () =>
      (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES) as
        | Record<string, string>
        | undefined) ?? {},
    [keysMap]
  )

  const [rows, setRows] = useState<AssetRow[]>(() => buildInitialRows(assets))
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, AssetRowError>>({})
  const newRowCounter = useRef(0)
  // Row container elements, keyed by rowKey — used to scroll the first invalid row into view.
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const updateRow = useCallback((rowKey: string, patch: Partial<Omit<AssetRow, 'rowKey'>>) => {
    setRows((prev) => prev.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row)))
  }, [])

  const handleAddRow = useCallback(() => {
    newRowCounter.current += 1
    setRows((prev) => [
      ...prev,
      {
        rowKey: `new-${newRowCounter.current}`,
        name: '',
        unitType: null,
        quantity: '',
        note: '',
        proposalName: null,
        proposalUnitType: null,
        proposalQuantity: null,
        proposalNote: null,
      },
    ])
  }, [])

  const handleRemoveRow = useCallback((rowKey: string) => {
    setRows((prev) => prev.filter((row) => row.rowKey !== rowKey))
    setErrors((prev) => {
      if (!prev[rowKey]) return prev
      const next = { ...prev }
      delete next[rowKey]
      return next
    })
  }, [])

  useImperativeHandle(ref, () => ({
    getData: () => {
      const nextErrors: Record<string, AssetRowError> = {}
      rows.forEach((row) => {
        const rowError: AssetRowError = {}
        if (!row.name.trim()) rowError.name = 'Vui lòng nhập tên tài sản'
        const quantityNumber = Number(row.quantity)
        if (!row.quantity.trim() || Number.isNaN(quantityNumber) || quantityNumber <= 0) {
          rowError.quantity = 'Số lượng phải lớn hơn 0'
        }
        if (Object.keys(rowError).length > 0) nextErrors[row.rowKey] = rowError
      })

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        // Auto-scroll to the first invalid row and focus its offending field so the user
        // isn't left staring at an unchanged dialog after a failed confirm.
        const firstErrored = rows.find((row) => nextErrors[row.rowKey])
        if (firstErrored) {
          const rowError = nextErrors[firstErrored.rowKey]
          const el = rowRefs.current[firstErrored.rowKey]
          requestAnimationFrame(() => {
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const selector = rowError?.name ? 'input[type="text"]' : 'input[type="number"]'
            el?.querySelector<HTMLInputElement>(selector)?.focus()
          })
        }
        return null
      }

      setErrors({})
      return {
        approval_note: note.trim() || null,
        assets: rows.map((row) => ({
          ...(row.id != null ? { id: row.id } : {}),
          name: row.name.trim(),
          unit_type: row.unitType ?? null,
          quantity: Number(row.quantity),
          note: row.note.trim() || null,
        })),
      }
    },
  }))

  return (
    <div className="flex w-full flex-col items-start gap-4 overflow-clip">
      {rows.map((row) => (
        <AssetApproveRow
          key={row.rowKey}
          row={row}
          error={errors[row.rowKey]}
          unitTypeOptions={unitTypeOptions}
          unitTypeLabels={unitTypeLabels}
          registerRef={(el) => {
            rowRefs.current[row.rowKey] = el
          }}
          onChange={(patch) => updateRow(row.rowKey, patch)}
          onRemove={() => handleRemoveRow(row.rowKey)}
        />
      ))}

      <Button variant="secondary" size="medium" leftIcon={<IconPlus />} onClick={handleAddRow}>
        Thêm tài sản
      </Button>

      <TextArea
        label="Ghi chú"
        placeholder="Nhập ghi chú"
        value={note}
        onChange={setNote}
        className="w-full"
        rows={4}
      />
    </div>
  )
})

AssetAllocationApproveDialogContent.displayName = 'AssetAllocationApproveDialogContent'

export default AssetAllocationApproveDialogContent

type ReadOnlyFieldProps = {
  label: string
  value: string
}

const ReadOnlyField = ({ label, value }: ReadOnlyFieldProps) => (
  <div className="flex flex-1 flex-col items-start gap-2">
    <Text className="typo-body-base-semibold text-content-dark-2">{label}</Text>
    <div className="bg-data-light-grey-disabled border-data-light-grey-disabled flex w-full items-center gap-3 rounded border px-3 py-2.5">
      <Text className="typo-body-base-regular text-content-light-4">{value || '-'}</Text>
    </div>
  </div>
)

type AssetApproveRowProps = {
  row: AssetRow
  error?: AssetRowError
  unitTypeOptions: { value: string | number; label: string }[]
  unitTypeLabels: Record<string, string>
  registerRef: (el: HTMLDivElement | null) => void
  onChange: (patch: Partial<Omit<AssetRow, 'rowKey'>>) => void
  onRemove: () => void
}

const AssetApproveRow = ({
  row,
  error,
  unitTypeOptions,
  unitTypeLabels,
  registerRef,
  onChange,
  onRemove,
}: AssetApproveRowProps) => {
  const isHrAdded = row.id == null

  return (
    <div
      ref={registerRef}
      className="border-border-2 flex w-full flex-col gap-4 rounded-lg border border-solid p-4"
    >
      <Flex align="center" justify="between" className="w-full">
        <p className="typo-body-base-semibold text-content-dark-1">
          {isHrAdded ? 'Tài sản HR thêm' : `Tên tài sản đề xuất: ${row.proposalName || '-'}`}
        </p>
        <Button
          variant="secondary"
          iconOnly
          size="medium"
          leftIcon={<IconTrash />}
          onClick={onRemove}
          className="bg-data-red-disabled text-data-red-default p-2"
          title="Xóa tài sản"
        />
      </Flex>

      {/* Employee-proposed reference (read-only) — only for existing assets */}
      {!isHrAdded && (
        <div className="flex w-full flex-col gap-2">
          <p className="typo-body-sm-semibold text-content-dark-3">Thông tin nhân sự đề xuất</p>
          <Flex gap="5" align="start" className="w-full">
            <ReadOnlyField
              label="Đơn vị tính đề xuất"
              value={
                row.proposalUnitType
                  ? unitTypeLabels[row.proposalUnitType] || row.proposalUnitType
                  : '-'
              }
            />
            <ReadOnlyField
              label="Số lượng đề xuất"
              value={row.proposalQuantity != null ? String(row.proposalQuantity) : '-'}
            />
            <ReadOnlyField label="Ghi chú đề xuất" value={row.proposalNote || '-'} />
          </Flex>
        </div>
      )}

      {/* HR-approved values (editable) */}
      <div className="flex w-full flex-col gap-2">
        <p className="typo-body-sm-semibold text-content-dark-3">Thông tin HR duyệt</p>
        <TextField
          label="Tên tài sản"
          placeholder="Nhập tên tài sản"
          required
          value={row.name}
          onChange={(value) => onChange({ name: value })}
          error={error?.name}
        />
        <Flex gap="5" align="start" className="w-full">
          <Select
            label="Đơn vị tính"
            placeholder="Chọn đơn vị tính"
            options={unitTypeOptions}
            value={row.unitType ?? null}
            onChange={(next) =>
              onChange({ unitType: (next as ProposalAssetUnit_type | null) ?? null })
            }
            clearable
            wrapperClassName="flex-1"
          />
          <TextField
            label="Số lượng"
            placeholder="Nhập số lượng"
            required
            type="number"
            value={row.quantity}
            onChange={(value) => onChange({ quantity: value })}
            error={error?.quantity}
            className="flex-1"
          />
        </Flex>
        <TextField
          label="Ghi chú"
          placeholder="Nhập ghi chú"
          value={row.note}
          onChange={(value) => onChange({ note: value })}
        />
      </div>
    </div>
  )
}
