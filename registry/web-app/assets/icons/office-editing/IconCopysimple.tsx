import { TIcon } from '@/types/common.ts'

function IconCopysimple({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M17.25 6C17.6638 6.00049 18 6.33609 18 6.75V20.25C17.9997 20.6637 17.6636 20.9995 17.25 21H3.74902C3.33497 21 2.99831 20.664 2.99805 20.25V6.75C2.99805 6.33579 3.33481 6 3.74902 6H17.25ZM4.49902 19.5H16.5V7.5H4.49902V19.5ZM20.25 2.99902C20.6638 2.99946 21 3.33606 21 3.75V17.25C20.9997 17.6637 20.6637 17.9996 20.25 18C19.8359 18 19.5003 17.664 19.5 17.25V4.5H6.74902C6.33497 4.5 5.99929 4.16399 5.99902 3.75C5.99902 3.33579 6.33481 2.99902 6.74902 2.99902H20.25Z" />
    </svg>
  )
}

export { IconCopysimple }
