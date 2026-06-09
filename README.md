# Платформа волонтёрских мероприятий с Social Tokens

Веб-платформа для НКО **«Евразия»**: волонтёры участвуют в мероприятиях и заданиях,
получают **social tokens** и обменивают их на награды в маркетплейсе.
Роли: Волонтёр · Организация · Администратор · Партнёр.

> Хакатон-проект. Подробный план — [`docs/PLAN.md`](docs/PLAN.md), техзадание — [`docs/TZ.txt`](docs/TZ.txt) / [`docs/ТЗ_V2.pdf`](docs/ТЗ_V2.pdf), дизайн-референсы — [`docs/design/`](docs/design).

## Технологический стек

- **Next.js 16** (App Router, React 19, TypeScript) — full-stack
- **PostgreSQL** + **Prisma 6** (ORM)
- **Tailwind CSS v4** — дизайн-токены «Евразия» в `src/app/globals.css`
- **Auth.js (NextAuth v5)** — аутентификация и роли (RBAC)
- **Docker Compose** — PostgreSQL + MailHog (локальный SMTP)

## Дизайн-код «Евразия» (DIGITAL-палитра)

| | HEX | Роль |
|---|---|---|
| 🟣 Фиолетовый | `#511CE9` | primary |
| 🔴 Малиновый | `#F30C42` | danger / акцент |
| 🟢 Зелёный | `#88B04B` | success / +токены |
| 🟡 Янтарный | `#FFAD00` | баланс / warning |

Шрифт: **Montserrat** (основной), Akrobat (дополнительный).

## Быстрый старт

**Требования:** Node.js LTS, Docker Desktop.

```bash
# 1. Зависимости
npm install

# 2. Переменные окружения
cp .env.example .env        # при необходимости отредактируйте; AUTH_SECRET: npx auth secret

# 3. База данных + SMTP (Docker)
docker compose up -d        # Postgres :5433, MailHog UI :8025

# 4. Миграции Prisma
npx prisma migrate dev

# 5. Запуск
npm run dev                 # http://localhost:3000
```

## Структура

```
src/
├─ app/            # маршруты (App Router) + API (Route Handlers)
├─ components/ui/  # UI-компоненты (дизайн-система)
├─ lib/            # prisma-клиент, утилиты
└─ server/         # бизнес-логика (токеномика, чек-ин, ...)
prisma/            # schema.prisma + миграции
docs/              # план, ТЗ, дизайн-референсы
```

## Статус

Этап 0 (окружение и каркас) — готов. Дальнейшие этапы — см. [`docs/PLAN.md`](docs/PLAN.md) §5.
