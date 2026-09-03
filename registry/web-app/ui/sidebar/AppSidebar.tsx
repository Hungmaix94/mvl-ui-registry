import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
  SidebarGroupLabel,
} from '@/components/ui/sidebar/sidebar.tsx'
import { APP_PATH } from '@/routes'
import { useAbility, parsePermissionCode } from '@/lib/ability.ts'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

import { IconCaretdown } from '@/assets/icons'
import { cn } from '@/utils'
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSidebarStore } from '@/store/sidebar-store'
import { getMenuItems, type SidebarMenuItem as MenuItemType } from '@/constants/menu-items'

type Sidebar = MenuItemType

// Helper functions for checking active states
const isParentOrChildActive = (item: Sidebar, pathname: string): boolean => {
  if (item.url) {
    if (item.url === '/') {
      return pathname === '/'
    }

    // CUSTOM FIX FOR PI vs SA Overlap
    if (
      item.url === APP_PATH.PROJECT_PRODUCT_INVENTORIES &&
      pathname.includes('/product-inventory')
    ) {
      return true
    }
    if (item.url === APP_PATH.PROJECT_SALE_ALLOCATIONS && pathname.includes('/product-inventory')) {
      return false
    }

    return pathname.startsWith(item.url)
  }

  if (item.children) {
    return item.children.some((child: Sidebar) => isParentOrChildActive(child, pathname))
  }

  return false
}

const getActiveChildTitle = (item: Sidebar, location: { pathname: string }): string | undefined => {
  if (!item.hasChildren || !item.children) return undefined

  const activeChild = item.children.find((child: Sidebar) =>
    isParentOrChildActive(child, location.pathname)
  )

  if (activeChild) {
    if (activeChild.hasChildren && activeChild.children) {
      const activeGrandChild = activeChild.children.find((grandChild: Sidebar) =>
        isParentOrChildActive(grandChild, location.pathname)
      )
      return activeGrandChild
        ? `${activeChild.title} • ${activeGrandChild.title}`
        : activeChild.title
    }
    return activeChild.title
  }

  return undefined
}

// Recursive component for rendering menu items
const MenuItem = ({
  item,
  level,
  path,
  isActive,
  tooltipTitle,
  openSidebar,
  openCollapsible,
  onIconClick,
  onCollapsibleChange,
  onNavigate,
}: {
  item: Sidebar
  level: number
  path: string
  isActive: boolean
  tooltipTitle: string
  openSidebar: boolean
  openCollapsible: Set<string>
  onIconClick: (path: string, item: Sidebar) => void
  onCollapsibleChange: (path: string, isOpen: boolean) => void
  onNavigate: () => void
}) => {
  const location = useLocation()
  const isOpen = openCollapsible.has(path)
  const hasChildren = item.hasChildren && item.children && item.children.length > 0

  // Determine if we should use the "Main Item" structure (SidebarMenuItem)
  // This applies to Level 1 items (both leaves and branches) and nested branches (Level > 1 with children)
  const isMainItem = level === 1 || hasChildren

  if (item.isGroupLabel) {
    return (
      <SidebarMenuItem>
        <div className="mt-6 mb-2 px-2 text-xs font-bold text-gray-500 uppercase">{item.title}</div>
      </SidebarMenuItem>
    )
  }

  if (isMainItem) {
    return (
      <SidebarMenuItem>
        {!hasChildren && item?.url ? (
          <SidebarMenuButton
            asChild
            isActive={isActive}
            data-level={level}
            className={cn(
              isActive ? '!bg-action-primary-red-activated' : '',
              level > 1 ? 'w-full' : '' // Ensure full width for nested items
            )}
          >
            <Link to={item.url} onClick={onNavigate}>
              {/* ICON - Only for Level 1 */}
              {level === 1 && (
                <div
                  className={'basis-[20px]'}
                  title={!openSidebar ? tooltipTitle : undefined}
                  onClick={(e) => {
                    // When sidebar is closed, handle click for all items
                    if (!openSidebar) {
                      e.stopPropagation()
                      e.preventDefault()
                      onIconClick(path, item)
                    }
                  }}
                >
                  {item.icon && (
                    <item.icon
                      size={16}
                      className={cn(
                        'text-content-dark-1',
                        !openSidebar && isActive
                          ? 'group-data-[collapsible=icon]:text-action-primary-red-default'
                          : 'group-data-[collapsible=icon]:text-content-dark-2',
                        openSidebar && isActive ? 'text-action-primary-red-default' : ''
                      )}
                    />
                  )}
                </div>
              )}

              {/* Title */}
              <Text
                className={cn(
                  'typo-body-base-medium flex-1 truncate',
                  isActive ? 'text-action-primary-red-default' : 'text-content-dark-1'
                )}
                title={item.title}
              >
                {item.title}
              </Text>
            </Link>
          </SidebarMenuButton>
        ) : (
          <Collapsible
            className="group/collapsible"
            data-level={level}
            data-path={path}
            open={isOpen}
            onOpenChange={(isOpen) => onCollapsibleChange(path, isOpen)}
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                isActive={isActive}
                data-level={level}
                className={cn(level > 1 ? 'w-full' : '')}
              >
                {/* ICON - Only for Level 1 */}
                {level === 1 && (
                  <div
                    className={'basis-[20px]'}
                    title={!openSidebar ? tooltipTitle : undefined}
                    onClick={(e) => {
                      // When sidebar is closed, handle click for all items
                      if (!openSidebar) {
                        e.stopPropagation()
                        onIconClick(path, item)
                      }
                    }}
                  >
                    {item.icon && (
                      <item.icon
                        size={16}
                        className={cn(
                          'text-content-dark-1',
                          !openSidebar && isActive
                            ? 'group-data-[collapsible=icon]:text-action-primary-red-default'
                            : 'group-data-[collapsible=icon]:text-content-dark-2'
                        )}
                      />
                    )}
                  </div>
                )}

                {/* Title */}
                <Text
                  className={cn('typo-body-base-medium flex-1 truncate', 'text-content-dark-1')}
                  title={item.title}
                >
                  {item.title}
                </Text>

                {/* Chevron - Only if hasChildren */}
                {hasChildren && (
                  <IconCaretdown
                    className={cn(
                      'text-content-dark-1 ml-auto transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                    data-testid="chevron-down-icon"
                  />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>

            {/* Recursive Children */}
            {hasChildren && (
              <CollapsibleContent
                className={cn(
                  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
                )}
              >
                <SidebarMenuSub>
                  {item.children?.map((child: Sidebar, idx: number) => (
                    <MenuItem
                      key={`${child.title}_${idx}`}
                      item={child}
                      level={level + 1}
                      path={`${path}-${idx}`}
                      isActive={isParentOrChildActive(child, location.pathname)}
                      tooltipTitle={tooltipTitle} // Pass down, though mostly unused in deeper levels
                      openSidebar={openSidebar}
                      openCollapsible={openCollapsible}
                      onIconClick={onIconClick}
                      onCollapsibleChange={onCollapsibleChange}
                      onNavigate={onNavigate}
                    />
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            )}
          </Collapsible>
        )}
      </SidebarMenuItem>
    )
  } else {
    // Level > 1 Leaf Nodes (SidebarMenuSubItem)
    return (
      <SidebarMenuSubItem
        className={cn(
          'py-0',
          'relative',
          'w-full',
          level >= 3 ? 'pl-0' : '' // Maintain pl-0 for level 3+ based on original code
        )}
      >
        <Flex
          gap={'2'}
          align={'center'}
          className={cn('w-full', isActive ? 'bg-action-primary-red-activated' : '')}
        >
          {item.url && (
            <SidebarMenuSubButton
              asChild
              isActive={isActive}
              className={cn('w-full flex-1 truncate')}
              title={item.title}
            >
              <Link
                to={item.url}
                className={cn(
                  'typo-body-base-medium text-content-dark-2 flex h-fit w-full items-start gap-2 py-1 text-wrap'
                )}
                onClick={onNavigate}
              >
                {item.icon && (
                  <span className="mt-0.5 shrink-0">
                    <item.icon
                      size={16}
                      className={cn(isActive ? 'text-action-primary-red' : 'text-gray-500')}
                    />
                  </span>
                )}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuSubButton>
          )}
        </Flex>
      </SidebarMenuSubItem>
    )
  }
}

const AppSidebar = ({
  className,
  style,
}: {
  className?: string | undefined
  style?: CSSProperties | undefined
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const ability = useAbility()

  const { open: openSidebar, toggleSidebar } = useSidebar()

  const items = useMemo<Array<Sidebar>>(() => getMenuItems(), [])

  const filterMenuItems = useCallback(
    (menuItems: Sidebar[]): Sidebar[] => {
      return menuItems
        .map((item) => {
          if (item.children) {
            const filteredChildren = filterMenuItems(item.children)
            if (filteredChildren.length > 0) {
              return { ...item, children: filteredChildren }
            }
            if (!item.url) {
              return null
            }
          }

          if (item.permission) {
            const permissionsList = Array.isArray(item.permission)
              ? item.permission
              : [item.permission]
            const hasPermission = permissionsList.every((permission) => {
              const parsed = parsePermissionCode(permission)
              return parsed ? ability.can(parsed.action, parsed.subject) : false
            })
            if (hasPermission) {
              return item
            }
            return null
          }

          return item
        })
        .filter((item): item is Sidebar => item !== null)
    },
    [ability]
  )

  const filteredItems = useMemo(() => filterMenuItems(items), [items, filterMenuItems])

  const onNavigate = useCallback(() => {}, [])

  // Helper to get all paths recursively
  const getAllPaths = useCallback((items: Sidebar[], parentPath = ''): string[] => {
    let paths: string[] = []
    items.forEach((item, index) => {
      const currentPath = parentPath ? `${parentPath}-${index}` : index.toString()
      paths.push(currentPath)
      if (item.children) {
        paths = paths.concat(getAllPaths(item.children, currentPath))
      }
    })
    return paths
  }, [])

  const { openCollapsibles: openCollapsiblesArray, setOpenCollapsibles: setStoreOpenCollapsibles } =
    useSidebarStore()

  const openCollapsibles = useMemo(() => new Set(openCollapsiblesArray), [openCollapsiblesArray])

  const setOpenCollapsibles = useCallback(
    (newSet: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      if (typeof newSet === 'function') {
        // We can't easily support function updates with the current store structure if we want to be pure,
        // but we can derive it. However, the store setter expects an array.
        // Let's just use the store's toggle/set methods directly where possible, or wrap it.
        // For now, to minimize refactor, I'll just get the current value from the hook.
        // But wait, `setOpenCollapsibles` in the component is used as a state setter.
        // I should probably just expose a wrapper.
        const current = new Set(openCollapsiblesArray)
        const next = newSet(current)
        setStoreOpenCollapsibles(Array.from(next))
      } else {
        setStoreOpenCollapsibles(Array.from(newSet))
      }
    },
    [openCollapsiblesArray, setStoreOpenCollapsibles]
  )

  const [openedByIconClick, setOpenedByIconClick] = useState(false)
  const isSettingByIconClickRef = useRef(false)

  // Scroll to active item when sidebar expands
  // useEffect(() => {
  //   if (openSidebar) {
  //     // Small timeout to allow render
  //     setTimeout(() => {
  //       const activeElement = document.querySelector('.bg-action-primary-red-activated')
  //       if (activeElement) {
  //         activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  //       }
  //     }, 100)
  //   }
  // }, [openSidebar])

  // Helper to find path to active child
  const findActiveChildPath = useCallback(
    (children: Sidebar[], parentPath: string, pathname: string): string[] => {
      const paths: string[] = []

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const childPath = `${parentPath}-${i}`

        if (isParentOrChildActive(child, pathname)) {
          paths.push(childPath)

          // If this child has children, recursively find active path
          if (child.children) {
            const nestedPaths = findActiveChildPath(child.children, childPath, pathname)
            paths.push(...nestedPaths)
          }

          // Only follow one active branch
          break
        }
      }

      return paths
    },
    []
  )

  const brieflyGlowingEffect = useCallback((element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => {
      // Store original background color
      const originalBgColor = element.style.backgroundColor || ''
      element.style.transition = 'background-color 0.5s ease'

      // Create blinking effect: red -> white -> red (repeat for 2 seconds)
      let isRed = true
      const blinkInterval = setInterval(() => {
        if (isRed) {
          element.style.backgroundColor = 'var(--color-action-primary-red-activated)'
        } else {
          element.style.backgroundColor = 'transparent'
        }
        isRed = !isRed
      }, 500) // Toggle every 250ms

      // Stop blinking and restore original background after 2 seconds
      setTimeout(() => {
        clearInterval(blinkInterval)
        element.style.backgroundColor = originalBgColor
        setTimeout(() => {
          element.style.transition = ''
        }, 200)
      }, 2000)
    }, 300) // Wait a bit for scroll to start
  }, [])
  const handleIconClick = useCallback(
    (index: number, item: Sidebar) => {
      // Scroll to the clicked item
      setTimeout(() => {
        const element = document.querySelector(
          `[data-level="1"][data-path="${index}"]`
        ) as HTMLElement

        if (element) {
          brieflyGlowingEffect(element)
        }
      }, 100)

      if (item.hasChildren) {
        if (!openSidebar) {
          isSettingByIconClickRef.current = true
          setOpenedByIconClick(true)

          const pathsToOpen = new Set<string>()
          pathsToOpen.add(index.toString())

          if (item.children) {
            // Find the active child path and only open that branch
            const activeChildPaths = findActiveChildPath(
              item.children,
              index.toString(),
              location.pathname
            )

            if (activeChildPaths.length > 0) {
              // Only open the path to the active child
              activeChildPaths.forEach((p) => pathsToOpen.add(p))
            } else {
              // If no active child, open all children (fallback behavior)
              const childPaths = getAllPaths(item.children, index.toString())
              childPaths.forEach((p) => pathsToOpen.add(p))
            }
          }

          setOpenCollapsibles(pathsToOpen)
          toggleSidebar()
        }
      } else if (item.url) {
        // For items without children, open sidebar and navigate
        if (!openSidebar) {
          toggleSidebar()
        }
        navigate(item.url)
      }
    },
    [
      openSidebar,
      toggleSidebar,
      navigate,
      getAllPaths,
      findActiveChildPath,
      location.pathname,
      setOpenCollapsibles,
      brieflyGlowingEffect,
    ]
  )

  const handleCollapsibleChange = useCallback(
    (path: string, isOpen: boolean) => {
      if (isSettingByIconClickRef.current) {
        isSettingByIconClickRef.current = false
        return
      }

      setOpenCollapsibles((prev) => {
        const newSet = new Set(prev)
        if (isOpen) {
          newSet.add(path)
        } else {
          newSet.delete(path)
        }
        return newSet
      })
    },
    [setOpenCollapsibles]
  )

  // Remove the useEffect that resets state on openSidebar change,
  // as we now want to persist state (or we rely on the store).
  // The user said "giữ nguyên được trạng thái" (keep state).
  // So we DON'T reset to all open or anything else when toggling sidebar normally.

  useEffect(() => {
    if (openedByIconClick) {
      setOpenedByIconClick(false)
    }
  }, [openedByIconClick])

  return (
    <>
      <Sidebar
        className={cn(
          className,
          'top-(--header-height) print:hidden',
          'h-[calc(100svh-var(--header-height))]!'
        )}
        style={{ ...style }}
      >
        <SidebarContent>
          <SidebarGroup className={'overflow-auto'}>
            <SidebarMenu>
              {filteredItems.map((item, index) => {
                if (item.isGroupLabel) {
                  return (
                    <SidebarGroupLabel
                      key={index}
                      className="mt-6 mb-2 px-2 text-xs font-bold text-gray-500 uppercase"
                    >
                      {item.title}
                    </SidebarGroupLabel>
                  )
                }

                const activeChildTitle = getActiveChildTitle(item, location)
                const tooltipTitle = activeChildTitle
                  ? `${item.title} • ${activeChildTitle}`
                  : item.title
                const isActive = isParentOrChildActive(item, location.pathname)

                return (
                  <MenuItem
                    key={index}
                    item={item}
                    level={1}
                    path={index.toString()}
                    isActive={isActive}
                    tooltipTitle={tooltipTitle}
                    openSidebar={openSidebar}
                    openCollapsible={openCollapsibles}
                    onIconClick={(path, item) => {
                      const index = parseInt(path)
                      handleIconClick(index, item)
                    }}
                    onCollapsibleChange={handleCollapsibleChange}
                    onNavigate={onNavigate}
                  />
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter
          className={cn(
            'border-border-1 border-t-[1px] border-solid',
            'py-4',
            openSidebar ? '' : 'pb-[21px]'
          )}
        >
          <SidebarTrigger
            className={cn(
              'bg-transparent',
              'flex justify-start',
              'min-w-fit p-0',
              'hover:text-content-dark-2 hover:bg-transparent',
              'cursor-pointer',
              'sm:hidden md:block'
            )}
          />
        </SidebarFooter>
      </Sidebar>
    </>
  )
}

export default AppSidebar
