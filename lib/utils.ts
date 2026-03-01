import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateOnly(dateString: string): Date {
  const s = (dateString || '').slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    return new Date(y, mo - 1, d)
  }
  const d = new Date(dateString)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
