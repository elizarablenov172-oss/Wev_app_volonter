import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Coins,
  Gift,
  ListChecks,
  ShieldCheck,
  Storefront,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";

/** Как работает платформа — три плотных шага слева направо. */
const STEPS = [
  {
    icon: CalendarCheck,
    title: "Участвуй",
    text: "Записывайся на мероприятия и выполняй задания от проверенных организаций.",
  },
  {
    icon: Coins,
    title: "Зарабатывай",
    text: "Получай Social Tokens за каждое подтверждённое действие. Баланс — как банковский счёт.",
  },
  {
    icon: Gift,
    title: "Обменивай",
    text: "Трать токены на награды партнёров в маркетплейсе. Прозрачная история операций.",
  },
] as const;

/** Возможности для разных ролей. */
const FEATURES = [
  {
    icon: ListChecks,
    title: "Мероприятия и задания",
    text: "Каталог с фильтрами, запись в один тап и QR-чек-ин на месте.",
  },
  {
    icon: Storefront,
    title: "Маркетплейс наград",
    text: "Каталог наград от брендов-партнёров с прозрачной ценой в токенах.",
  },
  {
    icon: UsersThree,
    title: "Соц-профиль",
    text: "Уровни, активность, друзья и репутация волонтёра в одном месте.",
  },
  {
    icon: ShieldCheck,
    title: "Модерация и доверие",
    text: "Организации и партнёры проходят проверку администраторами.",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-dvh bg-background">
      {/* ── Шапка лендинга ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-10 xl:px-14">
          <Link href="/" className="flex items-center">
            <BrandLogo descriptor />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-muted transition-colors hover:text-foreground sm:inline"
            >
              Войти
            </Link>
            <Link href="/register">
              <Button size="sm">Начать</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero — структурный, левое выравнивание, без градиентного пятна ── */}
      <section className="border-b border-border">
        <div className="grid w-full gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-16 lg:px-10 lg:py-20 xl:px-14">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-primary ring-1 ring-inset ring-primary/15">
              НКО «Евразия»
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
              Волонтёрство, у которого есть валюта
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Участвуй в мероприятиях и заданиях, получай{" "}
              <span className="font-semibold text-foreground">Social Tokens</span>{" "}
              и обменивай их на награды от партнёров. Каждое начисление — в
              прозрачной истории операций.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Создать аккаунт
                  <ArrowRight className="size-4" weight="bold" aria-hidden />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Войти
                </Button>
              </Link>
            </div>
          </div>

          {/* Превью «счёта» — банковская карточка баланса, держится на бордерах. */}
          <div className="rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="text-sm font-semibold text-muted">Мой кошелёк</span>
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 text-xs font-bold text-warning-strong ring-1 ring-inset ring-warning-strong/15">
                <Coins className="size-3.5 text-tokens" weight="duotone" aria-hidden />
                токены
              </span>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                Доступный баланс
              </p>
              <p className="tabular mt-1 text-4xl font-extrabold tracking-[-0.02em]">
                1 250
              </p>
            </div>
            <ul className="divide-y divide-border border-t border-border">
              {[
                { label: "Участие в мероприятии", type: "Мероприятие", amount: "+150" },
                { label: "Заполнение профиля", type: "Профиль", amount: "+50" },
                { label: "Награда от партнёра", type: "Награда", amount: "−200" },
              ].map((row) => {
                const minus = row.amount.startsWith("−");
                return (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.label}</p>
                      <p className="text-xs text-muted">{row.type}</p>
                    </div>
                    <span
                      className={`tabular shrink-0 text-sm font-bold ${
                        minus ? "text-tokens-minus" : "text-tokens-plus"
                      }`}
                    >
                      {row.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Как это работает — три шага ── */}
      <section className="border-b border-border">
        <div className="w-full px-4 py-14 sm:px-6 lg:px-10 xl:px-14">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
              Как это работает
            </h2>
            <p className="mt-2 text-muted">
              Три шага от участия до награды — без лишних движений.
            </p>
          </div>
          <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="bg-surface p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-9 items-center justify-center rounded-sm bg-primary-soft text-primary ring-1 ring-inset ring-primary/15"
                      aria-hidden
                    >
                      <Icon className="size-[1.125rem]" weight="duotone" />
                    </span>
                    <span className="tabular text-sm font-bold text-muted">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {step.text}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Возможности — плотная сетка, бордеры вместо теней ── */}
      <section>
        <div className="w-full px-4 py-14 sm:px-6 lg:px-10 xl:px-14">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
              Всё в одном месте
            </h2>
            <p className="mt-2 text-muted">
              Платформа для волонтёров, организаций и брендов-партнёров.
            </p>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-4 bg-surface p-6"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-foreground ring-1 ring-inset ring-border"
                    aria-hidden
                  >
                    <Icon className="size-5" weight="duotone" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {f.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA-полоса — точечный primary, без больших заливок. */}
          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold tracking-[-0.02em]">
                Готовы начать зарабатывать токены?
              </h3>
              <p className="mt-1 text-sm text-muted">
                Регистрация занимает меньше минуты.
              </p>
            </div>
            <Link href="/register" className="shrink-0">
              <Button size="lg">
                Присоединиться
                <ArrowRight className="size-4" weight="bold" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Подвал ── */}
      <footer className="border-t border-border">
        <div className="flex w-full flex-col gap-1 px-4 py-8 text-xs text-muted sm:px-6 lg:px-10 xl:px-14">
          <span className="font-semibold text-foreground">
            НКО «Евразия» · Континент возможностей
          </span>
          <span>Платформа волонтёрских мероприятий · Social Tokens</span>
        </div>
      </footer>
    </main>
  );
}
