import { useConstants } from '@/store'
import { useMemo } from 'react'

export default function useAppConstant({
  module,
  keys,
}: {
  module?:
    | 'audit_logging'
    | 'core'
    | 'sales'
    | 'files'
    | 'elibrary'
    | 'hrm'
    | 'imports'
    | 'notifications'
    | 'realestate'
    | 'payroll'
    | 'accounting'
    | 'chat'
  keys: Array<string>
}) {
  const { constants: constantApp } = useConstants()

  const constants = useMemo(() => {
    if (module && !!constantApp?.[module]) {
      return constantApp[module]
    }

    if (!module) {
      return constantApp
    }
  }, [constantApp])

  const keysMap = useMemo(() => {
    if (!keys.length) {
      return new Map()
    }

    return keys.reduce((arrMap, k) => {
      const c = constants?.[k] || null

      if (Array.isArray(c)) {
        arrMap.set(
          k,
          c.reduce(
            (res, item: any) => {
              res[Object.keys(item)[0]] = Object.values(item)[0] as string
              return res
            },
            {} as Record<string, string>
          )
        )
      } else {
        arrMap.set(k, c)
      }
      return arrMap
    }, new Map<string, Record<string, any> | string | number | null>())
  }, [constants])

  const keysMapOptions = useMemo(() => {
    if (!keysMap || !keysMap.size) return new Map<string, Array<{ value: any; label: string }>>()

    const results = new Map<string, Array<{ value: any; label: string }>>()

    try {
      keysMap.forEach((val, k) => {
        if (val && typeof val === 'object') {
          results.set(
            k,
            Object.keys(val).reduce(
              (r, kv) => [...r, { value: kv, label: val[kv] }],
              [] as Array<{ value: any; label: string }>
            )
          )
        }
        //
        else if (Array.isArray(val)) {
          results.set(
            k,
            val.map((item: Record<string, string>) => {
              let [value, label] = Object.entries(item)[0]
              return { value, label }
            })
          )
        }
      })
    } catch (error) {
      console.error('Error processing keysMap:', error)
      return new Map<string, Array<{ value: any; label: string }>>()
    }

    return results
  }, [keysMap])

  return {
    constants,
    keysMap,
    keysMapOptions,
  }
}
