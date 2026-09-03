import { TIcon } from '@/types/common.ts'

function IconNumberfour({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M10.917 2C11.0549 1.60961 11.4835 1.40528 11.874 1.54297C12.2645 1.68087 12.4699 2.10945 12.332 2.5L8.18457 14.25H15.375V9C15.375 8.58579 15.7108 8.25 16.125 8.25C16.5392 8.25007 16.875 8.58583 16.875 9V21C16.875 21.4142 16.5391 21.7499 16.125 21.75C15.7108 21.75 15.375 21.4142 15.375 21V15.75H7.125C6.88173 15.75 6.6533 15.6321 6.5127 15.4336C6.37211 15.2349 6.33696 14.9795 6.41797 14.75L10.917 2Z" />
    </svg>
  )
}

export { IconNumberfour }
