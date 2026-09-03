declare module 'romans' {
  export function romanize(n: number): string
  export function deromanize(s: string): number
  const _default: {
    romanize: (n: number) => string
    deromanize: (s: string) => number
  }
  export default _default
}
