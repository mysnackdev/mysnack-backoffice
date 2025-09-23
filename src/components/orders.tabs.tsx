"use client";
import React from "react";

export default function Segmented({
  tab,
  setTab,
}: {
  tab: "orders" | "byClient";
  setTab: (t: "orders" | "byClient") => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border px-2 py-1">
      <button
        onClick={() => setTab("orders")}
        className={"px-3 py-1.5 text-sm rounded-md " + (tab === "orders" ? "bg-black text-white" : "text-zinc-700")}
      >
        Pedidos
      </button>
      <button
        onClick={() => setTab("byClient")}
        className={"px-3 py-1.5 text-sm rounded-md " + (tab === "byClient" ? "bg-black text-white" : "text-zinc-700")}
      >
        Por cliente
      </button>
    </div>
  );
}
