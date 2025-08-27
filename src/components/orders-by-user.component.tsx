"use client";

import React, { useEffect, useRef, useState } from "react";
import { OrderService } from "@/services";
import type { OrderResponse } from "@/@types";
import { Order } from "@/models";
import { LoadingContainer } from "./loading-container.component";
import { EmptyState } from "./empty-state.component";

export const OrdersByUser: React.FC = () => {
  const [uid, setUid] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Order[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

  const handleObserve = () => {
    // Cancela a inscrição anterior (se houver)
    unsubRef.current?.();

    if (!uid) {
      setItems([]);
      return;
    }

    setLoading(true);
    unsubRef.current = OrderService.subscribeOrdersByUser(
      uid,
      (list: OrderResponse[]) => {
        const mapped = list.map((it) => new Order(it));
        setItems(mapped);
        setLoading(false);
      }
    );
  };

  // Utilitário para adaptar a função (action) ao handler de clique (event)
  const bindAction =
    (
      fn?: (action?: "prev" | "next" | "cancel") => Promise<void>,
      action: "prev" | "next" | "cancel" = "next"
    ) =>
    () => {
      void fn?.(action);
    };

  return (
    <section className="w-full max-w-4xl">
      <h2 className="mb-2 text-lg font-semibold">Orders by user</h2>

      <div className="mb-3 flex items-center gap-2">
        <input
          className="w-[360px] rounded-md border px-3 py-2 text-sm"
          placeholder="User UID (orders_by_user/{uid})"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
        />
        <button
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
          onClick={handleObserve}
          aria-busy={loading}
          disabled={loading}
        >
          Observe
        </button>
      </div>

      <LoadingContainer loading={loading}>
        {items.length > 0 ? (
          <ul className="grid gap-2">
            {items.map((item, idx) => (
              <li key={idx} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {item.user.name || "(sem nome)"}
                  </div>
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white " +
                      item.status.color
                    }
                  >
                    {item.status.label}
                  </span>
                </div>

                {item.onClick && (
                  <div className="mt-2 text-right">
                    <button
                      onClick={bindAction(item.onClick, "next")}
                      className="rounded-md border px-3 py-1 text-xs font-semibold"
                    >
                      Avançar status
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}
      </LoadingContainer>
    </section>
  );
};
