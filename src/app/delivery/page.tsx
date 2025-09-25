// src/app/delivery/page.tsx
"use client";

import React from "react";
import { onValue, ref, update } from "firebase/database";
import { db } from "@/firebase";
import { syncSetupStatus } from "@/lib/completeness";
import DashboardShell from "@/components/DashboardShell";
import { Toaster, toast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";

type DeliveryArea = {
  name: string;
  type: "radius";
  radiusKm: number;
  center: { lat: number; lng: number };
  feeBase?: number;
  feePerKm?: number;
  minOrder?: number;
  etaMin?: number;
  etaMax?: number;
};

type DeliveryModes = { delivery: boolean; pickup: boolean; inhouse?: boolean };

type DeliveryData = {
  enabled: boolean;
  modes: DeliveryModes;
  areas?: Record<string, DeliveryArea>;
  freeThreshold?: number | null;
  updatedAt?: number;
};

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toNumberOrNull(
  v: unknown,
  fallback: number | null | undefined = null
): number | null {
  if (v == null || v === "") return fallback ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback ?? null;
}

function validateDelivery(form: DeliveryData): string[] {
  const issues: string[] = [];

  if (form.enabled !== true) {
    issues.push("Ative as Configurações de entrega (habilitar).");
  }

  const modes = form.modes || { delivery: false, pickup: false };
  const hasMode = !!(modes.delivery || modes.pickup || modes.inhouse);
  if (!hasMode) {
    issues.push(
      "Selecione pelo menos um modo: entrega, retirada (pickup) ou atendimento interno."
    );
  }

  const areas = form.areas || {};
  const hasArea = Object.keys(areas).length > 0;
  if (!modes.pickup && !hasArea) {
    issues.push(
      "Para usar entrega em domicílio, adicione ao menos uma área ou habilite pickup."
    );
  }

  for (const [k, a] of Object.entries(areas)) {
    if (!a.name || a.name.trim().length < 2)
      issues.push(`Área ${k}: informe um nome.`);
    if (a.type !== "radius")
      issues.push(`Área ${k}: tipo inválido (use radius).`);
    if (!(a.radiusKm >= 0 && a.radiusKm <= 100))
      issues.push(`Área ${k}: raio deve estar entre 0 e 100 km.`);
    if (!Number.isFinite(a.center?.lat) || a.center.lat < -90 || a.center.lat > 90)
      issues.push(`Área ${k}: latitude inválida.`);
    if (!Number.isFinite(a.center?.lng) || a.center.lng < -180 || a.center.lng > 180)
      issues.push(`Área ${k}: longitude inválida.`);
    if (a.feeBase != null && !(a.feeBase >= 0 && a.feeBase <= 1000))
      issues.push(`Área ${k}: taxa base deve estar entre 0 e 1000.`);
    if (a.feePerKm != null && !(a.feePerKm >= 0 && a.feePerKm <= 50))
      issues.push(`Área ${k}: taxa por km deve estar entre 0 e 50.`);
    if (a.minOrder != null && !(a.minOrder >= 0 && a.minOrder <= 10000))
      issues.push(`Área ${k}: pedido mínimo inválido (0 a 10000).`);
    if (a.etaMin != null && !(a.etaMin >= 0 && a.etaMin <= 240))
      issues.push(`Área ${k}: ETA mínimo inválido (0 a 240).`);
    if (a.etaMax != null && !(a.etaMax >= 0 && a.etaMax <= 240))
      issues.push(`Área ${k}: ETA máximo inválido (0 a 240).`);
    if (a.etaMin != null && a.etaMax != null && a.etaMin > a.etaMax)
      issues.push(`Área ${k}: ETA mínimo não pode ser maior que o máximo.`);
  }

  if (form.freeThreshold != null && form.freeThreshold < 0) {
    issues.push("Frete grátis a partir de: valor não pode ser negativo.");
  }

  return issues;
}

function invalidMap(form: DeliveryData): Record<string, string> {
  const issues = validateDelivery(form);
  const map: Record<string, string> = {};
  for (const msg of issues) {
    if (/habilitar/.test(msg)) map["enabled"] = msg;
    if (/Selecione pelo menos um modo/.test(msg)) map["modes"] = msg;
    if (/pickup/.test(msg) || /área/.test(msg) || /domicílio/.test(msg))
      map["areas"] = msg;
    if (/Frete grátis/.test(msg)) map["freeThreshold"] = msg;
  }
  return map;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function DeliveryPage() {
  const { user } = useAuth();

  const [form, setForm] = React.useState<DeliveryData>({
    enabled: false,
    modes: { delivery: true, pickup: false, inhouse: false },
    areas: {},
    freeThreshold: null,
  });
  const [saving, setSaving] = React.useState(false);
  const [online, setOnline] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string>("");

  // carrega dados do delivery
  React.useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const r = ref(db, `backoffice/tenants/${uid}/delivery`);
    const off = onValue(r, (s) => {
      if (!s.exists()) return;

      const raw = s.val() as unknown;
      if (!raw || typeof raw !== "object") return;

      const v = raw as Partial<DeliveryData> & {
        updatedAt?: number;
        freeThreshold?: unknown;
        modes?: Partial<DeliveryModes>;
      };

      setForm((f) => {
        const incoming: Partial<DeliveryModes> = v.modes ?? {};
        const mergedModes: DeliveryModes = {
          delivery: !!(incoming.delivery ?? f.modes.delivery ?? false),
          pickup: !!(incoming.pickup ?? f.modes.pickup ?? false),
          inhouse: !!(incoming.inhouse ?? f.modes.inhouse ?? false),
        };

        return {
          ...f,
          enabled: v.enabled ?? f.enabled,
          modes: mergedModes,
          areas: v.areas || {},
          freeThreshold: toNumberOrNull(v.freeThreshold, f.freeThreshold),
        };
      });

      if (v.updatedAt) {
        const d = new Date(Number(v.updatedAt));
        setLastUpdated(
          d.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    });
    return () => off();
  }, [user]);

  // badge online/offline
  React.useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const rStatus = ref(db, `backoffice/tenants/${uid}/status`);
    const offS = onValue(rStatus, (s) =>
      setOnline(!!(s.val() as { online?: boolean } | null)?.online)
    );
    return () => offS();
  }, [user]);

  // atualização imutável por caminho "a.b.c"
  function setField(path: string, value: unknown) {
    setForm((curr) => {
      const clone: DeliveryData = JSON.parse(
        JSON.stringify(curr)
      ) as DeliveryData;
      const parts = path.split(".");
      let obj: Record<string, unknown> =
        (clone as unknown) as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        const next = (obj[k] ?? {}) as Record<string, unknown>;
        obj[k] = next;
        obj = next;
      }
      obj[parts[parts.length - 1]] = value;
      return clone;
    });
  }

  function addArea() {
    const id = randomId();
    setForm((f) => ({
      ...f,
      areas: {
        ...(f.areas || {}),
        [id]: {
          name: "Nova área",
          type: "radius",
          radiusKm: 3,
          center: { lat: -22.9, lng: -43.2 },
          feeBase: 5,
          feePerKm: 1,
          minOrder: 0,
          etaMin: 30,
          etaMax: 60,
        },
      },
    }));
  }

  function removeArea(id: string) {
    setForm((f) => {
      const nextAreas = { ...(f.areas || {}) } as Record<string, DeliveryArea>;
      delete nextAreas[id];
      return { ...f, areas: nextAreas };
    });
  }

  const invalid = invalidMap(form);

  const save = async () => {
    if (!user) return;
    const issues = validateDelivery(form);
    if (issues.length) {
      setShowErrors(true);
      toast.error(
        "Corrija os campos antes de salvar:\n\n• " + issues.join("\n• ")
      );
      return;
    }
    setSaving(true);
    try {
      const uid = user.uid;

      const modes: DeliveryModes = {
        delivery: !!form.modes?.delivery,
        pickup: !!form.modes?.pickup,
        inhouse: !!form.modes?.inhouse,
      };

      const areas: Record<string, DeliveryArea> = {};
      for (const [id, a] of Object.entries(
        form.areas || {}
      ) as Array<[string, DeliveryArea]>) {
        areas[id] = {
          name: a.name,
          type: "radius",
          radiusKm: Number(a.radiusKm || 0),
          center: { lat: Number(a.center?.lat), lng: Number(a.center?.lng) },
          feeBase: numOrUndef(a.feeBase),
          feePerKm: numOrUndef(a.feePerKm),
          minOrder: numOrUndef(a.minOrder),
          etaMin: numOrUndef(a.etaMin),
          etaMax: numOrUndef(a.etaMax),
        };
      }

      const toSave: DeliveryData = {
        enabled: !!form.enabled,
        modes,
        areas,
        freeThreshold: form.freeThreshold ?? null,
        updatedAt: Date.now(),
      };

      await update(ref(db, `backoffice/tenants/${uid}/delivery`), toSave);
      await update(ref(db, `backoffice/tenants/${uid}/lastUpdated`), {
        delivery: Date.now(),
      });

      await syncSetupStatus(uid);
      toast.success("Configurações de entrega salvas.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Não foi possível salvar.\n" + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Delivery
            </h1>
            <p className="text-sm text-zinc-500">
              {lastUpdated ? <>Última atualização: {lastUpdated}</> : "Sem atualizações ainda"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border",
                online
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-700",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  online ? "bg-emerald-500" : "bg-zinc-400",
                ].join(" ")}
              />
              {online ? "Online" : "Offline"}
            </span>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </div>

        {/* Aviso de regra para ficar online */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Para ficar <b>online</b>: ative as configurações de entrega, selecione
          pelo menos um modo (entrega, pickup ou in-house) e, se <b>usar entrega em
          domicílio</b>, mantenha pickup marcado ou adicione ao menos <b>uma área</b> de
          atendimento.
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Coluna esquerda (principal) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Habilitar e modos */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Habilitar e modos</h2>

              <div className="mb-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setField("enabled", e.target.checked)}
                  />
                  <span
                    className={
                      showErrors && invalid["enabled"]
                        ? "font-medium text-rose-600"
                        : ""
                    }
                  >
                    Habilitar configurações de entrega
                  </span>
                </label>
                {showErrors && invalid["enabled"] && (
                  <div className="mt-1 text-sm text-rose-600">
                    {invalid["enabled"]}
                  </div>
                )}
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
                  showErrors && invalid["modes"]
                    ? "rounded-lg border border-rose-300 p-3"
                    : ""
                }`}
                title={showErrors && invalid["modes"] ? invalid["modes"] : undefined}
              >
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!form.modes?.delivery}
                    onChange={(e) => setField("modes.delivery", e.target.checked)}
                  />
                  <span>Entrega em domicílio</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!form.modes?.pickup}
                    onChange={(e) => setField("modes.pickup", e.target.checked)}
                  />
                  <span>Retirada (pickup)</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!form.modes?.inhouse}
                    onChange={(e) => setField("modes.inhouse", e.target.checked)}
                  />
                  <span>Atendimento interno</span>
                </label>
              </div>
            </section>

            {/* Áreas */}
            <section className="rounded-xl border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Áreas (raio)</h2>
                <button
                  type="button"
                  onClick={addArea}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  + Adicionar área
                </button>
              </div>

              <div
                className={`${
                  showErrors && invalid["areas"]
                    ? "rounded-lg border border-rose-300 p-3"
                    : ""
                }`}
                title={showErrors && invalid["areas"] ? invalid["areas"] : undefined}
              >
                {Object.entries(form.areas || {}).length === 0 ? (
                  <p className="text-sm text-zinc-600">
                    Nenhuma área cadastrada. Adicione ao menos uma área se não
                    usar pickup.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(form.areas || {}).map(([id, a]) => (
                      <div key={id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{a.name || "Área"}</div>
                          <button
                            type="button"
                            onClick={() => removeArea(id)}
                            className="text-sm text-rose-600 hover:underline"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <label className="block">
                            <span className="mb-1 block text-sm">Nome</span>
                            <input
                              className="w-full rounded-lg border px-3 py-2"
                              value={a.name}
                              onChange={(e) =>
                                setField(`areas.${id}.name`, e.target.value)
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm">Raio (km)</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              className="w-full rounded-lg border px-3 py-2"
                              value={a.radiusKm}
                              onChange={(e) =>
                                setField(
                                  `areas.${id}.radiusKm`,
                                  Number(e.target.value)
                                )
                              }
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="mb-1 block text-sm">Lat</span>
                              <input
                                type="number"
                                min={-90}
                                max={90}
                                step={0.0001}
                                className="w-full rounded-lg border px-3 py-2"
                                value={a.center?.lat ?? 0}
                                onChange={(e) =>
                                  setField(
                                    `areas.${id}.center.lat`,
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-sm">Lng</span>
                              <input
                                type="number"
                                min={-180}
                                max={180}
                                step={0.0001}
                                className="w-full rounded-lg border px-3 py-2"
                                value={a.center?.lng ?? 0}
                                onChange={(e) =>
                                  setField(
                                    `areas.${id}.center.lng`,
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
                          <label className="block">
                            <span className="mb-1 block text-sm">Taxa base (R$)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-full rounded-lg border px-3 py-2"
                              value={a.feeBase ?? ""}
                              onChange={(e) =>
                                setField(
                                  `areas.${id}.feeBase`,
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm">Taxa por km (R$)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-full rounded-lg border px-3 py-2"
                              value={a.feePerKm ?? ""}
                              onChange={(e) =>
                                setField(
                                  `areas.${id}.feePerKm`,
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm">Pedido mínimo (R$)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-full rounded-lg border px-3 py-2"
                              value={a.minOrder ?? ""}
                              onChange={(e) =>
                                setField(
                                  `areas.${id}.minOrder`,
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm">ETA mín (min)</span>
                            <input
                              type="number"
                              min={0}
                              max={240}
                              className="w-full rounded-lg border px-3 py-2"
                              value={a.etaMin ?? ""}
                              onChange={(e) =>
                                setField(
                                  `areas.${id}.etaMin`,
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm">ETA máx (min)</span>
                            <input
                              type="number"
                              min={0}
                              max={240}
                              className="w-full rounded-lg border px-3 py-2"
                              value={a.etaMax ?? ""}
                              onChange={(e) =>
                                setField(
                                  `areas.${id}.etaMax`,
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Frete grátis */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Frete grátis</h2>
              <label className="block">
                <span className="mb-1 block text-sm">A partir de (R$)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    showErrors && invalid["freeThreshold"]
                      ? "border-rose-500 ring-rose-200 focus:ring-rose-200"
                      : ""
                  }`}
                  value={form.freeThreshold ?? ""}
                  onChange={(e) =>
                    setField(
                      "freeThreshold",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  title={
                    showErrors && invalid["freeThreshold"]
                      ? invalid["freeThreshold"]
                      : undefined
                  }
                  aria-invalid={(showErrors && !!invalid["freeThreshold"]) || undefined}
                />
              </label>
            </section>
          </div>

          {/* Coluna direita */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Resumo</h3>
              <ul className="text-sm text-zinc-600 space-y-1">
                <li>
                  Habilitado: <b>{form.enabled ? "Sim" : "Não"}</b>
                </li>
                <li>
                  Entrega: <b>{form.modes.delivery ? "Sim" : "Não"}</b>
                </li>
                <li>
                  Pickup: <b>{form.modes.pickup ? "Sim" : "Não"}</b>
                </li>
                <li>
                  In-house: <b>{form.modes.inhouse ? "Sim" : "Não"}</b>
                </li>
                <li>
                  Áreas: <b>{Object.keys(form.areas || {}).length}</b>
                </li>
                <li>
                  Frete grátis:{" "}
                  <b>
                    {form.freeThreshold != null
                      ? form.freeThreshold.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "-"}
                  </b>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Dicas</h3>
              <p className="text-sm text-zinc-600">
                Se não pretende adicionar áreas agora, marque <b>Pickup</b>. Para
                usar entrega em domicílio, cadastre ao menos uma área.
              </p>
            </div>
          </aside>
        </div>
      </div>
      <Toaster />
    </DashboardShell>
  );
}
