import { ref, onValue, update, get } from "firebase/database";
import { db } from "../../firebase";
import { getUsersBasicCF } from "./operator.service";


export type OrderStatus =
  | "pedido realizado"
  | "pedido confirmado"
  | "pedido sendo preparado"
  | "pedido pronto"
  | "pedido indo até você"
  | "pedido entregue";

export type OrderItem = { id: string; name: string; price: number; qty: number; subtotal?: number };
export type Order = {
  key: string;
  storeId: string;
  uid: string;
  createdAt: number;
  status: OrderStatus;
  items: OrderItem[];
  total?: number;
  storeName?: string;
  userName?: string;
};

function computeItemsAndTotal(items: OrderItem[]) {
  const normalized = (items || []).map((it) => ({
    ...it,
    subtotal: typeof it.subtotal === "number" ? it.subtotal : Number(it.price) * Number(it.qty || 0),
  }));
  const total = normalized.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
  return { items: normalized, total: Math.round(total * 100) / 100 };
}

type OrderDB = { uid: string; storeId: string; createdAt?: number; status?: string; items?: OrderItem[]; cancelled?: boolean; [k: string]: unknown };
function enrich(ordersObj: Record<string, OrderDB> | null | undefined) {
  const list = Object.entries(ordersObj || {}).map(([key, o]) => {
    const { items, total } = computeItemsAndTotal(o.items || []);
    return { key, ...o, items, total } as Order;
  });
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

async function attachUsers(list: Order[]) {
  const uids = Array.from(new Set(list.map((o) => o.uid).filter(Boolean)));
  if (!uids.length) return list;
  try {
    const users = await getUsersBasicCF(uids);
    return list.map((o) => ({ ...o, userName: users?.[o.uid]?.name || o.userName }));
  } catch {
    return list;
  }
}

export const OrderService = {
  subscribeOrders(params: { role: "admin" | "operacao" | "operador" | "unknown"; uid: string }, cb: (orders: Order[]) => void) {
    const { role, uid } = params;

    const handle = async (snap: import("firebase/database").DataSnapshot) => {
      const raw = snap.val() as Record<string, OrderDB> | null;
      const list = enrich(raw);
      cb(await attachUsers(list));
    };

    if (role === "admin") {
      const node = ref(db, "orders");
      const unsub = onValue(node, handle);
      return () => unsub();
    }

    if (role === "operacao") {
      const node = ref(db, `order_by_store/${uid}`);
      const unsub = onValue(node, handle);
      return () => unsub();
    }

    if (role === "operador") {
      // o componente de gate já impede acesso antes da aprovação,
      // aqui assumimos que já há um storeId vinculado
      const storeIdNode = ref(db, `backoffice/users/${uid}/storeId`);
      let innerUnsub: null | (() => void) = null;
      const unsub = onValue(storeIdNode, (s) => {
        const storeId = s.val();
        if (!storeId) {
          cb([]);
          if (innerUnsub) { innerUnsub(); innerUnsub = null; }
          return;
        }
        if (innerUnsub) innerUnsub();
        innerUnsub = onValue(ref(db, `order_by_store/${storeId}`), handle);
      });
      return () => { if (innerUnsub) innerUnsub(); unsub(); };
    }

    cb([]);
    return () => {};
  },
  // Subscribe to all orders and filter by user UID (simple client-side filter).
  // If you later fan-out to /orders_by_user/{uid}, you can swap the node below.
  subscribeOrdersByUser(uid: string, cb: (orders: { key: string; nome: string; status: string; createdAt?: number; cancelled?: boolean; }[]) => void) {
    if (!uid) { cb([]); return () => {}; }
    const handle = async (snap: import("firebase/database").DataSnapshot) => {
      const raw = snap.val() as Record<string, OrderDB> | null;
      const list = enrich(raw);
      const withUsers = await attachUsers(list);
      const mapped = withUsers
        .filter((o) => o.uid === uid)
        .map((o) => ({
          key: o.key,
          nome: o.userName || "Usuário",
          status: String(o.status || "pedido realizado"),
          createdAt: Number(o.createdAt || 0),
        }));
      cb(mapped);
    };
    const unsub = onValue(ref(db, "orders"), handle);
    return () => unsub();
  },


  async prevOrderStatus(orderId: string): Promise<string | null> {
    const s = await get(ref(db, `orders/${orderId}/status`));
    return s.exists() ? String(s.val()) : null;
  },

  async setOrderStatus(orderId: string, status: OrderStatus) {
    await update(ref(db, `orders/${orderId}`), { status });
    return { ok: true };
  },

  async cancelOrder(orderId: string) {
    await update(ref(db, `orders/${orderId}`), { status: "pedido cancelado" });
    return { ok: true };
  },
};

// keep named exports for compatibility
export const prevOrderStatus = OrderService.prevOrderStatus;
export const setOrderStatus = OrderService.setOrderStatus;
export const cancelOrder = OrderService.cancelOrder;
