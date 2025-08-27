"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import LandingPortal from "@/components/LandingPortal";
import DashboardShell from "@/components/DashboardShell";
import { Orders, OrdersByUser } from "@/components";

function Tabs() {
  const [tab, setTab] = React.useState<'all' | 'byUser'>('all');
  return (
    <section className="max-w-5xl">
      <div className="mb-4 inline-flex rounded-lg border p-1 bg-white shadow-sm">
        <button onClick={()=>setTab('all')} className={"px-3 py-1.5 rounded-md " + (tab==='all' ? 'bg-black text-white' : '')}>Pedidos</button>
        <button onClick={()=>setTab('byUser')} className={"ml-1 px-3 py-1.5 rounded-md " + (tab==='byUser' ? 'bg-black text-white' : '')}>Pedidos por usuário</button>
      </div>
      <div data-tab={tab}>
        {tab==='all' ? (
          <div className="flex justify-center"><Orders /></div>
        ) : (
          <div className="flex justify-center"><OrdersByUser /></div>
        )}
      </div>
    </section>
  );
}

export default function Page() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="p-6 text-center text-sm text-zinc-600">Carregando…</div>;

  // ⬇️ MOSTRA O LOGIN (LandingPortal) DIRETO NA HOME QUANDO NÃO LOGADO
  if (!user) return <LandingPortal />;

  const can = role === "admin" || role === "operacao";
  if (!can) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Acesso restrito</h1>
          <p className="text-sm text-zinc-600 mb-4">
            Sua conta autenticou, mas não possui permissão (<code>admin</code> ou <code>operacao</code>).
            Peça a um administrador para ajustar seu papel.
          </p>
          <a className="underline" href="/login">Sair e trocar de conta</a>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Vamos configurar sua loja para começar a vender</h2>
          <p className="text-sm text-zinc-600">Acompanhe e atualize seus pedidos em tempo real.</p>
        </div>
        <Tabs />
      </div>
    </DashboardShell>
  );
}
