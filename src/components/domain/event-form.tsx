"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { EVENT_CATEGORIES } from "@/lib/events";

export interface EventFormInitial {
  title: string;
  description: string;
  /** Значение для <input type="datetime-local"> (локальное). */
  startsAtLocal: string;
  location: string;
  geoLat: string;
  geoLng: string;
  capacity: string;
  category: string;
}

interface EventFormProps {
  /** 'create' → POST /api/org/events; 'edit' → PATCH /api/org/events/[id]. */
  mode: "create" | "edit";
  /** Обязателен в режиме edit. */
  eventId?: string;
  initial?: Partial<EventFormInitial>;
}

const EMPTY: EventFormInitial = {
  title: "",
  description: "",
  startsAtLocal: "",
  location: "",
  geoLat: "",
  geoLng: "",
  capacity: "10",
  category: EVENT_CATEGORIES[0],
};

const TEXTAREA_CLASS =
  "flex w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted/80 hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";
const SELECT_CLASS =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-xs transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

/**
 * Форма создания/редактирования мероприятия (организация).
 * Поля: title, description, startsAt (datetime-local → ISO), location,
 * geoLat/geoLng (опц., парой), capacity, category. Серверные ошибки полей
 * показываются под инпутами.
 */
export function EventForm({ mode, eventId, initial }: EventFormProps) {
  const router = useRouter();
  const start = { ...EMPTY, ...initial };

  const [title, setTitle] = React.useState(start.title);
  const [description, setDescription] = React.useState(start.description);
  const [startsAtLocal, setStartsAtLocal] = React.useState(start.startsAtLocal);
  const [location, setLocation] = React.useState(start.location);
  const [geoLat, setGeoLat] = React.useState(start.geoLat);
  const [geoLng, setGeoLng] = React.useState(start.geoLng);
  const [capacity, setCapacity] = React.useState(start.capacity);
  const [category, setCategory] = React.useState(start.category);

  const [saving, setSaving] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const err = (key: string) => fieldErrors[key]?.[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    // Координаты — опциональны, но строго парой; пустые → не отправляем.
    const latStr = geoLat.trim();
    const lngStr = geoLng.trim();
    const lat = latStr ? Number(latStr) : null;
    const lng = lngStr ? Number(lngStr) : null;

    if ((latStr && !lngStr) || (!latStr && lngStr)) {
      setFieldErrors({ geoLat: ["Координаты задаются парой (широта и долгота)"] });
      setSaving(false);
      return;
    }
    if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) {
      setFieldErrors({ geoLat: ["Координаты должны быть числами"] });
      setSaving(false);
      return;
    }

    // datetime-local → ISO.
    const startsAt = startsAtLocal ? new Date(startsAtLocal).toISOString() : "";

    const payload = {
      title: title.trim(),
      description: description.trim(),
      startsAt,
      location: location.trim(),
      capacity: Number(capacity),
      category: category.trim(),
      geoLat: lat,
      geoLng: lng,
    };

    const url = mode === "create" ? "/api/org/events" : `/api/org/events/${eventId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.fields) setFieldErrors(data.fields);
        throw new Error(data?.error ?? "Не удалось сохранить мероприятие");
      }

      toast.success(
        mode === "create"
          ? "Мероприятие отправлено на модерацию"
          : "Изменения сохранены",
      );
      router.push("/org/events");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardContent className="space-y-4 py-5">
          <div>
            <Label htmlFor="ev-title">Название</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Субботник в парке"
              aria-invalid={Boolean(err("title"))}
              required
            />
            {err("title") && (
              <p className="mt-1 text-xs text-danger-strong">{err("title")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="ev-description">Описание</Label>
            <textarea
              id="ev-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Чем будут заниматься волонтёры, что взять с собой, как добраться…"
              className={TEXTAREA_CLASS}
              aria-invalid={Boolean(err("description"))}
              required
            />
            {err("description") && (
              <p className="mt-1 text-xs text-danger-strong">{err("description")}</p>
            )}
          </div>

          {/* Дата/время и категория — на ПК в два столбца. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ev-startsAt">Дата и время начала</Label>
              <input
                id="ev-startsAt"
                type="datetime-local"
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
                className={SELECT_CLASS}
                aria-invalid={Boolean(err("startsAt"))}
                required
              />
              {err("startsAt") && (
                <p className="mt-1 text-xs text-danger-strong">{err("startsAt")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ev-category">Категория</Label>
              <select
                id="ev-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={SELECT_CLASS}
                aria-invalid={Boolean(err("category"))}
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {err("category") && (
                <p className="mt-1 text-xs text-danger-strong">{err("category")}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <Label htmlFor="ev-location">Место проведения</Label>
              <Input
                id="ev-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Москва, Парк Горького"
                aria-invalid={Boolean(err("location"))}
                required
              />
              {err("location") && (
                <p className="mt-1 text-xs text-danger-strong">{err("location")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ev-capacity">Мест</Label>
              <Input
                id="ev-capacity"
                type="number"
                min={1}
                max={100000}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                aria-invalid={Boolean(err("capacity"))}
                required
              />
              {err("capacity") && (
                <p className="mt-1 text-xs text-danger-strong">{err("capacity")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Координаты для гео-чек-ина — опционально. */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Координаты для гео-чек-ина
            </h2>
            <p className="text-xs text-muted">
              Необязательно. Если указать широту и долготу, волонтёры смогут отмечаться
              по геолокации (в радиусе 300 м). Задаются парой.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ev-lat">Широта (lat)</Label>
              <Input
                id="ev-lat"
                value={geoLat}
                onChange={(e) => setGeoLat(e.target.value)}
                placeholder="55.7298"
                inputMode="decimal"
                aria-invalid={Boolean(err("geoLat"))}
              />
            </div>
            <div>
              <Label htmlFor="ev-lng">Долгота (lng)</Label>
              <Input
                id="ev-lng"
                value={geoLng}
                onChange={(e) => setGeoLng(e.target.value)}
                placeholder="37.6037"
                inputMode="decimal"
                aria-invalid={Boolean(err("geoLng"))}
              />
            </div>
          </div>
          {err("geoLat") && (
            <p className="text-xs text-danger-strong">{err("geoLat")}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && (
            <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
          )}
          {saving
            ? "Сохранение…"
            : mode === "create"
              ? "Отправить на модерацию"
              : "Сохранить изменения"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => router.push("/org/events")}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
