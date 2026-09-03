import { TIcon } from '@/types/common.ts'

function IconNotebook({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 3C20.3284 3 21 3.67157 21 4.5V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H19.5ZM8.25 19.5H19.5V4.5H8.25V19.5ZM4.5 19.5H6.75V4.5H4.5V19.5ZM16.5 12.75C16.9142 12.75 17.25 13.0858 17.25 13.5C17.25 13.9142 16.9142 14.25 16.5 14.25H10.5C10.0858 14.25 9.75 13.9142 9.75 13.5C9.75 13.0858 10.0858 12.75 10.5 12.75H16.5ZM16.5 9.75C16.9142 9.75 17.25 10.0858 17.25 10.5C17.25 10.9142 16.9142 11.25 16.5 11.25H10.5C10.0858 11.25 9.75 10.9142 9.75 10.5C9.75 10.0858 10.0858 9.75 10.5 9.75H16.5Z" />
    </svg>
  )
}

export { IconNotebook }
