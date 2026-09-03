import type { ImportParsedResult, ImportResultRecord } from './hrm-import'

export type ContractImportResult = {
  success?: ImportParsedResult
  successRaw?: string
  failure?: ImportParsedResult
  failureRaw?: string
}

export type { ImportParsedResult, ImportResultRecord }
