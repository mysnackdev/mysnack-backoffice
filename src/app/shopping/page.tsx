"use client";

type RatingLike = { avg?: number; votes?: number; count?: number; total?: number; n?: number };

// src/app/shopping/page.tsx
import type { Shop } from "@/services/admin.service";

import React from "react";
import PaymentsCard from "@/components/shopping/PaymentsCard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { toast } from "@/components/ui/toast";
import {
  getStoresStatusCF,
  listShoppingsCF,
  getShoppingCF,
  updateShoppingCF,
  submitShoppingLikertCF,
  upsertChairCF,
  deleteChairCF,
  type StoreSummary,
  setStoreOnlineStatusCF,
} from "@/services/admin.service";

export default function ShoppingPage() {
  const params = useSearchParams();
  const slug = params.get("slug") || "";

  const [title, setTitle] = React.useState(slug);
  const [stores, setStores] = React.useState<StoreSummary[]>([]);
  const [address, setAddress] = React.useState<string>("");
  const [lat, setLat] = React.useState<string>("");
  const [lng, setLng] = React.useState<string>("");
  const [chairs, setChairs] = React.useState<{ id: string; label: string; capacity?: number }[]>([]);
  const [avg, setAvg] = React.useState<number | undefined>(undefined);
  const [votes, setVotes] = React.useState<number | undefined>(undefined);
  const [newChair, setNewChair] = React.useState<{ label: string; capacity?: number }>({
    label: "",
    capacity: undefined,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const s = await getStoresStatusCF();
      const ss = (s.stores || []).filter((x: StoreSummary) => x.shoppingSlug === slug);
      setStores(ss);

      const { shoppings } = await listShoppingsCF();
      const shop = ((shoppings || []) as Shop[]).find((it) => it.slug === slug);
      if (shop) {
        setTitle(shop.name || shop.slug);
        setAddress(shop.address || "");
        setLat(shop.lat != null ? String(shop.lat) : "");
        setLng(shop.lng != null ? String(shop.lng) : "");
      }

      try {
        const full = await getShoppingCF(slug);
        if (full) {
          if (full.address != null) setAddress(full.address || "");
          if (full.lat != null) setLat(String(full.lat ?? ""));
          if (full.lng != null) setLng(String(full.lng ?? ""));
          setChairs(((full as { chairs?: { id: string; label: string; capacity?: number }[] }).chairs || []));
          const rating = (full as { rating?: { avg?: number; votes?: number } }).rating;
          setAvg(rating?.avg ?? undefined);
          setVotes(rating?.votes ?? undefined);
          const ids = Array.isArray((full as { stores?: Record<string, unknown> | string[] }).stores)
            ? ((full as { stores?: Record<string, unknown> | string[] }).stores as string[])
            : ((full as { stores?: Record<string, unknown> | string[] }).stores
                ? Object.keys((full as { stores?: Record<string, unknown> | string[] }).stores as Record<string, unknown>)
                : []);
          if (ids.length > 0) {
            setStores(ss.filter((x: StoreSummary) => ids.includes(x.id)));
          }
        }
      } catch {}
    })();
  }, [slug]);

  const total = stores.length;
  const online = stores.filter((s) => (typeof s.online === "boolean" ? s.online : !s.suspended)).length;

  async function onSaveHeader() {
    try {
      setSaving(true);
      await updateShoppingCF({
        slug,
        address,
        lat: lat === "" ? undefined : Number(lat),
        lng: lng === "" ? undefined : Number(lng),
      });
      toast.success("Dados do shopping salvos");
    } catch (e: unknown) {
      const __msg = e instanceof Error ? e.message : String(e);
      toast.error(__msg);
    } finally {
      setSaving(false);
    }
  }

  function applyStoreStatusLocal(storeId: string, approved: boolean, suspended: boolean) {
    setStores((prev) =>
      prev.map((st) => (st.id === storeId ? { ...st, approved, suspended, online: approved && !suspended } : st))
    );
  }

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="text-sm text-muted-foreground">
            Lojas: {online}/{total} online
          </div>
        </div>
        <Link href="/shopping" className="text-sm underline">
          ← Voltar
        </Link>
      </div>

      {/* DADOS */}
      <section className="rounded-xl border p-4 max-w-2xl">
        <div className="text-lg font-semibold mb-2">Dados</div>
        <div className="grid gap-3">
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do shopping"
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Endereço"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
            />
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
            />
          </div>
          <button className="w-fit border rounded-lg px-3 py-1" onClick={onSaveHeader} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </section>

      {/* AVALIAÇÃO */}
      <section className="rounded-xl border p-4 mt-6 max-w-3xl">
        <div className="text-lg font-semibold mb-3">Avaliação (Likert 1–5)</div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className="border rounded-lg px-2 py-1"
              onClick={async () => {
                try {
                  const r = await submitShoppingLikertCF({ slug, value: n });
                  setAvg((r as RatingLike).avg);
                  const __votes =
                    ((r as RatingLike).votes ?? (r as RatingLike).count ?? (r as RatingLike).total ?? (r as RatingLike).n ?? 0);
                  setVotes(__votes);
                } catch (e: unknown) {
                  const __msg = e instanceof Error ? e.message : String(e);
                  toast.error(__msg);
                }
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Média: {typeof avg === "number" ? avg.toFixed(2) : "–"} • Votos: {votes ?? 0}
        </div>
      </section>

      {/* CADEIRAS */}
      <section className="rounded-xl border p-4 mt-6">
        <div className="text-lg font-semibold mb-3">Cadeiras</div>
        <div className="flex items-center gap-2 mb-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Rótulo"
            value={newChair.label}
            onChange={(e) => setNewChair((p) => ({ ...p, label: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2 w-40"
            placeholder="Capacidade"
            type="number"
            value={newChair.capacity ?? ""}
            onChange={(e) =>
              setNewChair((p) => ({
                ...p,
                capacity: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
          />
          <button
            className="border rounded-lg px-3 py-1"
            onClick={async () => {
              if (!newChair.label) return;
              try {
                const c = await upsertChairCF({ slug, chair: { label: newChair.label, capacity: newChair.capacity } });
                setChairs((prev) => {
                  const nc = c as { id: string; label: string; capacity?: number };
                  return [...prev, nc];
                });
                setNewChair({ label: "", capacity: undefined });
              } catch (e: unknown) {
                const __msg = e instanceof Error ? e.message : String(e);
                toast.error(__msg);
              }
            }}
          >
            Adicionar
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {chairs.map((c) => (
            <div key={c.id} className="rounded-lg border p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">Capacidade: {c.capacity ?? 0}</div>
              </div>
              <button
                className="text-red-600 underline text-sm"
                onClick={async () => {
                  try {
                    await deleteChairCF({ slug, id: c.id });
                    setChairs((prev) => prev.filter((x) => x.id !== c.id));
                  } catch (e: unknown) {
                    const __msg = e instanceof Error ? e.message : String(e);
                    toast.error(__msg);
                  }
                }}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* LOJAS VINCULADAS */}
      <section className="rounded-xl border p-4 mt-6">
        <div className="text-lg font-semibold mb-2">Lojas vinculadas</div>
        <div className="grid gap-2">
          {stores.map((s: { id: string; name?: string; suspended?: boolean; online?: boolean }) => (
            <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">ID: {s.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const r = await setStoreOnlineStatusCF({
                        shoppingSlug: slug,
                        storeId: s.id,
                        approved: true,
                        suspended: false,
                        reason: "Ativado manualmente no painel do shopping.",
                      });
                      applyStoreStatusLocal(s.id, r.approved, r.suspended);
                      toast.success("Loja colocada online.");
                    } catch (e: unknown) {
                      const __msg = e instanceof Error ? e.message : String(e);
                      toast.error(__msg);
                    }
                  }}
                  className="border rounded-lg px-3 py-1"
                >
                  Colocar online
                </button>
                <button
                  onClick={async () => {
                    try {
                      const r = await setStoreOnlineStatusCF({
                        shoppingSlug: slug,
                        storeId: s.id,
                        approved: true,
                        suspended: !(s.suspended ?? false),
                        reason: s.suspended
                          ? "Reativado manualmente no painel."
                          : "Desativado manualmente no painel.",
                      });
                      applyStoreStatusLocal(s.id, r.approved, r.suspended);
                      toast.info(r.suspended ? "Loja colocada offline." : "Loja reativada.");
                    } catch (e: unknown) {
                      const __msg = e instanceof Error ? e.message : String(e);
                      toast.error(__msg);
                    }
                  }}
                  className="border rounded-lg px-3 py-1"
                >
                  {s.suspended ? "Reativar" : "Colocar offline"}
                </button>
              </div>
            </div>
          ))}
          {stores.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a este shopping.</div>
          ) : null}
        </div>
      </section>

      <PaymentsCard slug={slug} />
    </DashboardShell>
  );
}