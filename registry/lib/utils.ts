import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyVN(amount: number): string {
  if (isNaN(amount)) return '0 đ';
  if (amount >= 1_000_000_000) {
    const b = amount / 1_000_000_000;
    return `${b.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  }
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${m.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} triệu`;
  }
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function slugifyVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
