
import { db } from "../../firebase";
import { onValue, off, query, ref, orderByChild } from "firebase/database";

export type StoreMirrorOrder = {
  key: string;
  userId: string | null;
  userName?: string | null;
  status: string;
  createdAt: number;
  cancelled?: boolean;
  total?: number | null;
  number?: string | null;
  itemsCount?: number | null;
  storeId?: string | null;
  lastItem?: string | null;
};

export function subscribeOrdersByStore(
  storeId: string,
  cb: (orders: StoreMirrorOrder[]) => void
): () => void {
  const r = query(ref(db, `orders_by_store/${storeId}`), orderByChild("createdAt"));
  const handler = (snap: any) => {
    const v = snap.val() || {};
    const list: StoreMirrorOrder[] = Object.entries(v)
      .map(([key, val]: [string, any]) => ({
        key,
        userId: val?.userId ?? null,
        status: String(val?.status ?? "pedido realizado"),
        createdAt: Number(val?.createdAt ?? 0),
        cancelled: !!val?.cancelled,
        total: typeof val?.total === "number" ? val.total : null,
        number: val?.number ?? null,
        itemsCount:
          typeof val?.itemsCount === "number"
            ? val.itemsCount
            : Array.isArray(val?.items)
            ? val.items.length
            : null,
        storeId: storeId,
      }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    cb(list);
  };
  onValue(r, handler);
  return () => off(r, "value", handler);
}

export function subscribeAllOrders(cb: (orders: StoreMirrorOrder[]) => void): () => void {
  const r = query(ref(db, `orders`), orderByChild("createdAt"));
  const handler = (snap: any) => {
    const v = snap.val() || {};
    const list: StoreMirrorOrder[] = Object.entries(v)
      .map(([key, val]: [string, any]) => ({
        key,
        userId: val?.userId ?? null,
        status: String(val?.status ?? "pedido realizado"),
        createdAt: Number(val?.createdAt ?? 0),
        cancelled: !!val?.cancelled,
        total: typeof val?.total === "number" ? val.total : null,
        number: val?.number ?? null,
        itemsCount: Array.isArray(val?.items)
          ? val.items.length
          : typeof val?.itemsCount === "number"
          ? val.itemsCount
          : null,
        storeId: val?.storeId ?? null,
      }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    cb(list);
  };
  onValue(r, handler);
  return () => off(r, "value", handler);
}
