"use client";
import { useCallback, useState } from "react";
import { Order } from "@/models";
import { OrderService } from "@/services";
import type { Order as ServiceOrder } from "@/services/order.service"; // ⟵ tipagem do service
import { useAuth } from "@/context/AuthContext";

export const useOrder = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Order[]>([]);

  const setup = useCallback(async () => {
    setLoading(true);
    let unsub: (() => void) | undefined;
    try {
      if (!user || (role !== "admin" && role !== "operacao")) {
        setItems([]);
        return () => {};
      }

      unsub = OrderService.subscribeOrders(
        { role: (role === "admin" || role === "operacao" ? role : "unknown"), uid: user.uid },
        (list: ServiceOrder[]) => {
          setItems(
            list.map((o) =>
              new Order({
                key: String(o.key),
                nome: String(o.userName || "Usuário"),
                status: String(o.status || "pedido realizado"),
                createdAt: Number(o.createdAt || 0),
              })
            )
          );
        }
      );
    } catch (err) {
      console.error("Erro ao configurar orders:", err);
    } finally {
      setLoading(false);
    }
    return () => { unsub?.(); };
  }, [user, role]);

  return { items, setup, loading };
};
