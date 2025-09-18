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
    try {
      setBusy("advance");
      await OrderWorkflowService.advance(orderId);
    } finally {
      setBusy(null);
    }
  }

  async function onCancel() {
    try {
      setBusy("cancel");
      await OrderWorkflowService.cancel(orderId);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-2 rounded-xl border hover:bg-gray-50"
        aria-label="Cancelar pedido"
        title="Cancelar pedido"
      >
        {busy === "cancel" ? "Cancelando..." : "Cancelar"}
      </button>

      <button
        type="button"
        onClick={onAdvance}
        className="px-3 py-2 rounded-xl border bg-black text-white hover:opacity-90"
        aria-label="Avançar para o próximo status"
        title={nxt ? `Avançar para: ${nxt}` : "Avançar"}
      >
        {busy === "advance" ? "Avançando..." : (nxt ? `Avançar (${nxt})` : "Avançar")}
      </button>
    </div>
  );
}
