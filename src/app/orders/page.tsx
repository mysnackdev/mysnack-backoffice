"use client";
import React from "react";
import Segmented from "@/components/orders.tabs";
import OverdueOrders15 from "@/components/overdue-orders.component";
import RecentOrdersByClientSection from "@/components/recent-orders-by-client.section";
import AllOrdersSection from "@/components/all-orders.section";

export default function OrdersPage() {
  const [tab, setTab] = React.useState<"orders" | "byClient">("orders");
  return (
    <main className="max-w-6xl mx-auto p-4">
      <Segmented tab={tab} setTab={setTab} />
      {tab === "orders" ? (
        <>
          <OverdueOrders15 />
          <AllOrdersSection />
        </>
      ) : (
        <RecentOrdersByClientSection />
      )}
    </main>
  );
}
