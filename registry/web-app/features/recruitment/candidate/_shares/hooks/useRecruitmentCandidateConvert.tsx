import { useCallback, useEffect, useMemo } from 'react'
import {
  useConvertCandidateToEmployee,
  useRecruitmentCandidate,
} from '@/features/recruitment/services/recruitment-candidate-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import { useNavigate } from 'react-router-dom'
import { useDialog } from '@/hooks/useDialog.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { FormController, RadioGroup } from '@/components/ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { APP_PATH } from '@/routes'
import { EmployeeCodeType } from '@/constants/api-schema-aliases'

export const convertCandidateToEmployeeFormSchema = z.object({
  code_type: z.nativeEnum(EmployeeCodeType, {
    required_error: 'Hãy chọn loại mã nhân viên',
  }),
})

export type ConvertCandidateToEmployeeFormValues = z.infer<
  typeof convertCandidateToEmployeeFormSchema
>

export function useRecruitmentCandidateConvert(candidateId?: number) {
  const navigate = useNavigate()

  const convertCandidateMutation = useConvertCandidateToEmployee()
  const invalidateQueries = useInvalidateQueries()

  const { data: currentCandidate, refetch: refetchCandidate } = useRecruitmentCandidate(
    candidateId ?? 0
  )

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE.CODE_TYPE],
  })

  const convertCandidate = useCallback(
    async (candidateId: number, candidateCodeType?: EmployeeCodeType | null) => {
      try {
        await convertCandidateMutation.mutateAsync({
          id: candidateId,
          requestData:
            candidateCodeType == null ? { code_type: null } : { code_type: candidateCodeType },
        })

        // Invalidate recruitment candidate list queries
        await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

        toastService.success('Chuyển ứng viên thành nhân viên thành công')
      } catch (error: unknown) {
        toastService.error(
          extractErrorMessage(error, 'Có lỗi xảy ra khi chuyển ứng viên thành nhân viên.')
        )
        throw error
      }
    },
    [navigate, convertCandidateMutation, invalidateQueries]
  )
  const codeTypeOptions = useMemo((): Array<{
    value: EmployeeCodeType
    label: string
  }> => {
    return keysMapOptions.has(APP_CONSTANT_KEY.EMPLOYEE.CODE_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.CODE_TYPE) || []
      : []
  }, [keysMapOptions])

  const form = useForm<ConvertCandidateToEmployeeFormValues>({
    resolver: zodResolver(convertCandidateToEmployeeFormSchema),
    mode: 'onChange',
  })
  const { register, control, getValues, formState } = form

  const { displayFormContent, updateConfig, displayClose, setLoading, displayConfirm } = useDialog()

  const showNavigateToEmployeeDialog = useCallback(async () => {
    const { data: updatedCandidate } = await refetchCandidate()
    const employeeId = updatedCandidate?.employee?.id
    if (!employeeId) return

    displayConfirm({
      title: 'Chuyển thành nhân viên thành công',
      content: 'Bạn có muốn xem thông tin chi tiết của nhân viên này không?',
      confirmText: 'Xem nhân viên',
      cancelText: 'Ở lại',
      onConfirm: () => {
        navigate(APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(employeeId)))
        displayClose()
      },
      onCancel: displayClose,
    })
  }, [refetchCandidate, displayConfirm, displayClose, navigate])

  const onConfirm = useCallback(
    async (currentCandidateId?: number) => {
      const formVal = getValues()
      const targetCandidateId = currentCandidateId ?? candidateId

      if (!targetCandidateId || !formVal.code_type) {
        return
      }

      try {
        // Bật loading
        setLoading(true)

        // Gọi API
        await convertCandidate(targetCandidateId, formVal.code_type)

        // Tắt loading và đóng dialog khi thành công
        setLoading(false)
        displayClose()

        // Hỏi user có muốn chuyển sang màn hình chi tiết nhân viên không
        await showNavigateToEmployeeDialog()
      } catch (error) {
        setLoading(false)
      }
    },
    [
      getValues,
      candidateId,
      convertCandidate,
      setLoading,
      displayClose,
      showNavigateToEmployeeDialog,
    ]
  )

  useEffect(() => {
    updateConfig({
      disableConfirm: !formState.isValid,
    })
  }, [formState.isValid, updateConfig])

  const openConvertDialog = useCallback(
    (currentCandidateId?: number, isReturnCandidate?: boolean) => {
      // Reset form và trigger validation khi mở dialog
      form.reset()

      const targetCandidateId = currentCandidateId ?? candidateId
      const isReturn =
        isReturnCandidate ??
        (targetCandidateId === candidateId ? currentCandidate?.is_return_candidate : undefined) ??
        false

      if (targetCandidateId && isReturn) {
        void (async () => {
          try {
            setLoading(true)
            await convertCandidate(targetCandidateId, null)
            setLoading(false)
          } catch {
            setLoading(false)
          }
        })()
        return
      }

      const handleCancel = () => {
        form.reset() // Reset form when canceling
        displayClose()
      }

      displayFormContent({
        title: 'Chuyển thành nhân viên',
        content: (
          <>
            <FormController
              register={register}
              name="code_type"
              control={control}
              Field={RadioGroup}
              fieldProps={{
                label: 'Loại mã nhân viên',
                required: true,
                options: codeTypeOptions,
                className: 'flex gap-[26px] items-center',
              }}
            />
          </>
        ),
        confirmText: 'Chuyển thành nhân viên',
        confirmButtonClassName: 'w-[200px]',
        disableConfirm: true, // Disable ngay khi mở dialog
        onConfirm: () => onConfirm(currentCandidateId),
        onCancel: handleCancel,
      })
    },
    [
      displayFormContent,
      register,
      control,
      codeTypeOptions,
      onConfirm,
      displayClose,
      form,
      candidateId,
      currentCandidate?.is_return_candidate,
      convertCandidate,
      setLoading,
      showNavigateToEmployeeDialog,
    ]
  )

  return {
    convertCandidate,
    isConverting: convertCandidateMutation.isPending,
    openConvertDialog,
  }
}
