"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Rule {
  id: string;
  actionKey: string;
  title: string;
  tokens: number;
  perAction: boolean;
  limitCount: number | null;
  isActive: boolean;
}

function RuleRow({ rule }: { rule: Rule }) {
  const [tokens, setTokens] = React.useState(String(rule.tokens));
  const [limit, setLimit] = React.useState(rule.limitCount == null ? "" : String(rule.limitCount));
  const [active, setActive] = React.useState(rule.isActive);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    Number(tokens) !== rule.tokens ||
    (limit === "" ? null : Number(limit)) !== rule.limitCount ||
    active !== rule.isActive;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/profile-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          tokens: Number(tokens),
          limitCount: limit === "" ? null : Number(limit),
          isActive: active,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Ошибка");
      toast.success("Правило сохранено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-b-0 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{rule.title}</p>
        <p className="font-mono text-xs text-muted">{rule.actionKey}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-muted">
          Токены
          <Input
            type="number"
            min={0}
            value={tokens}
            onChange={(e) => setTokens(e.target.value)}
            className="mt-1 h-9 w-24"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Лимит
          <Input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="∞"
            className="mt-1 h-9 w-20"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs font-semibold text-muted">
          <Switch checked={active} onCheckedChange={setActive} />
          Активно
        </label>
        <Button size="sm" disabled={!dirty || saving} onClick={save}>
          {saving ? "…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}

export function AdminProfileRules({ rules }: { rules: Rule[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      {rules.map((r) => (
        <RuleRow key={r.id} rule={r} />
      ))}
    </div>
  );
}
