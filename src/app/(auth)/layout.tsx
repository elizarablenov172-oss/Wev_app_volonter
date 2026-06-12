import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

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
          <Link href="/" className="flex items-center">
            <BrandLogo descriptor />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
