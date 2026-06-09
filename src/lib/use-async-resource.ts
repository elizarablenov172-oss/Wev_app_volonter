"use client";

import * as React from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/**
 * Загружает ресурс при монтировании и при смене `key`. Состояние сбрасывается
 * в loading через requestKey без синхронного setState внутри эффекта
 * (правило react-hooks/set-state-in-effect). `loader` должен быть стабильным
 * (обернут в useCallback у вызывающего).
 */
export function useAsyncResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  key: string,
): AsyncState<T> {
  const [resolved, setResolved] = React.useState<{
    key: string;
    state: AsyncState<T>;
  } | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    loader(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResolved({ key, state: { status: "ready", data } });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Не удалось загрузить данные";
        setResolved({ key, state: { status: "error", message } });
      });

    return () => controller.abort();
  }, [loader, key]);

  // Пока результат для текущего key не пришёл — показываем loading.
  if (!resolved || resolved.key !== key) {
    return { status: "loading" };
  }
  return resolved.state;
}
