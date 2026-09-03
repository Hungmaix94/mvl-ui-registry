export function stableStringifyRecord(params: Record<string, unknown> | null | undefined): string {
  return JSON.stringify(sortKeys(params))
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys)
  }
  const sortedKeys = Object.keys(obj).sort()
  const result: Record<string, unknown> = {}
  for (const key of sortedKeys) {
    result[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return result
}
