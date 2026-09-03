import { useMemo, useCallback, useRef } from 'react'
import { Table, ColumnDef, type TableAction } from '@/components/ui'
import { useEmployee } from '@/features/employee/services/employee-service'
import {
  type EmployeeWorkHistory,
  useEmployeeWorkHistories,
  useDeleteEmployeeWorkHistory,
  usePartialUpdateEmployeeWorkHistory,
} from '@/features/employee/services/employee-work-history-service'
import { formatDate, formatDateToApi } from '@/utils/date-utils.ts'
import { useDialog } from '@/hooks/useDialog.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import type { MaternityLeaveFormData } from '@/features/employee/management/_shares/components/MaternityLeaveDialog.tsx'
import type { StartWorkingFormData } from '@/features/employee/management/_shares/components/StartWorkingDialog.tsx'
import type { ResignationFormData } from '@/features/employee/management/_shares/components/ResignationDialog.tsx'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { EmployeeWorkHistoryName } from '@/api/schema.ts'
import MaternityLeaveDialog, {
  type MaternityLeaveDialogRef,
} from '@/features/employee/management/_shares/components/MaternityLeaveDialog.tsx'
import StartWorkingDialog, {
  type StartWorkingDialogRef,
} from '@/features/employee/management/_shares/components/StartWorkingDialog.tsx'
import ResignationDialog, {
  type ResignationDialogRef,
} from '@/features/employee/management/_shares/components/ResignationDialog.tsx'
import { EmployeeStatus } from '@/constants/api-schema-aliases'

type HistoryTabProps = {
  employee?: { id: number }
}

const HistoryTab = ({ employee }: HistoryTabProps) => {
  const { displayCustom, displayConfirm, displayClose, setLoading } = useDialog()

  // Fetch employee data for dialogs
  const { data: employeeData } = useEmployee(employee?.id || 0)

  // Fetch work histories for the specific employee
  const { data: workHistoriesData, isLoading } = useEmployeeWorkHistories({
    employee: employee?.id,
  })

  // Work history mutations
  const deleteWorkHistoryMutation = useDeleteEmployeeWorkHistory()
  const updateWorkHistoryMutation = usePartialUpdateEmployeeWorkHistory()
  const invalidateQueries = useInvalidateQueries()

  const workHistories = useMemo(
    () => workHistoriesData?.results || [],
    [workHistoriesData?.results]
  )

  // Refs for different dialog types
  const maternityLeaveRef = useRef<MaternityLeaveDialogRef>(null)
  const startWorkingRef = useRef<StartWorkingDialogRef>(null)
  const resignationRef = useRef<ResignationDialogRef>(null)

  // Helper function to check if work history is editable
  const isWorkHistoryEditable = useCallback((record: EmployeeWorkHistory): boolean => {
    const status = record.status
    const eventName = record.name

    // Onboarding - not editable
    if (status === EmployeeStatus.Onboarding) {
      return false
    }

    // Unpaid Leave - not editable
    if (status === EmployeeStatus.Unpaid_Leave) {
      return false
    }

    // Maternity Leave with proposal - not editable
    if (status === EmployeeStatus.Maternity_Leave) {
      // Check if there's a proposal (check both proposal and proposal_id fields)
      const hasProposal = (record as any).proposal || (record as any).proposal_id
      if (hasProposal) {
        return false
      }
    }

    // Change Contract when Active - not editable
    if (status === EmployeeStatus.Active && eventName === EmployeeWorkHistoryName.Change_Contract) {
      return false
    }

    return true
  }, [])

  // Handle edit work history - render appropriate dialog based on status and name
  const handleEdit = useCallback(
    (record: EmployeeWorkHistory) => {
      if (!employeeData) return

      // Check if editable first
      if (!isWorkHistoryEditable(record)) {
        displayConfirm({
          title: 'Không thể chỉnh sửa',
          content: 'Hành động này không được phép chỉnh sửa.',
          confirmText: 'Đóng',
          onConfirm: displayClose,
        })
        return
      }

      const status = record.status
      const eventName = record.name
      let dialogContent: React.ReactNode
      let dialogRef: any
      let title = `Chỉnh sửa lịch sử ${record.name_display}`

      switch (status) {
        case EmployeeStatus.Resigned:
          // Resigned - use ResignationDialog
          dialogRef = resignationRef
          dialogContent = (
            <ResignationDialog
              ref={resignationRef}
              employee={employeeData}
              initialData={record}
              onSubmit={async (data: ResignationFormData) => {
                try {
                  setLoading(true)
                  await updateWorkHistoryMutation.mutateAsync({
                    id: record.id,
                    data: {
                      date: formatDateToApi(data.resignation_date),
                      note: data.description?.trim() || undefined,
                    },
                  })
                  await invalidateQueries.invalidateByPrefix('hrm/employee-work-histories')
                  await invalidateQueries.invalidateByPrefix('hrm/employees')
                  toastService.success('Cập nhật lịch sử công tác thành công')
                  displayClose()
                } catch (error: unknown) {
                  toastService.error(
                    extractErrorMessage(error, 'Có lỗi xảy ra khi xoá lịch sử công tác')
                  )
                  throw error
                } finally {
                  setLoading(false)
                }
              }}
            />
          )
          break

        case EmployeeStatus.Maternity_Leave:
          // Maternity Leave without proposal - use MaternityLeaveDialog
          dialogRef = maternityLeaveRef
          dialogContent = (
            <MaternityLeaveDialog
              ref={maternityLeaveRef}
              employee={employeeData}
              initialData={record}
              onSubmit={async (data: MaternityLeaveFormData) => {
                try {
                  setLoading(true)
                  await updateWorkHistoryMutation.mutateAsync({
                    id: record.id,
                    data: {
                      note: data.description?.trim() || undefined,
                    },
                  })
                  await invalidateQueries.invalidateByPrefix('hrm/employee-work-histories')
                  await invalidateQueries.invalidateByPrefix('hrm/employees')
                  toastService.success('Cập nhật lịch sử công tác thành công')
                  displayClose()
                } catch (error: unknown) {
                  toastService.error(
                    extractErrorMessage(error, 'Có lỗi xảy ra khi cập nhật lịch sử công tác')
                  )
                  throw error
                } finally {
                  setLoading(false)
                }
              }}
            />
          )
          break

        case EmployeeStatus.Active:
          // Active - check name to determine dialog
          switch (eventName) {
            case EmployeeWorkHistoryName.Change_Status:
              dialogRef = startWorkingRef
              dialogContent = (
                <StartWorkingDialog
                  ref={startWorkingRef}
                  employee={employeeData}
                  initialData={record}
                  onSubmit={async (data: StartWorkingFormData) => {
                    try {
                      setLoading(true)
                      await updateWorkHistoryMutation.mutateAsync({
                        id: record.id,
                        data: {
                          date: formatDateToApi(data.start_date),
                          branch_id: data.branch_id,
                          block_id: data.block_id,
                          department_id: data.department_id,
                          position_id: data.position_id,
                          note: data.description?.trim() || undefined,
                        },
                      })
                      await invalidateQueries.invalidateByPrefix('hrm/employee-work-histories')
                      await invalidateQueries.invalidateByPrefix('hrm/employees')
                      toastService.success('Cập nhật lịch sử công tác thành công')
                      displayClose()
                    } catch (error: unknown) {
                      toastService.error(
                        extractErrorMessage(error, 'Có lỗi xảy ra khi cập nhật lịch sử công tác')
                      )
                      throw error
                    } finally {
                      setLoading(false)
                    }
                  }}
                />
              )
              break

            default:
              return
          }
          break

        default:
          return
      }

      displayCustom({
        size: 'md',
        title,
        scrollable: true,
        content: dialogContent,
        hideFooter: false,
        confirmText: 'Lưu',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          if (dialogRef.current) {
            await dialogRef.current.submit()
          }
        },
        onCancel: displayClose,
        footerFlexJustify: 'end',
        dialogContentClassName: 'p-0',
      })
    },
    [
      displayCustom,
      displayClose,
      displayConfirm,
      employeeData,
      isWorkHistoryEditable,
      updateWorkHistoryMutation,
      invalidateQueries,
      setLoading,
    ]
  )

  // Handle delete work history
  const handleDelete = useCallback(
    (record: EmployeeWorkHistory) => {
      const formattedDate = record.date ? format(new Date(record.date), DATE_FORMAT) : ''
      displayConfirm({
        title: 'Xoá Lịch sử công tác',
        content: (
          <>
            Bạn có chắc chắn muốn xoá <b>{record.name_display}</b> ngày <b>{formattedDate}</b>{' '}
            không?
          </>
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteWorkHistoryMutation.mutateAsync(record.id)

            // Invalidate work histories queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm/employee-work-histories')
            // Also invalidate employee queries as work history affects employee data
            await invalidateQueries.invalidateByPrefix('hrm/employees')

            toastService.success('Xoá lịch sử công tác thành công')
            displayClose()
          } catch (error: unknown) {
            toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi xoá lịch sử công tác'))
          } finally {
            setLoading(false)
          }
        },
        onCancel: displayClose,
      })
    },
    [displayConfirm, displayClose, deleteWorkHistoryMutation, invalidateQueries, setLoading]
  )

  // Define table columns matching Figma design
  const columns: ColumnDef<EmployeeWorkHistory>[] = useMemo(
    () => [
      {
        accessorKey: 'date',
        id: 'date',
        header: 'Ngày',
        cell: ({ getValue }) => {
          const dateString = getValue() as string | null | undefined
          const formattedDate = formatDate(dateString)
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'name_display',
        id: 'name_display',
        header: 'Sự kiện',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'decision',
        id: 'decision',
        header: 'Quyết định',
        cell: ({ row }) => {
          const decision = row.original.decision
          if (!decision) {
            return (
              <span className="text-content-dark-1 text-sm" title="-">
                -
              </span>
            )
          }

          const displayText = decision.decision_number || '-'
          const fullText =
            decision.decision_number && decision.name
              ? `${decision.decision_number} - ${decision.name}`
              : displayText

          return (
            <span className="text-content-dark-1 text-sm" title={fullText}>
              {displayText}
            </span>
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'detail',
        id: 'detail',
        header: 'Chi tiết sự kiện',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 text-sm text-wrap" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'note',
        id: 'description',
        header: 'Mô tả',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 text-sm text-wrap" title={value || ''}>
              {value}
            </span>
          )
        },
        meta: { sortable: false },
      },
    ],
    []
  )

  // Define row actions - only show for first record and if editable
  const actions: TableAction<EmployeeWorkHistory>[] = useMemo(
    () => [
      // NOTE: temporary comment these features
      // {
      //   label: 'Chỉnh sửa',
      //   icon: <IconPencilsimple size={16} />,
      //   onClick: (record) => handleEdit(record),
      //   show: (row) => {
      //     const index = workHistories.findIndex((h) => h.id === row.id)
      //     // Only show for first record and if editable
      //     return index === 0 && isWorkHistoryEditable(row)
      //   },
      // },
      // {
      //   label: 'Xoá',
      //   icon: <IconTrash size={16} className="text-action-primary-red-default" />,
      //   variant: 'danger',
      //   onClick: (record) => handleDelete(record),
      //   show: (row) => {
      //     const index = workHistories.findIndex((h) => h.id === row.id)
      //     return index === 0 // Only show for first record
      //   },
      // },
    ],
    [handleEdit, handleDelete, workHistories, isWorkHistoryEditable]
  )

  return (
    <Table
      data={workHistories}
      columns={columns}
      showSTT={false}
      showActions={true}
      rowActions={actions}
      enablePagination={false}
      enableSorting={false}
      isLoading={isLoading}
      className="flex-1 px-0"
    />
  )
}

export default HistoryTab
