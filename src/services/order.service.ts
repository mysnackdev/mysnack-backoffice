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

export type OrderStatus = (typeof ORDER_STATUS_FLOW)[number];

type FirebaseOrder = {
  nome?: string;
  status?: unknown;      // pode vir errado do DB; normalizamos abaixo
  createdAt?: unknown;   // idem
  cancelled?: unknown;   // idem
};

type OrderRecord = Record<string, FirebaseOrder>;

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUS_FLOW as readonly string[]).includes(value);
}

function normalizeStatus(value: unknown): OrderStatus {
  return isOrderStatus(value) ? value : "pedido realizado";
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

export class OrderService {
  static trackOrders(callback: (snapshot: DataSnapshot) => void): Unsubscribe {
    const ordersRef = ref(db, "orders");
    return onValue(ordersRef, callback);
  }

  static subscribeOrders(cb: (list: OrderResponse[]) => void): Unsubscribe {
    const r = ref(db, "orders");
    return onValue(r, (snap) => {
      const val = (snap.val() ?? {}) as OrderRecord;

      const list: OrderResponse[] = Object.keys(val).map((key) => {
        const v = val[key] ?? {};
        return {
          key,
          nome: typeof v.nome === "string" ? v.nome : "",
          status: normalizeStatus(v.status),
          createdAt: normalizeNumber(v.createdAt, 0),
          cancelled: normalizeBoolean(v.cancelled),
        };
      });

      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      cb(list);
    });
  }

  static subscribeOrdersByUser(uid: string, cb: (list: OrderResponse[]) => void): Unsubscribe {
    const r = ref(db, `orders_by_user/${uid}`);
    return onValue(r, (snap) => {
      const byId = (snap.val() ?? {}) as OrderRecord;

      const results: OrderResponse[] = Object.keys(byId).map((id) => {
        const v = byId[id] ?? {};
        return {
          key: id,
          nome: typeof v.nome === "string" ? v.nome : "",
          status: normalizeStatus(v.status),
          createdAt: normalizeNumber(v.createdAt, 0),
          cancelled: normalizeBoolean(v.cancelled),
        };
      });

      results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      cb(results);
    });
  }

  static async updateOrder(
    orderKey: string,
    data: Partial<{ status: OrderStatus; cancelled: boolean }>
  ): Promise<void> {
    await update(ref(db, `orders/${orderKey}`), data);
  }
}

export function nextOrderStatus(current: string): OrderStatus | null {
  const idx = (ORDER_STATUS_FLOW as readonly string[]).indexOf(current);
  if (idx < 0) return ORDER_STATUS_FLOW[0];
  if (idx >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[idx + 1];
}

export function prevOrderStatus(current: string): OrderStatus | null {
  const idx = (ORDER_STATUS_FLOW as readonly string[]).indexOf(current);
  if (idx <= 0) return null;
  return ORDER_STATUS_FLOW[idx - 1];
}

export async function setOrderStatus(orderKey: string, status: OrderStatus) {
  await update(ref(db, `orders/${orderKey}`), { status });
}

export async function cancelOrder(orderKey: string) {
  await update(ref(db, `orders/${orderKey}`), { cancelled: true });
}
