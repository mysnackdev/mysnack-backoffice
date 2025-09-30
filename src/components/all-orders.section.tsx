"use client";

import React, { useEffect, useState } from "react";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { fetchMyStoreOrdersEnriched, type EnrichedOrder } from "@/services/orders.enriched.service";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { LoadingContainer } from "@/components/loading-container.component";
import { db } from "@/services/firebase";
import { get, ref, onValue, onChildAdded, onChildChanged, onChildRemoved } from "firebase/database";
import type { OrderItem, OrderLike, EnrichedOrderExtra } from "@/types/order";

type OrderRow = EnrichedOrder & Partial<OrderLike> & EnrichedOrderExtra;
// --- Inatividade por status (15 min)
const STALE_MINUTES = 15;
const TERMINAL_STATUSES = new Set<string>([
  "pedido entregue",
  "entregue",
  "pedido cancelado",
  "cancelado",
]);
function isTerminalStatus(status: unknown): boolean {
  const s = String(status ?? "").toLowerCase().trim();
  return TERMINAL_STATUSES.has(s);
}


function normalizeItems(items: OrderLike["items"]): OrderItem[] {
  if (!items) return [];
  if (Array.isArray(items)) return items.filter(Boolean);
  return Object.values(items as Record<string, OrderItem>).filter(Boolean);
}

function OrderItems({ order }: { order: OrderLike }) {
  const items = normalizeItems(order?.items as OrderLike["items"]);
  if (items.length === 0) return null;
  return (
    <ul className="text-xs text-muted-foreground list-disc pl-4">
      {items.map((it, i) => (
        <li key={i}>{`${it?.name ?? ""} × ${it?.qty ?? 0}`}</li>
      ))}
    </ul>
  );
}

function fmt(x: unknown): string {
  const n = typeof x === "string" ? Number(x) : (typeof x === "number" ? x : 0);
  if (!isFinite(n)) return "R$ 0,00";
  try { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); } catch { return `R$ ${n.toFixed(2)}`; }
}

function OrderCard({ o, nowMs }: { o: OrderRow; nowMs: number }) {
  // Client info (from enriched or full order)
  const cs = (o as unknown as { clientSummary?: { displayName?: string; email?: string; phone?: string } }).clientSummary;
  const displayName = o.userName ?? cs?.displayName ?? "";
  const email = o.userEmail ?? cs?.email ?? "";
  const phone = (o as unknown as { userPhone?: string | null }).userPhone ?? cs?.phone ?? "";

// Amounts
type Amounts = { subtotal?: number; total?: number; serviceFee?: number; deliveryFee?: number; discounts?: number };
const amounts = ((o as unknown as { amounts?: Amounts }).amounts) ?? ({} as Amounts);

const itemsList = normalizeItems((o as OrderLike).items);
const money = (m: unknown): number => {
  const n = typeof m === "string" ? Number(m) : (typeof m === "number" ? m : 0);
  return Number.isFinite(n) ? n : 0;
};
const subtotal = typeof amounts.subtotal === "number" ? amounts.subtotal :
  itemsList.reduce<number>((sum, it: OrderItem) => {
    const price = money(it?.price);
    const qty = typeof it?.qty === "number" ? it.qty! : (typeof it?.quantity === "number" ? it.quantity! : 0);
    return sum + price * qty;
  }, 0);
const serviceFee = typeof amounts.serviceFee === "number" ? amounts.serviceFee : 0;
const deliveryFee = typeof amounts.deliveryFee === "number" ? amounts.deliveryFee : 0;
const discounts = typeof amounts.discounts === "number" ? amounts.discounts : 0;
const total = typeof amounts.total === "number" ? amounts.total
  : (o as unknown as { total?: number | string }).total
  ?? (o as unknown as { grandTotal?: number | string }).grandTotal
  ?? subtotal;

  // Inatividade: 15+ min no mesmo status (exceto entregues/cancelados)
  const terminal = isTerminalStatus(o.status);
  const refTsUnknown = (o as unknown as { statusChangedAt?: number }).statusChangedAt
    ?? (o as unknown as { updatedAt?: number }).updatedAt
    ?? (o as unknown as { createdAt?: number }).createdAt
    ?? 0;
  const refTs = typeof refTsUnknown === "number" ? refTsUnknown : Number(refTsUnknown ?? 0);
  const sinceMs = Number.isFinite(refTs) && refTs > 0 ? (nowMs - refTs) : Number.POSITIVE_INFINITY;
  const stale = !terminal && sinceMs >= STALE_MINUTES * 60_000;
  const staleMinutes = Math.floor(sinceMs / 60_000);
return (
    <li className="rounded-lg border p-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="font-medium">#{o.id}</div>
        <StatusBadgeWithActions status={String(o.status ?? "")} orderId={o.id} />
      </div>

      {/* Client summary */}
      {stale && (
        <div className="mb-1">
          <span
            className="inline-flex items-center px-2 py-[2px] rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-semibold tracking-wide uppercase"
            title="Pedido está há 15+ min sem mudança de status"
          >
            ⚠︎ sem mudança há {staleMinutes} min
          </span>
        </div>
      )}
{(displayName || email || phone) && (
        <div className="text-xs text-muted-foreground mt-1">
          <span className="font-medium">Cliente</span> {displayName || ""}{email ? ` · ${email}` : ""}{phone ? ` · ${phone}` : ""}
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-9">
          <div className="text-sm text-muted-foreground">
            {(o.itemsCount ?? normalizeItems((o as OrderLike).items).length)} item(s)
          </div>
          <OrderItems order={o as OrderLike} />
        </div>
        <div className="md:col-span-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {serviceFee ? <div className="flex justify-between"><span>Taxa de serviço</span><span>{fmt(serviceFee)}</span></div> : null}
            {deliveryFee ? <div className="flex justify-between"><span>Entrega</span><span>{fmt(deliveryFee)}</span></div> : null}
            {discounts ? <div className="flex justify-between"><span>Descontos</span><span>-{fmt(discounts)}</span></div> : null}
            <div className="flex justify-between font-semibold pt-1 border-t"><span>Total do pedido</span><span>{fmt(total)}</span></div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function AllOrdersSection() {
  const { storeId, loading: approvalLoading } = useOperatorApproval();

  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(approvalLoading);

  
    const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

useEffect(() => {
  if (!storeId) {
    setItems([]);
    setLoading(false);
    return;
  }
  let alive = true;
  const unsubs: Array<() => void> = [];
  setLoading(true);

  (async () => {
    try {
      const list: EnrichedOrder[] = await fetchMyStoreOrdersEnriched(storeId, 30);
      if (!alive) return;

      // hydrate with /orders/{id}
      const hydrated: OrderRow[] = await Promise.all(
        list.map(async (o) => {
          const snap = await get(ref(db, `orders/${o.id}`));
          const full = (snap.exists() ? (snap.val() as unknown as Partial<OrderRow>) : ({} as Partial<OrderRow>));
          return { ...o, ...full } as OrderRow;
        })
      );
      if (alive) {
        hydrated.sort((a,b) => Number((b.createdAt ?? 0)) - Number((a.createdAt ?? 0)));
        setItems(hydrated);
      }

      // realtime: each order
      hydrated.forEach((ord) => {
        const off = onValue(ref(db, `orders/${ord.id}`), (ss) => {
          const val = ss.val() as unknown as Partial<OrderRow> | null;
          if (!val) return;
          setItems((prev) => {
            const idx = prev.findIndex(p => p.id === ord.id);
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = { ...next[idx], ...val };
            next.sort((a,b) => Number((b.createdAt ?? 0)) - Number((a.createdAt ?? 0)));
            return next;
          });
        });
        unsubs.push(off as unknown as () => void);
      });

      // realtime: orders_by_store
      const sref = ref(db, `orders_by_store/${storeId}`);
      const offAdd = onChildAdded(sref, (ss) => {
        const id = String(ss.key);
        const partial = ss.val() as unknown as Partial<OrderRow>;
        setItems((prev) => {
          if (prev.some(p => p.id === id)) return prev;
          const next = prev.concat({ id, ...partial } as OrderRow);
          next.sort((a,b) => Number((b.createdAt ?? 0)) - Number((a.createdAt ?? 0)));
          return next;
        });
        // also observe full order for details
        const off = onValue(ref(db, `orders/${id}`), (snap) => {
          const val = snap.val() as unknown as Partial<OrderRow> | null;
          if (!val) return;
          setItems((prev) => {
            const idx = prev.findIndex(p => p.id === id);
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = { ...next[idx], ...val };
            next.sort((a,b) => Number((b.createdAt ?? 0)) - Number((a.createdAt ?? 0)));
            return next;
          });
        });
        unsubs.push(off as unknown as () => void);
      });
      const offChg = onChildChanged(sref, (ss) => {
        const id = String(ss.key);
        const partial = ss.val() as unknown as Partial<OrderRow>;
        setItems((prev) => {
          const idx = prev.findIndex(p => p.id === id);
          if (idx === -1) return prev;
          const next = prev.slice();
          next[idx] = { ...next[idx], ...partial };
          next.sort((a,b) => Number((b.createdAt ?? 0)) - Number((a.createdAt ?? 0)));
          return next;
        });
      });
      const offRem = onChildRemoved(sref, (ss) => {
        const id = String(ss.key);
        setItems((prev) => prev.filter(p => p.id !== id));
      });
      unsubs.push(offAdd as unknown as () => void);
      unsubs.push(offChg as unknown as () => void);
      unsubs.push(offRem as unknown as () => void);

      // realtime (legacy): backoffice/ordersByTenant/{storeId}
      const legacyRef = ref(db, `backoffice/ordersByTenant/${storeId}`);
      const legacyAdd = onChildAdded(legacyRef, (ss) => {
        const id = String(ss.key);
        const partial = ss.val() as unknown as Partial<OrderRow>;
        setItems((prev) => {
          if (prev.some(p => p.id === id)) return prev;
          const next = prev.concat({ id, ...partial } as OrderRow);
          next.sort((a,b) => Number((b.createdAt ?? 0)) - Number((a.createdAt ?? 0)));
          return next;
        });
      });
      const legacyChg = onChildChanged(legacyRef, (ss) => {
        const id = String(ss.key);
        const partial = ss.val() as unknown as Partial<OrderRow>;
        setItems((prev) => {
          const idx = prev.findIndex(p => p.id === id);
          if (idx === -1) return prev;
          const next = prev.slice();
          next[idx] = { ...next[idx], ...partial };
          next.sort((a,b) => Number((b.createdAt ?? 0)) - Number((a.createdAt ?? 0)));
          return next;
        });
      });
      const legacyRem = onChildRemoved(legacyRef, (ss) => {
        const id = String(ss.key);
        setItems((prev) => prev.filter(p => p.id !== id));
      });
      unsubs.push(legacyAdd as unknown as () => void);
      unsubs.push(legacyChg as unknown as () => void);
      unsubs.push(legacyRem as unknown as () => void);
    } catch {if (alive) setItems([]);
    } finally {
      if (alive) setLoading(false);
    }
  })();

  return () => {
    alive = false;
    unsubs.forEach(fn => { try { fn(); } catch {} });
  };
}, [storeId]);

  return (
    <section className="p-2">
      <h2 className="text-base font-semibold">Pedidos</h2>
      <LoadingContainer loading={approvalLoading || loading} className="mt-3">
        {(!storeId && !approvalLoading) ? (
          <div className="text-[12px] text-muted-foreground border rounded-md p-3 bg-white">
            Nenhuma loja vinculada a este usuário. Peça aprovação do operador ou associe uma loja em &quot;Minha loja&quot;.
          </div>
        ) : items.length === 0 ? (
          <div className="text-[12px] text-muted-foreground border rounded-md p-3 bg-white">
            Nenhum pedido.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((o) => (
              <OrderCard key={o.id} o={o} nowMs={nowMs} />
            ))}
          </ul>
        )}
      </LoadingContainer>
    </section>
  );
}
