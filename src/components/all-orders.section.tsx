
"use client";

import React from "react";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { LoadingContainer } from "@/components/loading-container.component";

function OrderCard({ o }: { o: StoreMirrorOrder }) {
  const created = o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "";
  const number = o.number || ("#" + (o.key?.slice?.(-4) ?? ""));
  const user = o.userName || "Cliente";
  return (
    <li className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b pb-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-semibold truncate">{user}</p>
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

export default function AllOrdersSection() {
  const { approved, storeId } = useOperatorApproval();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<StoreMirrorOrder[]>([]);

  React.useEffect(() => {
    let off: (() => void) | undefined;
    async function run() {
      if (!approved || !storeId) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      off = await subscribeOrdersByStore(storeId, (orders) => {
        const list = (orders || []).slice().sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        setItems(list);
        setLoading(false);
      });
    }
    run();
    return () => { if (off) off(); };
  }, [approved, storeId]);

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold mb-2">pedidos</h2>
      <LoadingContainer loading={loading}>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground border rounded-md p-3 bg-white">
            Nenhum pedido.
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
