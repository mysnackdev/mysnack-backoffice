"use client";
import React from "react";
import Image from "next/image";
import { getStoresStatusCF, listShoppingsCF, createShoppingCF, StoreSummary, type Shop } from "@/services/admin.service";

export default function AdminHome() {
  const [stores, setStores] = React.useState<StoreSummary[]>([]);
  const [shoppings, setShoppings] = React.useState<Shop[]>([]);
  const [newShop, setNewShop] = React.useState({ name: "", slug: "" });

  React.useEffect(() => {
    (async () => {
      const s = await getStoresStatusCF();
      setStores(s.stores);
      const res = await listShoppingsCF();
      setShoppings(res.shoppings || []);
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
        <div className="text-lg font-semibold mb-3">Shoppings</div>
        <form onSubmit={create} className="flex gap-2 mb-4">
          <input
            className="border rounded-lg px-2 py-1 flex-1"
            placeholder="Nome"
            value={newShop.name}
            onChange={(e) => setNewShop((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="border rounded-lg px-2 py-1"
            placeholder="slug"
            value={newShop.slug}
            onChange={(e) => setNewShop((p) => ({ ...p, slug: e.target.value }))}
          />
          <button className="border rounded-lg px-3 py-1">Criar</button>
        </form>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shoppings.map((shop) => {
            const base = typeof window !== "undefined" ? window.location.origin : "";
            const url = `${base}/s/${shop.slug}`;
            const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
            return (
              <div key={shop.slug} className="border rounded-lg p-3 flex flex-col items-center gap-2">
                <div className="font-semibold">{shop.name}</div>
                <Image src={qr} alt="QR code" width={160} height={160} className="w-40 h-40 rounded-md border" />
                <div className="text-xs break-all text-center">{url}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
