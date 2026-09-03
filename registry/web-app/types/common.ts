import { SVGProps } from 'react'

import { ENVIRONMENT } from '@/constants'
import { APP_PATH } from '@/routes'

export type TObjectValues<T> = T extends object ? TObjectValues<T[keyof T]> : T

export type ArrayElement<T> = T extends Array<infer E> ? E : never
export type ArrayElementReadonly<T> = T extends readonly (infer E)[] ? E : never

export type TIcon = SVGProps<SVGSVGElement> & {
  size?: number
  color?: string
  title?: string
}

export type TEnvironment = TObjectValues<typeof ENVIRONMENT>

export type TAppPath = TObjectValues<typeof APP_PATH>
