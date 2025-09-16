"use client";
import React from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";

function formatCNPJ(v?: string) {
  const digits = String(v||"").replace(/\D+/g, "").slice(0,14);
  if (digits.length !== 14) return v || "—";
  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
}

export default function StoreIdentityBadge() {
  const { user } = useAuth();
  const [cnpj, setCnpj] = React.useState<string>("");
  const [razao, setRazao] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const r = ref(db, `backoffice/tenants/${uid}/storeProfile`);
    const off = onValue(r, (snap) => {
      const v = (snap.val() || {}) as { cnpj?: string; razaoSocial?: string };
      setCnpj(v.cnpj || "");
      setRazao(v.razaoSocial || "");
      setLoading(false);
    });
    return () => off();
  }, [user]);

  if (loading) return null;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">Identidade fiscal</h2>
      <div className="text-sm text-zinc-700">
        <div className="flex items-center justify-between py-1">
          <span className="text-zinc-500">CNPJ</span>
          <span className="font-mono">{formatCNPJ(cnpj)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-zinc-500">Razão social</span>
          <span className="truncate max-w-[60%] text-right">{razao || "—"}</span>
        </div>
      </div>
    </div>
  );
}
