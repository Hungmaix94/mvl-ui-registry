import {
  PROJECT_DOCUMENT_SORT_OPTION,
  PROJECT_DOCUMENT_VIEW_MODE,
  type ProjectDocumentSortOption,
  type ProjectDocumentViewMode,
} from '@/constants/project-document'
import {
  DISPLAY_PRIORITY_FILE,
  DISPLAY_PRIORITY_FOLDER,
  type ProjectDocumentDisplayPriority,
} from '../components/sort-dropdown/sortDropdownConfig'

const PROJECT_DOCUMENTS_SETTINGS_VERSION = 1 as const

type ProjectDocumentsUserSettings = {
  version: typeof PROJECT_DOCUMENTS_SETTINGS_VERSION
  viewMode: ProjectDocumentViewMode
  sortOption: ProjectDocumentSortOption
  displayPriority: ProjectDocumentDisplayPriority
}

function getProjectDocumentsSettingsKey(
  username: string | null | undefined,
  namespace = 'project-documents'
) {
  return `${username || 'guest'}-${namespace}-settings`
}

function isValidViewMode(value: unknown): value is ProjectDocumentViewMode {
  return value === PROJECT_DOCUMENT_VIEW_MODE.GRID || value === PROJECT_DOCUMENT_VIEW_MODE.LIST
}

function isValidDisplayPriority(value: unknown): value is ProjectDocumentDisplayPriority {
  return value === DISPLAY_PRIORITY_FOLDER || value === DISPLAY_PRIORITY_FILE
}

function isValidSortOption(value: unknown): value is ProjectDocumentSortOption {
  return Object.values(PROJECT_DOCUMENT_SORT_OPTION).includes(value as ProjectDocumentSortOption)
}

export function loadProjectDocumentsUserSettings(
  username: string | null | undefined,
  namespace?: string
): ProjectDocumentsUserSettings | null {
  const stored = localStorage.getItem(getProjectDocumentsSettingsKey(username, namespace))
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored) as Partial<ProjectDocumentsUserSettings> | null
    if (!parsed || parsed.version !== PROJECT_DOCUMENTS_SETTINGS_VERSION) return null

    if (
      !isValidViewMode(parsed.viewMode) ||
      !isValidSortOption(parsed.sortOption) ||
      !isValidDisplayPriority(parsed.displayPriority)
    ) {
      return null
    }

    return {
      version: PROJECT_DOCUMENTS_SETTINGS_VERSION,
      viewMode: parsed.viewMode,
      sortOption: parsed.sortOption,
      displayPriority: parsed.displayPriority,
    }
  } catch {
    return null
  }
}

export function saveProjectDocumentsUserSettings(
  username: string | null | undefined,
  settings: Omit<ProjectDocumentsUserSettings, 'version'>,
  namespace?: string
): void {
  const payload: ProjectDocumentsUserSettings = {
    version: PROJECT_DOCUMENTS_SETTINGS_VERSION,
    ...settings,
  }
  localStorage.setItem(getProjectDocumentsSettingsKey(username, namespace), JSON.stringify(payload))
}
