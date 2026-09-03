import { TIcon } from '@/types/common.ts'

function IconDevicemobilespeaker({
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
      <path d="M16.5 1.5C17.7426 1.5 18.75 2.50736 18.75 3.75V20.25C18.75 21.4926 17.7426 22.5 16.5 22.5H7.5C6.25736 22.5 5.25 21.4926 5.25 20.25V3.75C5.25 2.50736 6.25736 1.5 7.5 1.5H16.5ZM7.5 3C7.08579 3 6.75 3.33579 6.75 3.75V20.25C6.75 20.6642 7.08579 21 7.5 21H16.5C16.9142 21 17.25 20.6642 17.25 20.25V3.75C17.25 3.33579 16.9142 3 16.5 3H7.5ZM15 4.5C15.4142 4.5 15.75 4.83579 15.75 5.25C15.75 5.66421 15.4142 6 15 6H9C8.58579 6 8.25 5.66421 8.25 5.25C8.25 4.83579 8.58579 4.5 9 4.5H15Z" />
    </svg>
  )
}

export { IconDevicemobilespeaker }
