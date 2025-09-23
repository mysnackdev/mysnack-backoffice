
import { httpsCallable } from "firebase/functions";
import { functions } from "@/services/firebase";

export type ClientProfile = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  address?: { city?: string | null; state?: string | null; zip?: string | null } | null;
};

export async function getClientProfiles(storeId: string, userIds: string[]): Promise<Record<string, ClientProfile>> {
  const call = httpsCallable<{ storeId: string; userIds: string[] }, { profiles: Record<string, ClientProfile> }>(functions, "getClientProfiles");
  const res = await call({ storeId, userIds });
  const data = (res.data as any) || {};
  return (data.profiles || {}) as Record<string, ClientProfile>;
}
