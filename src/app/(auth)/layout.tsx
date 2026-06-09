import Link from "next/link";

/** Центрированный лэйаут для экранов входа/регистрации с брендом «Евразия». */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-1">
            <span className="font-display text-3xl font-extrabold tracking-tight text-primary">
              Евразия
            </span>
            <span className="text-sm text-muted">Континент возможностей</span>
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
