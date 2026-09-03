import { useCallback, useMemo, useRef, useState } from 'react'
import type { Table as TanStackTable } from '@tanstack/react-table'
import { Flex } from '@radix-ui/themes'
import { Button, Table, TextArea, type ColumnDef } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { useAllEmployees, type Employee } from '@/features/employee/services/employee-service'
import DestinationDialogContent, {
  type DestinationDialogContentRef,
} from './DestinationDialogContent.tsx'
import ResultCardView from './ResultCardView.tsx'
import {
  assignEmployeesToCards,
  filterAvailableEmployees,
  removeLineFromCards,
  updateLinePosition,
  type LineConflict,
  type ResultCard,
} from './wizard-logic'
import { EmployeeStatus } from '@/constants/api-schema-aliases'

const NON_RESIGNED_STATUSES = [
  EmployeeStatus.Active,
  EmployeeStatus.Onboarding,
  EmployeeStatus.Maternity_Leave,
  EmployeeStatus.Unpaid_Leave,
]

type AssignStepProps = {
  sourceDepartmentId: number
  cards: ResultCard[]
  onCardsChange: (cards: ResultCard[]) => void
  note: string
  onNoteChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
  canSubmit: boolean
  isSubmitting: boolean
  lineConflicts: Record<number, LineConflict>
  onClearLineConflict: (employeeId: number) => void
}

const employeeColumns: ColumnDef<Employee>[] = [
  { accessorKey: 'code', header: 'Mã NV', meta: { width: 'w-32' } },
  { accessorKey: 'fullname', header: 'Tên nhân viên', meta: { width: 'w-72' } },
  {
    accessorFn: (row) => row.position?.name,
    id: 'position',
    header: 'Chức vụ',
    meta: { width: 'w-48' },
  },
]

const AssignStep = ({
  sourceDepartmentId,
  cards,
  onCardsChange,
  note,
  onNoteChange,
  onCancel,
  onSubmit,
  canSubmit,
  isSubmitting,
  lineConflicts,
  onClearLineConflict,
}: AssignStepProps) => {
  const { displayCustom, displayClose } = useDialog()
  const dialogContentRef = useRef<DestinationDialogContentRef>(null)
  const employeeTableRef = useRef<TanStackTable<Employee> | null>(null)
  const [selectedRows, setSelectedRows] = useState<Employee[]>([])

  const { data: employeesData, isLoading } = useAllEmployees({
    department: sourceDepartmentId,
    statuses: NON_RESIGNED_STATUSES,
  })
  const allEmployees = useMemo(() => employeesData ?? [], [employeesData])
  const availableEmployees = useMemo(
    () => filterAvailableEmployees(allEmployees, cards),
    [allEmployees, cards]
  )

  const openDestinationDialog = useCallback(
    (employeesToAssign: Employee[]) => {
      if (employeesToAssign.length === 0) return

      const handleConfirm = async () => {
        if (dialogContentRef.current) {
          await dialogContentRef.current.submit()
        }
      }

      displayCustom({
        size: 'lg',
        title: 'Chọn phòng ban đích',
        scrollable: true,
        confirmText: 'Xác nhận',
        cancelText: 'Hủy',
        onConfirm: handleConfirm,
        onCancel: displayClose,
        content: (
          <DestinationDialogContent
            ref={dialogContentRef}
            employees={employeesToAssign}
            onConfirm={(destination, confirmedEmployees) => {
              onCardsChange(assignEmployeesToCards(cards, destination, confirmedEmployees))
              setSelectedRows([])
              // The assigned employees disappear from `availableEmployees` (filtered out by
              // `filterAvailableEmployees`), but the Table's internal row-selection state keeps
              // their stale ids — TanStack's default getIsSomeRowsSelected() just checks whether
              // that state object is non-empty, not whether the ids still match current rows, so
              // the header checkbox would keep showing indeterminate. Reset it explicitly.
              employeeTableRef.current?.resetRowSelection()
              displayClose()
            }}
          />
        ),
      })
    },
    [cards, onCardsChange, displayCustom, displayClose]
  )

  const handleRemoveLine = useCallback(
    (departmentId: number, employeeId: number) => {
      onCardsChange(removeLineFromCards(cards, departmentId, employeeId))
      onClearLineConflict(employeeId)
    },
    [cards, onCardsChange, onClearLineConflict]
  )

  const handlePositionChange = useCallback(
    (departmentId: number, employeeId: number, positionId: number) => {
      onCardsChange(updateLinePosition(cards, departmentId, employeeId, positionId))
    },
    [cards, onCardsChange]
  )

  return (
    <div className="flex w-full flex-col gap-6">
      <Flex gap="3" justify="end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => openDestinationDialog(availableEmployees)}
          disabled={availableEmployees.length === 0 || isSubmitting}
        >
          Điều chuyển toàn bộ nhân viên
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => openDestinationDialog(selectedRows)}
          disabled={selectedRows.length === 0 || isSubmitting}
        >
          Chọn PB điều chuyển đến ({selectedRows.length})
        </Button>
      </Flex>

      <Table
        data={availableEmployees}
        columns={employeeColumns}
        isLoading={isLoading}
        enableRowSelection
        selectMode="multiple"
        getRowId={(row) => String(row.id)}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onTableInstance={(table) => {
          employeeTableRef.current = table
        }}
        showSTT
        emptyMessage="Không còn nhân viên nào trong phòng ban nguồn"
        paginationPosition="inline"
        className="px-0"
      />

      {cards.map((card) => (
        <ResultCardView
          key={card.destination.departmentId}
          card={card}
          onRemoveLine={(employeeId) => handleRemoveLine(card.destination.departmentId, employeeId)}
          onPositionChange={(employeeId, positionId) =>
            handlePositionChange(card.destination.departmentId, employeeId, positionId)
          }
          disabled={isSubmitting}
          lineConflicts={lineConflicts}
        />
      ))}

      <TextArea
        label="Ghi chú"
        placeholder="Nhập ghi chú cho nhân viên xác nhận đề xuất"
        value={note}
        onChange={onNoteChange}
        rows={4}
        disabled={isSubmitting}
      />

      <Flex gap="4" justify="end">
        <Button type="button" variant="text" onClick={onCancel} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
        >
          Gửi duyệt
        </Button>
      </Flex>
    </div>
  )
}

export default AssignStep
