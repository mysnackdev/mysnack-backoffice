// src/components/orders/OrdersGrid.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DataSnapshot, limitToLast, onValue, orderByChild, query, ref } from "firebase/database";
import { db } from "@/services/firebase";

export type OrderStatus =
  | "pedido realizado"
  | "pedido confirmado"
  | "pedido sendo preparado"
  | "pedido pronto"
  | "pedido indo até você"
  | "pedido entregue"
  | "cancelado";

export interface ClientSummary {
  uid: string;
  displayName?: string;
  email?: string;
  phone?: string;
  document?: string;
}

export interface EnrichedOrderMirror {
  key: string;
  status: OrderStatus;
  updatedAt: number;
  createdAt?: number;
  itemsCount?: number;
  lastItem?: string;
  clientSummary?: ClientSummary;
}

function formatBRL(v?: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}
function formatDateTime(ts?: number) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function subscribeOrdersMirror(
  storeId: string,
  cb: (list: EnrichedOrderMirror[]) => void,
  limit = 100
) {
  const q = query(ref(db, `/backoffice/ordersByTenant/${storeId}`), orderByChild("updatedAt"), limitToLast(limit));
  return onValue(q, (snap: DataSnapshot) => {
    const list: EnrichedOrderMirror[] = [];
    snap.forEach((c) => {
      const v = c.val() as Omit<EnrichedOrderMirror, "key">;
      list.push({ ...v, key: c.key! });
    });
    list.sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0));
    cb(list);
  });
}

type OrdersGridProps = {
  storeId: string;
  limit?: number;
};

export default function OrdersGrid({ storeId, limit = 100 }: OrdersGridProps) {
  const [orders, setOrders] = useState<EnrichedOrderMirror[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    const off = subscribeOrdersMirror(storeId, (list) => {
      setOrders(list);
      setLoading(false);
    }, limit);
    return () => off();
  }, [storeId, limit]);

  const empty = useMemo(() => !loading && orders.length === 0, [loading, orders.length]);

  return (
    <div className="space-y-4">
      {loading && <div className="text-sm text-zinc-500">Carregando pedidos…</div>}
      {empty && <div className="text-sm text-zinc-500">Nenhum pedido por aqui ainda.</div>}
      {orders.map((o) => (
        <OrderCard key={o.key} order={o} />
      ))}
    </div>
  );
}

function OrderCard({ order }: { order: EnrichedOrderMirror }) {
  const totalEst = useMemo(() => 0, []);
  const c = order.clientSummary;

  return (
    <div className="rounded-xl border border-zinc-300/70 shadow-sm p-4 max-w-xl">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          Pedido <span className="text-zinc-500">#{order.key?.slice(-6)}</span>
        </div>
        <span className="text-xs text-zinc-500">{formatDateTime(order.createdAt ?? order.updatedAt)}</span>
      </div>

      <div className="mt-3">
        <div className="text-[12px] text-zinc-500 font-medium mb-1">Cliente</div>
        {c ? (
          <div className="text-sm leading-5">
            <div className="font-medium text-zinc-800">{c.displayName || "—"}</div>
            <div className="text-zinc-600 text-[12px]">{c.email || "—"}</div>
            <div className="text-zinc-600 text-[12px]">{c.phone || "—"}</div>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <div className="h-4 w-28 rounded bg-zinc-200 animate-pulse" />
            <div className="h-4 w-40 rounded bg-zinc-200 animate-pulse" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill status={order.status} />
        {typeof order.itemsCount === "number" && (
          <span className="text-[11px] px-2 py-1 rounded-full border border-zinc-300 text-zinc-700">
            itens: {order.itemsCount}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-zinc-700">
          <span className="text-zinc-500">Total:</span> {formatBRL(totalEst)}
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-800 hover:bg-zinc-50">
            Cancelar
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90">
            Avançar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const color =
    status === "pedido realizado"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : status === "pedido entregue"
      ? "bg-zinc-100 text-zinc-800 border-zinc-300"
      : status === "cancelado"
      ? "bg-rose-100 text-rose-800 border-rose-300"
      : "bg-sky-100 text-sky-800 border-sky-300";

  return (
    <span className={`text-[11px] px-2 py-1 rounded-full border ${color}`}>
      {status}
    </span>
  );
}
