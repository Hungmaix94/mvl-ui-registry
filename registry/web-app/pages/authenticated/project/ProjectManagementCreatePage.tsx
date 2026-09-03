import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  useCreateProject,
  type PatchedProjectRequest,
  type ProjectRequest,
} from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

function isProjectRequest(
  payload: ProjectRequest | PatchedProjectRequest
): payload is ProjectRequest {
  return typeof payload.name === 'string'
}

export const ProjectManagementCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const createProjectMutation = useCreateProject()
  const createProjectStaffMutation = useCreateProjectStaff()

  const handleSuccess = useCallback(() => {
    // Preserve query params when navigating back after create
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.PROJECT_MANAGEMENT)
    }
  }, [navigate, location.state])

  const handleCancel = useCallback(() => {
    // Preserve query params when canceling create
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(withRememberedSearch(APP_PATH.PROJECT_MANAGEMENT))
    }
  }, [navigate, location.state])

  const handleSubmit = useCallback(
    async (payload: ProjectRequest | PatchedProjectRequest, values: ProjectFormValues) => {
      if (!isProjectRequest(payload)) return
      const project = await createProjectMutation.mutateAsync(payload)

      const today = format(new Date(), 'yyyy-MM-dd')

      // Assign staff assignments array
      if (values.staff_assignments && values.staff_assignments.length > 0) {
        for (const staff of values.staff_assignments) {
          const fromDateStr = formatDateToApi(staff.effective_from) || today
          const toDateStr = formatDateToApi(staff.effective_to || undefined) || null

          try {
            await createProjectStaffMutation.mutateAsync({
              project_id: project.id,
              employee_id: staff.employee_id,
              role: staff.role as components['schemas']['ProjectStaffRequest']['role'],
              effective_from: fromDateStr,
              effective_to: toDateStr,
            })
          } catch (e) {
            handleApiError(e)
            // Continue with other staff assignments even if one fails
          }
        }
      }

      toastService.success('Tạo dự án thành công')
      handleSuccess()
    },
    [createProjectMutation, createProjectStaffMutation, handleSuccess]
  )

  return (
    <>
      <PageTitle enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createProjectMutation.isPending}
        />
      </Flex>
    </>
  )
}

export default ProjectManagementCreatePage
