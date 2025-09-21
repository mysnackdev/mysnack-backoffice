"use client";
import React, { useEffect, useState } from "react";
import { fetchMyStoreOrdersEnriched, type EnrichedOrder } from "@/services/orders.enriched.service";
import { useAuth } from "@/context/AuthContext";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { useMyStoreId } from "@/hooks/useMyStoreId";

function formatDate(ts: number) {
  try { return new Date(ts).toLocaleString("pt-BR"); } catch { return ""; }
}

function cents(v:number|undefined|null){ return (v??0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }

export default function OrdersGrid() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const storeId = useMyStoreId();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchMyStoreOrdersEnriched(storeId || undefined);
        if (mounted) setOrders(list);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [role, storeId]);

  if (loading) {
    return <div className="p-6 text-sm text-zinc-600">Carregando pedidos…</div>;
  }
  if (!orders.length) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Nenhum pedido encontrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {orders.map((o) => (
        <article key={o.id} className="rounded-xl border border-zinc-200 p-4 bg-white">
          <header className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">
                Pedido <span className="text-zinc-500">#{String(o.number || o.id).slice(-5)}</span>
              </h3>
              <p className="text-xs text-zinc-500">Criado: {formatDate(o.createdAt)}</p>
            </div>
            <StatusBadgeWithActions status={o.status} orderId={o.id} />
          </header>

          <div className="mt-2 space-y-1 text-sm">
            <p className="text-zinc-700">
              <span className="font-medium">Cliente:</span> {o.userName || (o.userEmail ?? (o.userId ? o.userId.slice(0,6)+"…" : "—"))}
            </p>
            {(o.userPhone || o.userEmail) && (
              <p className="text-zinc-600">
                <span className="font-medium">Contato:</span> {[o.userPhone, o.userEmail].filter(Boolean).join(" · ")}
              </p>
            )}
            {(o.userCity || o.userState) && (
              <p className="text-zinc-600">
                <span className="font-medium">Local:</span> {[o.userCity, o.userState].filter(Boolean).join("/")}
              </p>
            )}
            <p className="text-zinc-600">
              <span className="font-medium">Itens:</span> {o.itemsCount ?? "—"}{o.itemsPreview?.length ? ` — ${o.itemsPreview.join(", ")}` : ""}
            </p>
            {typeof o.total === 'number' && (
              <p className="text-zinc-800 mt-1">
                <span className="font-medium">Total:</span> {cents(o.total)}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
