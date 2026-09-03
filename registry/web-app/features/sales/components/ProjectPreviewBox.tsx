import React from 'react'
import { APP_PATH } from '@/routes'
import { Link } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import { IconEye } from '@/assets/icons'
import { DisplayField } from '@/components/commons/DisplayField'
import { components } from '@/api/schema'
import { formatDate } from '@/utils/date-utils'
import { useProject, useProjectStaffs } from '@/services/realestate-service'
import { getActiveProjectStaff } from '@/features/sales/utils/projectStaffUtils'

type Project = components['schemas']['Project']

type ProjectPreviewBoxProps = {
  projectData: Project | any
  projectDirector?: any
  projectSecretary?: any
  targetDate?: string | Date | null
}

export const ProjectPreviewBox: React.FC<ProjectPreviewBoxProps> = ({
  projectData,
  projectDirector,
  projectSecretary,
  targetDate,
}) => {
  const projectId =
    projectData?.id ??
    (typeof projectData === 'number' || typeof projectData === 'string'
      ? Number(projectData)
      : undefined)

  // Fetch full project details from API
  const { data: projectDetail, isLoading } = useProject(projectId as number)

  // Use fetched details if available, otherwise fallback to the provided props initially
  const displayData = projectDetail || (typeof projectData === 'object' ? projectData : null)

  // Normalize targetDate to YYYY-MM-DD string
  const targetDateStr = React.useMemo(() => {
    if (!targetDate) return null
    if (targetDate instanceof Date) {
      try {
        return targetDate.toISOString().split('T')[0]
      } catch (e) {
        return null
      }
    }
    if (typeof targetDate === 'string') {
      return targetDate.split('T')[0]
    }
    return null
  }, [targetDate])

  const propDirector =
    projectDirector ||
    (targetDateStr ? null : displayData?.project_director || displayData?.project_manager)
  const propSecretary = projectSecretary || (targetDateStr ? null : displayData?.project_secretary)

  // Only fetch staff assignments if we don't have director/secretary from props/displayData
  const shouldFetchStaffs = !propDirector || !propSecretary

  // Fetch staff assignments for the project
  const { data: staffsResponse } = useProjectStaffs(
    projectId && shouldFetchStaffs ? { project: projectId } : undefined,
    { enabled: !!projectId && shouldFetchStaffs }
  )
  const staffs = staffsResponse?.results || []

  const formatEmployeeValue = (emp: any): string => {
    if (!emp) return ''
    if (typeof emp === 'string') return emp
    if (Array.isArray(emp)) {
      return emp
        .map((e) => (typeof e === 'string' ? e : e.fullname || ''))
        .filter(Boolean)
        .join(', ')
    }
    return emp.fullname || ''
  }

  const projectDirectors = React.useMemo(() => {
    if (propDirector) {
      return formatEmployeeValue(propDirector)
    }
    const activeStaff = getActiveProjectStaff(staffs, 'project_director', targetDateStr)
    return formatEmployeeValue(activeStaff)
  }, [propDirector, staffs, targetDateStr])

  const projectSecretaries = React.useMemo(() => {
    if (propSecretary) {
      return formatEmployeeValue(propSecretary)
    }
    const activeStaff = getActiveProjectStaff(staffs, 'project_secretary', targetDateStr)
    return formatEmployeeValue(activeStaff)
  }, [propSecretary, staffs, targetDateStr])

  if (isLoading && !projectDetail) {
    return (
      <div className="group border-border-1 bg-surface-secondary-default flex flex-col gap-6 rounded-lg border p-5 transition-colors hover:border-gray-300 lg:col-span-4">
        <div className="flex h-32 items-center justify-center text-gray-500">
          Đang tải thông tin dự án...
        </div>
      </div>
    )
  }

  if (!displayData || !displayData.id) return null

  return (
    <div className="group border-border-1 bg-surface-secondary-default flex flex-col gap-6 rounded-lg border p-5 transition-colors hover:border-gray-300 lg:col-span-4">
      <Flex direction="column" gap="1">
        <Text className="text-content-dark-3 typo-body-base-medium">
          {displayData?.code || '-'}
        </Text>
        <div className="flex items-center gap-2">
          <Text className="text-content-dark-1 typo-body-xl-semibold">
            {displayData?.name || '-'}
          </Text>
          {displayData?.id && (
            <Link
              to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(displayData.id))}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-primary text-gray-400 transition-colors"
              title="Xem chi tiết dự án"
            >
              <IconEye size={18} />
            </Link>
          )}
        </div>
      </Flex>
      <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:grid-cols-3">
        <DisplayField label="Chủ đầu tư" value={displayData?.investor?.name || '-'} />
        <DisplayField
          label="Tổng số căn"
          value={displayData?.total_units ? `${displayData.total_units} căn` : '-'}
        />
        <DisplayField
          label="Địa chỉ"
          value={
            displayData?.address ||
            [
              displayData.address_detail,
              displayData.ward_detail?.name,
              displayData.province_detail?.name,
            ]
              .filter(Boolean)
              .join(', ') ||
            '-'
          }
        />
        <DisplayField
          label="Ngày khởi công dự kiến"
          value={displayData?.planned_start_date ? formatDate(displayData.planned_start_date) : '-'}
        />
        <DisplayField
          label="Ngày hoàn thành dự kiến"
          value={displayData?.planned_end_date ? formatDate(displayData.planned_end_date) : '-'}
        />
        <DisplayField
          label="Ngày mở bán"
          value={displayData?.sale_open_date ? formatDate(displayData.sale_open_date) : '-'}
        />
        <DisplayField label="Giám đốc dự án" value={projectDirectors || '-'} />
        <DisplayField label="Thư ký dự án" value={projectSecretaries || '-'} />
      </div>
    </div>
  )
}
