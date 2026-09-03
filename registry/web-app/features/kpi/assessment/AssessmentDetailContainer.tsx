import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant.ts'
import {
  usePayrollKPIAssessmentEmployee,
  usePayrollKPIAssessmentManager,
  usePartialUpdatePayrollKPIAssessmentEmployee,
  usePartialUpdatePayrollKPIAssessmentManager,
} from '@/features/kpi/services/kpi-assessment-service'
import { useToast } from '@/hooks/useToast.ts'
import { handleApiError } from '@/utils/error-utils'
import { useAuth } from '@/store'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { Button, PageTitle } from '@/components/ui'
import { Flex, Separator } from '@radix-ui/themes'
import { TaskOverview } from './components/TaskOverview.tsx'
import { AssessmentResultSummary } from './components/AssessmentResultSummary.tsx'
import { KPIAssessmentTable } from './components/KPIAssessmentTable.tsx'
import { AssessmentFormFields } from './components/AssessmentFormFields.tsx'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assessmentSchema, AssessmentFormValues } from './schema.ts'
import { useEffect, useState, useCallback, useMemo, startTransition } from 'react'
import { IconCheckcircle, IconClockcounterclockwise } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface AssessmentDetailContainerProps {
  assessmentId?: number
  initialEditMode?: boolean
}

const AssessmentDetailContainer = ({
  assessmentId: propAssessmentId,
  initialEditMode = false,
}: AssessmentDetailContainerProps) => {
  const { id: paramId } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const ability = useAbility()
  const canViewHistory = ability.can('histories', 'employee_kpi_assessment')
  const isManagerMode = location.pathname.startsWith('/kpi/manager')
  const assessmentId = propAssessmentId || Number(paramId)
  const [isEditMode, setIsEditMode] = useState(initialEditMode)

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
  const toast = useToast()
  const { mutate: updateAssessmentEmployee, isPending: isUpdatingEmployee } =
    usePartialUpdatePayrollKPIAssessmentEmployee()
  const { mutate: updateAssessmentManager, isPending: isUpdatingManager } =
    usePartialUpdatePayrollKPIAssessmentManager()

  const isUpdating = isUpdatingEmployee || isUpdatingManager

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      items: [],
    },
  })

  const { setError } = form

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
          data.total_manager_score !== null ? Number(data.total_manager_score) : null,
      })
    }
  }, [data, form])

  useEffect(() => {
    resetForm()
  }, [resetForm])

  useEffect(() => {
    setIsEditMode(initialEditMode)
  }, [initialEditMode])

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
              setIsEditMode(false)
              navigate(APP_PATH.KPI_MANAGER_ASSESSMENT_DETAIL.replace(':id', String(assessmentId)))
            })
          },
          onError: (error: unknown) => {
            handleApiError(error, setError)
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
              setIsEditMode(false)
              navigate(APP_PATH.KPI_ASSESSMENT_DETAIL.replace(':id', String(assessmentId)))
            })
          },
          onError: (error: unknown) => {
            handleApiError(error, setError)
          },
        }
      )
    }
  }

  const handleCancel = () => {
    resetForm()
    startTransition(() => {
      setIsEditMode(false)
    })
    if (initialEditMode) {
      startTransition(() => {
        navigate(
          isManagerMode
            ? APP_PATH.KPI_MANAGER_ASSESSMENT_DETAIL.replace(':id', String(assessmentId))
            : APP_PATH.KPI_ASSESSMENT_DETAIL.replace(':id', String(assessmentId))
        )
      })
    }
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
      {
        label: `${data?.employee?.fullname} - ${data?.id}` || 'Nguyễn Văn An - MV000123',
        isCurrentPage: true,
      },
    ],
    [data, isManagerMode]
  )

  const handleBack = () => {
    const periodId = data?.period?.id
    const target = isManagerMode
      ? periodId
        ? APP_PATH.KPI_MANAGER_PERIOD_EVALUATION_DETAIL.replace(':id', String(periodId))
        : withRememberedSearch(APP_PATH.KPI_MANAGER_PERIOD_EVALUATION)
      : periodId
        ? APP_PATH.KPI_PERIOD_EVALUATION_DETAIL.replace(':id', String(periodId))
        : withRememberedSearch(APP_PATH.KPI_PERIOD_EVALUATION)

    startTransition(() => {
      navigate(target)
    })
  }

  const isSelfAssessment =
    isManagerMode &&
    user?.employee?.id &&
    data?.employee?.id &&
    user.employee.id === data.employee.id

  return (
    <div className="bg-background-1 flex h-full flex-col overflow-hidden">
      <PageTitle
        title={
          isEditMode
            ? 'Đánh giá phiếu KPI'
            : `${data?.employee?.fullname} - ${data?.id}` || 'Nguyễn Văn An - MV000123'
        }
        breadcrumb={breadcrumb}
        enableBackButton
        handleBackButton={handleBack}
        customActions={
          !isEditMode ? (
            <Flex gap="2" align="center">
              {canViewHistory && (
                <>
                  <Button
                    variant="secondary"
                    iconOnly
                    size="medium"
                    leftIcon={<IconClockcounterclockwise />}
                    className="bg-data-light-grey-default hover:bg-data-light-grey-hover"
                    title="Xem lịch sử thao tác"
                    onClick={() =>
                      startTransition(() => {
                        navigate(
                          isManagerMode
                            ? APP_PATH.KPI_MANAGER_ASSESSMENT_HISTORY.replace(
                                ':id',
                                String(assessmentId)
                              )
                            : APP_PATH.KPI_ASSESSMENT_HISTORY.replace(':id', String(assessmentId))
                        )
                      })
                    }
                  />
                  <Separator orientation="vertical" className="bg-border-1 h-8" />
                </>
              )}
              {!isSelfAssessment && (
                <Button
                  variant="primary"
                  size="small"
                  leftIcon={<IconCheckcircle />}
                  onClick={() =>
                    startTransition(() => {
                      navigate(
                        isManagerMode
                          ? APP_PATH.KPI_MANAGER_ASSESSMENT_ASSESS.replace(
                              ':id',
                              String(assessmentId)
                            )
                          : APP_PATH.KPI_ASSESSMENT_ASSESS.replace(':id', String(assessmentId))
                      )
                    })
                  }
                >
                  Đánh giá
                </Button>
              )}
            </Flex>
          ) : null
        }
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
                  {/* Overview & Proposals */}
                  <TaskOverview
                    planTasks={data.plan_tasks}
                    extraTasks={data.extra_tasks}
                    proposal={data.proposal}
                  />

                  <Separator size="4" className="bg-border-1 h-[1px] w-full" />

                  {/* Assessment Summary OR Form Fields */}
                  {!isEditMode ? (
                    <AssessmentResultSummary
                      managerScore={data.total_manager_score}
                      managerGrade={data.grade_manager}
                      managerOpinion={data.manager_assessment}
                      hrmGrade={data.grade_hrm}
                      hrmNote={data.note}
                    />
                  ) : (
                    <AssessmentFormFields />
                  )}

                  <Separator size="4" className="bg-border-1 h-[1px] w-full" />

                  {/* Detailed KPI Table */}
                  <KPIAssessmentTable data={data.items} isReadOnly={!isEditMode} />

                  {/* Form Actions (Only in Edit Mode) */}
                  {isEditMode && (
                    <Flex justify="end" gap="4" className="mt-4">
                      <Button
                        variant="secondary"
                        size="large"
                        className="w-[150px]"
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
                  )}
                </Flex>
              </form>
            </FormProvider>
          )}
        </DetailPageWrapper>
      </div>
    </div>
  )
}

export default AssessmentDetailContainer
