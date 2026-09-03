import type { TableColumnStorage } from '@/types/table'

export const COLUMN_CONFIG_VERSION = 1

export function getColumnConfigKey(username: string | null | undefined): string {
  return `${username || 'guest'}-employee-table-columns`
}

export function getProjectTableColumnConfigKey(username: string | null | undefined): string {
  return `${username || 'guest'}-project-table-columns`
}

function loadColumnConfigByKey(key: string): TableColumnStorage | null {
  const stored = localStorage.getItem(key)
  if (!stored) return null
  try {
    const config = JSON.parse(stored)
    if (config.version !== COLUMN_CONFIG_VERSION) return null
    return config
  } catch {
    return null
  }
}

function saveColumnConfigByKey(key: string, config: TableColumnStorage): void {
  localStorage.setItem(key, JSON.stringify(config))
}

export function saveColumnConfig(
  username: string | null | undefined,
  config: TableColumnStorage
): void {
  saveColumnConfigByKey(getColumnConfigKey(username), config)
}

export function loadColumnConfig(username: string | null | undefined): TableColumnStorage | null {
  return loadColumnConfigByKey(getColumnConfigKey(username))
}

export function loadProjectTableColumnConfig(
  username: string | null | undefined
): TableColumnStorage | null {
  return loadColumnConfigByKey(getProjectTableColumnConfigKey(username))
}

export function saveProjectTableColumnConfig(
  username: string | null | undefined,
  config: TableColumnStorage
): void {
  saveColumnConfigByKey(getProjectTableColumnConfigKey(username), config)
}

export function getEmployeeOrgTreeColumnConfigKey(username: string | null | undefined): string {
  return `${username || 'guest'}-employee-org-tree-table-columns`
}

export function loadEmployeeOrgTreeColumnConfig(
  username: string | null | undefined
): TableColumnStorage | null {
  return loadColumnConfigByKey(getEmployeeOrgTreeColumnConfigKey(username))
}

export function saveEmployeeOrgTreeColumnConfig(
  username: string | null | undefined,
  config: TableColumnStorage
): void {
  saveColumnConfigByKey(getEmployeeOrgTreeColumnConfigKey(username), config)
}

export function getEmployeeLeadershipColumnConfigKey(username: string | null | undefined): string {
  return `${username || 'guest'}-employee-leadership-table-columns`
}

export function loadEmployeeLeadershipColumnConfig(
  username: string | null | undefined
): TableColumnStorage | null {
  return loadColumnConfigByKey(getEmployeeLeadershipColumnConfigKey(username))
}

export function saveEmployeeLeadershipColumnConfig(
  username: string | null | undefined,
  config: TableColumnStorage
): void {
  saveColumnConfigByKey(getEmployeeLeadershipColumnConfigKey(username), config)
}

export function loadColumnConfigByStorageKey(
  username: string | null | undefined,
  storageKey: string
): TableColumnStorage | null {
  return loadColumnConfigByKey(`${username || 'guest'}-${storageKey}-table-columns`)
}

export function saveColumnConfigByStorageKey(
  username: string | null | undefined,
  storageKey: string,
  config: TableColumnStorage
): void {
  saveColumnConfigByKey(`${username || 'guest'}-${storageKey}-table-columns`, config)
}


export function getContractTableColumnConfigKey(username: string | null | undefined): string {
  return `${username || 'guest'}-contract-table-columns`
}

export function loadContractTableColumnConfig(
  username: string | null | undefined
): TableColumnStorage | null {
  return loadColumnConfigByKey(getContractTableColumnConfigKey(username))
}

export function saveContractTableColumnConfig(
  username: string | null | undefined,
  config: TableColumnStorage
): void {
  saveColumnConfigByKey(getContractTableColumnConfigKey(username), config)
}
