import Link from "next/link";
import { Button } from "@/components/ui/button";

const palette = [
  { name: "Фиолетовый", hex: "#511CE9", cls: "bg-primary" },
  { name: "Малиновый", hex: "#F30C42", cls: "bg-danger" },
  { name: "Зелёный", hex: "#88B04B", cls: "bg-success" },
  { name: "Янтарный", hex: "#FFAD00", cls: "bg-warning" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <div className="space-y-4">
        <span className="inline-block rounded-full bg-primary-soft px-4 py-1 text-sm font-semibold text-primary">
          НКО «Евразия» · Континент возможностей
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Платформа волонтёрских мероприятий
        </h1>
        <p className="text-lg text-muted">
          Участвуй в мероприятиях и заданиях, получай{" "}
          <span className="font-semibold text-tokens-plus">social tokens</span> и
          обменивай их на награды.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/register">
          <Button size="lg">Начать</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="secondary">
            Войти
          </Button>
        </Link>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        {palette.map((c) => (
          <div
            key={c.hex}
            className="rounded-lg border border-border bg-surface p-3 shadow-sm"
          >
            <div className={`mb-2 h-12 w-full rounded-md ${c.cls}`} />
            <div className="text-sm font-semibold">{c.name}</div>
            <div className="tabular text-xs text-muted">{c.hex}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Дизайн-код «Евразия» · Montserrat · Этап 0 — каркас проекта
      </p>
    </main>
  );
}
