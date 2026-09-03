import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDialogStore } from '@/store/dialog-store'
import { useToast } from '@/hooks/useToast.ts'
import { useActiveEmployee } from '@/features/employee/services/employee-action-service'
import { formatDateToApi } from '@/utils/date-utils.ts'
import StartWorkingDialog, {
  type StartWorkingDialogRef,
  type StartWorkingFormData,
} from '@/features/employee/management/_shares/components/StartWorkingDialog.tsx'
import type { Employee } from '@/features/employee/services/employee-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils'
import { ContractNet_percentage } from '@/api/schema.ts'
import { APP_PATH } from '@/routes'
import { Button } from '@/components/ui'
import { DialogFooter } from '@/components/ui/dialog'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/lib/utils'
import { EmployeeType } from '@/constants/api-schema-aliases'

function StartWorkingDialogFooter({
  onCancel,
  onConfirm,
  onConfirmAndCreate,
}: {
  onCancel: () => void
  onConfirm: () => Promise<void>
  onConfirmAndCreate: () => Promise<void>
}) {
  const loading = useDialogStore((s) => s.config?.loading ?? false)
  const [activeAction, setActiveAction] = useState<'confirm' | 'create' | null>(null)

  const handleAction = async (action: () => Promise<void>, type: 'confirm' | 'create') => {
    setActiveAction(type)
    try {
      await action()
    } catch {
      // Validation/API errors are handled inline or via toast
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <DialogFooter
      className={cn('border-border-1', 'border-t-[1px]', 'px-6 pt-4 pb-[20px]', 'flex-shrink-0')}
    >
      <Flex direction={{ initial: 'column-reverse', sm: 'row' }} gap="2" flexGrow="1" justify="end">
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="secondary"
          size="small"
          className="w-[130px]"
        >
          Huỷ
        </Button>
        <Flex gap="2">
          <Button
            onClick={() => handleAction(onConfirm, 'confirm')}
            disabled={loading}
            variant="secondary-border"
            size="small"
            loading={loading && activeAction === 'confirm'}
            className={cn(
              'w-[130px]',
              'border-action-primary-red-default hover:border-action-primary-red-hover',
              'text-action-primary-red-default hover:text-action-primary-red-hover'
            )}
          >
            Xác nhận
          </Button>
          <Button
            onClick={() => handleAction(onConfirmAndCreate, 'create')}
            disabled={loading}
            variant="primary"
            size="small"
            loading={loading && activeAction === 'create'}
          >
            Xác nhận & Tạo HĐ
          </Button>
        </Flex>
      </Flex>
    </DialogFooter>
  )
}

export function useStartWorkingDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast } = useToast()
  const activeEmployeeMutation = useActiveEmployee()
  const invalidateQueries = useInvalidateQueries()
  const formRef = useRef<StartWorkingDialogRef>(null)
  const navigate = useNavigate()
  const actionRef = useRef<'confirm' | 'confirmAndCreate'>('confirm')

  const openStartWorkingDialog = useCallback(
    (employee: Employee) => {
      const handleSubmit = async (
        data: StartWorkingFormData,
        setError: any,
        context?: {
          base_salary?: string | null
          effective_date?: string
          expiration_date?: string | null
          net_percentage?: ContractNet_percentage
        }
      ) => {
        try {
          setLoading(true)
          await activeEmployeeMutation.mutateAsync({
            id: employee.id,
            data: {
              start_date: formatDateToApi(data.start_date),
              description: data.description,
              department_id: data.department_id,
              position_id: data.position_id,
              employee_type: data.employee_type as EmployeeType,
            },
          })
          showSuccessToast('Bắt đầu làm việc thành công')
          await invalidateQueries.invalidateByPrefix('hrm/employees')
          displayClose()

          if (actionRef.current === 'confirmAndCreate') {
            navigate(APP_PATH.CONTRACT_MANAGE_CREATE, {
              state: {
                employee_id: employee.id,
                effective_date: context?.effective_date ?? data.start_date,
                expiration_date: context?.expiration_date ?? undefined,
                base_salary: context?.base_salary ?? undefined,
                net_percentage: context?.net_percentage ?? undefined,
              },
            })
          }
        } catch (error: any) {
          handleApiError(error, setError)
          throw error
        } finally {
          setLoading(false)
        }
      }

      const handleConfirm = async () => {
        actionRef.current = 'confirm'
        if (formRef.current) {
          try {
            await formRef.current.submit()
          } catch (error) {
            throw error
          }
        }
      }

      const handleConfirmAndCreate = async () => {
        actionRef.current = 'confirmAndCreate'
        if (formRef.current) {
          try {
            await formRef.current.submit()
          } catch (error) {
            throw error
          }
        }
      }

      displayCustom({
        size: 'md',
        title: 'Bắt đầu làm việc',
        scrollable: true,
        content: <StartWorkingDialog ref={formRef} employee={employee} onSubmit={handleSubmit} />,
        footer: (
          <StartWorkingDialogFooter
            onCancel={displayClose}
            onConfirm={handleConfirm}
            onConfirmAndCreate={handleConfirmAndCreate}
          />
        ),
        dialogContentClassName: 'p-0',
      })
    },
    [
      displayCustom,
      displayClose,
      setLoading,
      showSuccessToast,
      activeEmployeeMutation,
      invalidateQueries,
      navigate,
    ]
  )

  return {
    openStartWorkingDialog,
  }
}
