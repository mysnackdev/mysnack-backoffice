"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import LandingPortal from "@/components/LandingPortal";
import DashboardShell from "@/components/DashboardShell";
import OperatorGate from "@/components/OperatorGate";
import { Orders, OrdersByUser, OrdersByClient } from "@/components";
import AdminHome from "@/components/admin/AdminHome";
import StoreHome from "@/components/store/StoreHome";
import OperatorHome from "@/components/operator/OperatorHome";



function Tabs() {
  const [tab, setTab] = React.useState<"all" | "byUser" | "byClient">("all");
  return (
    <section className="max-w-5xl">
      <div className="mb-4 inline-flex rounded-lg border bg-white p-1 shadow-sm">
        <button
          onClick={() => setTab("all")}
          className={"px-3 py-1.5 text-sm rounded-md " + (tab === "all" ? "bg-black text-white" : "text-zinc-700")}
        >
          Pedidos
        </button>
        <button
          onClick={() => setTab("byUser")}
          className={"px-3 py-1.5 text-sm rounded-md " + (tab === "byUser" ? "bg-black text-white" : "text-zinc-700")}
        >
          Pedidos por usuário
        </button>
        <button
          onClick={() => setTab("byClient")}
          className={"px-3 py-1.5 text-sm rounded-md " + (tab === "byClient" ? "bg-black text-white" : "text-zinc-700")}
        >
          Por cliente
        </button>
      </div>

      {tab === "all" && <Orders />}
      {tab === "byUser" && <OrdersByUser />}
      {tab === "byClient" && <OrdersByClient />}
    </section>
  );
}

export default function Page() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Carregando...</div>;
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
            <Tabs />
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
        <Tabs />
      </div>
    </DashboardShell>
  );
}
