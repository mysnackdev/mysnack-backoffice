"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import LandingPortal from "@/components/LandingPortal";
import DashboardShell from "@/components/DashboardShell";
import OperatorGate from "@/components/OperatorGate";
import AdminHome from "@/components/admin/AdminHome";
import StoreHome from "@/components/store/StoreHome";
import OperatorHome from "@/components/operator/OperatorHome";
import RecentOrdersByClientSection from "@/components/recent-orders-by-client.section";
import OverdueOrders15 from "@/components/overdue-orders.component";
import AllOrdersSection from "@/components/all-orders.section";

function Segmented({ tab, setTab }: { tab: "orders" | "byClient"; setTab: (t:"orders"|"byClient")=>void }) {
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

export default function Home() {
  const { user, role, loading } = useAuth();
  const [tab, setTab] = React.useState<"orders" | "byClient">("orders");

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!user) {
    return <LandingPortal />;
  }

  if (role === "admin") {
    return (
      <DashboardShell>
        <AdminHome />
      </DashboardShell>
    );
  }

  if (role === "operador") {
    return (
      <OperatorGate>
        <DashboardShell>
          <OperatorHome />
          <div className="mt-6">
            <Segmented tab={tab} setTab={setTab} />
            {tab === "orders" ? (
              <>
                <OverdueOrders15 />
                <AllOrdersSection />
              </>
            ) : (
              <RecentOrdersByClientSection />
            )}
          </div>
        </DashboardShell>
      </OperatorGate>
    );
  }

  // role === "operacao" (ou outros conhecidos)
  return (
    <DashboardShell>
      <StoreHome />
      <div className="mt-6">
        <Segmented tab={tab} setTab={setTab} />
        {tab === "orders" ? (
          <>
            <OverdueOrders15 />
            <AllOrdersSection />
          </>
        ) : (
          <RecentOrdersByClientSection />
        )}
      </div>
    </DashboardShell>
  );
}
