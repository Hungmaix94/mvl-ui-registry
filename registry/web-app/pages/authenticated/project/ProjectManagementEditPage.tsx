import { useCallback, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import type { ProjectFormValues } from '@/features/project/_shares/types/project-form-types.ts'
import { format } from 'date-fns'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { components } from '@/api/schema.ts'
import { ProjectForm } from '@/features/project/_shares/components/ProjectForm.tsx'
import { APP_PATH } from '@/routes'
import {
  useCreateProjectStaff,
  usePartialUpdateProjectStaff,
  useDeleteProjectStaff,
  useProject,
  useProjectStaffs,
  usePartialUpdateProject,
  type PatchedProjectRequest,
} from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

export const ProjectManagementEditPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { data: projectResponse, isLoading, error } = useProject(Number(id))
  const { data: staffsResponse } = useProjectStaffs({ project: Number(id) })

  const project = useMemo(() => {
    if (!projectResponse) return undefined
    return {
      ...projectResponse,
      staff_assignments: staffsResponse?.results || [],
    }
  }, [projectResponse, staffsResponse])

  const updateProjectMutation = usePartialUpdateProject()
  const createProjectStaffMutation = useCreateProjectStaff()
  const partialUpdateProjectStaffMutation = usePartialUpdateProjectStaff()
  const deleteProjectStaffMutation = useDeleteProjectStaff()

  const ability = useAbility()

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !project
  }, [isLoading, error, project])

  const hasPermission = ability.can('update', 'project')

  const handleSuccess = useCallback(() => {
    // Preserve query params when navigating back after edit
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.PROJECT_MANAGEMENT)
    }
  }, [navigate, location.state])

  const handleCancel = useCallback(() => {
    // Preserve query params when canceling edit
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(withRememberedSearch(APP_PATH.PROJECT_MANAGEMENT))
    }
  }, [navigate, location.state])

  const handleSubmit = useCallback(
    async (data: PatchedProjectRequest, values: ProjectFormValues) => {
      await updateProjectMutation.mutateAsync({
        id: Number(id),
        data,
      })

      const today = format(new Date(), 'yyyy-MM-dd')

      // Sync staff assignments (create, update, delete)
      const initialStaffs = staffsResponse?.results || []
      const submittedStaffs = values.staff_assignments || []

      // 1. Identify deleted staff assignments
      const deletedStaffs = initialStaffs.filter(
        (sa: any) =>
          !submittedStaffs.some(
            (sub: any) =>
              (sub.employee_id === sa.employee?.id || sub.employee_id === sa.employee_id) &&
              sub.role === sa.role
          )
      )
      for (const sa of deletedStaffs) {
        if (sa.id) {
          try {
            await deleteProjectStaffMutation.mutateAsync(sa.id)
          } catch (e) {
            handleApiError(e)
          }
        }
      }

      // 2. Identify created or modified staff assignments
      for (const staff of submittedStaffs) {
        const existing = initialStaffs.find(
          (sa: any) =>
            (sa.employee?.id || sa.employee_id) === staff.employee_id && sa.role === staff.role
        )

        const fromDateStr = formatDateToApi(staff.effective_from) || today
        const toDateStr = formatDateToApi(staff.effective_to || undefined) || null

        if (!existing) {
          try {
            await createProjectStaffMutation.mutateAsync({
              project_id: Number(id),
              employee_id: staff.employee_id,
              role: staff.role as components['schemas']['ProjectStaffRequest']['role'],
              effective_from: fromDateStr,
              effective_to: toDateStr,
            })
          } catch (e) {
            handleApiError(e)
          }
        } else {
          const existingFrom = existing.effective_from
            ? existing.effective_from.substring(0, 10)
            : ''
          const existingTo = existing.effective_to ? existing.effective_to.substring(0, 10) : null

          if (existingFrom !== fromDateStr || existingTo !== toDateStr) {
            try {
              await partialUpdateProjectStaffMutation.mutateAsync({
                id: existing.id,
                data: {
                  effective_from: fromDateStr,
                  effective_to: toDateStr,
                },
              })
            } catch (e) {
              handleApiError(e)
            }
          }
        }
      }

      toastService.success('Cập nhật dự án thành công')
      handleSuccess()
    },
    [
      handleSuccess,
      id,
      updateProjectMutation,
      createProjectStaffMutation,
      partialUpdateProjectStaffMutation,
      deleteProjectStaffMutation,
      project,
      staffsResponse,
    ]
  )

  return (
    <>
      <PageTitle idLabel={project?.name || ''} enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        hasPermission={hasPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <ProjectForm
            initialData={project}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={updateProjectMutation.isPending}
            isEdit
          />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default ProjectManagementEditPage
