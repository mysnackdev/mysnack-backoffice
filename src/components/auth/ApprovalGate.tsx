import type { FirebaseApp } from "firebase/app";
import React, { PropsWithChildren } from "react";
import { useOperatorApproval } from "../../hooks/useOperatorApproval";

type Props = PropsWithChildren<{
  app?: FirebaseApp;
  role: "operador" | "operacao" | "admin" | string | undefined;
  pendingUI?: React.ReactNode;
}>;

const DefaultPending = () => (
  <div className="max-w-2xl mx-auto border rounded-xl p-6 my-8">
    <h3 className="font-semibold text-lg mb-2">Aguardando aprovação</h3>
    <p className="text-sm text-gray-600">
      Seu cadastro de operador foi enviado. Assim que o responsável da loja aprovar seu acesso, seu painel será liberado automaticamente.
    </p>
  </div>
);

export default function ApprovalGate({ app, role, children, pendingUI }: Props) {
  
  if (process.env.NODE_ENV != "production" && app) console.debug("[ApprovalGate] app (unused):", app);

  const { loading, approved } = useOperatorApproval();

  // Dono/operacao/admin seguem acessando normalmente
  if (role === "operacao" || role === "admin") return <>{children}</>;

  // Operador: bloqueia até aprovar
  if (role === "operador") {
    if (loading) return null;
    if (!approved) return <>{pendingUI ?? <DefaultPending />}</>;
    return <>{children}</>;
  }

  // Qualquer outro caso (sem role): bloqueia por segurança
  if (loading) return null;
  return <>{pendingUI ?? <DefaultPending />}</>;
}
