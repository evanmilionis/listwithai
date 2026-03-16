import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ConditionLabel } from '@/types';

/**
 * Merge Tailwind classes with clsx for conditional class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as US currency (no decimals).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Map a 1–10 condition score to a human-readable label.
 */
export function getConditionLabel(score: number): ConditionLabel {
  if (score <= 3) return 'Needs Work';
  if (score <= 6) return 'Average';
  if (score <= 8) return 'Good';
  return 'Excellent';
}
