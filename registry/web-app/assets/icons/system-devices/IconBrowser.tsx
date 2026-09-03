import { TIcon } from '@/types/common.ts'

function IconBrowser({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.25 3.75C21.0784 3.75 21.75 4.42157 21.75 5.25V18.75C21.75 19.5784 21.0784 20.25 20.25 20.25H3.75C2.92157 20.25 2.25 19.5784 2.25 18.75V5.25C2.25 4.42157 2.92157 3.75 3.75 3.75H20.25ZM3.75 9.75V18.75H20.25V9.75H3.75ZM3.75 8.25H20.25V5.25H3.75V8.25Z" />
    </svg>
  )
}

export { IconBrowser }
