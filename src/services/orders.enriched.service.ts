import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";

type ListReq = { storeId?: string; limit?: number };
type ListRes = { orders?: EnrichedOrder[]; storeId?: string };

export type Address = { street?: string; logradouro?: string; line1?: string; number?: string | number; numero?: string | number; complement?: string; complemento?: string; line2?: string; neighborhood?: string; bairro?: string; city?: string; state?: string; zip?: string; postalCode?: string; cep?: string; [key: string]: unknown };

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
  deliveryMode?: string | null;
  address?: Address | null;
  cancelReason?: string | null;
  storeId?: string | null;
  number?: string | null;
  total?: number | null;
};

export async function fetchMyStoreOrdersEnriched(storeId?: string, limit = 50): Promise<EnrichedOrder[]> {
  const call = httpsCallable<ListReq, ListRes>(functions, "listMyStoreOrdersEnriched");
  const effectiveStore = storeId || process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || '9Hx7KMaUf0P1yED6OTALvv5wnbI2';
  const res = await call({ storeId: effectiveStore, limit });
  const data: ListRes = res.data || {};
  return Array.isArray(data.orders) ? (data.orders as EnrichedOrder[]) : [];
}
