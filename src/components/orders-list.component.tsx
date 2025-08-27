import { Order } from "@/models";
import { OrderListItem } from "./order-list-item.component";
import { EmptyState } from "./empty-state.component";
import { useOrder } from "@/hooks";
import { LoadingContainer } from "./loading-container.component";
import { useEffect, useMemo, useState } from "react";

const STATUS = [
  "pedido realizado",
  "pedido confirmado",
  "pedido sendo preparado",
  "pedido pronto",
  "pedido indo até você",
  "pedido entregue",
];

export const Orders = () => {
  const { items, setup, loading } = useOrder();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    const cleanupPromise = setup();
    return () => { Promise.resolve(cleanupPromise).then((fn)=>{ if (typeof fn === "function") (fn as any)(); }); };
  }, [setup]);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from + "T00:00:00").getTime() : 0;
    const toTs = to ? new Date(to + "T23:59:59").getTime() : Number.MAX_SAFE_INTEGER;
    return items.filter((it: any) => {
      const ts = it.createdAt || 0;
      const okDate = ts >= fromTs && ts <= toTs;
      const st = it.data?.status || it.status?.label;
      const okStatus = !statusFilter || st === statusFilter;
      return okDate && okStatus;
    });
  }, [items, from, to, statusFilter]);

  return (
    <div className="w-xl max-w-4xl">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-muted-foreground">Status</label>
          <select className="rounded-md border px-3 py-2 text-sm" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            {STATUS.map((s)=> <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">De</label>
          <input type="date" className="rounded-md border px-3 py-2 text-sm" value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Até</label>
          <input type="date" className="rounded-md border px-3 py-2 text-sm" value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <LoadingContainer />
      ) : filtered && filtered.length ? (
        <ul>
          {filtered.map((elem: Order, index) => (
            <OrderListItem key={index} item={elem} />
          ))}
        </ul>
      ) : (
        <EmptyState />
      )}
    </div>
  );
};
