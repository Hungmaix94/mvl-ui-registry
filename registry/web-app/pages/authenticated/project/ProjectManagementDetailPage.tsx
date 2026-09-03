import { useCallback, useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import ProjectOverview from '@/features/project/overview/ProjectOverview.tsx'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useProjectDelete } from '@/features/project/_shares/hooks/useProjectDelete.tsx'
import { useProject } from '@/services/realestate-service.ts'
import { isNotFoundError } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import type { PageTitleTabConfig } from '@/components/ui/page-title/PageTitle.tsx'
import { type ProjectDocumentsTabSlots } from '@/features/project/project-documents/types/index.ts'
import { PROJECT_DETAIL_TAB, PROJECT_DETAIL_TABS, type ProjectDetailTab } from '@/constants/project'
import ProjectDocumentsExplorer from '@/features/project/project-documents/ProjectDocumentsExplorer.tsx'
import {
  PromotionCommissionConfigTab,
  type PromotionCommissionConfigTabSlots,
} from '@/features/project/promotion-commission-config/components/PromotionCommissionConfigTab.tsx'
import StaffCommissionRateSection from '@/features/project/staff-commission-rates/components/StaffCommissionRateSection'

export const ProjectManagementDetailPage = () => {
  const { id } = useParams<{ id: string }>()

  const { data: projectResponse, isLoading, error } = useProject(Number(id))
  const project = useMemo(() => projectResponse, [projectResponse])

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { openDeleteDialog } = useProjectDelete(() => {
    // Preserve query params when navigating back after delete
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.PROJECT_MANAGEMENT)
    }
  })
  const ability = useAbility()

  const currentTabFromUrl = searchParams.get('tab') || PROJECT_DETAIL_TAB.OVERVIEW

  const activeTab = (PROJECT_DETAIL_TABS as readonly string[]).includes(currentTabFromUrl)
    ? (currentTabFromUrl as ProjectDetailTab)
    : PROJECT_DETAIL_TAB.OVERVIEW

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !project
  }, [isLoading, error, project])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'project')

  const handleEdit = useCallback(() => {
    if (id) {
      const path = APP_PATH.PROJECT_MANAGEMENT_EDIT.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (project) {
      openDeleteDialog(project)
    }
  }, [openDeleteDialog, project])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.PROJECT_MANAGEMENT_HISTORY.replace(':id', id)
      navigate(path)
    }
  }, [navigate, id])

  const handleTabChange = useCallback(
    (value: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', value)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const [documentsTabSlots, setDocumentsTabSlots] = useState<ProjectDocumentsTabSlots | null>(null)
  const [commissionTabSlots, setCommissionTabSlots] =
    useState<PromotionCommissionConfigTabSlots | null>(null)

  const tabs: PageTitleTabConfig[] = useMemo(() => {
    const results: Array<PageTitleTabConfig> = []

    if (ability.can('retrieve', 'project')) {
      results.push({
        value: PROJECT_DETAIL_TAB.OVERVIEW,
        label: 'Thông tin chi tiết',
        handleEdit: ability.can('update', 'project') ? handleEdit : undefined,
        handleDelete: ability.can('destroy', 'project') ? handleDelete : undefined,
        handleShowHistory: ability.can('histories', 'project') ? handleShowHistory : undefined,
      })
    }

    if (ability.can('list', 'project_document')) {
      results.push({
        value: PROJECT_DETAIL_TAB.DOCUMENTS,
        label: 'Tài liệu',
        toolbarProps: documentsTabSlots?.toolbarProps,
      })
    }

    if (ability.can('list', 'project_promotion_recipient')) {
      results.push({
        value: PROJECT_DETAIL_TAB.COMMISSION,
        label: 'Cấu hình Hoa hồng',
        handleEdit: commissionTabSlots?.handleEdit,
      })
    }

    return results
  }, [
    ability,
    handleDelete,
    handleEdit,
    handleShowHistory,
    documentsTabSlots?.toolbarProps,
    commissionTabSlots?.handleEdit,
  ])

  return (
    <>
      <PageTitle
        title={project?.name || ''}
        enableBackButton={true}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasReadPermission}
      >
        <Flex
          flexGrow={'1'}
          direction="column"
          gap="4"
          className={activeTab === PROJECT_DETAIL_TAB.OVERVIEW ? 'pt-0 pb-6' : '!hidden'}
        >
          {project && <ProjectOverview project={project} />}
        </Flex>
        {project && (
          <Flex
            flexGrow={'1'}
            direction="column"
            gap="4"
            className={activeTab === PROJECT_DETAIL_TAB.DOCUMENTS ? 'pb-0' : '!hidden'}
          >
            <ProjectDocumentsExplorer project={project} setTabSlots={setDocumentsTabSlots} />
          </Flex>
        )}
        {project && (
          <Flex
            flexGrow={'1'}
            direction="column"
            gap="4"
            className={activeTab === PROJECT_DETAIL_TAB.COMMISSION ? 'pt-0 pb-6' : '!hidden'}
          >
            <div className="px-10">
              <StaffCommissionRateSection
                projectId={Number(id)}
                active={activeTab === PROJECT_DETAIL_TAB.COMMISSION}
              />
            </div>
            <div className="border-border-1 mx-10 border-t" />
            <div className="flex flex-col gap-3">
              <h3 className="typo-body-lg-semibold text-content-dark-1 px-10">
                Tỷ lệ doanh thu xúc tiến
              </h3>
              <PromotionCommissionConfigTab
                projectId={Number(id)}
                active={activeTab === PROJECT_DETAIL_TAB.COMMISSION}
                setTabSlots={setCommissionTabSlots}
              />
            </div>
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default ProjectManagementDetailPage
