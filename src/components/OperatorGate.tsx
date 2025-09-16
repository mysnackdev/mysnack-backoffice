"use client";
import React from "react";
import { ref, get } from "firebase/database";
import { db, app } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";
import type { FirebaseApp } from "firebase/app";

function OperatorApprovedCard({ storeId }: { storeId: string }) {
  const [cnpj, setCnpj] = React.useState<string>("");
  const [razao, setRazao] = React.useState<string>("");
  React.useEffect(() => {
    const r = ref(db, `backoffice/tenants/${storeId}/storeProfile`);
    get(r).then((snap) => {
      const v = (snap.exists() ? snap.val() : {}) as { cnpj?: string; razaoSocial?: string; nome?: string; displayName?: string; name?: string };
      setCnpj(v?.cnpj || "");
      setRazao(v?.razaoSocial || v?.displayName || v?.name || "");
    });
  }, [storeId]);
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-600">Acesso aprovado</div>
      <div className="text-xs mt-1 opacity-70">STORE ID</div>
      <div className="font-mono text-xs">{storeId}</div>
      <div className="text-xs mt-2 opacity-70">CNPJ</div>
      <div className="font-mono text-xs">{cnpj || "—"}</div>
      <div className="text-xs mt-2 opacity-70">RAZÃO SOCIAL</div>
      <div className="text-xs">{razao || "—"}</div>
    </div>
  );
}

export default function OperatorGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { approved, storeId } = useOperatorApproval(app as FirebaseApp);

  if (!user) return <>{children}</>;

  // Only show the "approved" card when the operator is in fact approved
  return (
    <>
      {approved && storeId ? (
        <div className="px-4 sm:px-6 lg:px-8 mb-4">
          <OperatorApprovedCard storeId={storeId} />
        </div>
      ) : null}
      {children}
    </>
  );
}
