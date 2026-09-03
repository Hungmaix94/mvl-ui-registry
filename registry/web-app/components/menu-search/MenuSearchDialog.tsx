import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComponentType } from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/components/ui/command'
import { useAbility, parsePermissionCode } from '@/lib/ability'
import { TIcon } from '@/types'
import { getMenuItems, type SidebarMenuItem } from '@/constants/menu-items'
import { removeVietnameseDiacritics } from '@/utils/string-utils'
import { cn } from '@/lib/utils'

// Helper function to highlight matching text
function highlightText(text: string, searchValue: string): React.ReactNode {
  if (!searchValue.trim()) {
    return text
  }

  const searchLower = searchValue.toLowerCase().trim()
  const searchNormalized = removeVietnameseDiacritics(searchLower)
  const textLower = text.toLowerCase()
  const textNormalized = removeVietnameseDiacritics(textLower)

  // Find all match positions
  const matches: Array<{ start: number; end: number }> = []

  // Find exact matches (case-insensitive)
  let index = 0
  while (index < textLower.length) {
    const matchIndex = textLower.indexOf(searchLower, index)
    if (matchIndex === -1) break
    matches.push({ start: matchIndex, end: matchIndex + searchLower.length })
    index = matchIndex + 1
  }

  // Find normalized matches (diacritic-insensitive)
  // We need to find where normalized text matches and map back to original positions
  index = 0
  while (index < textNormalized.length) {
    const normMatchIndex = textNormalized.indexOf(searchNormalized, index)
    if (normMatchIndex === -1) break

    // Map normalized position back to original text position
    let normPos = 0
    let origPos = 0

    // Find start position in original text
    while (normPos < normMatchIndex && origPos < text.length) {
      const char = text[origPos]
      const charNorm = removeVietnameseDiacritics(char.toLowerCase())
      normPos += charNorm.length
      origPos++
    }
    const origStart = origPos

    // Find end position in original text
    const targetNormEnd = normMatchIndex + searchNormalized.length
    while (normPos < targetNormEnd && origPos < text.length) {
      const char = text[origPos]
      const charNorm = removeVietnameseDiacritics(char.toLowerCase())
      normPos += charNorm.length
      origPos++
    }
    const origEnd = origPos

    // Check if this match overlaps with existing matches
    const overlaps = matches.some((m) => !(origEnd <= m.start || origStart >= m.end))

    if (!overlaps) {
      matches.push({ start: origStart, end: origEnd })
    }

    index = normMatchIndex + 1
  }

  if (matches.length === 0) {
    return text
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start)

  // Merge overlapping matches
  const merged: Array<{ start: number; end: number }> = []
  for (const match of matches) {
    if (merged.length === 0) {
      merged.push(match)
    } else {
      const last = merged[merged.length - 1]
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end)
      } else {
        merged.push(match)
      }
    }
  }

  // Build highlighted JSX
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  for (const match of merged) {
    if (match.start > lastIndex) {
      parts.push(text.slice(lastIndex, match.start))
    }
    parts.push(
      <mark key={`${match.start}-${match.end}`} className="bg-yellow-200 text-inherit">
        {text.slice(match.start, match.end)}
      </mark>
    )
    lastIndex = match.end
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

type Sidebar = SidebarMenuItem

type FlattenedMenuItem = {
  title: string
  fullPath: string
  url: string
  permission?: string | string[]
  icon?: ComponentType<TIcon>
}

// Flatten menu items recursively
function flattenMenuItems(items: Sidebar[], parentTitle?: string): FlattenedMenuItem[] {
  const flattened: FlattenedMenuItem[] = []

  items.forEach((item) => {
    // Use parent title if available, otherwise use item title
    const currentFullPath = parentTitle ? `${parentTitle} • ${item.title}` : item.title

    // If item has URL, add it to flattened list
    if (item.url) {
      flattened.push({
        title: item.title,
        fullPath: currentFullPath,
        url: item.url,
        permission: item.permission,
        icon: item.icon,
      })
    }

    // Recursively process children - use current item's title as parent for children
    if (item.children && item.children.length > 0) {
      const childItems = flattenMenuItems(item.children, currentFullPath)
      flattened.push(...childItems)
    }
  })

  return flattened
}

// Search filter function
function searchMenuItems(items: FlattenedMenuItem[], searchValue: string): FlattenedMenuItem[] {
  if (!searchValue.trim()) {
    return items
  }

  const searchLower = searchValue.toLowerCase().trim()
  const searchNormalized = removeVietnameseDiacritics(searchLower)

  return items.filter((item) => {
    const titleLower = item.title.toLowerCase()
    const fullPathLower = item.fullPath.toLowerCase()
    const titleNormalized = removeVietnameseDiacritics(titleLower)
    const fullPathNormalized = removeVietnameseDiacritics(fullPathLower)
    const titleMatch =
      titleNormalized.includes(searchNormalized) || titleLower.includes(searchLower)
    const fullPathMatch =
      fullPathNormalized.includes(searchNormalized) || fullPathLower.includes(searchLower)
    return titleMatch || fullPathMatch
  })
}

export default function MenuSearchDialog() {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()
  const ability = useAbility()

  // Get menu items
  const menuItems = useMemo(() => getMenuItems(), [])

  // Flatten menu items first (before permission filtering)
  // This ensures all items are available for search
  const allFlattenedItems = useMemo(() => flattenMenuItems(menuItems), [menuItems])

  // Filter by permissions after flattening
  const filteredItems = useMemo(() => {
    return allFlattenedItems.filter((item) => {
      if (!item.permission) {
        return true // Items without permission requirement are always shown
      }
      const permissionsList = Array.isArray(item.permission) ? item.permission : [item.permission]
      return permissionsList.every((permission) => {
        const parsed = parsePermissionCode(permission)
        return parsed ? ability.can(parsed.action, parsed.subject) : false
      })
    })
  }, [allFlattenedItems, ability])

  // Filter by search
  const searchResults = useMemo(
    () => searchMenuItems(filteredItems, searchValue),
    [filteredItems, searchValue]
  )

  // Keyboard shortcut handler
  // Supports both Mac (Cmd+K) and Windows/Linux (Alt+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCmdK = isMac && event.metaKey && event.key === 'k'
      const isAltK = !isMac && event.altKey && event.key === 'k'

      if (isCmdK || isAltK) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchValue('')
    }
  }, [open])

  // Handle item selection
  const handleSelect = useCallback(
    (item: FlattenedMenuItem) => {
      setOpen(false)
      navigate(item.url)
    },
    [navigate]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Tìm kiếm menu"
      description="Tìm kiếm menu items"
      className="max-w-lg"
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Hãy nhập tên menu"
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>Không có kết quả</CommandEmpty>
        {searchResults.map((item, index) => {
          const IconComponent = item.icon
          return (
            <CommandItem
              key={`${item.url}-${index}`}
              value={item.url}
              onSelect={() => handleSelect(item)}
              className={cn(
                'cursor-pointer',
                'data-[selected=true]:bg-action-primary-red-focus data-[selected=true]:text-content-light-1',
                '[&[data-selected=true]_svg]:!text-content-light-1',
                '[&[data-selected=true]_span]:!text-content-light-1',
                '[&[data-selected=true]_mark]:!bg-yellow-300',
                '[&[data-selected=true]_mark]:!text-content-dark-1'
              )}
            >
              {IconComponent && (
                <IconComponent size={20} className="text-content-dark-2 shrink-0" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="typo-body-sm text-content-dark-1 truncate" title={item.title}>
                  {highlightText(item.title, searchValue)}
                </span>
                {item.fullPath !== item.title && (
                  <span
                    className="typo-body-xs text-content-light-4 truncate"
                    title={item.fullPath}
                  >
                    {highlightText(item.fullPath, searchValue)}
                  </span>
                )}
              </div>
            </CommandItem>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
