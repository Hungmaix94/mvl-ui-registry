import { TIcon } from '@/types/common.ts'

function IconDevicetabletspeaker({
  size = 24,
  color = 'currentColor',
  title = '',
  ...props
}: TIcon) {
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
      <path d="M18 2.25C19.2426 2.25 20.25 3.25736 20.25 4.5V19.5C20.25 20.7426 19.2426 21.75 18 21.75H6C4.75736 21.75 3.75 20.7426 3.75 19.5V4.5C3.75 3.25736 4.75736 2.25 6 2.25H18ZM6 3.75C5.58579 3.75 5.25 4.08579 5.25 4.5V19.5C5.25 19.9142 5.58579 20.25 6 20.25H18C18.4142 20.25 18.75 19.9142 18.75 19.5V4.5C18.75 4.08579 18.4142 3.75 18 3.75H6ZM15 5.25C15.4142 5.25 15.75 5.58579 15.75 6C15.75 6.41421 15.4142 6.75 15 6.75H9C8.58579 6.75 8.25 6.41421 8.25 6C8.25 5.58579 8.58579 5.25 9 5.25H15Z" />
    </svg>
  )
}

export { IconDevicetabletspeaker }
