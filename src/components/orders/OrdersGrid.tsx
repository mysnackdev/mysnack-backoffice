"use client";

import React from "react";
import { subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";
import { useMyStoreId } from "@/hooks/useMyStoreId";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { ref, get } from "firebase/database";
import { db } from "@/firebase";
import type { EnrichedOrder } from "@/services/orders.enriched.service";

type ExtendedOrder = EnrichedOrder & { [key: string]: unknown };
type OrderItem = { name?: string; label?: string; qty?: number; price?: number; options?: Array<{ name?: string; label?: string } | string> };

function AddressSnippet({ o }: { o: ExtendedOrder }) {
  const r = o as Record<string, unknown>;
  const addr: Record<string, unknown> =
    (r["address"] as Record<string, unknown> | undefined) ||
    (r["shippingAddress"] as Record<string, unknown> | undefined) ||
    ((r["delivery"] as Record<string, unknown> | undefined)?.["address"] as Record<string, unknown> | undefined) ||
    {};
  const line1 = [addr["street"] || addr["logradouro"] || addr["line1"], addr["number"] || addr["numero"]]
    .filter(Boolean)
    .join(", ");
  const line2 = [addr["neighborhood"] || addr["bairro"], (addr["city"] || addr["town"] || addr["municipio"] || r["userCity"]), (addr["state"] || r["userState"])]
    .filter(Boolean)
    .join(" - ");
  const zipVal = (addr["cep"] ?? addr["zip"] ?? addr["postalCode"]) as string | number | undefined;
  const compVal = (addr["complement"] ?? addr["complemento"] ?? addr["line2"]) as string | undefined;
  const parts = [zipVal, compVal].filter((v) => v != null && v !== "") as (string | number)[];
  const extra = parts.map(String).join(" • ");
  return (
    <div className="text-xs text-zinc-600">
      {line1 && <div>{String(line1)}</div>}
      {line2 && <div>{String(line2)}</div>}
      {extra && <div className="text-zinc-500">{extra}</div>}
    </div>
  );
}

function ItemsPreview({ items, count }: { items?: string[]; count?: number | null }) {
  const has = Array.isArray(items) && items.length > 0;
  if (!has && !count) return null;
  return (
    <div className="mt-2 text-xs text-zinc-700">
      {has && <div className="line-clamp-2">{items!.join(", ")}</div>}
      {typeof count === "number" && count > (items?.length || 0) && (
        <div className="text-zinc-500">+{count - (items?.length || 0)} itens</div>
      )}
    </div>
  );
}

function OrderDrawer(
  { open, onClose, orderId, fallback }: { open: boolean; onClose: () => void; orderId: string | null; fallback?: EnrichedOrder | null }
) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<EnrichedOrder | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open || !orderId) return;
      setLoading(true);
      try {
        const snap = await get(ref(db, `orders/${orderId}`));
        if (mounted) setData(snap.exists() ? (snap.val() as EnrichedOrder) : null);
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [open, orderId]);

  const o = (data || fallback || {}) as ExtendedOrder;
  const items = Array.isArray((o as Record<string, unknown>)["items"])
    ? ((o as unknown as { items: OrderItem[] }).items)
    : [];

  const r = o as Record<string, unknown>;
  const addr: Record<string, unknown> =
    (r["address"] as Record<string, unknown> | undefined) ||
    (r["shippingAddress"] as Record<string, unknown> | undefined) ||
    ((r["delivery"] as Record<string, unknown> | undefined)?.["address"] as Record<string, unknown> | undefined) ||
    {};

  const mode: string | null =
    (r["deliveryMode"] as string | undefined) ||
    (r["mode"] as string | undefined) ||
    ((r["fulfillment"] as Record<string, unknown> | undefined)?.["mode"] as string | undefined) ||
    ((r["pickup"] ? "pickup" : (Object.keys(addr).length ? "delivery" : null)) as string | null);

  const note =
    (r["note"] as string | undefined) ||
    (r["obs"] as string | undefined) ||
    (r["observation"] as string | undefined) ||
    (r["comments"] as string | undefined);

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* backdrop */}
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      {/* panel */}
      <div className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Pedido #{(orderId || "").slice(0, 5)}</div>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded-md border">Fechar</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto h-full">
          {loading && <div className="text-sm text-zinc-500">Carregando…</div>}

          {/* Cliente */}
          <section>
            <div className="text-xs font-semibold mb-1">Cliente</div>
            <div className="text-sm">
              {(r["userName"] as string | undefined) && <div>{r["userName"] as string}</div>}
              {(r["userEmail"] as string | undefined) && <div className="text-zinc-500">{r["userEmail"] as string}</div>}
              {(r["userPhone"] as string | undefined) && <div className="text-zinc-500">{r["userPhone"] as string}</div>}
              <AddressSnippet o={o} />
            </div>
          </section>

          {/* Entrega/Retirada */}
          <section>
            <div className="text-xs font-semibold mb-1">Entrega/Retirada</div>
            <div className="text-sm">
              {mode === "pickup" ? "Retirada no balcão" : "Entrega"}
            </div>
          </section>

          {/* Itens */}
          <section>
            <div className="text-xs font-semibold mb-1">Itens</div>
            <ItemsPreview items={items.map((it) => (typeof it.name === "string" ? it.name : (it as unknown as { id?: string }).id || ""))} count={items.length} />
            <ul className="divide-y border rounded-lg">
              {items.length === 0 && <li className="p-3 text-sm text-zinc-500">Sem itens disponíveis.</li>}
              {items.map((it: OrderItem, i: number) => {
                const altQty = (it as unknown as { quantity?: number }).quantity;
                const qty = typeof it.qty === "number" ? it.qty : (typeof altQty === "number" ? altQty : 1);
                const name = it.name || (it as unknown as { id?: string }).id || `Item ${i + 1}`;
                const opts = Array.isArray(it.options) ? it.options : [];
                return (
                  <li key={i} className="p-3 space-y-1">
                    <div className="flex justify-between">
                      <div className="font-medium">{qty}x {name}</div>
                    </div>
                    {opts.length > 0 && (
                      <div className="text-xs text-zinc-600">
                        {opts.map((op) => (typeof op === "string" ? op : (op?.label || op?.name || ""))).filter(Boolean).join(", ")}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Observações */}
          {note && (
            <section>
              <div className="text-xs font-semibold mb-1">Observações</div>
              <div className="text-sm text-zinc-700 whitespace-pre-wrap">{note}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBRL(v?: number | null) {
  if (typeof v !== "number") return "R$ 0,00";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);
  } catch {
    return `R$ ${(v/100).toFixed(2)}`.replace(".", ",");
  }
}

export default function OrdersGrid() {
  const storeId = useMyStoreId();
  const [orders, setOrders] = React.useState<StoreMirrorOrder[]>([]);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [drawerFallback, setDrawerFallback] = React.useState<EnrichedOrder | null>(null);

  React.useEffect(() => {
    if (!storeId) return;
    const unsub = subscribeOrdersByStore(storeId, (list) => {
      // ordenar do mais recente para o mais antigo
      setOrders([...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [storeId]);

  if (!storeId) {
    return <div className="text-sm text-zinc-500">Carregando loja…</div>;
  }

  const openDrawer = (o: StoreMirrorOrder) => {
    setDrawerId(o.key);
    // fallback com dados mínimos
    setDrawerFallback({
      id: o.key,
      createdAt: o.createdAt,
      status: o.status,
      itemsCount: o.itemsCount ?? null,
      lastItem: null,
      itemsPreview: [],
      userId: o.userId,
      userName: undefined,
      userEmail: undefined,
      userPhone: undefined,
      address: undefined,
      cancelReason: undefined,
      storeId: o.storeId,
      number: o.number ?? null,
      total: o.total ?? null,
    });
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {orders.map((o) => (
        <div key={o.key} className="rounded-xl border p-4 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">Pedido #_{o.key.slice(0, 3)}_{o.key.slice(-2)}</div>
              <div className="text-xs text-muted-foreground">
                Criado: {o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "-"}
              </div>
            </div>
            <button className="text-xs rounded-lg border px-3 py-1" onClick={() => openDrawer(o)}>
              Ver detalhes
            </button>
          </div>

          <div className="mt-3 text-sm">
            <div className="text-xs text-muted-foreground">Cliente</div>
            <div>{/* nome/email/telefone podem estar apenas no pedido completo (drawer) */}</div>
          </div>

          <div className="mt-3">
            <StatusBadgeWithActions status={o.status} orderId={o.key} />
          </div>

          <div className="mt-3 text-sm text-zinc-700">
            <div className="flex items-center gap-2">
              <span className="text-xs rounded-full border px-2 py-0.5">itens: {o.itemsCount ?? "–"}</span>
            </div>
            <div className="mt-2 font-medium">Total: {formatBRL(o.total)}</div>
          </div>
        </div>
      ))}

      <OrderDrawer open={drawerId != null} onClose={() => setDrawerId(null)} orderId={drawerId} fallback={drawerFallback} />
    </div>
  );
}
