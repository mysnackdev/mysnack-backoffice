"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PortalPage() {
  const { user, role, loading } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const err = params.get("e");

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return <div className="p-6 text-center text-sm text-zinc-600">Carregando...</div>;
  }

  const canAccess = role === "admin" || role === "operacao";

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Portal</h1>
          <div className="text-sm text-zinc-600">Usuário: <strong>{user?.email}</strong> • Papel: <strong>{role ?? "unknown"}</strong></div>
        </header>

        {err === "forbidden" && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            Seu usuário autenticou, mas ainda não possui papel de acesso (<code>admin</code> / <code>operacao</code>).
            Peça a um administrador para cadastrar seu papel em <code>backoffice/users/{'{uid}'}/role</code>.
          </div>
        )}

        {canAccess ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700">Acesso liberado. Escolha onde deseja ir:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link href="/" className="rounded-xl border bg-white p-4 shadow-sm hover:shadow">📦 Painel de pedidos</Link>
              <Link href="/settings" className="rounded-xl border bg-white p-4 shadow-sm hover:shadow">⚙️ Configurações (opcional)</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-md border bg-white p-4 shadow-sm text-sm">
            <p className="mb-2">
              Você está autenticado mas sem permissão. Enquanto um admin não atribui seu papel,
              você ainda pode navegar em alguns recursos públicos.
            </p>
            <Link className="underline" href="/login">Trocar de conta</Link>
          </div>
        )}
      </div>
    </div>
  );
}
