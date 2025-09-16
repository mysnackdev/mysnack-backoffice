"use client";
import React from "react";
import OperatorsCard from "./OperatorsCard";
import StoreIdentityBadge from "./StoreIdentityBadge";

export default function StoreHome() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">Minha Loja</h2>
        <p className="text-sm text-zinc-600">Bem-vindo ao painel da operação. Configure horário, cardápio e acompanhe pedidos.</p>
      </div>
      <StoreIdentityBadge />
      <OperatorsCard />
    </div>
  );
}
