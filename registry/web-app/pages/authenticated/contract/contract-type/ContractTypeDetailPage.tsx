import { PageTitle } from '@/components/ui'
import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import ContractTypeDetail from '@/features/contract/contract-type/view-details/ContractTypeDetail.tsx'
import { useContractType } from '@/features/contract/services/contract-type-service'
import { useContractTypeDelete } from '@/features/contract/contract-type/_shares/hooks/useContractTypeDelete.tsx'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import type { components } from '@/api/schema.ts'
import { isNotFoundError } from '@/utils/error-utils'

const ContractTypeDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const contractTypeId = Number(id)

  const { data: contractTypeResponse, isLoading, error } = useContractType(contractTypeId)

  const contractType = useMemo(() => contractTypeResponse || null, [contractTypeResponse])

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !contractType
  }, [isLoading, error, contractType])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const { openDeleteDialog } = useContractTypeDelete(() => {
    navigate(APP_PATH.CONTRACT_TYPE)
  })

  const handleEdit = useCallback(() => {
    const path = APP_PATH.CONTRACT_TYPE_EDIT.replace(':id', contractTypeId.toString())
    navigate(path)
  }, [navigate, contractTypeId])

  const handleDelete = useCallback(() => {
    if (contractType && contractType.category) {
      // Convert ContractType to ContractTypeList for delete hook
      const contractTypeListItem: components['schemas']['ContractTypeList'] = {
        id: contractType.id,
        code: contractType.code || null,
        name: contractType.name,
        duration_display: contractType.duration_display || '',
        duration_type: contractType.duration_type!,
        duration_months: contractType.duration_months ?? null,
        base_salary: contractType.base_salary || '',
        lunch_allowance: contractType.lunch_allowance ?? null,
        phone_allowance: contractType.phone_allowance ?? null,
        other_allowance: contractType.other_allowance ?? null,
        created_at: contractType.created_at,
        category: contractType.category,
        is_active: contractType.is_active ?? false,
        employee_type: contractType.employee_type ?? null,
        colored_employee_type: contractType.colored_employee_type,
      }
      openDeleteDialog(contractTypeListItem)
    }
  }, [openDeleteDialog, contractType])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.CONTRACT_TYPE_HISTORY.replace(':id', contractTypeId.toString())
    navigate(path)
  }, [navigate, contractTypeId])

  // Dynamic title: "Loại hợp đồng {code}"
  const pageTitle = contractType ? `Loại hợp đồng ${contractType.code || ''}` : undefined

  return (
    <>
      <PageTitle
        idLabel={contractType?.name || ''}
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'contract_type') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'contract_type') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'contract_type') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'contract_type')}
      >
        {contractType && <ContractTypeDetail contractType={contractType} />}
      </DetailPageWrapper>
    </>
  )
}

export default ContractTypeDetailPage
