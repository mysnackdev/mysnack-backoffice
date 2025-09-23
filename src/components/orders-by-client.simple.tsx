
"use client";

import React from "react";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";
import StatusBadgeWithActions from "@/components/StatusBadgeWithActions";
import { LoadingContainer } from "@/components/loading-container.component";
import { getClientProfiles, type ClientProfile } from "@/services/profiles.service";

function initials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function isDone(status?: string | null) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s.includes("entregue") || s.includes("cancel");
}

type Group = {
  userId: string;
  userName: string;
  lastCreatedAt: number;
  openCount: number;
  totalCount: number;
  orders: StoreMirrorOrder[];
};

export default function OrdersByClientSimple() {
  const { approved, storeId } = useOperatorApproval();
  const [loading, setLoading] = React.useState(true);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const profilesRef = React.useRef<Map<string, ClientProfile>>(new Map());

  React.useEffect(() => {
    let off: (() => void) | undefined;
    async function run() {
      if (!approved || !storeId) {
        setGroups([]);
        setLoading(false);
        profilesRef.current.clear();
        return;
      }
      setLoading(true);
      off = await subscribeOrdersByStore(storeId, async (orders) => {
        const map = new Map<string, Group>();
        for (const o of orders) {
          const uid = String(o.userId || "desconhecido");
          // nome base (cai para profile depois se existir)
          const baseName = (o.userName || "Cliente").trim() || "Cliente";
          if (!map.has(uid)) {
            map.set(uid, {
              userId: uid,
              userName: baseName,
              lastCreatedAt: o.createdAt || 0,
              openCount: 0,
              totalCount: 0,
              orders: [],
            });
          }
          const g = map.get(uid)!;
          g.orders.push(o);
          g.totalCount += 1;
          if (!isDone(o.status)) g.openCount += 1;
          if ((o.createdAt || 0) > g.lastCreatedAt) g.lastCreatedAt = o.createdAt || 0;
        }
        let arr = Array.from(map.values())
          .map(g => ({
            ...g,
            orders: g.orders.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)),
          }))
          .sort((a,b) => (b.lastCreatedAt || 0) - (a.lastCreatedAt || 0));

        // --- enriquecimento de perfis via callable ---
        const uniqueIds = Array.from(new Set(arr.map(g => g.userId).filter(Boolean)));
        const missing = uniqueIds.filter((uid) => !profilesRef.current.has(uid));
        if (missing.length) {
          try {
            const fetched = await getClientProfiles(storeId, missing);
            for (const [uid, prof] of Object.entries(fetched)) {
              profilesRef.current.set(uid, prof);
            }
          } catch (e) {
            // silencioso para não travar a UI
            console.error("getClientProfiles error", e);
          }
        }

        // aplica nomes e render info
        arr = arr.map(g => {
          const prof = profilesRef.current.get(g.userId);
          const userName = (prof?.displayName || prof?.email || g.userName || "Cliente").trim();
          return { ...g, userName };
        });

        setGroups(arr);
        setLoading(false);
      });
    }
    run();
    return () => { if (off) off(); };
  }, [approved, storeId]);

  return (
    <section>
      <LoadingContainer loading={loading}>
        {groups.length === 0 ? (
          <div className="text-sm text-muted-foreground border rounded-md p-3 bg-white">
            Nenhum pedido.
          </div>
        ) : (
          <ul className="space-y-4">
            {groups.map((g) => {
              const prof = profilesRef.current.get(g.userId);
              const subtitle = [prof?.email || null, prof?.phone || null].filter(Boolean).join(" · ");
              const extra = [prof?.document || null, prof?.address?.city ? (prof?.address?.state ? `${prof?.address?.city}/${prof?.address?.state}` : prof?.address?.city) : null].filter(Boolean).join(" · ");
              return (
              <li key={g.userId} className="rounded-xl border bg-white p-0 overflow-hidden">
                {/* Cabeçalho do cliente */}
                <div className="flex items-center gap-3 px-4 py-3 border-b">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 text-white text-xs grid place-items-center">
                    {initials(g.userName)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{g.userName}</div>
                    {subtitle && <div className="text-[12px] text-muted-foreground truncate">{subtitle}</div>}
                    {extra && <div className="text-[11px] text-muted-foreground truncate">{extra}</div>}
                    <div className="text-xs text-muted-foreground">
                      {g.openCount} em andamento • {g.totalCount} no total
                    </div>
                  </div>
                </div>

                {/* Pedidos do cliente */}
                <ul className="divide-y">
                  {g.orders.map((o) => {
                    const created = o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : "";
                    const number = o.number || ("#" + (o.key?.slice?.(-4) ?? ""));
                    return (
                      <li key={o.key} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Linha 1: itens e preço (quando houver) */}
                          <div className="text-sm font-medium truncate">
                            {(o.itemsCount ?? 0) > 0 ? `${o.itemsCount} item${(o.itemsCount ?? 0) > 1 ? 's' : ''}` : 'Pedido'}
                            {o.total ? <span className="ml-1 text-muted-foreground"> • R$ {(o.total / 100).toFixed(2)}</span> : null}
                          </div>
                          {/* Linha 2: número + data */}
                          <div className="text-xs text-muted-foreground truncate">
                            <span className="font-mono">{number}</span>
                            <span className="mx-1">•</span>
                            {created}
                          </div>
                        </div>
                        {/* Ações/Status */}
                        <StatusBadgeWithActions status={o.status} orderId={o.key} />
                      </li>
                    );
                  })}
                </ul>
              </li>
            )})}
          </ul>
        )}
      </LoadingContainer>
    </section>
  );
}
