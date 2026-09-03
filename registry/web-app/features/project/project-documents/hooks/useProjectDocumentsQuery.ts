import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE } from '@/constants/table'
import {
  PROJECT_DOCUMENT_SORT_OPTION,
  type ProjectDocumentSortOption,
} from '@/constants/project-document'
import { type RealestateLibraryFileRead, useProjectDocuments } from '@/services/document-service'
import type { DocumentPathItem } from '../components/header/DocumentsExplorerHeader'
import type { ProjectDocumentDisplayPriority } from '../components/sort-dropdown/sortDropdownConfig'
import type { DocumentsListHook } from '../types'
import { type ElibraryVisibility } from '@/constants/api-schema-aliases'

type UseProjectDocumentsQueryParams = {
  projectId: number
  rootFolderId: number | null
  rootLabel: string
  visibility?: ElibraryVisibility | null
  category?: number | null
  displayPriority?: ProjectDocumentDisplayPriority
  useDocumentsListHook?: DocumentsListHook
  allowNullRootFolderId?: boolean
}

export function useProjectDocumentsQuery({
  projectId,
  rootFolderId,
  rootLabel,
  visibility,
  category,
  displayPriority,
  useDocumentsListHook,
  allowNullRootFolderId = false,
}: UseProjectDocumentsQueryParams) {
  const [path, setPath] = useState<DocumentPathItem[]>([{ id: rootFolderId, label: rootLabel }])
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch] = useDebounceValue(searchInput, 300)
  const [sortOption, setSortOption] = useState<ProjectDocumentSortOption>(
    PROJECT_DOCUMENT_SORT_OPTION.UPDATED_DESC
  )
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<RealestateLibraryFileRead[]>([])
  const [hasMore, setHasMore] = useState(false)

  const currentParentId = path[path.length - 1]?.id ?? rootFolderId ?? null

  const queryParams = useMemo(() => {
    const orderingParts: string[] = []

    if (displayPriority) {
      orderingParts.push(displayPriority === 'folder' ? '-node_type' : 'node_type')
    }

    if (sortOption) {
      orderingParts.push(sortOption)
    }

    const ordering = orderingParts.join(',')

    return {
      page,
      page_size: PAGE_SIZE,
      parent: currentParentId ?? undefined,
      search: debouncedSearch.trim() || undefined,
      ordering,
      visibility: visibility ?? undefined,
      category: category ?? undefined,
    }
  }, [page, currentParentId, debouncedSearch, sortOption, visibility, category, displayPriority])

  const useListHook = useDocumentsListHook ?? useProjectDocuments
  const { data, isLoading, isFetching } = useListHook(projectId, queryParams, {
    enabled: !!projectId && (allowNullRootFolderId || rootFolderId != null),
  })

  useEffect(() => {
    setPath([{ id: rootFolderId, label: rootLabel }])
  }, [rootFolderId, rootLabel])

  useEffect(() => {
    setPage(1)
    setItems([])
  }, [currentParentId, debouncedSearch, sortOption, visibility, category])

  useEffect(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    setHasMore(page * PAGE_SIZE < count)
    if (page === 1) {
      setItems(results)
      return
    }
    setItems((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]))
      results.forEach((item) => map.set(item.id, item))
      return Array.from(map.values())
    })
  }, [data, page])

  const handleNavigatePath = useCallback((index: number) => {
    setPath((prev) => prev.slice(0, index + 1))
  }, [])

  const handleOpenFolder = useCallback((folder: RealestateLibraryFileRead) => {
    if (!folder) return
    const folderType = 'folder' as const
    if (folder.node_type !== folderType) return
    setPath((prev) => [...prev, { id: folder.id, label: folder.name }])
  }, [])

  const scrollHandler = useCallback(
    (el: HTMLDivElement | null, isFetchingFlag: boolean) => {
      if (!el || isFetchingFlag || !hasMore) return
      const threshold = 120
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
      if (remaining <= threshold) {
        setPage((prev) => prev + 1)
      }
    },
    [hasMore]
  )

  return {
    // query state
    path,
    setPath,
    searchInput,
    setSearchInput,
    debouncedSearch,
    sortOption,
    setSortOption,
    page,
    setPage,
    items,
    hasMore,
    isLoading,
    isFetching,
    currentParentId,
    // handlers
    handleNavigatePath,
    handleOpenFolder,
    scrollHandler,
  }
}
