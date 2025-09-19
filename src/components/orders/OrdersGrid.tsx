"use client";
import React, { useEffect, useState } from "react";
import { fetchMyStoreOrdersEnriched, type EnrichedOrder } from "@/services/orders.enriched.service";
import { useAuth } from "@/context/AuthContext";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";

function formatDate(ts: number) {
  try { return new Date(ts).toLocaleString("pt-BR"); } catch { return ""; }
}

export default function OrdersGrid() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false as boolean;
    async function load() {
      setLoading(true);
      try {
        if ((role === "operador" || role === "operacao" || role === "admin")) {
          const list = await fetchMyStoreOrdersEnriched(undefined, 100);
          if (!cancelled) setOrders(list);
        } else {
          if (!cancelled) setOrders([]);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 p-4 animate-pulse">
            <div className="h-4 w-40 bg-zinc-200 rounded mb-2" />
            <div className="h-3 w-24 bg-zinc-200 rounded mb-2" />
            <div className="h-3 w-32 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="rounded-lg border border-zinc-200 p-4 text-zinc-600">
        Nenhum pedido encontrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {orders.map((o) => (
        <article key={o.id} className="rounded-xl border border-zinc-200 p-4 bg-white">
          <header className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg">Pedido <span className="text-zinc-500">#{String(o.number || o.id).slice(-5)}</span></h3>
            <StatusBadgeWithActions status={o.status} orderId={o.id} />
          </header>
          <p className="text-sm text-zinc-600">Criado: {formatDate(o.createdAt)}</p>
          <p className="text-sm text-zinc-600">
            Itens: {o.itemsCount ?? "—"}{o.itemsPreview && o.itemsPreview.length ? ` · Ex.: ${o.itemsPreview.join(', ')}` : (o.lastItem ? ` · Último: ${o.lastItem}` : "")} · Cliente: {o.userName || (o.userId ? o.userId.slice(0, 6) + "…" : "—")}
          </p>
          {o.storeId && (
            <p className="text-xs text-zinc-500 mt-1">
              Loja: {o.storeId.slice(0, 6)}…
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
