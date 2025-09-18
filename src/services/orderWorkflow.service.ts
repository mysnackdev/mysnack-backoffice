import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase";

type WorkflowResponse = { ok: boolean; message?: string; status?: string; nextStatus?: string };
type AdvancePayload = { orderId: string };
type CancelPayload = { orderId: string };
const functions = getFunctions(app, "us-central1");

export const OrderWorkflowService = {
  async advance(orderId: string) {
    const fn = httpsCallable<AdvancePayload, WorkflowResponse>(functions, "advanceOrder");
    const res = await fn({ orderId });
    return res.data;
  },
  async cancel(orderId: string) {
    const fn = httpsCallable<CancelPayload, WorkflowResponse>(functions, "cancelOrderFn");
    const res = await fn({ orderId });
    return res.data;
  },
};