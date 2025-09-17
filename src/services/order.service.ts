
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, onValue, update, query, orderByChild, limitToLast, DataSnapshot, get, equalTo } from "firebase/database";
import { db } from "../../firebase";
import { getUsersBasicCF } from "./operator.service";

export type OrderStatus =
  | "pedido realizado"
  | "pedido confirmado"
  | "pedido sendo preparado"
  | "pedido pronto"
  | "pedido indo até você"
  | "pedido entregue"
  | "pedido cancelado";

export type OrderItem = { id: string; name?: string; price?: number; qty: number; subtotal?: number };
export type Order = {
  key: string;
  uid: string;
  userName?: string;
  status: OrderStatus;
  createdAt: number;
  total?: number;
  items?: OrderItem[];
};

const STATUS_FLOW: OrderStatus[] = [
  "pedido realizado",
  "pedido confirmado",
  "pedido sendo preparado",
  "pedido pronto",
  "pedido indo até você",
  "pedido entregue",
];

export function prevOrderStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  return idx > 0 ? STATUS_FLOW[idx - 1] : null;
}
export function nextOrderStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

function snapshotToList(snap: DataSnapshot): Order[] {
  const arr: Order[] = [];
  snap.forEach((c) => {
    const v: any = c.val() || {};
    arr.push({
      key: String(c.key),
      uid: String(v.uid || ""),
      userName: v.userName || "Usuário",
      status: String(v.status || "pedido realizado") as OrderStatus,
      createdAt: Number(v.createdAt || 0),
      total: typeof v.total === "number" ? v.total : undefined,
      items: Array.isArray(v.items)
        ? v.items.map((it: any) => ({
            id: String(it.id),
            name: typeof it.name === "string" ? it.name : undefined,
            price: typeof it.price === "number" ? it.price : undefined,
            qty: Number(it.qty || 0),
            subtotal: typeof it.subtotal === "number" ? it.subtotal : undefined,
          }))
        : undefined,
    });
    return false;
  });
  arr.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  return arr;
}

async function attachUsers(list: Order[]) {
  const uids = Array.from(new Set(list.map((o) => o.uid).filter(Boolean)));
  if (!uids.length) return list;
  try {
    const users = await getUsersBasicCF(uids);
    return list.map((o) => ({ ...o, userName: users?.[o.uid]?.name || o.userName }));
  } catch (e) {
    console.warn("attachUsers failed", e);
    return list;
  }
}

async function resolveTenantKey(uid: string): Promise<{ tenant: string; profileId?: string }> {
  try {
    const s = await get(ref(db, `backoffice/users/${uid}/storeId`));
    const tenant = s.exists() ? String(s.val()) : String(uid);
    let profileId: string | undefined = undefined;
    try {
      const p = await get(ref(db, `backoffice/tenants/${tenant}/storeProfile/id`));
      if (p.exists()) profileId = String(p.val());
    } catch {}
    return { tenant, profileId };
  } catch {
    return { tenant: String(uid) };
  }
}

export const OrderService = {
  subscribeOrders(params: { role: "admin" | "operacao" | "operador" | "unknown"; uid: string }, cb: (orders: Order[]) => void) {
    if (!params?.uid || (params.role !== "admin" && params.role !== "operacao" && params.role !== "operador")) {
      cb([]);
      return () => {};
    }

    let unsubscribes: Array<() => void> = [];
    let active: "primary" | "fallback1" | "fallback2" | null = null;
    let lastPrimary: Order[] = [];
    let lastFallback1: Order[] = [];
    let lastFallback2: Order[] = [];

    (async () => {
      const { tenant, profileId } = await resolveTenantKey(params.uid);
      const primaryPath = `backoffice/ordersByTenant/${tenant}`;
      const fallbackPath1 = `order_by_store/${tenant}`;
      const fallbackPath2 = profileId ? `order_by_store/${profileId}` : null;

      // initial load (defensive)
      try {
        const p = await get(ref(db, primaryPath));
        if (p.exists()) {
          lastPrimary = await attachUsers(snapshotToList(p));
          if (lastPrimary.length) {
            active = "primary";
            cb(lastPrimary);
          }
        }
      } catch (e:any) {
        console.warn("init-load primary error", e?.message || e);
      }
      if (active === null) {
        try {
          const f1 = await get(ref(db, fallbackPath1));
          if (f1.exists()) {
            lastFallback1 = await attachUsers(snapshotToList(f1));
            if (lastFallback1.length) {
              active = "fallback1";
              cb(lastFallback1);
            }
          }
        } catch (e:any) {
          console.warn("init-load fallback1 error", e?.message || e);
        }
      }
      if (active === null && fallbackPath2) {
        try {
          const f2 = await get(ref(db, fallbackPath2));
          if (f2.exists()) {
            lastFallback2 = await attachUsers(snapshotToList(f2));
            if (lastFallback2.length) {
              active = "fallback2";
              cb(lastFallback2);
            }
          }
        } catch (e:any) {
          console.warn("init-load fallback2 error", e?.message || e);
        }
      }

      const qPrimary = query(ref(db, primaryPath), orderByChild("createdAt"), limitToLast(400));
      const qDirectOrders = (params.role === "admin" || params.role === "operacao")
        ? query(ref(db, "orders"), orderByChild("storeId"), equalTo(tenant))
        : null;
      const qFallback1 = query(ref(db, fallbackPath1), orderByChild("createdAt"), limitToLast(400));
      const qFallback2 = fallbackPath2 ? query(ref(db, fallbackPath2), orderByChild("createdAt"), limitToLast(400)) : null;

      const upPrimary = onValue(qPrimary, async (snap) => {
        try {
          const list = snapshotToList(snap);
          lastPrimary = await attachUsers(list);
          if (lastPrimary.length > 0) {
            active = "primary";
            cb(lastPrimary);
          } else if (active !== "primary") {
            if (lastFallback1.length > 0) {
              active = "fallback1";
              cb(lastFallback1);
            } else if (lastFallback2.length > 0) {
              active = "fallback2";
              cb(lastFallback2);
            } else {
              cb([]);
            }
          }
        } catch (e:any) {
          console.error("listener primary error", e?.message || e);
        }
      }, (e) => console.warn("listen primary permission?", e));

      unsubscribes.push(() => upPrimary());

      const upFallback1 = onValue(qFallback1, async (snap) => {
        try {
          const list = snapshotToList(snap);
          lastFallback1 = await attachUsers(list);
          if ((active === null || active === "fallback1") && lastPrimary.length === 0) {
            active = lastFallback1.length > 0 ? "fallback1" : active;
            cb(lastFallback1);
          }
        } catch (e:any) {
          console.error("listener fallback1 error", e?.message || e);
        }
      }, (e) => console.warn("listen fallback1 permission?", e));
      unsubscribes.push(() => upFallback1());

      /* ORDERS FALLBACK */
      if (qDirectOrders) {
        const upOrders = onValue(qDirectOrders, async (snap) => {
          const list = snapshotToList(snap);
          lastFallback2 = await attachUsers(list);
          if ((active === null || active === "fallback2") && lastPrimary.length === 0 && lastFallback1.length === 0) {
            active = lastFallback2.length > 0 ? "fallback2" : active;
            cb(lastFallback2);
          }
        }, logRtdbError("orders/equalTo(storeId)"));
        unsubscribes.push(() => upOrders());
      }

      if (qFallback2) {
        const upFallback2 = onValue(qFallback2, async (snap) => {
          try {
            const list = snapshotToList(snap);
            lastFallback2 = await attachUsers(list);
            if ((active === null || active === "fallback2") && lastPrimary.length === 0 && lastFallback1.length === 0) {
              active = lastFallback2.length > 0 ? "fallback2" : active;
              cb(lastFallback2);
            }
          } catch (e:any) {
            console.error("listener fallback2 error", e?.message || e);
          }
        }, (e) => console.warn("listen fallback2 permission?", e));
        unsubscribes.push(() => upFallback2());
      }
    })();

    return () => {
      for (const u of unsubscribes) {
        try { u(); } catch {}
      }
    };
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

export const prevStatus = prevOrderStatus;
export const nextStatus = nextOrderStatus;
export const setOrderStatus = OrderService.setOrderStatus;
export const cancelOrder = OrderService.cancelOrder;
