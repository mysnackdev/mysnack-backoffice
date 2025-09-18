
"use client";
import React from "react";
import OrdersGrid from "@/components/orders/OrdersGrid";

export default function OrdersPage() {
  return (
    <main className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Pedidos</h1>
      <OrdersGrid />
    </main>
  );
}
