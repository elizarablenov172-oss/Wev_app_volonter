import * as React from "react";

export interface PageHeaderProps {
  /** Заголовок страницы (h1). */
  title: string;
  /** Опциональный подзаголовок под заголовком. */
  description?: React.ReactNode;
  /** Опциональный слот действий справа (кнопки, чипы и т.п.). */
  actions?: React.ReactNode;
  /** Опциональный слот над заголовком (хлебные крошки, «назад» и т.п.). */
  eyebrow?: React.ReactNode;
}

/**
 * Единая страничная шапка: выровнена влево, занимает всю ширину контента.
 * На десктопе заголовок и действия раскладываются в ряд, на мобиле — стек.
 * Используется на wallet/feed/profile/плейсхолдерах для единообразия.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow}
        <h1 className="text-2xl font-bold tracking-[-0.02em] lg:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-prose text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
