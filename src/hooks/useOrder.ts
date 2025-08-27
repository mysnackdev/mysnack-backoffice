import { useCallback, useState } from "react";
import { Order } from "@/models";
import { OrderService } from "@/services";
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
      unsub = OrderService.subscribeOrders((list) => {
        setItems(list.map((d) => new Order(d)));
      });
    } catch (err) {
      console.error("Erro ao configurar orders:", err);
    } finally {
      setLoading(false);
    }
    return () => { unsub?.(); };
  }, [user, role]);

  return { items, setup, loading };
};
