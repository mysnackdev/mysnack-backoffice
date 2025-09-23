import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";

// Keep TS shape in sync with function's return
export type Address = { city?: string | null; state?: string | null; zip?: string | null; [key: string]: unknown };

export type EnrichedOrder = {
  id: string;
  createdAt: number;
  status: string;
  itemsCount: number | null;
  lastItem?: string | null;
  itemsPreview?: string[];
  userId: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  userCity?: string | null;
  userState?: string | null;
  userDocument?: string | null;
  userAddress?: Address | null;
  deliveryMode?: string | null;
  address?: Address | null;
  cancelReason?: string | null;
  storeId?: string | null;
  number?: string | null;
  total?: number | null;
};

type ListReq = { storeId?: string; limit?: number };
type ListRes = { orders?: EnrichedOrder[]; storeId?: string };

export async function fetchMyStoreOrdersEnriched(storeId?: string, limit = 50): Promise<EnrichedOrder[]> {
  // ❗️Do NOT use env fallback. Caller must resolve storeId (OperatorGate/useOperatorApproval)
  if (!storeId) return [];
  try {
    // Prefer the stable function name exported by cloud functions
    const call = httpsCallable<ListReq, ListRes>(functions, "listStoreOrdersEnriched");
    const res = await call({ storeId, limit });
    const data: ListRes = (res?.data as any) || {};
    const orders = Array.isArray((data as any).orders) ? (data as any).orders as EnrichedOrder[] : [];
    return orders;
  } catch (e) {
    console.error("[fetchMyStoreOrdersEnriched] callable error", e);
    // Fail closed with empty list to avoid overlay
    return [];
  }
}
