"use client";

import * as React from "react";
import { X, Plus } from "@phosphor-icons/react/dist/ssr";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface InterestsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Максимум тегов (схема допускает до 30). */
  max?: number;
  placeholder?: string;
  id?: string;
}

const DEFAULT_MAX = 30;
const MAX_LEN = 40;

/**
 * Ввод интересов как chips: Enter/запятая добавляют тег, крестик удаляет,
 * Backspace на пустом поле удаляет последний. Дубликаты игнорируются.
 */
export function InterestsInput({
  value,
  onChange,
  max = DEFAULT_MAX,
  placeholder = "Добавьте интерес и нажмите Enter",
  id,
}: InterestsInputProps) {
  const [draft, setDraft] = React.useState("");

  function addTag(raw: string) {
    const tag = raw.trim().slice(0, MAX_LEN);
    if (!tag) return;
    if (value.length >= max) return;
    const exists = value.some((v) => v.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  const reachedMax = value.length >= max;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag, i) => (
            <li key={`${tag}-${i}`}>
              <span className="inline-flex items-center gap-1 rounded-sm bg-primary-soft py-1 pl-2.5 pr-1 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/15">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="flex size-5 items-center justify-center rounded-sm text-primary transition-colors hover:bg-primary/15"
                  aria-label={`Удалить интерес «${tag}»`}
                >
                  <X className="size-3.5" weight="bold" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={reachedMax ? `Достигнут лимит (${max})` : placeholder}
          disabled={reachedMax}
          maxLength={MAX_LEN}
          aria-label="Новый интерес"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={reachedMax || draft.trim() === ""}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-4 text-sm font-semibold transition-colors",
            "hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Plus className="size-4" weight="bold" aria-hidden />
          Добавить
        </button>
      </div>
    </div>
  );
}
