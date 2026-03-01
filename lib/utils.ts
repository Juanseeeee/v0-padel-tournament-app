import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateOnly(input: unknown): Date {
  // If it's already a Date, normalize to local Y/M/D
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }
  // Coerce to string safely
  const raw = input == null ? "" : String(input)
  const s = raw.slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    return new Date(y, mo - 1, d)
  }
  // Fallback: try constructing Date and normalize to local Y/M/D
  const d = new Date(raw)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
