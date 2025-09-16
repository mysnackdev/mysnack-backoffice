import { httpsCallable, getFunctions } from "firebase/functions";
import { app } from "../../firebase";

const functions = getFunctions(app, "us-central1");

export type BasicUser = { uid: string; name?: string; email?: string; phone?: string };

export async function approveOperatorCF(params: { operatorUid: string; storeId: string }) {
  const fn = httpsCallable<{ operatorUid: string; storeId: string }, { ok: boolean }>(functions, "approveOperator");
  const res = await fn(params);
  return res.data;
}

export async function suspendOperatorCF(params: { operatorUid: string; storeId: string }) {
  const fn = httpsCallable<{ operatorUid: string; storeId: string }, { ok: boolean }>(functions, "suspendOperator");
  const res = await fn(params);
  return res.data;
}

export async function getUsersBasicCF(uids: string[]) {
  const fn = httpsCallable<{ uids: string[] }, { users: Record<string, BasicUser> }>(functions, "getUsersBasic");
  const res = await fn({ uids });
  return res.data.users;
}
