import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { ProjectLocationForm } from '@/features/attendance/project-location/_shares/components/ProjectLocationForm.tsx'
import { useAttendanceGeolocation } from '@/features/attendance/services/attendance-geolocation-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useMemo } from 'react'
import { withRememberedSearch } from '@/utils/list-url-memory'
import { useAbility } from '@/lib/ability'

const ProjectLocationEditPage = () => {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectLocationId = id ? parseInt(id, 10) : 0

  const { data: initialData, isLoading, error } = useAttendanceGeolocation(projectLocationId)

  const handleSuccess = () => {
    navigate(APP_PATH.PROJECT_LOCATION_MANAGEMENT)
  }

  const handleCancel = () => {
    navigate(withRememberedSearch(APP_PATH.PROJECT_LOCATION_MANAGEMENT))
  }

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !initialData
  }, [isLoading, error, initialData])

  // Quyền của trang lấy theo endpoint mà trang GỌI để dựng form: `GET /hrm/attendance-geolocations/{id}/`
  // → `attendance_geolocation.retrieve`. KHÔNG chép lại `.update` của route: route đã chặn `.update`
  // rồi nên tầng thứ hai không thêm gì, trong khi người có `.update` mà thiếu `.retrieve` vẫn ăn 403
  // ở lượt tải form — đúng ca mà DetailPageWrapper sinh ra để chặn.
  return (
    <DetailPageWrapper
      isLoading={isLoading}
      isNotFound={isNotFound}
      hasPermission={ability.can('retrieve', 'attendance_geolocation')}
    >
      <PageTitle title={'Chỉnh sửa định vị dự án'} enableBackButton />
      <Flex className="flex-1 px-10 py-4">
        <ProjectLocationForm
          initialData={{
            id: initialData?.id,
            name: initialData?.name || '',
            project_id: initialData?.project?.id || 0,
            address: initialData?.address || '',
            latitude: Number(initialData?.latitude),
            longitude: Number(initialData?.longitude),
            latlong: initialData?.longitude + ',' + initialData?.latitude,
            radius_m: initialData?.radius_m || 100,
            notes: initialData?.notes,
          }}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Flex>
    </DetailPageWrapper>
  )
}

export default ProjectLocationEditPage
