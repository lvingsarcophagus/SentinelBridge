import { type ClassValue, clsx } from "clsx";

/**
 * Utility function to combine classnames
 * Merges clsx with Tailwind CSS class merging
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
