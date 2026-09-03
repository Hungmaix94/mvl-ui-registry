import { useCallback, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import BlockDetailWrapper from '@/features/org/block/view-details/BlockDetailWrapper.tsx'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams } from 'react-router-dom'
import { useBlockDelete } from '@/features/org/block/_shares/hooks/useBlockDelete.tsx'
import { useBlock } from '@/services'
import { isNotFoundError } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

export const BlockDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: block, isLoading, error } = useBlock(Number(id))
  const blockName = useMemo(() => block?.name || 'Chi tiết khối', [block])
  const navigate = useNavigate()
  const { openDeleteDialog } = useBlockDelete(() => {
    navigate(APP_PATH.BLOCK_MANAGEMENT)
  })
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !block
  }, [isLoading, error, block])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'block')

  const handleEdit = useCallback(() => {
    if (id) {
      const path = APP_PATH.BLOCK_MANAGEMENT_EDIT.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (block) {
      openDeleteDialog(block)
    }
  }, [openDeleteDialog, block])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.BLOCK_MANAGEMENT_HISTORY.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  return (
    <>
      <PageTitle
        title={blockName}
        idLabel={block?.name}
        enableBackButton
        handleEdit={ability.can('update', 'block') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'block') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'block') ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasReadPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <BlockDetailWrapper block={block!} />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default BlockDetailPage
