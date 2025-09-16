import { httpsCallable, getFunctions } from "firebase/functions";
import { app } from "../../firebase";

const functions = getFunctions(app, "us-central1");

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

export async function listShoppingsCF() {
  const fn = httpsCallable<object, Shop[]>(functions, "listShoppings");
  const res = await fn({});
  return { shoppings: (res.data ?? []) as Shop[] };
}

export async function createShoppingCF(input: { name: string; slug: string }) {
  const fn = httpsCallable<{ name: string; slug: string }, Shop>(functions, "createShopping");
  const res = await fn(input);
  return res.data;
}

export type Shop = { name: string; slug: string };
