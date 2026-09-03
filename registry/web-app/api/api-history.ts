import type { operations } from '@/api/schema'

export type TKeySuffixHistory<T> = {
  [K in keyof T as K extends `${string}_histories_retrieve` ? K : never]: T[K]
}

export type GetHistoriesParameters = operations[keyof TKeySuffixHistory<operations>] extends infer T
  ? T extends { parameters: infer P }
    ? P
    : never
  : never
