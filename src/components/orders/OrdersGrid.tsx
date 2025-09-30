// src/components/orders/OrdersGrid.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { get, ref } from "firebase/database";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { fetchMyStoreOrdersEnriched, type EnrichedOrder } from "@/services/orders.enriched.service";
import { LoadingContainer } from "@/components/loading-container.component";
import type { OrderItem, OrderLike, EnrichedOrderExtra } from "@/types/order";

function fmtBRL(v?: number | null) {
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0)); } catch { return "R$ 0,00"; }
}
function pick<T>(...vals: T[]) { return vals.find((x) => x !== undefined && x !== null) as T | undefined; }
function parseNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  return null;
}
function fromCentsMaybe(v: unknown, fallback?: number) {
  const n = parseNum(v);
  if (n == null) return fallback ?? null;
  return n >= 100 ? n / 100 : n;
}

function OrderItems({ order }: { order: OrderLike }) {
  const rawAny = (order as OrderLike)?.items;
  const raw: OrderItem[] = Array.isArray(rawAny) ? rawAny as OrderItem[] : (rawAny && typeof rawAny === "object" ? Object.values(rawAny as Record<string, OrderItem>) : []);
  const preview: string[] = Array.isArray(order?.itemsPreview) ? order.itemsPreview : [];
  const hasRaw = raw && raw.length > 0;

  const stringifyOptions = (x: unknown): string | null => {
    const acc: string[] = [];
    const walk = (y: unknown) => {
      if (!y) return;
      if (typeof y === "string" || typeof y === "number") acc.push(String(y));
      else if (Array.isArray(y)) y.forEach(walk);
      else if (typeof y === "object") Object.values(y).forEach(walk);
    };
    walk(x);
    return acc.length ? acc.join(", ") : null;
  };

  if (hasRaw) {
    const rows = raw.map((it: OrderItem) => {
      const name = pick(it?.name, it?.title, it?.productName, it?.product?.name, it?.label, "Item");
      const qty = parseNum(pick(it?.quantity, it?.qty, it?.qtd, 1)) || 1;

      const unitCandidates = [
        it?.unitPrice, it?.price, it?.unit_price, it?.priceUnit, it?.unit_value, it?.unit,
        it?.unitPriceCents, it?.priceCents, it?.unit_cents, it?.amount_unit
      ];
      const unitRaw = pick(...unitCandidates);
      const unit = fromCentsMaybe(unitRaw);

      let total = parseNum(pick(it?.total, it?.subtotal, it?.lineTotal, it?.sum));
      if (total == null && unit != null) total = unit * qty;

      const opts = stringifyOptions(pick(it?.optionsText, it?.options_label, it?.options, it?.complements, it?.addons, it?.extras, it?.variations, it?.modifiers));
      return { name, qty, unit, total, opts, key: pick(it?.id, it?.key) };
    });

    const totalOrder = rows.reduce((acc, r) => acc + (r.total ?? 0), 0);

    const deliveryFee = pick(order?.deliveryFee, order?.frete, order?.shippingFee, order?.delivery?.fee);
    const deliveryFeeN = parseNum(deliveryFee);
    const serviceFee  = pick(order?.serviceFee,  order?.taxa,  order?.fees?.service);
    const serviceFeeN = parseNum(serviceFee);
    const discount    = pick(order?.discount, order?.couponDiscount, order?.cupomDesconto, order?.desconto);
    const discountN   = parseNum(discount);
    const totalProvided = pick(order?.total, order?.amount);
    const grandTotal = (totalProvided != null)
      ? Number(totalProvided)
      : Number(totalOrder || 0) + Number(serviceFee || 0) + Number(deliveryFee || 0) - Number(discount || 0);

    return (
      <>
        <ul className="mt-2 pt-1 space-y-1">
          {rows.map((r, idx) => (
            <li key={String(r.key ?? idx)} className="grid grid-cols-[40px,1fr,84px,96px] items-center gap-1 py-0.5">
              <div className="text-right tabular-nums text-zinc-600">{r.qty}×</div>
              <div className="min-w-0">
                <div className="truncate">{r.name}</div>
                {r.opts && <div className="text-[11px] text-zinc-500 truncate">{r.opts}</div>}
              </div>
              <div className="text-right text-[13px] tabular-nums">{r.unit != null ? fmtBRL(r.unit) : "—"}</div>
              <div className="text-right text-[13px] font-medium tabular-nums">{r.total != null ? fmtBRL(r.total) : (r.unit != null ? fmtBRL(r.unit * r.qty) : "—")}</div>
            </li>
          ))}
        </ul>

        <div className="mt-2 grid grid-cols-[1fr,100px] gap-2">
          <div className="text-right text-[12px] text-zinc-600">Subtotal</div>
          <div className="text-right text-[13px] tabular-nums">{fmtBRL(totalOrder)}</div>

          {serviceFeeN != null && (<>
            <div className="text-right text-[12px] text-zinc-600">Taxa de serviço</div>
            <div className="text-right text-[13px] tabular-nums">{fmtBRL(serviceFeeN)}</div>
          </>)}

          {deliveryFeeN != null && (<>
            <div className="text-right text-[12px] text-zinc-600">Entrega</div>
            <div className="text-right text-[13px] tabular-nums">{fmtBRL(deliveryFeeN)}</div>
          </>)}

          {discountN != null && Number(discountN) !== 0 && (<>
            <div className="text-right text-[12px] text-zinc-600">Desconto</div>
            <div className="text-right text-[13px] tabular-nums">- {fmtBRL(Math.abs(Number(discountN)))}</div>
          </>)}

          <div className="text-right text-[13px] font-semibold">Total do pedido</div>
          <div className="text-right text-[13px] font-semibold tabular-nums">{fmtBRL(grandTotal)}</div>
        </div>
      </>
    );
  }

  if (preview && preview.length) {
    return (
      <ul className="mt-3 border-t pt-3 space-y-1 text-[12px]">
        {preview.map((label: string, idx: number) => (
          <li key={idx} className="flex justify-between gap-3">
            <div className="truncate">{label}</div>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

function OrderCard({ o }: { o: EnrichedOrder }) {
  const created = o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "";
  const number = o.number || ("#" + (o.id?.slice?.(-4) ?? ""));
  const user = o.userName || o.userEmail || "Cliente";
  const subtitle = [o.userEmail, (o as EnrichedOrderExtra).userPhone].filter(Boolean).join(" · ");

  return (
    <li className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Cliente</p>
          <p className="font-medium text-[14px] truncate">{user}</p>
          {subtitle && <p className="text-[12px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">{created}</p>
          <p className="text-[11px] text-muted-foreground">{number}</p>
        </div>
      </div>

      {/* Barra de status + ações */}
      <div className="mt-2">
        <StatusBadgeWithActions status={o.status} orderId={o.id} />
      </div>

      {/* Itens */}
      
      {/* Observações (opcional) */}
      
      {/* Observações (opcional) */}
      {(() => {
        const note = (o as EnrichedOrderExtra).notes ?? (o as EnrichedOrderExtra).observations ?? (o as EnrichedOrderExtra).obs ?? null;
        if (!note) return null;
        return <div className="mt-2 text-[12px] text-zinc-700 bg-zinc-50 rounded px-2 py-1 whitespace-pre-wrap">{String(note)}</div>;
      })()}
    
      {(() => {
        const note = (o as EnrichedOrderExtra).notes ?? (o as EnrichedOrderExtra).observations ?? (o as EnrichedOrderExtra).obs ?? null;
        if (!note) return null;
        return <div className="mt-2 text-[12px] text-zinc-700 bg-zinc-50 rounded px-2 py-1 whitespace-pre-wrap">{String(note)}</div>;
      })()}
    
      <OrderItems order={o} />
    </li>
  );
}

export default function OrdersGrid() {
  const { storeId } = useOperatorApproval();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!storeId) return;
      setLoading(true);
      try {
        let list = await fetchMyStoreOrdersEnriched(storeId, 120);

        // Hidratar /orders/{id}
        const hydrated = await Promise.all(list.map(async (o) => {
          try {
            const snap = await get(ref(db, `orders/${o.id}`));
            const val = (snap.val() ?? null) as unknown;
            if (val) return { ...o, ...val };
          } catch {}
          return o;
        }));
        list = hydrated;

        if (alive) setOrders(list);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [storeId]);

  return (
    <section className="space-y-3">
      <LoadingContainer loading={loading}>
        {orders.length === 0 ? (
          <div className="text-[12px] text-muted-foreground border rounded-md p-3 bg-white">Nenhum pedido.</div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => <OrderCard key={o.id} o={o} />)}
          </ul>
        )}
      </LoadingContainer>
    </section>
  );
}