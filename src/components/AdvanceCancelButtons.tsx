"use client";

import { useState } from "react";
import { nextStatus } from "@/lib/orderStatus";
import { OrderWorkflowService } from "@/services/orderWorkflow.service";

type Props = {
  orderId: string;
  status: string;
  className?: string;
};

export default function AdvanceCancelButtons({ orderId, status, className }: Props) {
  const [busy, setBusy] = useState<null | "advance" | "cancel">(null);
  const nxt = nextStatus(status);

  async function onAdvance() {
    if (!nxt) return;
    setBusy("advance");
    try {
      const res = await OrderWorkflowService.advance(orderId);
      const updated = (res?.status as string) || (res?.nextStatus as string) || nxt;
      try { window.dispatchEvent(new CustomEvent("order:status-changed", { detail: { id: orderId, status: updated } })); } catch {}
    } catch (e) {
      console.error("[advance] failed", e);
    } finally {
      setBusy(null);
    }
  }

  async function onCancel() {
    setBusy("cancel");
    try {
      await OrderWorkflowService.cancel(orderId);
      try { window.dispatchEvent(new CustomEvent("order:canceled", { detail: { id: orderId } })); } catch {}
    } catch (e) {
      console.error("[cancel] failed", e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={className ?? ""}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-neutral-50"
          aria-label="Cancelar pedido"
          title="Cancelar pedido"
          disabled={busy !== null}
        >
          {busy === "cancel" ? "Cancelando..." : "Cancelar"}
        </button>

        <button
          type="button"
          onClick={onAdvance}
          className="px-3 py-2 rounded-xl border bg-black text-white hover:opacity-90"
          aria-label="Avançar para o próximo status"
          title={nxt ? `Avançar para: ${nxt}` : "Avançar"}
          disabled={busy !== null || !nxt}
        >
          {busy === "advance" ? "Avançando..." : "Avançar"}
        </button>
      </div>
    </div>
  );
}
