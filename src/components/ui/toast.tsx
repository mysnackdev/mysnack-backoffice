// src/components/ui/toast.tsx
"use client";

import React from "react";

type ToastKind = "success" | "error" | "info";
type ToastMsg = { id: string; type: ToastKind; title?: string; message: string };

const listeners: Set<(t: ToastMsg) => void> = new Set();

function emit(t: ToastMsg) {
  listeners.forEach((l) => l(t));
}

export const toast = {
  success(message: string, title: string = "Tudo certo") {
    emit({ id: crypto.randomUUID(), type: "success", title, message });
  },
  error(message: string, title: string = "Algo deu errado") {
    emit({ id: crypto.randomUUID(), type: "error", title, message });
  },
  info(message: string, title: string = "Info") {
    emit({ id: crypto.randomUUID(), type: "info", title, message });
  },
};

export function Toaster() {
  const [items, setItems] = React.useState<ToastMsg[]>([]);

  React.useEffect(() => {
    const on = (t: ToastMsg) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== t.id));
      }, 4000);
    };
    listeners.add(on);
    return () => {
      // garantir cleanup com retorno void
      listeners.delete(on);
    };
  }, []);

  const color = (k: ToastKind) =>
    k === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : k === "error"
      ? "border-rose-300 bg-rose-50 text-rose-900"
      : "border-zinc-300 bg-zinc-50 text-zinc-900";

  const dot = (k: ToastKind) =>
    k === "success" ? "bg-emerald-500" : k === "error" ? "bg-rose-500" : "bg-zinc-500";

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex w-[360px] items-start gap-3 rounded-xl border p-3 shadow-lg ${color(t.type)}`}
          role="status"
          aria-live="polite"
        >
          <span className={`mt-1 inline-block h-2 w-2 rounded-full ${dot(t.type)}`} />
          <div className="min-w-0">
            {t.title && <div className="truncate text-sm font-semibold">{t.title}</div>}
            <div className="mt-0.5 whitespace-pre-wrap break-words text-sm">{t.message}</div>
          </div>
          <button
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
            className="ml-auto rounded-md px-2 text-sm/none opacity-60 hover:opacity-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
