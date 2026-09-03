import { TIcon } from '@/types/common.ts'

function IconDevicetabletcamera({
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
      <path d="M18 2.25C19.2426 2.25 20.25 3.25736 20.25 4.5V19.5C20.25 20.7426 19.2426 21.75 18 21.75H6C4.75736 21.75 3.75 20.7426 3.75 19.5V4.5C3.75 3.25736 4.75736 2.25 6 2.25H18ZM6 3.75C5.58579 3.75 5.25 4.08579 5.25 4.5V19.5C5.25 19.9142 5.58579 20.25 6 20.25H18C18.4142 20.25 18.75 19.9142 18.75 19.5V4.5C18.75 4.08579 18.4142 3.75 18 3.75H6ZM12 5.4375C12.5178 5.4375 12.9375 5.85723 12.9375 6.375C12.9375 6.89277 12.5178 7.3125 12 7.3125C11.4822 7.3125 11.0625 6.89277 11.0625 6.375C11.0625 5.85723 11.4822 5.4375 12 5.4375Z" />
    </svg>
  )
}

export { IconDevicetabletcamera }
