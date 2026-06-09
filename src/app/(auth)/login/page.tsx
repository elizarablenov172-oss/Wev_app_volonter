"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

/** Куда отправлять после входа в зависимости от роли. */
function homeForRole(role: Role): string {
  switch (role) {
    case "ORGANIZATION":
      return "/org";
    case "PARTNER":
      return "/partner";
    case "ADMIN":
      return "/admin";
    default:
      return "/feed";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");
  const blocked = searchParams.get("blocked");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (blocked) {
      toast.error("Сессия завершена. Войдите снова.");
    }
  }, [blocked]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; role?: Role; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось войти");
        setPending(false);
        return;
      }

      toast.success("С возвращением!");
      const dest = nextUrl && nextUrl.startsWith("/") ? nextUrl : homeForRole(data.role!);
      router.push(dest);
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Вход</h1>
        <p className="mb-6 text-sm text-muted">
          Войдите, чтобы продолжить участвовать и зарабатывать токены.
        </p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Входим…" : "Войти"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
