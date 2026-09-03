import { useParams } from 'react-router-dom'
import { useAttendanceGeolocation } from '@/features/attendance/services/attendance-geolocation-service'
import { useMemo } from 'react'
import { isNotFoundError } from '@/utils/error-utils'

export const useProjectLocationDetail = () => {
  const { id } = useParams<{ id: string }>()
  const projectLocationId = id ? parseInt(id, 10) : 0

  const { data: projectLocation, isLoading, error } = useAttendanceGeolocation(projectLocationId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !projectLocation
  }, [isLoading, error, projectLocation])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    projectLocation,
    isLoading,
    error,
    isNotFound,
    isError,
    projectLocationId,
  }
}
