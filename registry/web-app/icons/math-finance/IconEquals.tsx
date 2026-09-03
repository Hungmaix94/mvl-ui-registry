import { TIcon } from '@/types/common.ts'

function IconEquals({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.25 14.25C20.6642 14.25 21 14.5858 21 15C21 15.4142 20.6642 15.75 20.25 15.75H3.75C3.33579 15.75 3 15.4142 3 15C3 14.5858 3.33579 14.25 3.75 14.25H20.25ZM20.25 8.25C20.6642 8.25 21 8.58579 21 9C21 9.41421 20.6642 9.75 20.25 9.75H3.75C3.33579 9.75 3 9.41421 3 9C3 8.58579 3.33579 8.25 3.75 8.25H20.25Z" />
    </svg>
  )
}

export { IconEquals }
