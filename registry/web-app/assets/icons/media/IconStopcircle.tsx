import { TIcon } from '@/types/common.ts'

function IconStopcircle({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M12 2.25C17.3848 2.25 21.75 6.61522 21.75 12C21.75 17.3848 17.3848 21.75 12 21.75C6.61522 21.75 2.25 17.3848 2.25 12C2.25 6.61522 6.61522 2.25 12 2.25ZM12 3.75C7.44365 3.75 3.75 7.44365 3.75 12C3.75 16.5563 7.44365 20.25 12 20.25C16.5563 20.25 20.25 16.5563 20.25 12C20.25 7.44365 16.5563 3.75 12 3.75ZM14.25 9C14.6642 9 15 9.33579 15 9.75V14.25C15 14.6642 14.6642 15 14.25 15H9.75C9.33579 15 9 14.6642 9 14.25V9.75C9 9.33579 9.33579 9 9.75 9H14.25ZM10.5 13.5H13.5V10.5H10.5V13.5Z" />
    </svg>
  )
}

export { IconStopcircle }
