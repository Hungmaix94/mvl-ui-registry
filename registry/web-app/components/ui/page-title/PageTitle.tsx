import React, { useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { cn } from '@/utils'
import Button from '../button/Button'
import {
  IconArrowleft,
  IconArrowsleftright,
  IconClockcounterclockwise,
  IconCopy,
  IconEnvelopesimple,
  IconDownloadsimple,
  IconPencilsimple,
  IconTrashsimple,
} from '@/assets/icons'
import { BreadcrumbWrapper } from '@/components/ui'
import type { BreadcrumbItemData } from '../breadcrumb'
import { useLocation, useNavigate } from 'react-router-dom'
import { getDynamicRouteTitle, getRouteTitles } from '@/routes/AppRoute.tsx'
import { Flex, Separator } from '@radix-ui/themes'
import { canGoBackInApp, getParentRoute } from '@/utils/route-utils.ts'
import { getRememberedSearch } from '@/utils/list-url-memory.ts'
import { resolveBackTarget } from '@/utils/back-navigation.ts'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageTitleToolbar, { type PageTitleToolbarProps } from './PageTitleToolbar'

export interface PageTitleRef {
  handleBackBtn: (e?: any) => void
}

export type PageTitleTabConfig = {
  value: string
  label: string
  disabled?: boolean
  toolbarProps?: PageTitleToolbarProps
  topSlot?: React.ReactNode
  handleConvert?: (e: any) => void
  handleExportBtnIcon?: (e: any) => void
  handleMail?: (e: any) => void
  handleCopy?: (e: any) => void
  handleDelete?: (e: any) => void
  handleEdit?: (e: any) => void
  handleShowHistory?: (e: any) => void
  btnEditVariant?: 'primary' | 'secondary'
}

function hasToolbar(config?: PageTitleToolbarProps): boolean {
  if (!config) return false

  return (
    typeof config.handleSearch !== 'undefined' ||
    typeof config.handleFilter !== 'undefined' ||
    typeof config.handleConfigTableColumn !== 'undefined' ||
    typeof config.handleExportBtnFull !== 'undefined' ||
    typeof config.handleImportBtnFull !== 'undefined' ||
    typeof config.handleCreateNew !== 'undefined' ||
    typeof config.rightContent !== 'undefined' ||
    typeof config.leftContent !== 'undefined'
  )
}

export interface PageTitleProps {
  title?: string | React.ReactNode
  sub?: string | React.ReactNode // Subtitle right under title
  breadcrumb?: BreadcrumbItemData[]
  currentPageBreadcrumbTitle?: string
  idLabel?: string // Tên thực tế để thay thế ID trong breadcrumb
  hideBreadcrumb?: boolean // Hide breadcrumb for dashboard or other pages

  enableBackButton?: boolean
  handleBackButton?: (e: any) => void

  handleConvert?: (e: any) => void
  handleExportBtnIcon?: (e: any) => void
  handleMail?: (e: any) => void
  handleCopy?: (e: any) => void
  handleDelete?: (e: any) => void
  handleEdit?: (e: any) => void
  handleShowHistory?: (e: any) => void

  titleConvert?: string
  titleExportBtnIcon?: string
  titleMail?: string
  titleCopy?: string
  titleDelete?: string
  titleEdit?: string
  titleShowHistory?: string

  handleSearch?: (e: any) => void
  searchPlaceholder?: string
  searchClassName?: string
  searchValue?: string

  handleFilter?: (e: any) => void
  filterBadgeCount?: number

  handleConfigTableColumn?: (e: any) => void
  titleConfigTableColumn?: string

  handleExportBtnFull?: (e: any) => void
  handleImportBtnFull?: (e: any) => void
  handleImportPdf?: (e: any) => void
  handleImportExcel?: (e: any) => void

  handleCreateNew?: (e: any) => void
  titleCreateNew?: string

  btnEditVariant?: 'primary' | 'secondary'

  tabs?: PageTitleTabConfig[]
  activeTab?: string
  defaultActiveTab?: string
  onTabChange?: (value: string) => void

  customActions?: React.ReactNode
  topSlot?: React.ReactNode
  pageTitleClassName?: string
  /**
   * Class thêm cho chính thẻ `<h1>` tiêu đề màn.
   *
   * Khác `pageTitleClassName` (đặt lên khối bọc ngoài): muốn chỉnh đúng chữ tiêu đề thì phải vào
   * được `<h1>`, vì `typo-h5` đã khai `font-weight` nên class đặt ở cha không đè lên được.
   *
   * Mặc định mọi màn dùng `typo-h5` (700). Chỉ truyền prop này khi có yêu cầu riêng cho một màn —
   * dùng rộng là mỗi màn một kiểu chữ, đúng thứ token typography sinh ra để tránh.
   */
  titleClassName?: string
  toolbarLeftContent?: React.ReactNode
  rightContent?: React.ReactNode
}

const PageTitle = React.forwardRef<PageTitleRef, PageTitleProps>(
  (
    {
      title,
      breadcrumb: customBreadcrumb,
      currentPageBreadcrumbTitle: customBreadcrumbTitle,
      idLabel,
      hideBreadcrumb,

      enableBackButton,
      handleBackButton,

      handleConvert,
      handleExportBtnIcon,
      handleMail,
      handleCopy,
      handleDelete,
      handleEdit,
      btnEditVariant = 'primary',
      handleShowHistory,

      titleConvert,
      titleExportBtnIcon,
      titleMail,
      titleCopy,
      titleDelete,
      titleEdit,
      titleShowHistory,

      handleSearch,
      searchPlaceholder,
      searchClassName,
      searchValue,

      handleFilter,
      filterBadgeCount,

      handleConfigTableColumn,
      titleConfigTableColumn,

      handleExportBtnFull,
      handleImportBtnFull,
      handleImportPdf,
      handleImportExcel,
      handleCreateNew,
      titleCreateNew,

      tabs,
      activeTab,
      defaultActiveTab,
      onTabChange,

      customActions,
      topSlot,
      pageTitleClassName,
      titleClassName,
      toolbarLeftContent,
      rightContent,
    },
    ref
  ) => {
    const location = useLocation()
    const navigate = useNavigate()

    const [internalActiveTab, setInternalActiveTab] = useState<string | undefined>(
      defaultActiveTab ?? tabs?.[0]?.value
    )

    const hasTabs = !!tabs && tabs.length > 0
    const currentTab = hasTabs ? (activeTab ?? internalActiveTab ?? tabs?.[0]?.value) : undefined

    const handleTabChange = useCallback(
      (value: string) => {
        onTabChange?.(value)

        if (typeof activeTab === 'undefined') {
          setInternalActiveTab(value)
        }
      },
      [activeTab, onTabChange]
    )

    const activeTabConfig = useMemo(
      () => (hasTabs && currentTab ? tabs?.find((tab) => tab.value === currentTab) : undefined),
      [hasTabs, currentTab, tabs]
    )

    const pageTitle = useMemo<React.ReactNode>(() => {
      if (title) {
        return title
      }

      const currentPath = location.pathname.replace(/\/$/, '') || '/'

      // Try dynamic route title first
      const dynamicTitle = getDynamicRouteTitle(currentPath)
      if (dynamicTitle) {
        return dynamicTitle
      }

      const routeTitles = getRouteTitles()
      const routeTitle = routeTitles[currentPath]
      if (routeTitle) {
        return routeTitle
      }

      // Fallback: generate title from path segments
      const pathSegments = currentPath.split('/').filter(Boolean)
      if (pathSegments.length === 0) {
        return 'Dashboard'
      }

      const lastSegment = pathSegments[pathSegments.length - 1]
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
    }, [location.pathname, title])

    const breadcrumb = useMemo(() => {
      if (customBreadcrumb) {
        return customBreadcrumb
      }

      const pathSegments = location.pathname.split('/').filter(Boolean)

      const breadcrumbItems: BreadcrumbItemData[] = []

      // Build breadcrumb from path segments
      let currentPath = ''

      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`
        const isLast = index === pathSegments.length - 1

        // Check if segment is numeric ID
        const isNumericId = /^\d+$/.test(segment)

        // If it's an ID and we have idLabel, replace it
        if (isNumericId && idLabel) {
          breadcrumbItems.push({
            label: idLabel,
            href: isLast ? undefined : currentPath,
            isCurrentPage: false,
          })
          return
        }

        // Get label from routeTitles or use segment as fallback
        const label =
          getDynamicRouteTitle(currentPath) || segment.charAt(0).toUpperCase() + segment.slice(1)

        breadcrumbItems.push({
          label,
          href: isLast ? undefined : currentPath,
          isCurrentPage: isLast,
        })
      })

      // If no segments (root path), create breadcrumb for dashboard
      if (breadcrumbItems.length === 0) {
        return [
          {
            label: pageTitle,
            isCurrentPage: true,
          },
        ]
      }

      // Replace the last item with the page title (only if not already replaced by idLabel)
      if (breadcrumbItems.length > 0) {
        const lastItem = breadcrumbItems[breadcrumbItems.length - 1]
        // Only replace if the last item is not the idLabel replacement
        if (!idLabel || lastItem.label !== idLabel) {
          breadcrumbItems[breadcrumbItems.length - 1] = {
            label: customBreadcrumbTitle ?? pageTitle,
            isCurrentPage: true,
          }
        } else {
          // If last item is idLabel, just mark it as current page
          lastItem.isCurrentPage = true
        }
      }

      // Always return breadcrumb items, even if only one
      return breadcrumbItems
    }, [location.pathname, pageTitle, customBreadcrumb, idLabel, customBreadcrumbTitle])

    const shouldShowBreadcrumb = useMemo(() => {
      // Don't show breadcrumb if explicitly hidden
      if (hideBreadcrumb) {
        return false
      }

      // Don't show breadcrumb for dashboard (root path)
      const isDashboard = location.pathname === '/' || location.pathname === ''
      if (isDashboard) {
        return false
      }

      return true
    }, [hideBreadcrumb, location.pathname])

    const fallbackPath = useMemo(() => {
      return getParentRoute(location.pathname)
    }, [location.pathname])

    const toolbarPropsForRender: PageTitleToolbarProps | undefined = useMemo(() => {
      if (hasTabs) {
        return activeTabConfig?.toolbarProps
      }

      return {
        handleSearch,
        searchPlaceholder,
        searchClassName,
        searchValue,
        handleFilter,
        filterBadgeCount,
        handleConfigTableColumn,
        titleConfigTableColumn,
        handleExportBtnFull,
        titleExportBtnIcon,
        handleImportBtnFull,
        handleImportPdf,
        handleImportExcel,
        handleCreateNew,
        titleCreateNew,
        leftContent: toolbarLeftContent,
        rightContent,
      }
    }, [
      hasTabs,
      activeTabConfig,
      handleSearch,
      searchPlaceholder,
      searchClassName,
      searchValue,
      handleFilter,
      filterBadgeCount,
      handleConfigTableColumn,
      titleConfigTableColumn,
      handleExportBtnFull,
      titleExportBtnIcon,
      handleImportBtnFull,
      handleImportPdf,
      handleImportExcel,
      handleCreateNew,
      titleCreateNew,
      toolbarLeftContent,
      rightContent,
    ])

    const shouldShowToolbar = useMemo(
      () => hasToolbar(toolbarPropsForRender),
      [toolbarPropsForRender]
    )

    const showDivider = useMemo<boolean>(
      () => shouldShowToolbar || hasTabs,
      [shouldShowToolbar, hasTabs]
    )

    const topSlotForRender = useMemo(() => {
      if (hasTabs) {
        return activeTabConfig?.topSlot
      }
      return topSlot
    }, [hasTabs, activeTabConfig, topSlot])

    const handleBackBtn = useCallback(
      (e?: any) => {
        if (handleBackButton) {
          handleBackButton(e)
          return
        }

        const target = resolveBackTarget({
          from: location.state?.from,
          parentFrom: location.state?.parentFrom,
          canGoBack: canGoBackInApp(),
          fallbackPath,
          rememberedSearch: getRememberedSearch(fallbackPath),
        })

        if (target.type === 'pop') {
          navigate(-1)
          return
        }

        // Pass parentFrom as the new from so back navigation chain continues
        navigate(target.to, { state: target.from ? { from: target.from } : undefined })
      },
      [navigate, fallbackPath, handleBackButton, location.state]
    )

    useImperativeHandle(ref, () => ({
      handleBackBtn,
    }))

    const line1Actions = useMemo(() => {
      if (hasTabs && activeTabConfig) {
        return {
          handleConvert: activeTabConfig.handleConvert,
          handleExportBtnIcon: activeTabConfig.handleExportBtnIcon,
          handleMail: activeTabConfig.handleMail,
          handleCopy: activeTabConfig.handleCopy,
          handleDelete: activeTabConfig.handleDelete,
          handleEdit: activeTabConfig.handleEdit,
          handleShowHistory: activeTabConfig.handleShowHistory,
          btnEditVariant: activeTabConfig.btnEditVariant ?? btnEditVariant,
        }
      }

      return {
        handleConvert,
        handleExportBtnIcon,
        handleMail,
        handleCopy,
        handleDelete,
        handleEdit,
        handleShowHistory,
        btnEditVariant,
      }
    }, [
      hasTabs,
      activeTabConfig,
      handleConvert,
      handleExportBtnIcon,
      handleMail,
      handleCopy,
      handleDelete,
      handleEdit,
      handleShowHistory,
      btnEditVariant,
    ])

    return (
      <>
        <Flex
          direction={'column'}
          justify={'center'}
          align={'start'}
          gap={'0'}
          pt={'4'}
          pb={'4'}
          width={'100%'}
          className={cn(
            'bg-background-1',
            !showDivider && 'border-border-1 border-b',
            pageTitleClassName
          )}
        >
          {/* Line 1: Title and Actions */}
          <Flex width={'100%'} justify={'between'} align={'center'} className={'px-7'} py={'0'}>
            {/* Title Section */}
            <div className="flex w-[800px] flex-1 flex-col items-start gap-1.5">
              {shouldShowBreadcrumb && (
                <Flex align={'center'} gap={'3'}>
                  <BreadcrumbWrapper items={breadcrumb} className="w-full" />
                </Flex>
              )}

              {/* Title with Back Button */}
              <div className="flex w-full items-center gap-2">
                {(enableBackButton || handleBackButton) && (
                  <>
                    <Button
                      iconOnly
                      leftIcon={<IconArrowleft />}
                      variant={'secondary'}
                      className={cn(
                        'relative size-5 shrink-0',
                        'bg-transparent',
                        'hover:text-content-dark-1 hover:scale-125 hover:bg-transparent'
                      )}
                      onClick={handleBackBtn}
                    />
                  </>
                )}
                <h1 className={cn('typo-h5 text-content-dark-1', titleClassName)}>{pageTitle}</h1>
              </div>
            </div>

            {/* Action Buttons - Line 1 */}
            <div className="flex items-center justify-end gap-2">
              {[
                line1Actions.handleConvert && (
                  <Button
                    key="convert"
                    variant={'secondary'}
                    iconOnly
                    size={'large'}
                    leftIcon={<IconArrowsleftright />}
                    className={cn('p-2', 'bg-data-light-grey-hover')}
                    title={titleConvert || 'Chuyển đổi'}
                    onClick={line1Actions.handleConvert}
                  />
                ),
                line1Actions.handleExportBtnIcon && (
                  <Button
                    key="export"
                    variant="secondary"
                    iconOnly
                    size="large"
                    leftIcon={<IconDownloadsimple />}
                    onClick={line1Actions.handleExportBtnIcon}
                    className={cn('p-2', 'bg-data-light-grey-hover')}
                    title={titleExportBtnIcon || 'Xuất file'}
                  />
                ),
                line1Actions.handleMail && (
                  <Button
                    key="mail"
                    variant="secondary"
                    iconOnly
                    size="large"
                    leftIcon={<IconEnvelopesimple />}
                    onClick={line1Actions.handleMail}
                    className={cn('p-2', 'bg-data-light-grey-hover')}
                    title={titleMail || 'Gửi mail'}
                  />
                ),
                line1Actions.handleCopy && (
                  <Button
                    key="copy"
                    variant="secondary"
                    size="large"
                    leftIcon={<IconCopy />}
                    onClick={line1Actions.handleCopy}
                    className={cn('p-2', 'bg-data-light-grey-hover')}
                    title={titleCopy || 'Sao chép'}
                  />
                ),
                line1Actions.handleShowHistory && (
                  <Button
                    key="history"
                    variant="secondary"
                    size="large"
                    leftIcon={<IconClockcounterclockwise />}
                    onClick={line1Actions.handleShowHistory}
                    className={cn('p-2', 'bg-data-light-grey-hover')}
                    title={titleShowHistory || 'Xem lịch sử thao tác'}
                  />
                ),
                line1Actions.handleDelete && (
                  <Button
                    key="delete"
                    variant={'secondary'}
                    iconOnly
                    size={'large'}
                    leftIcon={<IconTrashsimple className={'text-action-primary-red-default'} />}
                    onClick={line1Actions.handleDelete}
                    className={cn('p-2', 'bg-data-light-grey-hover')}
                    title={titleDelete || 'Xoá'}
                  />
                ),
                line1Actions.handleEdit && (
                  <Button
                    key="edit"
                    variant={line1Actions.btnEditVariant}
                    size="medium"
                    leftIcon={<IconPencilsimple />}
                    onClick={line1Actions.handleEdit}
                    title={titleEdit || 'Chỉnh sửa'}
                  >
                    Chỉnh sửa
                  </Button>
                ),
                customActions && <React.Fragment key="custom">{customActions}</React.Fragment>,
              ]
                .filter(Boolean)
                .map((item, index, array) => (
                  <React.Fragment key={index}>
                    {item}
                    {index < array.length - 1 && (
                      <Separator orientation="vertical" className="h-5" />
                    )}
                  </React.Fragment>
                ))}
            </div>
          </Flex>

          {/* Divider */}
          {showDivider && <hr className={'border-border-1 mt-3 mb-3 w-full'} />}

          <Flex direction={'column'} gap={'2'} width={'100%'} className={'px-7'}>
            {hasTabs && tabs && tabs.length > 0 && (
              <Tabs value={currentTab} onValueChange={handleTabChange}>
                <TabsList className="gap-4 px-3 pb-2">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      disabled={tab.disabled}
                      className={'h-10 px-0 py-0 pb-2'}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {topSlotForRender && <div className="w-full">{topSlotForRender}</div>}

            {/* Line 2: Search, Filter, and Action Buttons */}
            {shouldShowToolbar && toolbarPropsForRender && (
              <PageTitleToolbar {...toolbarPropsForRender} />
            )}
          </Flex>
        </Flex>
      </>
    )
  }
)

PageTitle.displayName = 'PageTitle'

export default PageTitle
