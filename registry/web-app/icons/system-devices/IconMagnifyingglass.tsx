import { TIcon } from '@/types/common.ts'

function IconMagnifyingglass({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M10.875 2.25C15.6385 2.25 19.5 6.11154 19.5 10.875C19.5 12.9869 18.7397 14.9205 17.4795 16.4199L21.5303 20.4707C21.8225 20.7637 21.8229 21.2386 21.5303 21.5312C21.2376 21.8238 20.7626 21.8234 20.4697 21.5312L16.418 17.4795C14.9187 18.7391 12.9864 19.5 10.875 19.5C6.11154 19.5 2.25 15.6385 2.25 10.875C2.25 6.11154 6.11154 2.25 10.875 2.25ZM10.875 3.75C6.93997 3.75 3.75 6.93997 3.75 10.875C3.75 14.81 6.93997 18 10.875 18C14.81 18 18 14.81 18 10.875C18 6.93997 14.81 3.75 10.875 3.75Z" />
    </svg>
  )
}

export { IconMagnifyingglass }
