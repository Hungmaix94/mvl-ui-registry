export type ImportResultRecord = Record<string, string>

export type ImportColumnStructure =
  | { type: 'standalone'; header: string; accessorKey: string }
  | {
      type: 'group'
      parentHeader: string
      children: Array<{ header: string; accessorKey: string }>
    }

export type ImportParsedResult = {
  headers: string[]
  rows: ImportResultRecord[]
  /** For attendance exemption: column groups (e.g. 01 with S, C) for nested header display */
  columnStructure?: ImportColumnStructure[]
}

export type EmployeeImportResult = {
  success?: ImportParsedResult
  successRaw?: string
  failure?: ImportParsedResult
  failureRaw?: string
}
