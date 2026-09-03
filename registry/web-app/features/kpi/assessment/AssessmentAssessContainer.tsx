import { useParams, useNavigate } from 'react-router-dom'
import {
  usePayrollKPIAssessmentEmployee,
  usePayrollKPIAssessmentManager,
  usePartialUpdatePayrollKPIAssessmentEmployee,
  usePartialUpdatePayrollKPIAssessmentManager,
} from '@/features/kpi/services/kpi-assessment-service'
import { usePayrollKPIConfigCurrent } from '@/features/kpi/services/kpi-criteria-service'
import { useLocation } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useToast } from '@/hooks/useToast'
import { extractErrorMessage } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { Button, PageTitle } from '@/components/ui'
import { Flex, Separator } from '@radix-ui/themes'
import { KPIAssessmentTable } from './components/KPIAssessmentTable'
import { AssessmentFormFields } from './components/AssessmentFormFields'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assessmentSchema, AssessmentFormValues } from './schema'
import { useEffect, useCallback, useMemo, startTransition } from 'react'

const AssessmentAssessContainer = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const assessmentId = Number(id)

  const toast = useToast()
  const location = useLocation()
  const isManagerMode = location.pathname.startsWith('/kpi/manager')

  const {
    data: employeeData,
    isLoading: isEmployeeLoading,
    error: employeeError,
  } = usePayrollKPIAssessmentEmployee(assessmentId, { enabled: !isManagerMode })
  const {
    data: managerData,
    isLoading: isManagerLoading,
    error: managerError,
  } = usePayrollKPIAssessmentManager(assessmentId, { enabled: isManagerMode })

  const data = (isManagerMode ? managerData : employeeData) as any
  const isLoading = isManagerMode ? isManagerLoading : isEmployeeLoading
  const error = isManagerMode ? managerError : employeeError

  const { mutate: updateAssessmentEmployee, isPending: isUpdatingEmployee } =
    usePartialUpdatePayrollKPIAssessmentEmployee()
  const { mutate: updateAssessmentManager, isPending: isUpdatingManager } =
    usePartialUpdatePayrollKPIAssessmentManager()

  // Fetch KPI Config for auto-grading
  const { data: kpiConfig } = usePayrollKPIConfigCurrent()

  const isUpdating = isUpdatingEmployee || isUpdatingManager

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      items: [],
    },
  })

  const resetForm = useCallback(() => {
    if (data) {
      form.reset({
        plan_tasks: data.plan_tasks,
        extra_tasks: data.extra_tasks,
        proposal: data.proposal,
        grade_manager_overridden: data.grade_manager_overridden,
        grade: data.grade,
        grade_hrm: data.grade_hrm,
        note: data.note,
        manager_assessment: data.manager_assessment,
        items: data.items.map((item: any) => ({
          id: item.id,
          employee_score: item.employee_score !== null ? Number(item.employee_score) : null,
          manager_score: item.manager_score !== null ? Number(item.manager_score) : null,
          note: item.note,
        })),
        total_manager_score:
          data.total_manager_score !== null ? Number(data.total_manager_score) : 0,
      })
    }
  }, [data, form])

  useEffect(() => {
    resetForm()
  }, [resetForm])

  // Watch total score to auto-calculate grade
  const totalManagerScore = form.watch('total_manager_score')

  useEffect(() => {
    if (
      !kpiConfig?.config?.grade_thresholds ||
      totalManagerScore === undefined ||
      totalManagerScore === null
    )
      return

    const score = Number(totalManagerScore)
    const thresholds = kpiConfig.config.grade_thresholds

    // Find matching grade
    // Prioritize specific ranges

    // Fallback or specific logic if needed?
    // Let's implement a more robust finder given standard KPI logic:
    // Usually grades are sorted.
    // Let's use the explicit logic:
    let calculatedGrade = ''

    for (const t of thresholds) {
      const min = t.min ?? -Infinity
      const max = t.max ?? Infinity

      // Check inclusion. Adjust equality based on typical business rules.
      // Often: min <= score <= max.
      if (score >= min && score <= max) {
        // Found it.
        // Use the first possible code or a default code if exists
        calculatedGrade = t.default_code || t.possible_codes[0] || ''
        break
      }
    }

    if (calculatedGrade) {
      if (isManagerMode) {
        form.setValue('grade', calculatedGrade, { shouldValidate: true })
      } else {
        form.setValue('grade_hrm', calculatedGrade, { shouldValidate: true })
      }
    }
  }, [totalManagerScore, kpiConfig, isManagerMode, form])

  const onSubmit = (values: AssessmentFormValues) => {
    if (isManagerMode) {
      updateAssessmentManager(
        {
          id: assessmentId,
          data: {
            manager_assessment: values.note || '',
            grade: values.grade || '',
            items: values.items.map((item) => ({
              item_id: item.id,
              score: String(item.manager_score ?? 0),
            })),
          },
        },
        {
          onSuccess: () => {
            toast.success('Đã lưu đánh giá nhân viên')
            startTransition(() => {
              navigate(APP_PATH.KPI_MANAGER_ASSESSMENT_DETAIL.replace(':id', String(assessmentId)))
            })
          },
          onError: (error: unknown) => {
            toast.error(extractErrorMessage(error, 'Đã xảy ra lỗi. Vui lòng thử lại.'))
          },
        }
      )
    } else {
      updateAssessmentEmployee(
        {
          id: assessmentId,
          data: {
            grade_hrm: values.grade_hrm || '',
            note: values.note || '',
          },
        },
        {
          onSuccess: () => {
            toast.success('Đã lưu đánh giá nhân viên')
            startTransition(() => {
              navigate(APP_PATH.KPI_ASSESSMENT_DETAIL.replace(':id', String(assessmentId)))
            })
          },
          onError: (error: unknown) => {
            toast.error(extractErrorMessage(error, 'Đã xảy ra lỗi. Vui lòng thử lại.'))
          },
        }
      )
    }
  }

  const handleCancel = () => {
    startTransition(() => {
      navigate(
        isManagerMode
          ? APP_PATH.KPI_MANAGER_ASSESSMENT_DETAIL.replace(':id', String(assessmentId))
          : APP_PATH.KPI_ASSESSMENT_DETAIL.replace(':id', String(assessmentId))
      )
    })
  }

  const breadcrumb = useMemo(
    () => [
      { label: 'Đánh giá KPI', href: APP_PATH.KPI },
      {
        label: 'Phiếu đánh giá KPI theo kỳ',
        href: isManagerMode
          ? APP_PATH.KPI_MANAGER_PERIOD_EVALUATION
          : APP_PATH.KPI_PERIOD_EVALUATION,
      },
      {
        label: data?.period?.month ? `Tháng ${data.period.month}` : 'Tháng 1/2025',
        href:
          isManagerMode && data?.period?.id
            ? APP_PATH.KPI_MANAGER_PERIOD_EVALUATION_DETAIL.replace(':id', String(data.period.id))
            : !isManagerMode && data?.period?.id
              ? APP_PATH.KPI_PERIOD_EVALUATION_DETAIL.replace(':id', String(data.period.id))
              : '#',
      },
      { label: data?.employee?.fullname || 'Nguyễn Văn An - MV000123', isCurrentPage: true },
    ],
    [data, isManagerMode]
  )

  return (
    <div className="bg-background-1 flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Đánh giá phiếu KPI"
        breadcrumb={breadcrumb}
        enableBackButton
        handleBackButton={handleCancel}
      />

      {/*
        `hasPermission={true}` là CỐ Ý (ClickUp 86eync7g0): container này được render bởi
        `AssessmentDetailPage`, mà trang đó nằm trên BỐN route với BỐN mã quyền khác nhau
        (`employee_kpi_assessment.retrieve|update`, `employee_manager_assessment.retrieve|partial_update`).
        Ghi cứng một mã là chặn nhầm ba route còn lại. Quyền đã được `PermissionGuard` chặn ở
        từng route trước khi component này render.
      */}
      <div className="flex-1 overflow-y-auto px-10 pb-16">
        <DetailPageWrapper
          isLoading={isLoading}
          isError={!!error}
          hasPermission={true}
          isNotFound={!data}
        >
          {data && (
            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Flex direction="column" gap="9" className="py-8">
                  {/* Detailed KPI Table with Inputs */}
                  <KPIAssessmentTable data={data.items} isReadOnly={!isManagerMode} />

                  <Separator size="4" className="bg-border-1 h-[1px] w-full" />

                  {/* Grading and Notes Form */}
                  <AssessmentFormFields />

                  {/* Pixel Perfect Action Buttons */}
                  <Flex justify="end" gap="4" className="mt-4">
                    <Button
                      variant="secondary"
                      size="large"
                      className="bg-data-light-grey-default text-content-dark-1 w-[150px]"
                      onClick={handleCancel}
                      type="button"
                    >
                      Huỷ
                    </Button>
                    <Button
                      variant="primary"
                      size="large"
                      className="w-[150px]"
                      type="submit"
                      loading={isUpdating}
                    >
                      Lưu
                    </Button>
                  </Flex>
                </Flex>
              </form>
            </FormProvider>
          )}
        </DetailPageWrapper>
      </div>
    </div>
  )
}

export default AssessmentAssessContainer
