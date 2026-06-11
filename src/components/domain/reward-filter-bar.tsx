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
import { REWARD_TYPE_VALUES, REWARD_TYPE_META } from "@/lib/rewards";

interface RewardFilterBarProps {
  initialType: string;
  initialMaxCost: string;
  initialSort: string;
}

const SELECT_CLASS =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-xs transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

/**
 * Панель фильтров каталога наград (тип / макс. цена / сортировка).
 * Пишет значения в query-параметры (router.push) — каталог перезапрашивается.
 * ПК: фильтры в строку. Телефон: спрятаны за кнопкой «Фильтры».
 */
export function RewardFilterBar({
  initialType,
  initialMaxCost,
  initialSort,
}: RewardFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [type, setType] = React.useState(initialType);
  const [maxCost, setMaxCost] = React.useState(initialMaxCost);
  const [sort, setSort] = React.useState(initialSort || "new");
  const [openMobile, setOpenMobile] = React.useState(false);

  // sort=new считается «по умолчанию» и в счётчик активных не входит.
  const activeCount =
    (initialType ? 1 : 0) +
    (initialMaxCost ? 1 : 0) +
    (initialSort && initialSort !== "new" ? 1 : 0);

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) => {
      const v = value.trim();
      if (v) params.set(key, v);
      else params.delete(key);
    };
    set("type", type);
    set("maxCost", maxCost);
    if (sort && sort !== "new") params.set("sort", sort);
    else params.delete("sort");
    router.push(`${pathname}?${params.toString()}`);
    setOpenMobile(false);
  }

  function resetFilters() {
    setType("");
    setMaxCost("");
    setSort("new");
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
            <Label htmlFor="filter-type">Тип награды</Label>
            <select
              id="filter-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Все типы</option>
              {REWARD_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {REWARD_TYPE_META[t].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="filter-maxcost">Цена до, токенов</Label>
            <Input
              id="filter-maxcost"
              type="number"
              min={0}
              value={maxCost}
              onChange={(e) => setMaxCost(e.target.value)}
              placeholder="Например, 500"
              inputMode="numeric"
            />
          </div>

          <div>
            <Label htmlFor="filter-sort">Сортировка</Label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="new">Сначала новые</option>
              <option value="cost_asc">Сначала дешевле</option>
              <option value="cost_desc">Сначала дороже</option>
            </select>
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
