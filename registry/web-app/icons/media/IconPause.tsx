import { TIcon } from '@/types/common.ts'

function IconPause({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M8.625 3C9.45343 3 10.125 3.67157 10.125 4.5V19.5C10.125 20.3284 9.45343 21 8.625 21H5.25C4.42157 21 3.75 20.3284 3.75 19.5V4.5C3.75 3.67157 4.42157 3 5.25 3H8.625ZM18.75 3C19.5784 3 20.25 3.67157 20.25 4.5V19.5C20.25 20.3284 19.5784 21 18.75 21H15.375C14.5466 21 13.875 20.3284 13.875 19.5V4.5C13.875 3.67157 14.5466 3 15.375 3H18.75ZM5.25 19.5H8.625V4.5H5.25V19.5ZM15.375 19.5H18.75V4.5H15.375V19.5Z" />
    </svg>
  )
}

export { IconPause }
