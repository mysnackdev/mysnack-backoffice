
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";

import type { ClientProfile } from "@/types/profile";
export type { ClientProfile } from "@/types/profile";

export async function getClientProfiles(storeId: string, userIds: string[]): Promise<Record<string, ClientProfile>> {
  const call = httpsCallable<{ storeId: string; userIds: string[] }, { profiles?: Record<string, ClientProfile> }>(functions, "getClientProfiles");
  const res = await call({ storeId, userIds });
  const data = (res.data ?? {}) as { profiles?: Record<string, ClientProfile> };
  return data.profiles ?? {};}