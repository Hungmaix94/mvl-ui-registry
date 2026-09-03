import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import ContractAppendixDetail from '@/features/contract/contract-appendix/view-details/ContractAppendixDetail.tsx'
import { useContractAppendix } from '@/features/contract/services/contract-appendix-service'
import { useAbility } from '@/lib/ability.ts'
import { useContractAppendixDelete } from '@/features/contract/contract-appendix/_shares/hooks/useContractAppendixDelete.tsx'
import { isNotFoundError } from '@/utils/error-utils'
import { ContractStatus } from '@/constants/api-schema-aliases'

const ContractAppendixDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const appendixId = useMemo(() => Number(id), [id])

  const { openDeleteDialog } = useContractAppendixDelete()

  const { data: appendixData, isLoading, error } = useContractAppendix(appendixId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !appendixData
  }, [isLoading, error, appendixData])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const isDraft = useMemo(() => {
    return appendixData?.status === ContractStatus.draft
  }, [appendixData?.status])

  const handleEdit = useCallback(() => {
    const path = APP_PATH.CONTRACT_APPENDIX_EDIT.replace(':id', appendixId.toString())
    navigate(path)
  }, [navigate, appendixId])

  const handleDelete = useCallback(() => {
    if (!appendixData) return
    openDeleteDialog(appendixData as any)
  }, [appendixData, openDeleteDialog])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.CONTRACT_APPENDIX_HISTORY.replace(':id', appendixId.toString())
    navigate(path)
  }, [navigate, appendixId])

  // Dynamic title: "Phụ lục hợp đồng số {contract_number}"
  const pageTitle = appendixData
    ? `Phụ lục hợp đồng số ${appendixData.contract_number || appendixData.code || ''}`
    : undefined

  return (
    <>
      <PageTitle
        idLabel={appendixData?.contract_number || appendixData?.code || ''}
        enableBackButton
        title={pageTitle}
        handleEdit={isDraft && ability.can('update', 'contract_appendix') ? handleEdit : undefined}
        handleDelete={
          isDraft && ability.can('destroy', 'contract_appendix') ? handleDelete : undefined
        }
        handleShowHistory={
          ability.can('histories', 'contract_appendix') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'contract_appendix')}
      >
        {appendixData && <ContractAppendixDetail contractAppendix={appendixData} />}
      </DetailPageWrapper>
    </>
  )
}

export default ContractAppendixDetailPage
