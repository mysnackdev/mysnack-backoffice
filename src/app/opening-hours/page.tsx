// src/app/opening-hours/page.tsx
"use client";

import React from "react";
import DashboardShell from "@/components/DashboardShell";
import { db } from "@/firebase";
import { ref, onValue, update } from "firebase/database";
import { useAuth } from "@/context/AuthContext";

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type DayRow = {
  key: DayKey;
  label: string;
  enabled: boolean;
  open: string;
  close: string;
};

type OpeningHoursRow = { enabled: boolean; open: string; close: string };
type OpeningHoursDB = Partial<Record<DayKey, OpeningHoursRow>>;

const DAY_ORDER: { key: DayKey; label: string }[] = [
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const TIME_OPTS = (() => {
  const list: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      list.push(`${hh}:${mm}`);
    }
  }
  return list;
})();

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
        (enabled
          ? "border-rose-200 bg-rose-50 text-rose-600"
          : "border-zinc-200 bg-zinc-100 text-zinc-500")
      }
    >
      {enabled ? "Aberto" : "Fechado"}
    </span>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-4">
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={
            "block h-6 w-11 rounded-full transition-colors duration-200 " +
            (checked ? "bg-rose-600" : "bg-zinc-300")
          }
        />
        <span
          className={
            "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[20px]"
          }
        />
      </span>
      <span className="text-[17px] leading-none font-semibold text-zinc-800">
        {label}
      </span>
    </label>
  );
}

export default function OpeningHoursPage() {
  const { user } = useAuth();

  const [rows, setRows] = React.useState<DayRow[]>(
    DAY_ORDER.map(({ key, label }) => ({
      key,
      label,
      enabled: ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(key),
      open: "08:00",
      close: "18:00",
    }))
  );
  const [saving, setSaving] = React.useState(false);

  // Carregar do DB (tenant)
  React.useEffect(() => {
    if (!user) return;
    const r = ref(db, `backoffice/tenants/${user.uid}/openingHours`);
    return onValue(r, (snap) => {
      if (!snap.exists()) return;
      const v = snap.val() as OpeningHoursDB;
      setRows((prev) =>
        DAY_ORDER.map(({ key, label }) => {
          const prevRow = prev.find((p) => p.key === key);
          const row = v?.[key];
          return {
            key,
            label,
            enabled: row?.enabled ?? prevRow?.enabled ?? false,
            open: row?.open ?? "08:00",
            close: row?.close ?? "18:00",
          };
        })
      );
    });
  }, [user]);

  const setRow = (key: DayKey, patch: Partial<DayRow>) =>
    setRows((curr) => curr.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const acceptRecommendations = () => {
    setRows(() =>
      DAY_ORDER.map(({ key, label }) => ({
        key,
        label,
        enabled: ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(key),
        open: "08:00",
        close: "18:00",
      }))
    );
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: OpeningHoursDB = {};
      for (const r of rows) {
        payload[r.key] = { enabled: r.enabled, open: r.open, close: r.close };
      }
      await update(ref(db, `backoffice/tenants/${user.uid}/openingHours`), payload);
      await update(ref(db, `backoffice/tenants/${user.uid}/storeProfile`), {
        updatedAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Horário de funcionamento
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Escolha os dias e horários que sua loja receberá pedidos.
          </p>
        </div>

        <div className="rounded-xl border bg-zinc-900 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/20 text-rose-200">
                ⚡️
              </div>
              <div>
                <div className="text-lg font-semibold">
                  Horários recomendados para sua cozinha
                </div>
                <p className="mt-1 text-sm text-zinc-200/90 max-w-3xl">
                  Confira nossas recomendações de horários estratégicos para seu tipo de
                  cozinha. Você poderá alterar estes dados depois.
                </p>
              </div>
            </div>
            <button
              onClick={acceptRecommendations}
              className="rounded-lg border border-rose-300/40 bg-transparent px-4 py-2 text-sm font-medium hover:bg-rose-500/10"
            >
              Aceitar recomendações
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-white">
          {rows.map((row, idx) => (
            <div
              key={row.key}
              className={
                "grid items-center gap-3 px-4 py-3 " +
                "grid-cols-1 md:grid-cols-[minmax(220px,1fr),150px,16px,150px,auto] " +
                (idx !== rows.length - 1 ? "border-b" : "")
              }
            >
              <Switch
                checked={row.enabled}
                onChange={(v) => setRow(row.key, { enabled: v })}
                label={row.label}
              />

              <select
                disabled={!row.enabled}
                value={row.open}
                onChange={(e) => setRow(row.key, { open: e.target.value })}
                className="h-10 w-[150px] rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] leading-none disabled:opacity-50"
              >
                {TIME_OPTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <span className="hidden items-center justify-center text-zinc-400 md:flex">–</span>

              <select
                disabled={!row.enabled}
                value={row.close}
                onChange={(e) => setRow(row.key, { close: e.target.value })}
                className="h-10 w-[150px] rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] leading-none disabled:opacity-50"
              >
                {TIME_OPTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div className="ml-auto">
                <StatusBadge enabled={row.enabled} />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between px-4 py-4">
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50"
              onClick={() => history.back()}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar e continuar"}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
