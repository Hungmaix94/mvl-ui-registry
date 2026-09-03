import { PageTitle } from '@/components/ui'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmployeeCertificate } from '@/features/employee/services/employee-certificate-service'
import { useEmployeeCertificateDelete } from '@/features/employee/certificate/delete/EmployeeCertificateDelete.tsx'
import { APP_PATH } from '@/routes'
import EmployeeCertificateDetail from '@/features/employee/certificate/view-details/EmployeeCertificateDetail.tsx'
import { Flex } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const EmployeeCertificateDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const certificateId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  const { data: certificate, isLoading, error } = useEmployeeCertificate(certificateId)

  const { openDeleteDialog } = useEmployeeCertificateDelete(() => {
    navigate(APP_PATH.EMPLOYEE_CERTIFICATE)
  })

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !certificate
  }, [isLoading, error, certificate])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = () => {
    if (certificate) {
      navigate(APP_PATH.EMPLOYEE_CERTIFICATE_EDIT.replace(':id', String(certificate.id)))
    }
  }

  const handleDelete = () => {
    if (certificate) {
      openDeleteDialog(certificate)
    }
  }

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.EMPLOYEE_CERTIFICATE_HISTORY.replace(':id', id.toString())
      navigate(path)
    }
  }, [navigate, id])

  // Build title from certificate name or type
  const pageTitle =
    certificate?.certificate_name ||
    certificate?.certificate_type_display ||
    'Bằng cấp, chứng chỉ môi giới'

  return (
    <>
      <PageTitle
        title={pageTitle}
        enableBackButton
        handleEdit={ability.can('update', 'employee_certificate') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'employee_certificate') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'employee_certificate') ? handleShowHistory : undefined
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'employee_certificate')}
      >
        <Flex p={'7'} flexGrow={'1'} direction={'column'}>
          {certificate && <EmployeeCertificateDetail certificate={certificate} />}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default EmployeeCertificateDetailPage
