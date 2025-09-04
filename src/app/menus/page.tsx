// src/app/cardapio/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

function SectionCard({
  title,
  subtitle,
  hint,
  href,
  icon,
}: {
  title: string;
  subtitle: string;
  hint?: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-white p-10 text-center hover:shadow-md transition-shadow"
    >
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-zinc-100 text-zinc-700 text-2xl">
        {icon}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="max-w-xs text-sm text-zinc-600">{subtitle}</p>
      {hint ? <p className="text-xs text-zinc-400">{hint}</p> : null}
    </Link>
  );
}

export default function CardapioPage() {
  const lastUpdated = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Cardápio</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70" aria-hidden>
                <path fill="currentColor" d="M7 2v2H5v2H3v14h18V6h-2V4h-2V2zm0 4h10v2H7zm-2 4h14v8H5z"/>
              </svg>
              Última atualização: {lastUpdated}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Online
        </span>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Cardápio</h2>
          <p className="text-sm text-zinc-600">
            Escolha como quer montar seu cardápio
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SectionCard
            href="/cardapio/assistente"
            title="Manter o cardápio dos tipos atendidos"
            subtitle="Nossa inteligência artificial vai ler e estruturar seu cardápio"
            hint="até 50 min"
            icon={<span>⚡️</span>}
          />
          <SectionCard
            href="/cardapio/novo"
            title="Crio o cardápio do zero"
            subtitle="Você cadastra seus produtos como quiser"
            icon={<span>➕</span>}
          />
        </div>
      </div>
    </div>
  );

  return <DashboardShell>{content}</DashboardShell>;
}
