import { TIcon } from '@/types/common.ts'

function IconTrashsimple({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.25 4.5C20.664 4.50026 21 4.83595 21 5.25C21 5.66405 20.664 5.99974 20.25 6H19.5V19.5C19.5 19.8978 19.3419 20.2792 19.0605 20.5605C18.7792 20.8419 18.3978 21 18 21H6C5.60218 21 5.22076 20.8419 4.93945 20.5605C4.65815 20.2792 4.5 19.8978 4.5 19.5V6H3.75C3.33579 6 2.99902 5.66421 2.99902 5.25C2.99903 4.83579 3.33579 4.5 3.75 4.5H20.25ZM6 6V19.5H18V6H6ZM15.75 1.5C16.1642 1.5 16.5 1.83579 16.5 2.25C16.5 2.66421 16.1642 3 15.75 3H8.25C7.83579 3 7.5 2.66421 7.5 2.25C7.5 1.83579 7.83579 1.5 8.25 1.5H15.75Z" />
    </svg>
  )
}

export { IconTrashsimple }
