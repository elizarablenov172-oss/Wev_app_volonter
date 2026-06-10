import Link from "next/link";

/** Лэйаут экранов входа/регистрации: брендовая шапка + центрированная карточка. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      {/* Тонкая брендовая шапка с hairline-разделителем. */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex size-7 items-center justify-center rounded-sm bg-primary text-[0.9375rem] font-extrabold leading-none text-on-primary"
              aria-hidden
            >
              Е
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.9375rem] font-bold tracking-[-0.02em]">
                Евразия
              </span>
              <span className="mt-0.5 hidden text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted sm:inline">
                Континент возможностей
              </span>
            </span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
