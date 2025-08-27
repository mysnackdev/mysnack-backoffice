import { DataSnapshot, onValue, ref, Unsubscribe, update } from "firebase/database";
import { db } from "../../firebase";
import type { OrderResponse } from "@/@types";

export const ORDER_STATUS_FLOW = [
  "pedido realizado",
  "pedido confirmado",
  "pedido sendo preparado",
  "pedido pronto",
  "pedido indo até você",
  "pedido entregue",
] as const;

export class OrderService {
  static trackOrders(callback: (snapshot: DataSnapshot) => void): Unsubscribe {
    const ordersRef = ref(db, "orders");
    return onValue(ordersRef, callback);
  }

  static subscribeOrders(cb: (list: OrderResponse[]) => void): Unsubscribe {
    const r = ref(db, "orders");
    return onValue(r, (snap) => {
      const val = (snap.val() as Record<string, any>) || {};
      const list: OrderResponse[] = Object.entries(val).map(([key, v]: any) => ({
        key,
        nome: v?.nome ?? "",
        status: v?.status ?? "pedido realizado",
        createdAt: v?.createdAt ?? 0,
        cancelled: !!v?.cancelled,
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      cb(list);
    });
  }

  static subscribeOrdersByUser(uid: string, cb: (list: OrderResponse[]) => void): Unsubscribe {
    const r = ref(db, `orders_by_user/${uid}`);
    return onValue(r, (snap) => {
      const idx = (snap.val() as Record<string, any>) || {};
      const ids = Object.keys(idx);
      const results: OrderResponse[] = ids.map((id) => ({
        key: id,
        nome: (idx[id]?.nome ?? ""),
        status: (idx[id]?.status ?? "pedido realizado"),
        createdAt: (idx[id]?.createdAt ?? 0),
        cancelled: !!(idx[id]?.cancelled),
      }));
      results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      cb(results);
    });
  }

  static async updateOrder(orderKey: string, data: Partial<{ status: string; cancelled: boolean }>): Promise<void> {
    await update(ref(db, `orders/${orderKey}`), data as any);
  }
}

export function nextOrderStatus(current: string): string | null {
  const flow = Array.from(ORDER_STATUS_FLOW);
  const idx = flow.indexOf(current as any);
  if (idx < 0) return flow[0];
  if (idx >= flow.length - 1) return null;
  return flow[idx + 1];
}
export function prevOrderStatus(current: string): string | null {
  const flow = Array.from(ORDER_STATUS_FLOW);
  const idx = flow.indexOf(current as any);
  if (idx <= 0) return null;
  return flow[idx - 1];
}
export async function setOrderStatus(orderKey: string, status: string) {
  await update(ref(db, `orders/${orderKey}`), { status });
}
export async function cancelOrder(orderKey: string) {
  await update(ref(db, `orders/${orderKey}`), { cancelled: true });
}
