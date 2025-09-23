
"use client";

import React from "react";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { fetchMyStoreOrdersEnriched, type EnrichedOrder } from "@/services/orders.enriched.service";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { LoadingContainer } from "@/components/loading-container.component";

function OrderCard({ o }: { o: EnrichedOrder }) {
  const created = o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "";
  const number = o.number || ("#" + (o.id?.slice?.(-4) ?? ""));
  const user = o.userName || o.userEmail || "Cliente";
  const subtitle = [o.userEmail, o.userPhone].filter(Boolean).join(" · ");
  const extra = [o.userDocument, (o.userCity && o.userState ? `${o.userCity}/${o.userState}` : o.userCity)].filter(Boolean).join(" · ");

  return (
    <li className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b pb-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-semibold truncate">{user}</p>
          <p className="text-[12px] text-muted-foreground truncate">{subtitle || "—"}</p>
          {extra && <p className="text-[11px] text-muted-foreground truncate">{extra}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{created}</p>
          <p className="text-[11px] text-muted-foreground">{number}</p>
        </div>
      </div>
      <StatusBadgeWithActions status={o.status} orderId={o.id} />
    </li>
  );
}

export default function AllOrdersSection() {
  const { approved, storeId } = useOperatorApproval();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<EnrichedOrder[]>([]);

  const refresh = React.useCallback(async (sId?: string) => {
    if (!sId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await fetchMyStoreOrdersEnriched(sId, 120);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(approved ? storeId || undefined : undefined); }, [approved, storeId, refresh]);

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
              <OrderCard key={o.id} o={o} />
            ))}
          </ul>
        )}
      </LoadingContainer>
    </section>
  );
}
