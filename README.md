# Платформа волонтёрских мероприятий с Social Tokens

Веб-платформа для НКО **«Евразия»**: волонтёры участвуют в мероприятиях и заданиях,
получают **social tokens** и обменивают их на награды в маркетплейсе.
Роли: Волонтёр · Организация · Администратор · Партнёр.

> Хакатон-проект. План — [`docs/PLAN.md`](docs/PLAN.md), техзадание — [`docs/TZ.txt`](docs/TZ.txt) / [`docs/ТЗ_V2.pdf`](docs/ТЗ_V2.pdf), дизайн-референсы — [`docs/design/`](docs/design).

## Технологический стек

- **Next.js 16** (App Router, React 19, TypeScript) — full-stack
- **PostgreSQL 16** + **Prisma 6** (ORM, миграции, seed)
- **Tailwind CSS v4** — дизайн-токены «Евразия» в `src/app/globals.css`
- **Своя JWT-сессия** (`jose` HS256 + `bcryptjs`) — аутентификация и роли (RBAC)
- **Docker Compose** — приложение + PostgreSQL + MailHog (локальный SMTP)
- Иконки **Phosphor**, тосты `sonner`, графики QR (`qrcode.react` / `html5-qrcode`)

---

## 🚀 Запуск на другом компьютере (одной командой)

**Единственное требование — установленный [Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows / macOS / Linux). Node.js, PostgreSQL и пр. ставить НЕ нужно — всё внутри контейнеров.

```bash
# 1. Распакуйте архив и зайдите в папку проекта
cd Wev_app_volonter

# 2. Соберите и запустите весь стек (приложение + БД + почта)
docker compose up -d --build
```

Первый запуск занимает 2–4 минуты (сборка образа). При старте контейнер
автоматически: применяет миграции (`prisma migrate deploy`), наполняет
демо-данными (`prisma db seed`) и поднимает сервер.

Когда в логах появится `Ready`, откройте:

| Сервис | Адрес |
|---|---|
| 🌐 **Приложение** | http://localhost:3000 |
| 📧 MailHog (входящие письма) | http://localhost:8025 |
| 🐘 PostgreSQL | `localhost:5433` (пользователь/пароль/база: `volonter`) |

> Проверить, что всё поднялось: `docker compose ps` — у `volonter_pg` должен быть статус `healthy`, у `volonter_web` — `Up`.

### 👤 Демо-аккаунты

Пароль у всех одинаковый: **`Password123!`**

| Роль | E-mail |
|---|---|
| Администратор | `admin@evraziya.local` |
| Организация | `org@evraziya.local` |
| Партнёр | `partner@evraziya.local` |
| Волонтёр | `anna@evraziya.local` |
| Волонтёр | `ivan@evraziya.local` |
| Волонтёр | `maria@evraziya.local` |

### Полезные команды

```bash
docker compose logs -f web      # логи приложения
docker compose stop             # остановить (данные сохраняются)
docker compose up -d            # снова запустить
docker compose down             # остановить и удалить контейнеры (volume с БД остаётся)
docker compose down -v          # ⚠️ полный сброс: удалить и БД, и загруженные файлы
```

> **Безопасность.** Для демо `AUTH_SECRET` по умолчанию `change-me`. Для боевого
> запуска задайте свой секрет: создайте файл `.env` в корне со строкой
> `AUTH_SECRET="<случайная строка>"` (например, `openssl rand -base64 32`) — compose
> подхватит его автоматически.

---

## 🛠 Локальная разработка (без Docker для приложения)

Если нужно запускать приложение в dev-режиме (hot reload), а в Docker держать только БД:

```bash
npm install
copy .env.example .env          # Windows  (Linux/macOS: cp .env.example .env)
docker compose up -d postgres mailhog   # только БД и почта
npx prisma migrate dev          # миграции + seed
npm run dev                     # http://localhost:3000
```

`.env` по умолчанию указывает на Postgres из compose (`localhost:5433`).

---

## Дизайн-код «Евразия» (DIGITAL-палитра)

| | HEX | Роль |
|---|---|---|
| 🟣 Фиолетовый | `#511CE9` | primary |
| 🔴 Малиновый | `#F30C42` | danger / акцент |
| 🟢 Зелёный | `#88B04B` | success / +токены |
| 🟡 Янтарный | `#FFAD00` | баланс / warning |

Шрифт: **Montserrat** (основной), Akrobat (дополнительный).

## Структура

```
src/
├─ app/            # маршруты (App Router) + API (Route Handlers)
│  ├─ (app)/       # кабинет волонтёра
│  ├─ org/ partner/ admin/   # кабинеты по ролям
│  └─ api/         # REST-эндпоинты
├─ components/     # UI-компоненты (дизайн-система) + доменные
├─ lib/            # prisma-клиент, валидаторы, утилиты
└─ server/         # бизнес-логика (токеномика, чек-ин, награды, миссии, чат)
prisma/            # schema.prisma + миграции + seed.ts
docs/              # план, ТЗ, дизайн-референсы
Dockerfile · docker-compose.yml   # контейнеризация всего стека
```

## Ключевые механики

- **Токеномика** — журнал `TokenTransaction` (источник истины), `User.cachedBalance` —
  кэш, обновляемый атомарно в той же транзакции. Идемпотентные начисления (антифрод).
- **Мероприятия** — запись/отписка, контроль вместимости, чек-ин по QR/гео, подтверждение организацией → начисление токенов.
- **Маркетплейс** — обычные награды (мгновенно) и награды «по заявке» (резерв токенов → одобрение).
- **Задания (миссии)** — приём задания, сдача пруфа (скрин/ссылка/код), модерация админом.
- **Соц-слой** — друзья, личные чаты, лента активности, уведомления.

## Статус

MVP по всем этапам ([`docs/PLAN.md`](docs/PLAN.md)) реализован и запускается через Docker.
