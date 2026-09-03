import { useState } from 'react'
import {
  PROJECT_DOCUMENT_VIEW_MODE,
  type ProjectDocumentViewMode,
} from '@/constants/project-document'
import {
  DISPLAY_PRIORITY_FOLDER,
  type ProjectDocumentDisplayPriority,
} from '../components/sort-dropdown/sortDropdownConfig'

export function useProjectDocumentsViewState() {
  const [viewMode, setViewMode] = useState<ProjectDocumentViewMode>(PROJECT_DOCUMENT_VIEW_MODE.GRID)
  const [displayPriority, setDisplayPriority] =
    useState<ProjectDocumentDisplayPriority>(DISPLAY_PRIORITY_FOLDER)
  const [sortOpen, setSortOpen] = useState(false)

  return {
    viewMode,
    setViewMode,
    displayPriority,
    setDisplayPriority,
    sortOpen,
    setSortOpen,
  }
}
