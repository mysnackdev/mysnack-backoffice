import { useCallback, useState } from "react";
import type { DataSnapshot } from "firebase/database";
import { Order } from "@/models";
import { AuthService, OrderService } from "@/services";

export const useOrder = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Order[]>([]);

  const setup = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        email: "operador@mysnack.com",
        password: "senhaSegura123",
      };
      await AuthService.signIn(params);

      OrderService.trackOrders((snapshot: DataSnapshot) => {
        const list: Order[] = [];
        snapshot.forEach((child) => {
          const value = child.val();
          const key = child.key ?? undefined;
          list.push(new Order({ key, ...value }));
          return false; // continua o forEach
        });
        setItems(list);
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Erro ao autenticar operador:", err.message);
      } else {
        console.error("Erro ao autenticar operador:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, setup, loading };
};
