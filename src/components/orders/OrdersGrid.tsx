"use client";
import React, { useEffect, useState } from "react";
import { fetchMyStoreOrdersEnriched, type EnrichedOrder } from "@/services/orders.enriched.service";
import { useAuth } from "@/context/AuthContext";
import { subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { useMyStoreId } from "@/hooks/useMyStoreId";
import { ref, get } from "firebase/database";
import { db } from "@/firebase";

function formatDate(ts: number) {
  try { return new Date(ts).toLocaleString("pt-BR"); } catch { return ""; }
}
function cents(v: number | undefined | null) {
  if (typeof v !== "number") return "";
  try { return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); } catch { return ""; }
}


function AddressSnippet({ o }: { o: any }) {
  const addr = o.address || o.shippingAddress || o.delivery?.address || {};
  const mode = o.deliveryMode || o.mode || o.fulfillment?.mode || (o.pickup ? "pickup" : (addr && Object.keys(addr).length ? "delivery" : null));
  if (mode === "pickup") {
    return <div className="text-xs text-zinc-600">Retirada no balcão</div>;
  }
  const line1 = [addr.street || addr.logradouro || addr.line1, addr.number || addr.numero].filter(Boolean).join(", ");
  const line2 = [addr.neighborhood || addr.bairro, (addr.city || o.userCity), (addr.state || o.userState)].filter(Boolean).join(" - ");
  const zip = addr.cep || addr.zip || addr.postalCode;
  const complement = addr.complement || addr.complemento || addr.line2;
  return (
    <div className="text-xs text-zinc-600">
      {line1 && <div>{line1}</div>}
      {line2 && <div>{line2}</div>}
      {(zip || complement) && <div className="text-zinc-500">{[zip, complement].filter(Boolean).join(" • ")}</div>}
    </div>
  );
}


function ItemsPreview({ items, count }: { items?: string[]; count?: number | null }) {
  const has = Array.isArray(items) && items.length > 0;
  if (!has && !count) return null;
  return (
    <div className="mt-2 text-xs text-zinc-700">
      {has && (
        <div className="flex flex-wrap gap-1">
          {items!.slice(0, 4).map((name, i) => (
            <span key={i} className="px-2 py-0.5 bg-zinc-100 rounded-full border text-zinc-700">{name}</span>
          ))}
        </div>
      )}
      {typeof count === "number" && count > (items?.length || 0) && (
        <div className="mt-1">+{count - (items?.length || 0)} item(s)</div>
      )}
    </div>
  );
}


function OrderDrawer({ open, onClose, orderId, fallback }: { open: boolean; onClose: () => void; orderId: string | null; fallback?: any }) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open || !orderId) return;
      setLoading(true);
      try {
        const snap = await get(ref(db, `orders/${orderId}`));
        if (mounted) setData(snap.exists() ? snap.val() : null);
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [open, orderId]);

  const o = data || fallback || {};
  const items = Array.isArray(o.items) ? o.items : [];
  const addr = o.address || o.shippingAddress || o.delivery?.address || {};
  const line1 = [addr.street || addr.logradouro || addr.line1, addr.number || addr.numero].filter(Boolean).join(", ");
  const line2 = [addr.neighborhood || addr.bairro, (addr.city || o.userCity), (addr.state || o.userState)].filter(Boolean).join(" - ");
  const zip = addr.cep || addr.zip || addr.postalCode;
  const complement = addr.complement || addr.complemento || addr.line2;
  const mode = o.deliveryMode || o.mode || o.fulfillment?.mode || (o.pickup ? "pickup" : (addr && Object.keys(addr).length ? "delivery" : null));
  const note = o.note || o.obs || o.observation || o.comments;

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* backdrop */}
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      {/* panel */}
      <aside className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Pedido #{(orderId||"").slice(0,5)}</div>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded-md border">Fechar</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto h-full">
          {loading && <div className="text-sm text-zinc-500">Carregando…</div>}

          {/* Cliente */}
          <section>
            <div className="text-xs font-semibold mb-1">Cliente</div>
            <div className="text-sm">
              {o.userName && <div>{o.userName}</div>}
              {o.userEmail && <div className="text-zinc-500">{o.userEmail}</div>}
              {o.userPhone && <div className="text-zinc-500">{o.userPhone}</div>}
                <AddressSnippet o={o} />
            </div>
          </section>

          {/* Entrega/Retirada */}
          <section>
            <div className="text-xs font-semibold mb-1">Entrega/Retirada</div>
            <div className="text-sm text-zinc-700">
              {mode === "pickup" ? (
                <div>Retirada no balcão</div>
              ) : (
                <div className="space-y-0.5">
                  {line1 && <div>{line1}</div>}
                  {line2 && <div>{line2}</div>}
                  {(zip || complement) && <div className="text-zinc-500">{[zip, complement].filter(Boolean).join(" • ")}</div>}
                </div>
              )}
            </div>
          </section>

          {/* Itens */}
          <section>
            <div className="text-xs font-semibold mb-1">Itens</div>
            <ul className="divide-y border rounded-lg">
              {items.length === 0 && <li className="p-3 text-sm text-zinc-500">Sem itens disponíveis.</li>}
              {items.map((it:any, i:number) => {
                const name = it.name || it.id || `Item ${i+1}`;
                const qty = it.qty || it.quantity || 1;
                const unit = Number(it.price || it.unitPrice || 0);
                const total = Number(it.subtotal || (unit * qty));
                const opts = Array.isArray(it.options) ? it.options : (Array.isArray(it.modifiers) ? it.modifiers : []);
                const noteIt = it.note || it.obs || it.observation;
                return (
                  <li key={i} className="p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{qty}× {name}</div>
                      <div>{(total/100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                    </div>
                    {opts && opts.length > 0 && (
                      <ul className="mt-1 text-xs text-zinc-600 list-disc pl-4">
                        {opts.map((op:any, j:number) => <li key={j}>{op.name || op.label || String(op)}</li>)}
                      </ul>
                    )}
                    {noteIt && <div className="mt-1 text-xs text-zinc-700">Obs: {noteIt}</div>}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Observações do pedido */}
          {note && (
            <section>
              <div className="text-xs font-semibold mb-1">Observações</div>
              <div className="text-sm text-zinc-700 whitespace-pre-wrap">{note}</div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}


export default function OrdersGrid() {
  const { role } = useAuth();
  const storeId = useMyStoreId();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSince, setStatusSince] = useState<Record<string, { status: string; since: number }>>({});
  const [cancelAtStepMap, setCancelAtStepMap] = useState<Record<string, string>>({});
  const [nowTick, setNowTick] = useState(Date.now());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);


  // Initial fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchMyStoreOrdersEnriched(storeId || undefined);
        if (mounted) setOrders(list);
        if (mounted) {
          const map = Object.fromEntries(list.map((o: any) => [o.id, { status: o.status, since: (o as any).statusChangedAt || o.createdAt }]));
          setStatusSince(map);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [role, storeId]);

  // Tick a cada 20s para re-render sem refresh
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!storeId) return;
    const unsubscribe = subscribeOrdersByStore(storeId, (mirror: StoreMirrorOrder[]) => {
      let needsEnrich = false;
      setOrders((prev) => {
        const byId = new Map<string, any>(prev.map((o: any) => [o.id, o]));
        const nextStatusSince: Record<string, { status: string; since: number }> = { ...statusSince };
        const nextCancelAt: Record<string, string> = { ...cancelAtStepMap };

        mirror.forEach((m) => {
          const existing: any = byId.get(m.key);
          if (existing) {
            if (m.status === "pedido cancelado" && existing.status !== "pedido cancelado") {
              nextCancelAt[m.key] = existing.status as string;
            }
            if (!nextStatusSince[m.key] || nextStatusSince[m.key].status !== m.status) {
              nextStatusSince[m.key] = { status: m.status, since: m.statusChangedAt || Date.now() };
            }
            byId.set(m.key, { ...existing, status: m.status, total: m.total ?? existing.total, statusChangedAt: m.statusChangedAt ?? (existing as any)?.statusChangedAt });
          } else {
            needsEnrich = true;
            byId.set(m.key, {
              id: m.key,
              createdAt: m.createdAt,
              status: m.status,
              itemsCount: m.itemsCount ?? null,
              lastItem: m.lastItem ?? null,
              itemsPreview: [],
              userId: m.userId ?? null,
              userName: m.userName ?? null,
              userEmail: null,
              userPhone: null,
              userCity: null,
              userState: null,
              storeId: m.storeId ?? storeId,
              number: m.number ?? null,
              total: m.total ?? null,
              statusChangedAt: m.statusChangedAt ?? Date.now(),
            });
          }
        });

        const out = Array.from(byId.values()).sort((a: any,b: any) => (b.createdAt||0)-(a.createdAt||0));
        if (!needsEnrich) {
          needsEnrich = out.some((o: any) => !o.itemsPreview || !o.itemsPreview.length || !o.userName);
        }
        // side maps
        setStatusSince(nextStatusSince);
        setCancelAtStepMap(nextCancelAt);

        // kick async enrichment if needed
        if (needsEnrich) {
          fetchMyStoreOrdersEnriched(storeId).then((enriched) => {
            setOrders((prev2) => {
              const byId2 = new Map(prev2.map((o:any)=>[o.id,o]));
              enriched.forEach((e) => {
                const cur:any = byId2.get(e.id);
                if (cur) {
                  byId2.set(e.id, { ...e, status: cur.status ?? e.status, statusChangedAt: (cur as any).statusChangedAt ?? (e as any).statusChangedAt });
                }
              });
              return Array.from(byId2.values()).sort((a: any,b: any) => (b.createdAt||0)-(a.createdAt||0));
            });
          }).catch(()=>{});
        }

        return out;
      });
    });
    return () => { try { unsubscribe && unsubscribe(); } catch {} };
  }, [storeId, statusSince, cancelAtStepMap]);

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

  
  // Highlights 15 min
  const now = Date.now();
  const HIGHLIGHT_MS = 15 * 60 * 1000;
  const highlightIds = new Set(
    orders
      .filter((o: any) => {
        const rec = statusSince[o.id];
        const since = rec?.since ?? (o as any).statusChangedAt ?? (o as any).createdAt ?? 0;
        const canceled = (o.status || "").toLowerCase() === "pedido cancelado";
        const delivered = (o.status || "").toLowerCase() === "pedido entregue";
        if (canceled || delivered) return false;
        return now - Number(since || 0) >= HIGHLIGHT_MS;
      })
      .map((o: any) => o.id)
  );
return (
    <div className="space-y-6">
      {/* Pedidos com atenção (+15 min) */}
      {orders.filter(o => highlightIds.has(o.id)).length > 0 && (
        <section className="mb-6">
          <div className="text-sm font-semibold mb-2">Pedidos em atenção (+15 min)</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.filter(o => highlightIds.has(o.id)).map((o: any) => (
              <article key={o.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">Pedido #{(o.id || '').slice(0,5)}</div>
                    <div className="text-xs text-zinc-500">Criado: {formatDate(o.createdAt || 0)}</div>
                  </div>
                  <div>
                    <button onClick={(e)=>{e.stopPropagation?.(); setDrawerOrderId(o.id); setDrawerOpen(true);}} className="text-xs px-3 py-1 rounded-md border">Ver detalhes</button>
                  </div>
                </div>
            
                <div className="mt-1 text-xs text-zinc-700">
                  {o.userName && <div><span className="font-medium">Cliente:</span> {o.userName}</div>}
                  {o.userEmail && <div className="text-zinc-500">{o.userEmail}</div>}
                  {o.userPhone && <div className="text-zinc-500">{o.userPhone}</div>}
                <AddressSnippet o={o} />
                </div>
                <div className="mt-2">
                  <StatusBadgeWithActions
                    status={o.status}
                    orderId={o.id}
                    className="mt-2"
                    cancelReason={(o as any).cancelReason ?? null}
                    cancelAtStep={cancelAtStepMap[o.id] ?? null}
                  />
                </div>
                <ItemsPreview items={o.itemsPreview} count={o.itemsCount as any} />
                <div className="mt-2 text-sm text-zinc-700">
                  {typeof (o as any).total === 'number' && <div><span className="font-medium">Total:</span> {cents((o as any).total)}</div>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Pedidos dentro do tempo */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.filter(o => !highlightIds.has(o.id)).map((o: any) => (
          <article key={o.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">Pedido #{(o.id || '').slice(0,5)}</div>
                <div className="text-xs text-zinc-500">Criado: {formatDate(o.createdAt || 0)}</div>
              </div>
            </div>
            <div>
              <button onClick={(e)=>{e.stopPropagation?.(); setDrawerOrderId(o.id); setDrawerOpen(true);}} className="text-xs px-3 py-1 rounded-md border">Ver detalhes</button>
            </div>
            <div className="mt-1 text-xs text-zinc-700">
              {o.userName && <div><span className="font-medium">Cliente:</span> {o.userName}</div>}
              {o.userEmail && <div className="text-zinc-500">{o.userEmail}</div>}
              {o.userPhone && <div className="text-zinc-500">{o.userPhone}</div>}
                <AddressSnippet o={o} />
            </div>
            <div className="mt-2">
              <StatusBadgeWithActions
                status={o.status}
                orderId={o.id}
                className="mt-2"
                cancelReason={(o as any).cancelReason ?? null}
                cancelAtStep={cancelAtStepMap[o.id] ?? null}
              />
            </div>
            <ItemsPreview items={o.itemsPreview} count={o.itemsCount as any} />
            <div className="mt-2 text-sm text-zinc-700">
              {typeof (o as any).total === 'number' && <div><span className="font-medium">Total:</span> {cents((o as any).total)}</div>}
            </div>
          </article>
        ))}
      </div>
    <OrderDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} orderId={drawerOrderId} fallback={orders.find(x=>x.id===drawerOrderId)} />
  </div>
  );
}


