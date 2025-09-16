"use client";
import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { app } from "@/firebase";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import { usePathname, useRouter } from "next/navigation";

/**
 * Redireciona operadores com approved=false para /aguarde-aprovacao.
 * - Admin/Operação: acesso normal.
 * - Aprovado: uso normal. Se estiver na tela de espera, volta para a home.
 */
export default function RedirectOperatorGuard({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { loading, approved } = useOperatorApproval(app);
  const pathname = usePathname();
  const router = useRouter();
  const WAIT_PATH = "/aguarde-aprovacao";
  const HOME_PATH = "/";

  useEffect(() => {
    if (role === "admin" || role === "operacao") return; // sem bloqueio

    if (loading) return;

    if (role === "operador") {
      if (!approved) {
        if (pathname !== WAIT_PATH) router.replace(WAIT_PATH);
      } else {
        if (pathname === WAIT_PATH) router.replace(HOME_PATH);
      }
      return;
    }

    // sem role conhecida -> comporta como pendente
    if (pathname !== WAIT_PATH) router.replace(WAIT_PATH);
  }, [role, loading, approved, pathname, router]);

  // Enquanto decide/encaminha, não renderiza o dashboard
  if (role === "admin" || role === "operacao") return <>{children}</>;
  if (loading) return null;
  if (role === "operador" && !approved && pathname !== "/aguarde-aprovacao") return null;

  return <>{children}</>;
}
