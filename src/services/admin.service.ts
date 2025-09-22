import { httpsCallable, getFunctions } from "firebase/functions";
import { app } from "../../firebase";

const functions = getFunctions(app, "us-central1");

type ListShoppingsRaw = { items?: Shop[] } | Shop[] | Record<string, Shop>;

export type StoreSummary = {
  id: string;
  name: string;
  categoria?: string;
  online: boolean;
};

export async function getStoresStatusCF() {
  const fn = httpsCallable<object, { stores: StoreSummary[] }>(functions, "getStoresStatus");
  const res = await fn({});
  return res.data;
}

export type Shop = { name: string; slug: string; address?: string; lat?: number; lng?: number };

export async function listShoppingsCF(): Promise<{ shoppings: Shop[] }> {
  const fn = httpsCallable<object, ListShoppingsRaw>(functions, "listShoppings");
  const res = await fn({});
  const raw = res.data;
  // Accept several shapes:
  // - { items: [...] }
  // - [ ... ]
  // - { slug: {...}, ... }
  let list: Shop[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (Array.isArray(raw?.items)) list = raw.items;
  else if (raw && typeof raw === "object") list = Object.values(raw);
  return { shoppings: list };
}

export async function createShoppingCF(input: { name: string; slug: string }) {
  const fn = httpsCallable<{ name: string; slug: string }, Shop>(functions, "createShopping");
  const res = await fn(input);
  return res.data;
}

export async function updateShoppingCF(input: { slug: string; name?: string; address?: string; lat?: number; lng?: number }) {
  const fn = httpsCallable<typeof input, Shop>(functions, "updateShopping");
  const res = await fn(input);
  return res.data;
}

export type LikertSummary = { sum: number; count: number; avg: number; d1?: number; d2?: number; d3?: number; d4?: number; d5?: number };
export type Chair = { id: string; label: string; status: "available" | "occupied" | "disabled"; capacity?: number; updatedAt?: number; };

export async function getShoppingCF(slug: string) {
  const fn = httpsCallable<{slug:string}, (Shop & { likert?: LikertSummary })>(functions, "getShopping");
  const res = await fn({ slug });
  const data = res.data || {};
  return data as (Shop & { likert?: LikertSummary });
}

export async function submitShoppingLikertCF(input: { slug: string; value: number; }) {
  const fn = httpsCallable<typeof input, LikertSummary>(functions, "submitShoppingLikert");
  const res = await fn(input);
  return res.data;
}

// Chairs
export async function listChairsCF(slug: string){
  const fn = httpsCallable<{slug:string}, { items: Chair[] }>(functions, "listChairs");
  const res = await fn({ slug });
  return (res.data?.items ?? []) as Chair[];
}
export async function upsertChairCF(input: { slug: string; chair: Partial<Chair> & { label: string; id?: string } }){
  const fn = httpsCallable<typeof input, Chair>(functions, "upsertChair");
  const res = await fn(input);
  return res.data;
}
export async function deleteChairCF(input: { slug: string; id: string }){
  const fn = httpsCallable<typeof input, { ok: true }>(functions, "deleteChair");
  await fn(input);
  return true;
}
