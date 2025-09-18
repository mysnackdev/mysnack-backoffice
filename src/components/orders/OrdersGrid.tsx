
"use client";
import React from "react";
import { subscribeAllOrders, subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";
import { useAuth } from "@/context/AuthContext";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";

type OrderCard = {
  id: string;
  createdAt: number;
  status: string;
  itemsCount: number | null;
  userId: string | null;
  storeId: string | null;
};

function formatDate(ts?: number) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return String(ts);
  }
}

export default function OrdersGrid() {
  const { role } = useAuth();
  const { approved, storeId } = useOperatorApproval();
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<OrderCard[]>([]);

  React.useEffect(() => {
    setLoading(true);
    let unsub: (() => void) | undefined;

    const handle = (list: StoreMirrorOrder[]) => {
      const mapped: OrderCard[] = list
        .map((o) => ({
          id: o.key,
          createdAt: Number(o.createdAt || 0),
          status: String(o.status || ""),
          itemsCount: typeof o.itemsCount === "number" ? o.itemsCount : null,
          userId: o.userId ?? null,
          storeId: (o.storeId as string | null) ?? null,
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
      setOrders(mapped);
      setLoading(false);
    };

    const canOperator = !!storeId && (approved || role === "admin" || role === "operacao");
    if (canOperator) {
      unsub = subscribeOrdersByStore(storeId!, handle);
    } else if (role === "admin" || role === "operacao") {
      unsub = subscribeAllOrders(handle);
    } else {
      setOrders([]);
      setLoading(false);
    }

    return () => unsub?.();
  }, [role, approved, storeId]);

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
        <article key={o.id} className="rounded-xl border border-zinc-200 p-4 hover:shadow-sm transition">
          <header className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-zinc-900">Pedido #{o.id.slice(-6)}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-300 text-zinc-700">
              {o.status || "—"}
            </span>
          </header>
          <p className="text-sm text-zinc-600">Criado: {formatDate(o.createdAt)}</p>
          <p className="text-sm text-zinc-600">
            Itens: {o.itemsCount ?? "—"} · Cliente: {o.userId ? o.userId.slice(0, 6) + "…" : "—"}
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
