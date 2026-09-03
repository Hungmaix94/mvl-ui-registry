import { TIcon } from '@/types/common.ts'

function IconGridfour({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.125 3.375C19.9534 3.375 20.625 4.04657 20.625 4.875V19.125C20.625 19.9534 19.9534 20.625 19.125 20.625H4.875C4.04657 20.625 3.375 19.9534 3.375 19.125V4.875C3.375 4.04657 4.04657 3.375 4.875 3.375H19.125ZM4.875 12.75V19.125H11.25V12.75H4.875ZM12.75 12.75V19.125H19.125V12.75H12.75ZM4.875 11.25H11.25V4.875H4.875V11.25ZM12.75 11.25H19.125V4.875H12.75V11.25Z" />
    </svg>
  )
}

export { IconGridfour }
