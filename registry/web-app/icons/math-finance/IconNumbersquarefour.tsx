import { TIcon } from '@/types/common.ts'

function IconNumbersquarefour({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 3C20.3284 3 21 3.67157 21 4.5V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H19.5ZM4.5 19.5H19.5V4.5H4.5V19.5ZM10.918 6.875C11.056 6.4848 11.4837 6.28037 11.874 6.41797C12.2646 6.55582 12.4699 6.9844 12.332 7.375L10.4346 12.75H13.125V10.5C13.125 10.0858 13.4608 9.75 13.875 9.75C14.2892 9.75 14.625 10.0858 14.625 10.5V16.5C14.625 16.9142 14.2892 17.25 13.875 17.25C13.4608 17.25 13.125 16.9142 13.125 16.5V14.25H9.375C9.1317 14.25 8.90329 14.1321 8.7627 13.9336C8.62211 13.7349 8.58697 13.4795 8.66797 13.25L10.918 6.875Z" />
    </svg>
  )
}

export { IconNumbersquarefour }
