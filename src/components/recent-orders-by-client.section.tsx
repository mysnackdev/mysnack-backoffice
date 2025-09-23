
"use client";

import React from "react";
import OrdersByClientSimple from "@/components/orders-by-client.simple";

export default function RecentOrdersByClientSection() {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold mb-2">últimos pedidos</h2>
      {/* Reutiliza a listagem "Por cliente" existente */}
      <OrdersByClientSimple />
    </section>
  );
}
