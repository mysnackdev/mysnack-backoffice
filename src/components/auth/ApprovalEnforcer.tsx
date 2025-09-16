"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { FirebaseApp } from "firebase/app";
import { app } from "../../../firebase";
import { useAuth } from "@/context/AuthContext";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
/**
 * Enforcer global de aprovação:
 * - Operador com approved=false => redireciona para /aguarde-aprovacao
 * - Operador com approved=true na página /aguarde-aprovacao => redireciona para /
 * - Demais roles (admin/operacao/viewer) apenas seguem o fluxo normal
 */
export default function ApprovalEnforcer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, role, loading } = useAuth();
  const { loading: loadingApproval, approved } = useOperatorApproval(app as FirebaseApp);
  // Opcional: se desejar validar acesso real ao tenant, descomente a linha abaixo

  React.useEffect(() => {
    if (!user) return;

    const isAuthRoute =
      pathname === "/login" || pathname === "/signup" || pathname === "/forgot";

    // Rota de autenticação nunca deve ser bloqueada
    if (isAuthRoute) return;

    // Regras apenas para operadores
    if (role === "operador") {
      if (loadingApproval) return;

      if (!approved && pathname !== "/aguarde-aprovacao") {
        router.replace("/aguarde-aprovacao");
        return;
      }

      if (approved && pathname === "/aguarde-aprovacao") {
        router.replace("/");
        return;
      }
    }
    // Para demais papéis, não forçamos redirect
  }, [user, role, approved, loadingApproval, pathname, router]);

  // Evita flicker enquanto determina estado
  if (loading || (role === "operador" && loadingApproval)) {
    return <></>;
  }

  return <>{children}</>;
}
