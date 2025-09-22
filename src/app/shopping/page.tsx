// src/app/shopping/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { toast } from "@/components/ui/toast";
import {
  getStoresStatusCF,
  listShoppingsCF,
  approveStoreInShoppingCF,
  suspendStoreInShoppingCF,
  getShoppingCF,
  saveShoppingCF,
  rateShoppingCF,
  addChairCF,
  deleteChairCF,
  type StoreSummary,
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
  const [newChair, setNewChair] = React.useState<{ label: string; capacity?: number }>({ label: "", capacity: undefined });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const s = await getStoresStatusCF();
      const ss = (s.stores || []).filter((x: any) => (x as any).shoppingSlug === slug);
      setStores(ss);

      const { shoppings } = await listShoppingsCF();
      const shop = (shoppings || []).find((it: any) => it.slug === slug);
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
          setChairs((full.chairs as any) || []);
          setAvg(full.rating?.avg ?? undefined);
          setVotes(full.rating?.votes ?? undefined);
          const ids = Array.isArray((full as any).stores) ? (full as any).stores as string[] : ((full && (full as any).stores) ? Object.keys((full as any).stores) : []);
          if (ids.length > 0) {
            setStores(ss.filter((x: any) => ids.includes(x.id)));
          }
        }
      } catch {}
    })();
  }, [slug]);

  const total = stores.length;
  const online = stores.filter((s) => s.online).length;

  async function onSaveHeader() {
    try {
      setSaving(true);
      await saveShoppingCF({ slug, address, lat: lat === "" ? null : Number(lat), lng: lng === "" ? null : Number(lng) });
      toast.success("Dados do shopping salvos");
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="text-sm text-muted-foreground">Lojas: {online}/{total} online</div>
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
          <button
            className="w-fit border rounded-lg px-3 py-1"            onClick={onSaveHeader}            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </section>

      {/* AVALIAÇÃO */}
      <section className="rounded-xl border p-4 mt-6 max-w-3xl">
        <div className="text-lg font-semibold mb-3">Avaliação (Likert 1–5)</div>
        <div className="flex items-center gap-2">          {[1,2,3,4,5].map((n) => (            <button key={n} className="border rounded-lg px-2 py-1" onClick={async () => {              try {                const r = await rateShoppingCF({ slug, score: n });                setAvg(r.avg);                setVotes(r.votes);              } catch (e: any) {                toast.error(String(e?.message || e));              }            }}>{n}</button>          ))}        </div>
        <div className="mt-2 text-sm text-muted-foreground">          Média: {typeof avg === 'number' ? avg.toFixed(2) : '–'} • Votos: {votes ?? 0}        </div>
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
            onChange={(e) => setNewChair((p) => ({ ...p, capacity: e.target.value === "" ? undefined : Number(e.target.value) }))}
          />
          <button
            className="border rounded-lg px-3 py-1"            onClick={async () => {              if (!newChair.label) return;              try {                const c = await addChairCF({ slug, label: newChair.label, capacity: newChair.capacity });                setChairs((prev) => [...prev, c as any]);                setNewChair({ label: "", capacity: undefined });              } catch (e: any) {                toast.error(String(e?.message || e));              }            }}
>            Adicionar
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {chairs.map((c) => (            <div key={c.id} className="rounded-lg border p-3 flex items-center justify-between">              <div>                <div className="font-medium">{c.label}</div>                <div className="text-xs text-muted-foreground">Capacidade: {c.capacity ?? 0}</div>              </div>              <button className="text-red-600 underline text-sm" onClick={async () => {                try {                  await deleteChairCF({ slug, id: c.id });                  setChairs((prev) => prev.filter((x) => x.id !== c.id));                } catch (e: any) {                  toast.error(String(e?.message || e));                }              }}>Remover</button>            </div>          ))}        </div>      </section>

      {/* LOJAS VINCULADAS */}
      <section className="rounded-xl border p-4 mt-6">
        <div className="text-lg font-semibold mb-2">Lojas vinculadas</div>
        <div className="grid gap-2">
          {stores.map((s) => (            <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between">              <div>                <div className="font-medium">{s.name}</div>                <div className="text-xs text-muted-foreground">ID: {s.id}</div>              </div>              <div className="flex items-center gap-2">                <button onClick={async () => {                  await approveStoreInShoppingCF({ shoppingSlug: slug, storeId: s.id });                  toast.success("Loja aprovada");                }} className="border rounded-lg px-3 py-1">Aprovar</button>                <button onClick={async () => {                  await suspendStoreInShoppingCF({ shoppingSlug: slug, storeId: s.id, suspended: !(s as any).suspended });                }} className="border rounded-lg px-3 py-1">{(s as any).suspended ? 'Reativar' : 'Suspender'}</button>              </div>            </div>          ))}          {stores.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a este shopping.</div> : null}        </div>      </section>
    </DashboardShell>
  );
}
