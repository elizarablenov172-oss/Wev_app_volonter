# План проекта: Платформа волонтёрских мероприятий с Social Tokens

**Заказчик:** НКО «Евразия» · **Формат:** хакатон · **Документ-источник:** `Объединенное_ТЗ_Платформа_волонтерских_мероприятий_V2.pdf` + брендбук «Гайдлайн Евразия»
**План подготовлен** с участием ИИ-агентов (Backend Architect, UI Designer) и сведён в единый roadmap.

---

## 1. Резюме

Соцсеть для волонтёров: пользователи участвуют в мероприятиях и заданиях, получают **social tokens**, тратят их в маркетплейсе наград. Четыре роли: **Волонтёр**, **Организация**, **Администратор**, **Партнёр**. Ключевая «петля ценности»: *участие → начисление токенов → обмен на награду*.

### Зафиксированные решения (defaults, подлежат согласованию)
| Решение | Значение |
|---|---|
| Стек | **Next.js (App Router, React + TypeScript)** full-stack + **PostgreSQL** + **Prisma** + **Tailwind CSS** |
| Realtime | **Socket.io** (custom server) для чата и in-app уведомлений; fallback — polling |
| Auth | **Auth.js (NextAuth v5)**, Credentials + JWT, RBAC по 4 ролям |
| Хранилище файлов | Локальная ФС `public/uploads/` (аватары, скриншоты-пруфы) — оффлайн-демо |
| БД-инфраструктура | Локальный PostgreSQL через **Docker Compose** (+ MailHog для e-mail) |
| UI-кит | **shadcn/ui + Tailwind** (Radix — доступность из коробки) + доменные компоненты |
| Объём | **Обновлённый MVP по ТЗ §6** с чёткой фазировкой растяжек |
| Папка проекта | `D:\хакатон\Wev_app_volonter\` (git-репозиторий) |
| Репозиторий | GitHub `elizarablenov172-oss/Wev_app_volonter`, remote `origin` (SSH ✅), ветка `main` |

> **Окружение разработчика:** Windows 11. На машине **не установлены Node.js и Docker** — установка рантайма = первый шаг разработки (Фаза 0).
> **Версионирование:** проект разрабатывается внутри подключённого git-репозитория `Wev_app_volonter`. SSH-доступ к GitHub проверен (push работает). Стратегия: feature-ветки от `main`, коммиты по завершению этапов; большие бинарники (исходные PDF, рендеры брендбука) и `node_modules`/`uploads` — в `.gitignore`.

---

## 2. Дизайн-код «Евразия» (извлечён из официального брендбука, 74 стр.)

### Digital-палитра (основная для цифрового продукта)
| Цвет | HEX | RGB | Роль в UI |
|---|---|---|---|
| 🟣 Фиолетовый | `#511CE9` | 81 28 233 | **primary** — CTA, навигация, акценты соцсети |
| 🔴 Малиновый | `#F30C42` | 243 12 66 | **danger / accent** — ошибки, лайки, «горящее», списание токенов |
| 🟢 Зелёный | `#88B04B` | 137 176 75 | **success** — начисление токенов «+», подтверждено, выполнено |
| 🟡 Янтарный | `#FFAD00` | 255 173 0 | **tokens / warning** — баланс (монета), «ожидает», уровни/бейджи |

PANTONE-палитра (для печати/официоза, справочно): Viva Magenta `#BC2649`, Very Peri `#6518E2`, Greenery `#89B04B`, Classic Blue `#104C81`, Living Coral `#FF7061`, Mimosa `#F0C15A`.

### Типографика
- **Montserrat** — основной (Bold заголовки, Regular текст). Подключение через `next/font/google`, **обязателен cyrillic-subset**.
- **Akrobat** — дополнительный (Black заголовки, SemiBold текст), локально через `next/font/local`. Fallback при отсутствии файлов — Montserrat 800.

### Прочее
- Логотип «Евразия» + дескриптор «Континент возможностей»; графика — стилизованный флаг.
- Фирменный **паттерн** (этнические орнаменты народов Евразии) — декоративные акценты: шапки профиля, пустые состояния, бейджи уровней, экраны успеха. Не перегружать.
- Стиль: чистые белые карточки на холодно-белом фоне, глубина — тенями, mobile-first.

### ⚠️ Контраст (WCAG AA — обязательно)
- Фиолетовый на белом — ~7.6:1 ✅ (текст/кнопки).
- **Янтарный и зелёный НЕЛЬЗЯ использовать как текст на белом** (контраст 1.7:1 / 2.4:1) — только фон-soft + тёмный текст. Суммы токенов выводить тёмным/затемнённым-зелёным `#71943A`, янтарь — для фона-чипа и иконки.
- Малиновый для мелкого текста затемнять до `#CC0834`. Тач-таргеты ≥ 44×44px.

---

## 3. Архитектура и модель данных

### 3.1. Стек и обоснование
- **Next.js full-stack**: UI + API (Route Handlers `app/api/.../route.ts` для REST из ТЗ §5, Server Actions для форм). Один проект → меньше DevOps.
- **PostgreSQL + Prisma**: транзакции критичны для токеномики; типобезопасность, быстрые миграции.
- **Socket.io** для realtime (чат, уведомления): сообщение пишется в БД через API → эмитится в сокет. БД — источник истины, сокет — транспорт. Fallback — polling `GET /dialogs/{id}/messages`.
- **Файлы** — локально (`public/uploads/{avatars,proofs}/`), в БД только путь.
- **E-mail** — опционально через Nodemailer + MailHog (оффлайн-демо), иначе лог в консоль.

### 3.2. Модель данных (Prisma) — ключевые сущности
Покрывает ТЗ §4 (основные + дополнительные сущности):

**Enums:** `Role(VOLUNTEER/ORGANIZATION/ADMIN/PARTNER)`, `OrgStatus(PENDING/APPROVED/REJECTED)`, `EventStatus(DRAFT/PENDING/PUBLISHED/REJECTED/ARCHIVED)`, `ParticipationStatus(REGISTERED/CHECKED_IN/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW)`, `CheckInMethod(QR/GEO/ORG_CONFIRM)`, `TxType(EARN_EVENT/EARN_PROFILE/EARN_MISSION/EARN_BONUS/SPEND_REWARD/REFUND/ADMIN_ADJUST)`, `FriendStatus(PENDING/ACCEPTED/DECLINED/BLOCKED)`, `MissionStatus(AVAILABLE/ACCEPTED/PENDING_REVIEW/COMPLETED/REJECTED/EXPIRED)`, `ProofMethod(OAUTH/UTM_LINK/PROMO_QR/SCREENSHOT)`, `RewardType(DISCOUNT/GOODS/SERVICE/EVENT_ACCESS/TRIP/EDUCATION/MERCH/PARTNER_OFFER)`, `RedemptionStatus(CREATED/PENDING_APPROVAL/APPROVED/ISSUED/CANCELLED/REFUNDED)`, `NotifType(...)`, `FeedVisibility(PUBLIC/FRIENDS/PRIVATE)`.

**Модели:** `User` (роль, соц-профиль, privacy JSON, cachedBalance, levelId), `Organization` (status-модерация), `Partner`, `Event` (rewardTokens назначает админ, geoLat/Lng, qrSecret), `Participation` (`@@unique([userId,eventId])`, флаг `rewarded`), `TokenTransaction` (**ledger — источник истины**, `idempotencyKey @unique`), `ProfileCompletionRule` (настраиваемые правила 3.9), `Mission` + `MissionSubmission`, `Reward` + `RewardRedemption`, `Friendship`, `Dialog` + `Message` (readAt), `ActivityFeedItem` (visibility), `Notification`, `Level`, `Badge` + `UserBadge`, `AdminAuditLog`.

### 3.3. Токеномика (ledger-дизайн)
- **Баланс = `SUM(amount)` по TokenTransaction**; `User.cachedBalance` — денормализованный кэш, обновляется в той же транзакции. Полный аудит «кто/за что/когда/по какому правилу» (ТЗ 3.14).
- **Начисление за профиль (3.9):** правила в `ProfileCompletionRule` (сидируются по таблице ТЗ: контакты +10, фото +10, соц-ссылка +5 до лимита, обязательные поля +5..15, профиль ≥80% +20 бонус).
- **Антифрод:** идемпотентный ключ `userId:actionKey[:linkHash]` (нельзя «удалил-добавил → снова токены»), валидация форматов, лимиты, ручная модерация спорных (скриншот-пруфы).
- **Начисление за участие (3.8):** размер назначает только админ; начисление при переходе `Participation → CONFIRMED` в одной транзакции (`idempotencyKey=part:{id}`, `rewarded=true`) → «одно участие = одна награда».
- **Списание/возврат:** покупка награды в `prisma.$transaction`; крупные награды резервируют токены, при отмене → `REFUND`.

### 3.4. Аутентификация и RBAC
- NextAuth v5, Credentials (bcrypt), JWT-сессии, роль в токене. `middleware.ts` + серверный `requireRole()` в каждом эндпоинте.
- Модерация регистрации: организация/партнёр → `PENDING` → админ `APPROVED/REJECTED` (+ AuditLog). Мероприятия: `DRAFT → PENDING → PUBLISHED`(с наградой) / `REJECTED`.

### 3.5. API-поверхность (REST, замаплена на ТЗ §5)
Auth/профиль (`/api/auth/*`, `/api/profile*`, `/api/users/{id}`), мероприятия+участие (`/api/events*`, `join`, `checkin`, `participants/{uid}/confirm`, `stats`), друзья+сообщения (`/api/friends*`, `/api/dialogs*`, `/api/messages/{id}/read`, `users/{id}/block`), миссии/токены/награды (`/api/missions*`, `/api/wallet*`, `/api/rewards*`, `reserve`, `redemptions`), админ/партнёр (`/api/admin/*`, `/api/partner/rewards`). Полная таблица доступов по ролям — см. ниже в разделе «Деталь API».

### 3.6. Чек-ин (3.7)
1. **QR** — `Event.qrSecret`, скан `eventId:qrSecret`. 2. **Геолокация** — Haversine до точки события, допуск ~150–300 м. 3. **Подтверждение организацией** — кнопка в кабинете. Начисление атомарно при `CONFIRMED`. *Упрощение для демо:* основные методы — гео + кнопка организации; QR — если останется время.

### 3.7. Структура проекта (Next.js full-stack)
```
Wev_app_volonter/                # git-репозиторий = корень проекта
├─ .gitignore                    # node_modules, .next, .env, uploads, *.pdf, _guideline_pages
├─ README.md
├─ docker-compose.yml            # postgres + mailhog
├─ .env.example                  # DATABASE_URL, AUTH_SECRET, UPLOAD_DIR
├─ server.ts                     # custom Next + Socket.io
├─ prisma/ schema.prisma · migrations/ · seed.ts
├─ public/ uploads/{avatars,proofs}/ · fonts/ · patterns/
└─ src/
   ├─ app/
   │  ├─ (auth)/ login · register · onboarding
   │  ├─ (app)/ feed · profile/[id] · events/[id] · missions · marketplace · wallet · friends · chats/[id] · notifications
   │  ├─ org/ · partner/ · admin/
   │  └─ api/                    # Route Handlers (см. §3.5)
   ├─ server/                    # бизнес-логика: auth.ts · tokens/ledger.ts · tokens/profileRules.ts · events/checkin.ts · rewards/redeem.ts · missions/ · notifications/ · socket/
   ├─ lib/                       # prisma, zod-валидаторы, api-клиент, utils
   ├─ components/ ui/ (shadcn) · domain/ (EventCard, RewardCard, TaskCard, TokenAmount, ChatBubble, ...)
   └─ middleware.ts              # RBAC guard
```

---

## 4. Дизайн-система и фронтенд

### 4.1. Токены
Двухуровневые: **primitives** (digital-палитра) → **semantic** (роли) через CSS-переменные (RGB-каналы для tailwind `<alpha-value>`) + `tailwind.config.ts`. Поддержка dark-mode (`class`). Радиусы (кнопки 10px, карточки 16px, pill для чипов/аватаров/токенов), тени (sm/md/lg + focus-ring), типошкала 1.25 на Montserrat, числа токенов — Akrobat Black + `tabular-nums`. Артефакты: `src/app/globals.css`, `tailwind.config.ts`, `src/app/fonts.ts`.

### 4.2. UI-кит
- **Из shadcn:** Button, Input, Textarea, Select, Dialog, Sheet, DropdownMenu, Tabs, Toast (Sonner), Avatar, Badge, Skeleton, Switch, Tooltip, Popover, Command.
- **Доменные (свои):** `TokenAmount`, `EventCard`, `RewardCard`, `TaskCard`, `UserCard`, `FeedItem`, `ChatBubble`, `BottomNav`, `LevelBadge`, `QrCheckIn`, `BalanceChip`, `EmptyState`, `WalletHistoryRow`, `ModerationPanel`, `AppShell`, `ProfileHeader`.
- **Словарь статусов** (единые цвета): мероприятие/участие/задание/награда/организация — см. раздел UI-агента.

### 4.3. Карта экранов (по ролям)
- **Публичные:** `/`, `/login`, `/register` (выбор роли), `/onboarding`.
- **Волонтёр:** `/feed`, `/profile/[id]`, `/profile/edit`, `/profile/privacy`, `/events`, `/events/[id]`, `/events/[id]/checkin`, `/missions`, `/missions/[id]`, `/marketplace`, `/marketplace/[id]`, `/marketplace/purchases`, `/wallet`, `/friends`, `/chats`, `/chats/[id]`, `/notifications`.
- **Организация `/org`:** дашборд, events (список/new/edit), participants, qr.
- **Партнёр `/partner`:** дашборд, rewards (список/new/edit), redemptions.
- **Админ `/admin`:** дашборд, moderation/events (+ назначение награды), moderation/orgs, users, missions, profile-rules, rewards (+ заявки), tokens-log, complaints.

### 4.4. Mobile-first
Брейкпоинты xs375/sm640/md768/lg1024/xl1280. **< md:** BottomNav (5 пунктов, центр — QR-чек-ин) + компактный TopBar (логотип, баланс-чип, колокол), фильтры через Sheet. **≥ md:** Sidebar + расширенный TopBar, списки→сетки/таблицы, чат→master-detail. Sticky-CTA снизу + `pb-safe`. PWA-манифест опционально (low-effort win), Web Push — вне MVP (имитируем тостами).

---

## 5. Интегрированный roadmap (бэкенд × фронтенд)

Принцип: фронт с первого часа работает на **типизированных моках** (типы из Prisma/ТЗ §4) → параллельно с бэком; подключение к API — точечная замена слоя `lib/api`.

| Этап | Бэкенд | Фронтенд | Зависимости |
|---|---|---|---|
| **0. Окружение** | Установка Node LTS + Docker (Windows), `create-next-app`, Prisma init, `docker-compose up` (Postgres+MailHog), Tailwind | Каркас: токены, шрифты, shadcn-init, AppShell, BottomNav/Sidebar | — (узкое горлышко, делать первым) |
| **1. Фундамент данных** | Полная `schema.prisma` + миграции + seed (роли, правила 3.9, demo) | Дизайн-кит: атомы+молекулы, страница `/kit` | Б1 ← Б0 |
| **2. Auth + роли** | NextAuth, register/login, middleware, requireRole | login/register/onboarding, guard-роуты | ← Э1 |
| **3. Ledger + Профиль** | tokens/ledger.ts (идемпотентность), wallet/history, PATCH профиля + начисления 3.9 | соц-профиль + лента, edit (+toast токенов), privacy, wallet | ← Э2 |
| **4. Мероприятия + чек-ин** | CRUD, модерация, join, QR/гео, начисление | список/фильтры/карточка, чек-ин, кабинет орг | ← Э2,Э3 |
| **5. Marketplace** | каталог, redeem, reserve, заявки, refund | магазин, карточка награды, покупка, история | ← Э3 |
| **6. Задания** | list/start/submit-proof/verify, начисление | модуль заданий, статусы, загрузка пруфа | ← Э3 |
| **7. Соц: друзья + чат** | friendships, dialogs, messages, Socket.io | друзья/заявки/поиск, список диалогов, окно чата | ← Э2 |
| **8. Уведомления** | таблица + эмиттеры во всех модулях | колокол, центр уведомлений, тосты | ← Э7 |
| **9. Админ + Партнёр** | модерация, profile-rules, audit-log, статистика, partner/rewards | админ-панель (1 DataTable + конфиг), кабинет партнёра | ← все |
| **10. Полировка + демо** | seed демо-сценария, фиксы | пустые/ошибки/лоадеры, адаптив-аудит, a11y/контраст, паттерн-акценты | финал |

**Демо-минимум (если время горит):** Этапы 0–5 + админ-модерация из 9 → закрывает петлю «участие → токены → награда» + соц-профиль.

---

## 6. Риски и упрощения для хакатона
| Риск | Митигация |
|---|---|
| Установка Node/Docker на чистой Windows | Фаза 0 — первой; запасной план: Postgres локально без Docker |
| Socket.io требует custom server | Заложить `server.ts` сразу; fallback на polling |
| Гео-чек-ин ненадёжен в помещении | Большой допуск / dev-флаг «успешно»; основной метод — кнопка организации |
| QR — много фронт-работы | Понизить приоритет; секрет в БД уже заложен |
| Двойные начисления токенов | Идемпотентные ключи + `$transaction` с самого начала |
| Akrobat (лицензия/файлы) | Fallback Montserrat 800 |
| Realtime/Web Push | In-app тосты + центр уведомлений; push — «расширение» |
| OAuth/UTM-проверка миссий | В MVP только «скриншот + модерация» (минимум 1 способ — требование §6) |
| Объём админки (9 экранов) | Переиспользуемый DataTable + approve/reject-модалки |
| Загрузка файлов | Локальная папка; на демо — превью/мок-URL при отсутствии хранилища |

---

## 7. Что замокать без потери демо-ценности
E-mail (лог в консоль), Web Push, OAuth/UTM-методы миссий, ротация QR-секрета, мульти-фото профиля, расширенная статистика (2–3 цифры), dark-mode (включается позже «бесплатно»).

---

## 8. Следующий шаг
После утверждения плана — **Этап 0 (Окружение)** внутри репозитория `Wev_app_volonter`:
1. Установка Node.js LTS + Docker Desktop (на Windows).
2. Инициализация Next.js (App Router, TS) в корне репозитория + Tailwind + shadcn + Prisma.
3. `.gitignore` (node_modules, .next, .env, uploads, исходные PDF, `_guideline_pages`); перенос `PLAN.md`/`tz.txt` в `docs/`.
4. `docker-compose up` (PostgreSQL + MailHog), первая миграция и seed.
5. Первый коммит каркаса в ветку `main` (или `feat/scaffold`) и push в origin.
