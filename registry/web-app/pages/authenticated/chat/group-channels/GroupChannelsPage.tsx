import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { useAbility } from '@/lib/ability'

import { useGetChatChannels } from '@/features/chat/services/chat-service'
import { GroupChannel } from '@/features/chat/types'

import GroupChannelListTable from './components/GroupChannelListTable'
import { ManageAdminsDialogContent } from './components/ManageAdminsDialogContent'
import GroupChannelFilter, { GroupChannelFilterFormData } from './components/GroupChannelFilter'

import { APP_PATH } from '@/routes'
import type { BreadcrumbItemData } from '@/components/ui/breadcrumb'

import { useCreateGroupChannelDialog } from '@/features/chat/hooks/useCreateGroupChannelDialog'
import { useGroupChannelActions } from '@/features/chat/hooks/useGroupChannelActions'
import { useDialog } from '@/hooks/useDialog'
import { EditGroupChannelForm } from '@/features/chat/components/EditGroupChannelForm'
import AppDialog from '@/components/dialog/AppDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

const GroupChannelsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()

  const { openCreateDialog } = useCreateGroupChannelDialog()
  const { confirmDelete, confirmDisable, confirmEnable } = useGroupChannelActions()
  const { displayFormContent, displayClose } = useDialog()

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterFormRef = useRef<any>(null)

  const currentPage = parsePositiveInt(searchParams.get('page')) || 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const searchQuery = searchParams.get('search') || ''
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const trimmed = localSearchQuery.trim()
    const timer = setTimeout(() => {
      if (trimmed !== searchQuery) {
        setSearchParams(
          (prev) => {
            const newParams = new URLSearchParams(prev)
            newParams.set('page', '1')
            if (trimmed) {
              newParams.set('search', trimmed)
            } else {
              newParams.delete('search')
            }
            return newParams
          },
          { replace: true }
        )
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [localSearchQuery, searchQuery, setSearchParams])

  const filterState = searchParams.get('state') || ''
  const filterWritePolicy = searchParams.get('write_policy') || ''

  const { keysMap } = useAppConstant({
    module: 'chat',
    keys: [
      APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.WRITE_POLICY_CHOICES,
      APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.STATE_CHOICES,
    ],
  })

  const writePolicyChoices = keysMap.get(
    APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.WRITE_POLICY_CHOICES
  ) as Record<string, string>

  const stateChoices = keysMap.get(APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.STATE_CHOICES) as Record<
    string,
    string
  >

  const stateOptions = useMemo(() => {
    if (!stateChoices) return []
    return Object.entries(stateChoices).map(([value, label]) => ({ value, label }))
  }, [stateChoices])

  const writePolicyOptions = useMemo(() => {
    if (!writePolicyChoices) return []
    return Object.entries(writePolicyChoices).map(([value, label]) => ({ value, label }))
  }, [writePolicyChoices])

  const { data, isLoading, error } = useGetChatChannels()

  const filteredChannels = useMemo(() => {
    const channels = data?.channels || []
    return channels.filter((c) => {
      // 1. Search Query (name or description)
      if (searchQuery) {
        const query = searchQuery.trim().toLowerCase()
        const matchName = c.name?.toLowerCase().includes(query)
        const matchDesc = c.description?.toLowerCase().includes(query)
        if (!matchName && !matchDesc) return false
      }
      // 2. State Filter
      if (filterState && c.state !== filterState) {
        return false
      }
      // 3. Write Policy Filter
      if (filterWritePolicy && c.write_policy !== filterWritePolicy) {
        return false
      }
      return true
    })
  }, [data, searchQuery, filterState, filterWritePolicy])

  const paginatedChannels = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredChannels.slice(start, end)
  }, [filteredChannels, currentPage, pageSize])

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (filterState) count++
    if (filterWritePolicy) count++
    return count
  }, [filterState, filterWritePolicy])

  const handleSearch = useCallback((query: any) => {
    const queryStr = typeof query === 'string' ? query : query?.target?.value || ''
    setLocalSearchQuery(queryStr)
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues?.() as GroupChannelFilterFormData
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')

    if (formData.state) {
      newParams.set('state', formData.state)
    } else {
      newParams.delete('state')
    }

    if (formData.write_policy) {
      newParams.set('write_policy', formData.write_policy)
    } else {
      newParams.delete('write_policy')
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm?.()
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.delete('state')
    newParams.delete('write_policy')
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })

      const mainEl = document.querySelector('main')
      if (mainEl) {
        mainEl.scrollTop = 0
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [searchParams, setSearchParams]
  )

  const handleCreateNew = () => openCreateDialog()

  const handleEdit = (channel: GroupChannel) => {
    displayFormContent({
      title: 'Chỉnh sửa nhóm chat',
      content: <EditGroupChannelForm channel={channel} onSuccess={displayClose} />,
      hideFooter: true,
      dialogContentClassName: 'p-0',
    })
  }

  const handleManageAdmins = (channel: GroupChannel) => {
    displayFormContent({
      title: 'Quản lý Admin',
      content: <ManageAdminsDialogContent channel={channel} onClose={displayClose} />,
      hideFooter: true,
    })
  }

  const hasCreatePermission = ability.can('create', 'chat_channel')

  const breadcrumb: BreadcrumbItemData[] = [
    {
      label: 'Trang chủ',
      href: APP_PATH.DASHBOARD,
    },
    {
      label: 'Quản lý Chat',
      href: APP_PATH.CHAT_GROUP_CHANNELS,
    },
    {
      label: 'Quản lý Group Channel',
      isCurrentPage: true,
    },
  ]

  return (
    <>
      <PageTitle
        title="Quản lý Group Channel"
        breadcrumb={breadcrumb}
        handleCreateNew={hasCreatePermission ? handleCreateNew : undefined}
        titleCreateNew="Tạo nhóm mới"
        handleSearch={handleSearch}
        searchValue={localSearchQuery}
        searchPlaceholder="Tìm theo tên hoặc mô tả..."
        searchClassName="!w-[350px]"
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
      />

      <Flex flexGrow="1" direction="column" gap="4" className="pb-6">
        <GroupChannelListTable
          data={paginatedChannels}
          isLoading={isLoading}
          error={error}
          totalRecords={filteredChannels.length}
          pageSize={pageSize}
          currentPageIndex={currentPage - 1}
          onPaginationChange={handlePaginationChange}
          handleEdit={handleEdit}
          handleManageAdmins={handleManageAdmins}
          handleDisable={confirmDisable}
          handleEnable={confirmEnable}
          handleDelete={confirmDelete}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <GroupChannelFilter
            ref={filterFormRef}
            initialValues={{ state: filterState, write_policy: filterWritePolicy }}
            isOpen={isFilterDialogOpen}
            stateOptions={stateOptions}
            writePolicyOptions={writePolicyOptions}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </>
  )
}

export default GroupChannelsPage
