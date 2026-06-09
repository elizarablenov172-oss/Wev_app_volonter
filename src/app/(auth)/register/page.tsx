"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SignupRole = "VOLUNTEER" | "ORGANIZATION" | "PARTNER";

const ROLE_OPTIONS: { value: SignupRole; label: string }[] = [
  { value: "VOLUNTEER", label: "Волонтёр" },
  { value: "ORGANIZATION", label: "Организация" },
  { value: "PARTNER", label: "Партнёр" },
];

const ROLE_HOME: Record<SignupRole, string> = {
  VOLUNTEER: "/feed",
  ORGANIZATION: "/org",
  PARTNER: "/partner",
};

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = React.useState<SignupRole>("VOLUNTEER");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [city, setCity] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [brandName, setBrandName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const needsModeration = role === "ORGANIZATION" || role === "PARTNER";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          role,
          city,
          orgName,
          brandName,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        role?: SignupRole;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось зарегистрироваться");
        setPending(false);
        return;
      }

      if (needsModeration) {
        toast.success("Аккаунт создан и отправлен на модерацию.");
      } else {
        toast.success("Добро пожаловать в «Евразию»!");
      }
      router.push(ROLE_HOME[data.role ?? role]);
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Регистрация</h1>
        <p className="mb-6 text-sm text-muted">
          Создайте аккаунт и присоединяйтесь к сообществу волонтёров.
        </p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {/* Выбор роли — сегмент-контрол */}
          <div>
            <Label>Я регистрируюсь как</Label>
            <div
              role="radiogroup"
              aria-label="Роль"
              className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface-muted p-1"
            >
              {ROLE_OPTIONS.map((opt) => {
                const active = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRole(opt.value)}
                    className={cn(
                      "rounded-[0.5rem] px-2 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-surface text-primary shadow-sm"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="displayName">Имя</Label>
            <Input
              id="displayName"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как к вам обращаться"
            />
          </div>

          {role === "ORGANIZATION" && (
            <div>
              <Label htmlFor="orgName">Название организации</Label>
              <Input
                id="orgName"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="НКО, фонд, инициатива…"
              />
            </div>
          )}

          {role === "PARTNER" && (
            <div>
              <Label htmlFor="brandName">Название бренда</Label>
              <Input
                id="brandName"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Бренд / компания"
              />
            </div>
          )}

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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
            />
          </div>

          <div>
            <Label htmlFor="city">
              Город <span className="font-normal text-muted">(необязательно)</span>
            </Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Москва"
            />
          </div>

          {needsModeration && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-strong">
              Аккаунт {role === "ORGANIZATION" ? "организации" : "партнёра"} проходит
              модерацию администратором. Полный доступ откроется после одобрения.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Создаём…" : "Зарегистрироваться"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
