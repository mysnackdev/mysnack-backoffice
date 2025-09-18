"use client";
import { useCallback, useState, useEffect } from "react";
import { Order } from "@/models";
import { useAuth } from "@/context/AuthContext";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { subscribeOrdersByStore, type StoreMirrorOrder } from "@/services/orders.mirror.service";

export const useOrder = () => {
  const { user, role } = useAuth();
  const { approved, storeId } = useOperatorApproval();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Order[]>([]);

  const setup = useCallback(async () => {
    setLoading(true);
    let unsub: (() => void) | undefined;
    try {
      if (!user || !storeId || !(role === "admin" || role === "operacao" || role === "operador") || !approved) {
        setItems([]);
        return () => {};
      }
      unsub = subscribeOrdersByStore(storeId, (list: StoreMirrorOrder[]) => {
        const mapped = list
          .map((o) => new Order({
            key: String(o.key),
            nome: String(o.userName || "Usuário"),
            status: String(o.status || "pedido realizado"),
            createdAt: Number(o.createdAt || 0),
            cancelled: Boolean(o.cancelled),
          }));
        setItems(mapped.reverse());
      });
    } catch (err) {
      console.error("Erro ao configurar orders:", err);
    } finally {
      setLoading(false);
    }
    return () => { unsub?.(); };
  }, [user, role, approved, storeId]);

  useEffect(() => {
    const end = setup();
    return () => { Promise.resolve(end).then((fn) => fn && fn()); };
  }, [setup]);

  return { items, setup, loading };
};