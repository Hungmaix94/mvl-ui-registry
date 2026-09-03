import { useCallback, useMemo } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { formatDate } from '@/utils/date-utils'
import { IconPencilsimple } from '@/assets/icons'
import { useDialogStore } from '@/store/dialog-store'
import { KPIUnitEvaluationEditForm } from '../components/KPIUnitEvaluationEditForm'
import {
  DepartmentKPIAssessmentList,
  usePartialUpdatePayrollKPIAssessmentDepartment,
} from '@/features/kpi/services/kpi-assessment-service'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { useAbility } from '@/lib/ability'
import { KPIUnitEvaluationFormValues } from '../_shares/types/kpi-unit-evaluation-form-types'

type KPIUnitEvaluationDetailTableProps = {
  data: DepartmentKPIAssessmentList[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  totalRecords: number
  currentPage: number
  pageSize: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

export const KPIUnitEvaluationDetailTable = ({
  data,
  isLoading,
  error,
  pageCount,
  totalRecords,
  currentPage,
  pageSize,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter = false,
}: KPIUnitEvaluationDetailTableProps) => {
  const { openDialog, closeDialog, setLoading, setError } = useDialogStore()
  const updateKPIAssessment = usePartialUpdatePayrollKPIAssessmentDepartment()
  const queryClient = useQueryClient()
  const ability = useAbility()

  const handleEdit = useCallback(
    (row: DepartmentKPIAssessmentList) => {
      const DialogContent = () => {
        const handleSubmit = async (formData: KPIUnitEvaluationFormValues) => {
          setLoading(true)
          setError(null)

          try {
            await updateKPIAssessment.mutateAsync({
              id: row.id,
              data: {
                grade: formData.grade,
                note: formData.note,
              },
            })
            // Invalidate all department list queries to refresh the table
            queryClient.invalidateQueries({
              queryKey: ['payroll', 'kpi-assessments', 'departments', 'list'],
            })

            toastService.success('Cập nhật phiếu đánh giá thành công')
            closeDialog()
          } catch (error: unknown) {
            // Error handling is done in form component via handleApiError
            // Re-throw to let form component handle it
            throw error
          } finally {
            setLoading(false)
          }
        }

        return (
          <KPIUnitEvaluationEditForm
            employeeCode={row.leader?.code || '-'}
            employeeName={row.leader?.fullname || '-'}
            departmentName={row.department?.name || '-'}
            initialGrade={row.grade}
            initialNote={row.note}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
            isSubmitting={isLoading}
          />
        )
      }

      openDialog({
        title: 'Chỉnh sửa Phiếu đánh giá',
        hideFooter: true,
        content: <DialogContent />,
      })
    },
    [openDialog, closeDialog, setLoading, setError, updateKPIAssessment, queryClient, isLoading]
  )

  // Define table columns
  const columns = useMemo<ColumnDef<DepartmentKPIAssessmentList>[]>(
    () => [
      {
        accessorKey: 'leader.code',
        header: 'Mã nhân viên',
        meta: {
          width: 'w-32',
        },
      },
      {
        accessorKey: 'leader.fullname',
        header: 'Họ tên',
        meta: {
          width: 'w-64',
        },
      },
      {
        accessorKey: 'department.name',
        header: 'Phòng ban',
        meta: {
          width: 'w-48',
          sortable: true,
        },
      },
      {
        accessorKey: 'grade',
        header: 'Xếp loại KPI',
        meta: {
          width: 'w-24',
          align: 'center',
          sortable: true,
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Ngày cập nhật',
        meta: {
          width: 'w-32',
          align: 'center',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const date = getValue<string>()
          if (!date) return '-'
          try {
            return formatDate(new Date(date))
          } catch {
            return date
          }
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        meta: {
          width: 'w-40',
        },
        cell: ({ getValue }) => getValue<string>() || '-',
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<DepartmentKPIAssessmentList>[] = useMemo(
    () => [
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => handleEdit(record),
        show: () => ability.can('update', 'department_kpi_assessment'),
      },
    ],
    [ability, handleEdit]
  )

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      onPaginationChange(pageIndex, newPageSize)
    },
    [onPaginationChange]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      onSortingChange(field, direction)
    },
    [onSortingChange]
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table<DepartmentKPIAssessmentList>
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      actionRenderType="direct"
      enableSorting={true}
      enablePagination={true}
      manualSorting
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      onClearFilter={onClearFilter}
      hasFilter={hasFilter}
    />
  )
}
