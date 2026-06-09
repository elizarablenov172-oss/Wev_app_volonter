import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Объединяет классы Tailwind, корректно разрешая конфликты. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Форматирует число токенов с разделителями разрядов (1 240). */
export function formatTokens(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}
