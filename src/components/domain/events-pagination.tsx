"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

interface EventsPaginationProps {
  page: number;
  totalPages: number;
}

/** Простая пагинация: предыдущая/следующая страница через query-параметр page. */
export function EventsPagination({ page, totalPages }: EventsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <nav
      className="flex items-center justify-between gap-3 pt-2"
      aria-label="Навигация по страницам"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        Назад
      </Button>
      <span className="tabular text-sm font-semibold text-muted">
        Страница {page} из {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
      >
        Вперёд
        <CaretRight className="size-4" weight="bold" aria-hidden />
      </Button>
    </nav>
  );
}
