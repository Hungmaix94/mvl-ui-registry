import { useMemo } from 'react'
import { PageTitle } from '@/components/ui'
import UserActionTrackingDetailWrapper from '@/features/user-action-tracking/UserActionTrackingDetailWrapper.tsx'
import { useAuditLogDetail } from '@/services/audit-log-service.ts'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { isNotFoundError } from '@/utils/error-utils'

const UserTrackingDetailPage = () => {
  const ability = useAbility()

  const logId = window.location.pathname.split('/').pop() || ''

  const { data: auditLog, isLoading, error } = useAuditLogDetail(logId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !auditLog
  }, [isLoading, error, auditLog])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasPermission = ability.can('get_detail', 'audit_logging')

  return (
    <>
      <PageTitle idLabel={`User ID: ${logId}`} enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasPermission}
      >
        {/* This content will only render if not loading, no error, found, and has permission */}
        <UserActionTrackingDetailWrapper auditLog={auditLog!} />
      </DetailPageWrapper>
    </>
  )
}

export default UserTrackingDetailPage
