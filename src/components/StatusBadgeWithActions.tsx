"use client";
import * as React from "react";
import AdvanceCancelButtons from "@/components/AdvanceCancelButtons";
import { ORDER_FLOW } from "@/lib/orderStatus";

type Props = {
  status: string;
  orderId: string;
  className?: string;
  cancelReason?: string | null;
  cancelAtStep?: string | null;
};

export default function StatusBadgeWithActions({
  status,
  orderId,
  className,
  cancelReason,
}: Props) {
  const steps = ORDER_FLOW as readonly string[];
  const isCanceled =
    status === "pedido cancelado" || status === "cancelado";

  if (isCanceled) {
    return (
      <div className={`w-full flex flex-col gap-2 ${className ?? ""}`}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-semibold">
            pedido cancelado
          </span>
          {cancelReason ? (
            <span className="text-xs text-rose-700/80" title={cancelReason}>
              Motivo: {cancelReason}
            </span>
          ) : null}
        </div>
        {/* cancelado: sem timeline/progresso e sem botões */}
      </div>
    );
  }

  const idx = Math.max(0, steps.indexOf(status));

  return (
    <div className={`w-full flex flex-col gap-2 ${className ?? ""}`}>
      {/* progress bar (segments) */}
      <div className="flex gap-2 items-center w-full">
        {steps.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300 ease-out"
            style={{ backgroundColor: i <= idx ? "#22c55e" : "#e5e7eb" }}
            aria-label={i <= idx ? "feito" : "pendente"}
          />
        ))}
      </div>

      {/* mini timeline */}
      <div className="flex flex-wrap gap-2 items-center mt-1">
        {steps.map((label, i) => (
          <span
            key={label}
            className={`text-xs px-2 py-1 rounded-full border transition-colors duration-300 ease-out ${
              i <= idx
                ? "bg-green-100 border-green-200 text-green-700"
                : "bg-gray-100 border-gray-200 text-gray-500"
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* actions */}
      <div className="flex items-center justify-end gap-3">
        <AdvanceCancelButtons orderId={orderId} status={status} />
      </div>
    </div>
  );
}
