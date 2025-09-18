
"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";

const DONE = new Set(["pedido entregue", "pedido cancelado"]);

export type ClientOrdersGroup = {
  userId: string;
  userName: string;
  lastCreatedAt: number;
  openCount: number;
  totalCount: number;
  latestStatus: string;
  orders: Array<{ key: string; status: string; createdAt: number }>;
};

export const useOrdersByClient = () => {
  const { role } = useAuth();
  const { approved, storeId } = useOperatorApproval();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ClientOrdersGroup[]>([]);

  const setup = useCallback(async () => {
    setLoading(true);
    let unsub: (() => void) | undefined;
    try {
      if (!storeId || !(role === "admin" || role === "operacao" || role === "operador") || !approved) {
        setGroups([]);
        return () => {};
      }
      unsub = subscribeOrdersByStore(storeId, (list: StoreMirrorOrder[]) => {
        const byUser = new Map<string, ClientOrdersGroup>();
        for (const o of list) {
          const uid = String(o.userId || "").trim();
          if (!uid) continue;
          const g = byUser.get(uid) || {
            userId: uid,
            userName: String(o.userName || "Cliente " + uid.slice(-6)),
            lastCreatedAt: 0,
            openCount: 0,
            totalCount: 0,
            latestStatus: "",
            orders: [],
          };
          const createdAt = Number(o.createdAt || 0);
          g.totalCount += 1;
          if (!DONE.has(String(o.status || "").toLowerCase())) g.openCount += 1;
          if (createdAt > g.lastCreatedAt) {
            g.lastCreatedAt = createdAt;
            g.latestStatus = String(o.status || "").toLowerCase();
            g.userName = String(o.userName || g.userName);
          }
          g.orders.push({ key: String(o.key), status: String(o.status || ""), createdAt });
          byUser.set(uid, g);
        }
        const arr = Array.from(byUser.values()).sort((a,b) => b.lastCreatedAt - a.lastCreatedAt);
        setGroups(arr);
      });
    } finally {
      setLoading(false);
    }
    return () => { unsub?.(); };
  }, [role, approved, storeId]);

  useEffect(() => {
    const end = setup();
    return () => { Promise.resolve(end).then((fn) => fn && fn()); };
  }, [setup]);

  return { groups, loading };
};
