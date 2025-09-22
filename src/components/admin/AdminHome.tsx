"use client";
import React from "react";
import Link from "next/link";
import { getStoresStatusCF, listShoppingsCF, createShoppingCF, updateShoppingCF, type StoreSummary, type Shop } from "@/services/admin.service";

export default function AdminHome() {
  const [stores, setStores] = React.useState<StoreSummary[]>([]);
  const [shoppings, setShoppings] = React.useState<Shop[]>([]);
  const [newShop, setNewShop] = React.useState<{ name: string; slug: string }>({ name: "", slug: "" });

  React.useEffect(() => {
    (async () => {
      const s = await getStoresStatusCF();
      setStores(s.stores);
      const res = await listShoppingsCF();
      setShoppings(res.shoppings ?? []);
    })();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShop.name || !newShop.slug) return;
    const created = await createShoppingCF({ name: newShop.name, slug: newShop.slug });
    setShoppings((prev) => [...prev, created]);
    setNewShop({ name: "", slug: "" });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-4">
        <div className="text-lg font-semibold mb-2">Lojas</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stores.map((s) => (
            <div key={s.id} className="border rounded-lg p-3">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground">
                Online: {s.online ? "sim" : "não"} • Categoria: {s.categoria || "-"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Shoppings</div>
        </div>

        {/* Novo shopping */}
        <form onSubmit={create} className="grid sm:grid-cols-3 gap-2 mb-4">
          <input
            value={newShop.name}
            onChange={(e) => setNewShop((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nome do shopping"
            className="border rounded-lg px-3 py-2"
          />
          <input
            value={newShop.slug}
            onChange={(e) => setNewShop((p) => ({ ...p, slug: e.target.value }))}
            placeholder="slug"
            className="border rounded-lg px-3 py-2"
          />
          <button className="border rounded-lg px-3 py-2">Criar</button>
        </form>

        {/* Lista de shoppings */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shoppings.map((shop, idx) => {
            const slug = shop.slug;
            return (
              <div key={`${slug ?? "shopping"}-${idx}`} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{shop.name}</div>
                  {slug ? (
                    <Link href={`/shopping?slug=${slug}`} className="text-blue-600 text-sm underline">
                      Detalhes
                    </Link>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">slug: {slug || "-"}</div>

                {/* Atualização rápida de endereço/lat/lng */}
                {slug ? (
                  <form
                    className="grid gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formEl = e.currentTarget as HTMLFormElement;
                      const fd = new FormData(formEl);
                      const address = String(fd.get("address") || "");
                      const lat = Number(fd.get("lat"));
                      const lng = Number(fd.get("lng"));
                      const updated = await updateShoppingCF({
                        slug,
                        address: address || undefined,
                        lat: Number.isFinite(lat) ? lat : undefined,
                        lng: Number.isFinite(lng) ? lng : undefined,
                      });
                      setShoppings((prev) =>
                        prev.map((it) => (it.slug === slug ? { ...it, ...updated } : it))
                      );
                      formEl.reset();
                    }}
                  >
                    <input name="address" defaultValue={shop.address ?? ""} className="border rounded-lg px-2 py-1" placeholder="Endereço" />
                    <div className="grid grid-cols-2 gap-2">
                      <input name="lat" defaultValue={String(shop.lat ?? "")} className="border rounded-lg px-2 py-1" placeholder="Lat" />
                      <input name="lng" defaultValue={String(shop.lng ?? "")} className="border rounded-lg px-2 py-1" placeholder="Lng" />
                    </div>
                    <button className="border rounded-lg px-3 py-1 justify-self-start">Salvar</button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
