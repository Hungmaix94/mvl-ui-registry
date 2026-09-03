import { useCallback, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Text } from '@radix-ui/themes'
import { Button, PageTitle, Table } from '@/components/ui'
import Chip from '@/components/ui/chip/Chip'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { formatCurrencyVND } from '@/utils/common'
import { QUERY_KEYS } from '@/constants'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  useImportedBonusBatch,
  useConfirmImportedBonusBatch,
  useVoidImportedBonusBatch,
  useDeleteImportedBonusEntry,
} from '@/features/accounting/imported-bonuses/services/imported-bonus-service'
import { useEmployeesByIds } from '@/features/employee/services/employee-service'
import { ColoredValueVariant } from '@/api/schema'
import { type ColumnDef } from '@tanstack/react-table'
import { type TableAction } from '@/types/table'
import { IconPlus, IconPencil, IconTrash } from '@/assets/icons'
import ImportedBonusEntryDialog from '@/features/accounting/imported-bonuses/components/ImportedBonusEntryDialog'
import { withRememberedSearch } from '@/utils/list-url-memory'
import { useAbility } from '@/lib/ability'

const statusVariants: Record<string, ColoredValueVariant> = {
  DRAFT: ColoredValueVariant.GREY,
  CONFIRMED: ColoredValueVariant.GREEN,
  VOIDED: ColoredValueVariant.RED,
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  CONFIRMED: 'Đã xác nhận',
  VOIDED: 'Đã hủy',
}

const bonusTypeLabels: Record<string, string> = {
  AD_SUPPORT: 'Hỗ trợ quảng cáo',
  RECOGNITION: 'Vinh danh',
  TET: 'Thưởng lễ tết',
  OTHER: 'Thưởng khác',
}

export default function ImportedBonusBatchDetailPage() {
  const ability = useAbility()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: record, isLoading, error } = useImportedBonusBatch(id, { enabled: !!id })
  const { mutateAsync: confirmBatch, isPending: isConfirming } = useConfirmImportedBonusBatch()
  const { mutateAsync: voidBatch, isPending: isVoiding } = useVoidImportedBonusBatch()

  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<any>(undefined)

  const { mutateAsync: deleteEntry } = useDeleteImportedBonusEntry()

  const handleAddEntry = useCallback(() => {
    setSelectedEntry(undefined)
    setEntryDialogOpen(true)
  }, [])

  const handleEditEntry = useCallback((entry: any) => {
    setSelectedEntry(entry)
    setEntryDialogOpen(true)
  }, [])

  const handleDeleteEntry = useCallback(
    async (entry: any) => {
      const ok = window.confirm(
        `Bạn có chắc chắn muốn xóa dòng thưởng của nhân viên ${entry.employee_name}?`
      )
      if (!ok) return
      try {
        await deleteEntry(entry.id)
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.DETAIL(id),
        })
        toastService.success('Đã xóa dòng thưởng thành công')
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [deleteEntry, id, queryClient]
  )

  const handleCrudSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.DETAIL(id),
    })
  }, [id, queryClient])

  // Hai mục thao tác trên DÒNG thưởng (`imported_bonus_entry`), không phải trên ĐỢT
  // (`imported_bonus_batch`) — hai resource riêng ở BE, đừng gộp về mã của đợt.
  //   Sửa → dialog gọi `PATCH /api/accounting/imported-bonus-entries/{id}/`
  //   Xóa → `DELETE /api/accounting/imported-bonus-entries/{id}/`
  const actions = useMemo<TableAction<any>[]>(
    () => [
      {
        label: 'Sửa',
        icon: <IconPencil size={16} />,
        show: () => ability.can('partial_update', 'imported_bonus_entry'),
        onClick: handleEditEntry,
      },
      {
        label: 'Xóa',
        icon: <IconTrash size={16} />,
        variant: 'danger',
        show: () => ability.can('destroy', 'imported_bonus_entry'),
        onClick: handleDeleteEntry,
      },
    ],
    [ability, handleEditEntry, handleDeleteEntry]
  )

  // Collect all employee IDs to fetch details
  const employeeIds = useMemo(() => {
    if (!record?.entries) return []
    return Array.from(new Set(record.entries.map((e: any) => e.employee)))
  }, [record?.entries])

  const { data: employeesResponse } = useEmployeesByIds(employeeIds, {
    enabled: employeeIds.length > 0,
  })

  const employeesMap = useMemo(() => {
    const map = new Map<number, any>()
    employeesResponse?.results?.forEach((emp: any) => {
      map.set(emp.id, emp)
    })
    return map
  }, [employeesResponse?.results])

  const handleConfirm = useCallback(async () => {
    try {
      await confirmBatch(id)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.DETAIL(id),
      })
      toastService.success('Đã xác nhận đợt thưởng thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [confirmBatch, id, queryClient])

  const handleVoid = useCallback(async () => {
    try {
      if (!record) return
      await voidBatch({
        id,
        data: {
          year: record.year,
          month: record.month,
          note: 'Hủy đợt thưởng imported',
        },
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.DETAIL(id),
      })
      toastService.success('Đã hủy đợt thưởng thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [voidBatch, id, record, queryClient])

  const mappedEntries = useMemo(() => {
    if (!record?.entries) return []
    return record.entries.map((entry: any) => {
      const empInfo = employeesMap.get(entry.employee)
      return {
        ...entry,
        employee_name: empInfo?.fullname || `Nhân viên #${entry.employee}`,
        employee_code: empInfo?.code || '—',
        tax_code: empInfo?.tax_code || empInfo?.id_number || '—',
      }
    })
  }, [record?.entries, employeesMap])

  const totalAmount = useMemo(() => {
    return mappedEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  }, [mappedEntries])

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'employee_code',
        header: 'Mã nhân viên',
        meta: { width: 'w-[120px]' },
      },
      {
        accessorKey: 'employee_name',
        header: 'Họ tên',
      },
      {
        accessorKey: 'tax_code',
        header: 'MST / CMND',
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'bonus_type',
        header: 'Loại thưởng',
        cell: ({ row }) => bonusTypeLabels[row.original.bonus_type] || row.original.bonus_type,
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'amount',
        header: 'Số tiền',
        cell: ({ row }) =>
          row.original.amount ? formatCurrencyVND(Number(row.original.amount)) : '—',
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'pit_withheld_at_payment',
        header: 'Thuế đã khấu',
        cell: ({ row }) =>
          row.original.pit_withheld_at_payment
            ? formatCurrencyVND(Number(row.original.pit_withheld_at_payment))
            : '0 đ',
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
      },
      {
        id: 'already_paid_externally',
        header: 'Đã thanh toán bên ngoài',
        cell: ({ row }) =>
          row.original.already_paid_externally ? (
            <Chip variant={ColoredValueVariant.GREEN} label="Có" size="small" />
          ) : (
            <Chip variant={ColoredValueVariant.GREY} label="Không" size="small" />
          ),
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'is_taxable',
        header: 'Tính thuế TNCN',
        cell: ({ row }) =>
          row.original.is_taxable ? (
            <Chip variant={ColoredValueVariant.GREEN} label="Có" size="small" />
          ) : (
            <Chip variant={ColoredValueVariant.GREY} label="Không" size="small" />
          ),
        meta: { width: 'w-[120px]' },
      },
    ],
    []
  )

  const isDraft = record?.status === 'DRAFT'

  return (
    <>
      <PageTitle
        title={`Đợt thưởng imported · ${record?.code ?? ''}`}
        enableBackButton
        handleBackButton={() => navigate(withRememberedSearch(APP_PATH.IMPORTED_BONUS_BATCH))}
        customActions={
          isDraft ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleVoid}
                disabled={isVoiding || isConfirming}
                loading={isVoiding}
              >
                Hủy đợt
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isVoiding || isConfirming}
                loading={isConfirming}
              >
                Xác nhận đợt
              </Button>
            </div>
          ) : undefined
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'imported_bonus_batch')}
      >
        {record && (
          <div className="flex flex-col gap-6 px-7 py-6">
            <div className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4 gap-y-4 lg:grid-cols-5">
                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Mã đợt
                  </Text>
                  <Text size="2" weight="medium">
                    {record.code}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Kỳ tháng
                  </Text>
                  <Text size="2" weight="medium">
                    {String(record.month).padStart(2, '0')}/{record.year}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Trạng thái
                  </Text>
                  <div>
                    <Chip
                      label={statusLabels[record.status] || record.status}
                      variant={statusVariants[record.status] || ColoredValueVariant.GREY}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Tổng tiền đợt
                  </Text>
                  <Text size="2" weight="bold" className="text-brand-primary-default">
                    {formatCurrencyVND(totalAmount)}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Ghi chú
                  </Text>
                  <Text size="2" className="text-neutral-600 italic">
                    {record.note || '—'}
                  </Text>
                </div>
              </div>
            </div>

            <div className="border-border-1 flex flex-col gap-4 rounded-lg border bg-white p-5">
              <div className="border-border-1 mb-2 flex items-center justify-between border-b pb-3">
                <h3 className="text-[14px] font-bold text-neutral-800">
                  Danh sách chi tiết thưởng
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-neutral-500">
                    Tổng số: {mappedEntries.length} nhân sự
                  </span>
                  {isDraft && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={handleAddEntry}
                      leftIcon={<IconPlus size={16} />}
                    >
                      Thêm dòng thưởng
                    </Button>
                  )}
                </div>
              </div>
              <Table
                data={mappedEntries}
                columns={columns}
                className="px-0"
                isLoading={isLoading}
                enablePagination={false}
                showActions={isDraft}
                rowActions={actions}
              />
            </div>
          </div>
        )}
      </DetailPageWrapper>

      {entryDialogOpen && (
        <ImportedBonusEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          batchId={id}
          entry={selectedEntry}
          onSuccess={handleCrudSuccess}
        />
      )}
    </>
  )
}
