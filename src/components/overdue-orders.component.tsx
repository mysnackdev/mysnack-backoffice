"use client";

import React from "react";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { LoadingContainer } from "@/components/loading-container.component";

const MINUTES_15 = Number.POSITIVE_INFINITY; // neutralizado: sem regra de 

function isDone(status?: string | null) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s.includes("entregue") || s.includes("cancel");
}

function OrderCard({ o }: { o: StoreMirrorOrder }) {
  const created = o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "";
  const number = o.number || ("#" + (o.key?.slice?.(-4) ?? ""));
  return (
    <li className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b pb-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-semibold truncate">{o.userName || "Cliente sem nome"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{created}</p>
          <p className="text-[11px] text-muted-foreground">{number}</p>
        </div>
      </div>
      <StatusBadgeWithActions status={o.status} orderId={o.key} />
    </li>
  );
}

export default function OverdueOrders15() {
  const { approved, storeId } = useOperatorApproval();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<StoreMirrorOrder[]>([]);

  React.useEffect(() => {
    let off: (() => void) | undefined;
    async function run() {
      if (!approved || !storeId) {
        setLoading(false);
        setItems([]);
        return;
      }
      setLoading(true);
      off = await subscribeOrdersByStore(storeId, (orders) => {
        const now = Date.now();
        const list = (orders || [])
          .filter(o => !isDone(o.status))
          .filter(o => {
            const pivot = typeof o.statusChangedAt === "number" && o.statusChangedAt! > 0
              ? (o.statusChangedAt as number)
              : (o.createdAt as number);
            return (now - (pivot || 0)) >= MINUTES_15;
          })
          .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)); // older first
        setItems(list);
        setLoading(false);
      });
    }
    run();
    return () => { if (off) off(); };
  }, [approved, storeId]);

  return (
    <section className="mt-4">
      <h2 className="text-sm font-semibold mb-2">mais de </h2>
      <LoadingContainer loading={loading}>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground border rounded-md p-3 bg-white">
            Todos os pedidos estão no prazo.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((o) => (
              <OrderCard key={o.key} o={o} />
            ))}
          </ul>
        )}
      </LoadingContainer>
    </section>
  );
}
