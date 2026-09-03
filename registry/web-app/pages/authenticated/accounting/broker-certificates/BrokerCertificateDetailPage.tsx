import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { useBrokerCertificate } from '@/features/accounting/broker-certificates/services/broker-certificate-service'
import BrokerCertificateDetail from '@/features/accounting/broker-certificates/view-details/BrokerCertificateDetail.tsx'
import BrokerCertificateRevokeDialog from '@/features/accounting/broker-certificates/_shares/components/BrokerCertificateRevokeDialog.tsx'
import { collaboratorNameOf } from '@/features/accounting/broker-certificates/types/broker-certificate-types'

const BrokerCertificateDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const certificateId = id ? parseInt(id, 10) : 0
  const ability = useAbility()
  const [showRevoke, setShowRevoke] = useState(false)

  const { data: certificate, isLoading, error } = useBrokerCertificate(certificateId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !certificate
  }, [isLoading, error, certificate])
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = useCallback(() => {
    if (certificate)
      navigate(APP_PATH.BROKER_CERTIFICATE_EDIT.replace(':id', String(certificate.id)))
  }, [navigate, certificate])

  const canUpdate = ability.can('update', 'brokercertificate')
  const canRevoke = ability.can('revoke', 'brokercertificate')
  const isRevoked = certificate?.status === 'REVOKED'

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={certificate ? collaboratorNameOf(certificate) : 'Chứng chỉ môi giới'}
        enableBackButton
        handleEdit={canUpdate ? handleEdit : undefined}
        customActions={
          certificate && !isRevoked && canRevoke ? (
            <Button type="button" variant="secondary" onClick={() => setShowRevoke(true)}>
              Thu hồi
            </Button>
          ) : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'brokercertificate')}
      >
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          {certificate && <BrokerCertificateDetail certificate={certificate} />}
        </div>
      </DetailPageWrapper>

      <BrokerCertificateRevokeDialog
        target={showRevoke && certificate ? certificate : null}
        onClose={() => setShowRevoke(false)}
      />
    </div>
  )
}

export default BrokerCertificateDetailPage
