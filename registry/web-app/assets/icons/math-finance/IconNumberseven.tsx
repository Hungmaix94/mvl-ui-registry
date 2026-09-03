import { TIcon } from '@/types/common.ts'

function IconNumberseven({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M16.5 3C16.7411 3 16.9674 3.11595 17.1084 3.31152C17.2493 3.5071 17.2881 3.7586 17.2119 3.9873L11.2119 21.9873C11.0809 22.3803 10.6557 22.5929 10.2627 22.4619C9.86974 22.3309 9.6571 21.9057 9.78809 21.5127L15.459 4.5H7.5C7.08579 4.5 6.75 4.16421 6.75 3.75C6.75 3.33579 7.08579 3 7.5 3H16.5Z" />
    </svg>
  )
}

export { IconNumberseven }
