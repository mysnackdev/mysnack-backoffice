"use client";

import { useEffect, useMemo, useState } from "react";
import { Order } from "@/models";
import { OrderListItem } from "./order-list-item.component";
import { EmptyState } from "./empty-state.component";
import { useOrder } from "@/hooks";
import { LoadingContainer } from "./loading-container.component";

const STATUS = [
  "pedido realizado",
  "pedido confirmado",
  "pedido sendo preparado",
  "pedido pronto",
  "pedido indo até você",
  "pedido entregue",
] as const;

// Alguns fluxos podem trazer itens "crus" (ex.: it.data.status).
// Esta tipagem cobre ambos os formatos sem usar `any`.
type RawOrder = {
  createdAt?: number;
  data?: { status?: string };
  status?: { label?: string };
};
type OrderLike = Order | RawOrder;

// Helpers seguros (sem `any`) para extrair campos usados no filtro
function getCreatedAt(o: OrderLike): number {
  const v = (o as { createdAt?: unknown }).createdAt;
  return typeof v === "number" ? v : 0;
}

function getStatusLabel(o: OrderLike): string | undefined {
  const fromStatusObj = (o as { status?: { label?: unknown } }).status?.label;
  if (typeof fromStatusObj === "string") return fromStatusObj;

  const fromData = (o as { data?: { status?: unknown } }).data?.status;
  if (typeof fromData === "string") return fromData;

  return undefined;
}

export const Orders = () => {
  const { items, setup, loading } = useOrder();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    const cleanupPromise = setup();
    return () => {
      Promise.resolve(cleanupPromise).then((fn) => {
        if (typeof fn === "function") (fn as () => void)();
      });
    };
  }, [setup]);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : 0;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;

    return (items as OrderLike[]).filter((it) => {
      const ts = getCreatedAt(it);
      const okDate = ts >= fromTs && ts <= toTs;

      const st = getStatusLabel(it);
      const okStatus = !statusFilter || st === statusFilter;

      return okDate && okStatus;
    }) as Order[];
  }, [items, from, to, statusFilter]);

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-muted-foreground">Status</label>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground">De</label>
          <input
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground">Até</label>
          <input
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <LoadingContainer loading={loading}>
        {filtered && filtered.length ? (
          <ul>
            {filtered.map((elem: Order, index) => (
              <OrderListItem key={index} item={elem} />
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}
      </LoadingContainer>
    </div>
  );
};
