"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FunnelSimple,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_CATEGORIES } from "@/lib/events";

interface EventFilterBarProps {
  initialCity: string;
  initialCategory: string;
  initialDate: string;
}

const SELECT_CLASS =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-xs transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

/**
 * Панель фильтров каталога мероприятий (город / категория / дата).
 * Пишет значения в query-параметры (через router.push) — список перезапрашивается.
 * ПК: фильтры в строку. Телефон: спрятаны за кнопкой «Фильтры» (раскрытие).
 */
export function EventFilterBar({
  initialCity,
  initialCategory,
  initialDate,
}: EventFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [city, setCity] = React.useState(initialCity);
  const [category, setCategory] = React.useState(initialCategory);
  const [date, setDate] = React.useState(initialDate);
  const [openMobile, setOpenMobile] = React.useState(false);

  const activeCount =
    (initialCity ? 1 : 0) + (initialCategory ? 1 : 0) + (initialDate ? 1 : 0);

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) => {
      const v = value.trim();
      if (v) params.set(key, v);
      else params.delete(key);
    };
    set("city", city);
    set("category", category);
    set("date", date);
    params.delete("page"); // фильтр сбрасывает пагинацию
    router.push(`${pathname}?${params.toString()}`);
    setOpenMobile(false);
  }

  function resetFilters() {
    setCity("");
    setCategory("");
    setDate("");
    router.push(pathname);
    setOpenMobile(false);
  }

  return (
    <div className="rounded-md border border-border bg-surface shadow-xs">
      {/* Мобильный переключатель раскрытия. */}
      <button
        type="button"
        onClick={() => setOpenMobile((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold md:hidden"
        aria-expanded={openMobile}
      >
        <span className="inline-flex items-center gap-2">
          <FunnelSimple className="size-[1.125rem] text-muted" weight="duotone" aria-hidden />
          Фильтры
          {activeCount > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-bold text-on-primary">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          {openMobile ? "Скрыть" : "Показать"}
        </span>
      </button>

      <form
        onSubmit={applyFilters}
        className={`${openMobile ? "block" : "hidden"} border-t border-border p-4 md:block md:border-t-0`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <Label htmlFor="filter-city">Город / место</Label>
            <Input
              id="filter-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Например, Москва"
              inputMode="search"
            />
          </div>

          <div>
            <Label htmlFor="filter-category">Категория</Label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Все категории</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="filter-date">Дата (от)</Label>
            <input
              id="filter-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={SELECT_CLASS}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 lg:flex-none">
              <MagnifyingGlass className="size-4" weight="bold" aria-hidden />
              Найти
            </Button>
            {activeCount > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetFilters}
                aria-label="Сбросить фильтры"
              >
                <X className="size-4" weight="bold" aria-hidden />
                <span className="lg:hidden">Сбросить</span>
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
