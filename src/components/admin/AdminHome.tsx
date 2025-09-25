"use client";
import React from "react";
import { get, ref, onValue } from "firebase/database";
import { db } from "@/firebase";
import Link from "next/link";
import {
  getStoresStatusCF,
  listShoppingsCF,
  createShoppingCF,
  
  setTenantOnlineCF,
  type StoreSummary,
  type Shop
} from "@/services/admin.service";

type BackofficeStoreMeta = { shoppingSlug?: string; approved?: boolean; suspended?: boolean };
type AdminStore = StoreSummary & BackofficeStoreMeta;

export default function AdminHome() {
  const [stores, setStores] = React.useState<AdminStore[]>([]);
  const [shoppings, setShoppings] = React.useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = React.useState<string | "all">("all");
  const [storeQuery, setStoreQuery] = React.useState<string>("");
  const [newShop, setNewShop] = React.useState<{ name: string; slug: string }>({ name: "", slug: "" });
    const [creating, setCreating] = React.useState(false);
  
  React.useEffect(() => {
      let unsub: (() => void) | null = null;
      (async () => {
        const s = await getStoresStatusCF();
        const r = await listShoppingsCF();
        setShoppings(r.shoppings ?? []);

        try {
          const snap = await get(ref(db, 'backoffice/stores'));
          const base = (snap.val() || {}) as Record<string, BackofficeStoreMeta>;
          const merged = (s.stores || []).map((it: StoreSummary) => ({
            ...it,
            shoppingSlug: base[it.id]?.shoppingSlug ?? it.shoppingSlug,
            approved: base[it.id]?.approved ?? it.approved,
            suspended: base[it.id]?.suspended ?? it.suspended,
          }));
          setStores(merged);
        } catch {
          setStores(s.stores || []);
        }

        try {
          const storesRef = ref(db, 'backoffice/stores');
          onValue(storesRef, (snap2) => {
            const base2 = (snap2.val() || {}) as Record<string, BackofficeStoreMeta>;
            setStores((prev) =>
              prev.map((it: StoreSummary) => ({
                ...it,
                shoppingSlug: base2[it.id]?.shoppingSlug ?? it.shoppingSlug,
                approved: base2[it.id]?.approved ?? it.approved,
                suspended: base2[it.id]?.suspended ?? it.suspended,
              })),
            );
          });
          unsub = () => {};
        } catch {
          /* ignore listener errors (rules) */
        }
      })();
      return () => { if (unsub) unsub(); };
    }, []);

  const filteredStores = stores
    .filter((s) => (selectedShop === "all" ? true : s.shoppingSlug === selectedShop))
    .filter((s) => (!storeQuery ? true : (s.name || "").toLowerCase().includes(storeQuery.toLowerCase())));

  const onCreateShop = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (creating) return;
      const { name, slug } = newShop;
      if (!name || !slug) return;
      if (shoppings.some(s => s.slug === slug)) return;
      try {
        setCreating(true);
        const created = await createShoppingCF({ name, slug });
        setShoppings((prev) => prev.some(s => s.slug === created.slug) ? prev : [...prev, created]);
        setNewShop({ name: "", slug: "" });
      } finally {
        setTimeout(() => setCreating(false), 600);
      }
    };

  return (
    <div className="space-y-6">
      {/* LOJAS */}
      <section className="rounded-xl border p-4">
        <div className="text-lg font-semibold mb-2">Lojas</div>

        <div className="flex items-center gap-4 text-sm flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground">Filtrar por shopping:</label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value as string)}
              className="border rounded-lg px-2 py-1"
            >
              <option value="all">Todos</option>
              {shoppings.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name || s.slug}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-muted-foreground">Buscar loja:</label>
            <input
              value={storeQuery}
              onChange={(e) => setStoreQuery(e.target.value)}
              placeholder="Digite o nome"
              className="border rounded-lg px-2 py-1"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStores.map((s) => (
            <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {s.name}
                  {s.shoppingSlug ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border">
                      {s.shoppingSlug}
                    </span>
                  ) : null}
                  {s.suspended ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-300 bg-red-50 text-red-700">
                      Suspensa
                    </span>
                  ) : s.approved === false ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">
                      Pendente
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700">
                      Aprovada
                    </span>
                  )}
                  {s.online ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700">
                      Online
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border">Offline</span>
                  )}
                </div>
                {s.displayName ? (
                  <div className="text-xs text-muted-foreground">{s.displayName}</div>
                ) : null}
              </div>
              <Link href={`/shopping?slug=${s.shoppingSlug || ""}`} className="underline text-sm">
                abrir
              </Link>
            </div>
          ))}
          {filteredStores.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma loja encontrada com os filtros atuais.</div>
          ) : null}
        </div>
      </section>

      {/* SHOPPINGS */}
      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Shoppings</div>
          <form onSubmit={onCreateShop} className="flex items-center gap-2">
            <input
              value={newShop.name}
              onChange={(e) => setNewShop((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome"
              className="border rounded-lg px-2 py-1"
            />
            <input
              value={newShop.slug}
              onChange={(e) => setNewShop((p) => ({ ...p, slug: e.target.value }))}
              placeholder="slug"
              className="border rounded-lg px-2 py-1"
            />
            <button disabled={creating} aria-busy={creating} className={"border rounded-lg px-3 py-1 " + (creating ? "opacity-60 animate-pulse" : "")}>{creating ? "Criando..." : "Criar"}</button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shoppings.map((shop) => {
            const total = stores.filter((s) => s.shoppingSlug === shop.slug).length;
            const online = stores.filter((s) => s.shoppingSlug === shop.slug && s.online).length;
                        return (
              <div key={shop.slug} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{shop.name || shop.slug}</div>
                    <div className="text-xs text-muted-foreground">
                      Lojas: {online}/{total} online
                    </div>
                  </div>
                  <Link href={`/shopping?slug=${shop.slug}`} className="text-xs underline">editar</Link>
                </div>

                
              </div>
            );
          })}
        </div>
      </section>

      {/* GERENCIAR LOJAS DO SHOPPING SELECIONADO */}
      {selectedShop !== "all" && (
        <section className="mt-2 rounded-xl border p-4">
          <h2 className="text-lg font-semibold mb-2">Lojas do shopping</h2>
          <div className="grid gap-2">
            {filteredStores.map((s) => (
              <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {s.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await setTenantOnlineCF({ shoppingSlug: selectedShop as string, storeId: s.id });
                    }}
                    className="border rounded-lg px-3 py-1"
                  >
                    Colocar online
                  </button>
                  <button
                    onClick={async () => {
                      await setTenantOnlineCF({ shoppingSlug: selectedShop as string, storeId: s.id, suspended: true });
                    }}
                    className="border rounded-lg px-3 py-1 text-red-600"
                  >
                    Colocar offline
                  </button>
                  <button
                    onClick={async () => {
                      await setTenantOnlineCF({ shoppingSlug: selectedShop as string, storeId: s.id, suspended: false });
                    }}
                    className="border rounded-lg px-3 py-1"
                  >
                    Reativar
                  </button>
                </div>
              </div>
            ))}
            {filteredStores.length === 0 ? (
              <div className="text-sm text-muted-foreground">Ainda não há lojas vinculadas a este shopping.</div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}