"use client";

import React from "react";
import { useOrdersByClient } from "@/hooks/useOrdersByClient";
import { LoadingContainer } from "./loading-container.component";
import { EmptyState } from "./empty-state.component";

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const OrdersByClient: React.FC = () => {
  const { groups, loading } = useOrdersByClient();
  const openTotal = groups.reduce((acc, g) => acc + g.openCount, 0);

  return (
    <section className="max-w-5xl">
      <div className="mb-3">
        {openTotal > 0 ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
            Você tem <b>{openTotal}</b> pedido(s) em andamento.
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
            Nenhum pedido em andamento.
          </div>
        )}
      </div>

      <LoadingContainer loading={loading}>
        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.userId} className="rounded-xl border bg-white shadow-sm p-3">
                <details>
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 text-white grid place-items-center text-sm font-semibold">
                        {initials(g.userName || `Cliente ${g.userId.slice(-6)}`)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {g.userName || `Cliente ${g.userId.slice(-6)}`}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {g.openCount} em andamento • {g.totalCount} no total
                        </div>
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-wide text-zinc-600">
                      {g.latestStatus || ""}
                    </div>
                  </summary>

                  <div className="mt-3 border-t pt-3">
                    <ul className="space-y-2">
                      {g.orders
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((o) => (
                          <li key={o.key} className="flex items-center justify-between">
                            <div className="text-sm">#{o.key.slice(-5)}</div>
                            <div className="text-xs text-zinc-600">{o.status}</div>
                            <div className="text-xs text-zinc-500">
                              {new Date(o.createdAt).toLocaleString()}
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </LoadingContainer>
    </section>
  );
};
